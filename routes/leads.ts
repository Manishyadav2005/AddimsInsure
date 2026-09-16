import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Lead, PolicyModel, User, CallLog, FollowUp, AuditLog } from "../models";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "policy_master_jwt_secret_key_2026_mongodb";

// Middleware to authenticate token
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = decoded;
    next();
  });
}

// GET /api/leads - Fetch leads based on role & data scope
router.get("/", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, tenantId, uid, permissions } = req.user;

    // RBAC permission check (skip for SUPER_ADMIN & ADMIN)
    if (role === "TEAM_LEADER" || role === "CALLER") {
      if (permissions && !permissions.includes("leads.view")) {
        return res.status(403).json({ error: "Forbidden: You do not have permission to view leads." });
      }
    }

    let query: any = {};
    if (role === "SUPER_ADMIN") {
      query = {};
    } else if (role === "ADMIN" || role === "TENANT_ADMIN") {
      query = { tenantId };
    } else if (role === "TEAM_LEADER") {
      query = { tenantId, $or: [{ teamLeaderId: uid }, { createdBy: uid }] };
    } else if (role === "CALLER" || role === "AGENT") {
      query = { tenantId, assignedTo: uid };
    }

    const leads = await Lead.find(query).sort({ updatedAt: -1 });
    res.json(leads);
  } catch (err: any) {
    console.error("Fetch Leads Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch leads" });
  }
});

// POST /api/leads - Create a new lead
router.post("/", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, tenantId, uid, permissions } = req.user;

    if (role === "TEAM_LEADER" || role === "CALLER") {
      if (permissions && !permissions.includes("leads.edit") && !permissions.includes("leads.create")) {
        return res.status(403).json({ error: "Forbidden: You do not have permission to create leads." });
      }
    }

    const { customerName, customerEmail, customerPhone, policyType, estimatedAmount, assignedTo, followUpDate } = req.body;
    if (!customerName) {
      return res.status(400).json({ error: "Customer name is required" });
    }

    // Resolve assigned caller name & team leader
    let assignedCallerId = assignedTo || (role === "CALLER" ? uid : undefined);
    let assignedCallerName = "";
    let assignedTlId = "";

    if (assignedCallerId) {
      const assignedUser = await User.findById(assignedCallerId);
      if (assignedUser) {
        assignedCallerName = assignedUser.name || assignedUser.email;
        assignedTlId = assignedUser.teamLeaderId || (role === "TEAM_LEADER" ? uid : "");
      }
    } else if (role === "TEAM_LEADER") {
      assignedTlId = uid;
    }

    const lead = await Lead.create({
      id: `lead_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      tenantId: tenantId || "default-tenant",
      teamLeaderId: assignedTlId,
      assignedTo: assignedCallerId,
      assignedToName: assignedCallerName,
      customerName,
      customerEmail: customerEmail || "",
      customerPhone: customerPhone || "",
      policyType: policyType || "General Insurance",
      estimatedAmount: estimatedAmount || 0,
      callStatus: "New",
      notes: [],
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      createdBy: uid
    });

    res.status(201).json(lead);
  } catch (err: any) {
    console.error("Create Lead Error:", err);
    res.status(500).json({ error: err.message || "Failed to create lead" });
  }
});

// PUT /api/leads/:id/status - Update call status, add call notes, schedule follow-up
router.put("/:id/status", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, tenantId, uid, email, permissions } = req.user;

    if (role === "TEAM_LEADER" || role === "CALLER") {
      if (permissions && !permissions.includes("leads.edit")) {
        return res.status(403).json({ error: "Forbidden: You do not have permission to update leads." });
      }
    }

    const { id } = req.params;
    const { callStatus, note, followUpDate } = req.body;

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const lead = await Lead.findOne(isObjectId ? { $or: [{ id }, { _id: id }] } : { id });
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    // Multi-tenant & caller data scope check
    if (role !== "SUPER_ADMIN" && lead.tenantId !== tenantId) {
      return res.status(403).json({ error: "Forbidden: Cross-tenant data access blocked" });
    }
    if ((role === "CALLER" || role === "AGENT") && lead.assignedTo !== uid) {
      return res.status(403).json({ error: "Forbidden: You can only update leads assigned to you" });
    }

    if (callStatus) lead.callStatus = callStatus;
    if (followUpDate) {
      lead.followUpDate = new Date(followUpDate);
      lead.nextFollowUpTime = req.body.nextFollowUpTime || "10:00 AM";
    }
    lead.lastContactedAt = new Date();

    const currentUser = await User.findById(uid);
    const authorName = currentUser?.name || email;

    if (note && note.trim()) {
      lead.notes.push({
        note: note.trim(),
        addedBy: uid,
        addedByName: authorName,
        createdAt: new Date()
      });
    }

    await lead.save();

    // 1. Create timestamped historical CallLog entry
    await CallLog.create({
      id: `clog_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      tenantId: lead.tenantId,
      teamLeaderId: lead.teamLeaderId,
      assignedTo: uid,
      assignedToName: authorName,
      entityType: "LEAD",
      entityId: lead.id,
      callStatus: callStatus || lead.callStatus,
      notes: note || "",
      nextFollowUpDate: followUpDate ? new Date(followUpDate).toISOString().split("T")[0] : undefined,
      nextFollowUpTime: req.body.nextFollowUpTime || "10:00 AM",
      createdBy: uid
    });

    // 2. Schedule FollowUp if followUpDate provided
    if (followUpDate) {
      const followUpDateStr = new Date(followUpDate).toISOString().split("T")[0];
      await FollowUp.create({
        id: `flw_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        tenantId: lead.tenantId,
        teamLeaderId: lead.teamLeaderId,
        assignedTo: lead.assignedTo || uid,
        assignedToName: lead.assignedToName || authorName,
        entityType: "LEAD",
        entityId: lead.id,
        title: `Follow-up call: ${lead.customerName}`,
        followUpDate: followUpDateStr,
        followUpTime: req.body.nextFollowUpTime || "10:00 AM",
        status: "PENDING",
        notes: note || "Scheduled callback",
        createdBy: uid
      });
    }

    res.json({ message: "Lead status updated successfully", lead });
  } catch (err: any) {
    console.error("Update Lead Status Error:", err);
    res.status(500).json({ error: err.message || "Failed to update lead status" });
  }
});

// PUT /api/leads/:id/assign - Assign or reassign lead to Team Leader / Caller
router.put("/:id/assign", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, tenantId, uid, name: userName, permissions } = req.user;

    if (role === "CALLER") {
      return res.status(403).json({ error: "Forbidden: Callers cannot assign leads." });
    }

    if (role === "TEAM_LEADER" && permissions && !permissions.includes("leads.assign") && !permissions.includes("leads.edit")) {
      return res.status(403).json({ error: "Forbidden: Permission required to assign leads." });
    }

    const { id } = req.params;
    const { assignedTo } = req.body;

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const lead = await Lead.findOne(isObjectId ? { $or: [{ id }, { _id: id }] } : { id });
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    if (role !== "SUPER_ADMIN" && lead.tenantId !== tenantId) {
      return res.status(403).json({ error: "Forbidden: Cross-tenant operation blocked" });
    }

    // Validate target assignee
    const targetUser = await User.findById(assignedTo);
    if (!targetUser) {
      return res.status(404).json({ error: "Target assignee user not found" });
    }

    // Team Leader validation: cannot assign to callers outside their team!
    if (role === "TEAM_LEADER") {
      if (targetUser.teamLeaderId !== uid && targetUser._id.toString() !== uid) {
        return res.status(403).json({ error: "Forbidden: Team Leaders can only assign leads to callers in their own team." });
      }
    }

    const previousAssignee = lead.assignedToName || "Unassigned";
    lead.assignedTo = targetUser._id.toString();
    lead.assignedToName = targetUser.name || targetUser.email;
    lead.teamLeaderId = targetUser.teamLeaderId || (targetUser.role === "TEAM_LEADER" ? targetUser._id.toString() : lead.teamLeaderId);
    
    await lead.save();

    // Audit Log for lead assignment
    await AuditLog.create({
      id: `audit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      tenantId,
      userId: uid,
      userName,
      userRole: role,
      action: "REASSIGNED_LEAD",
      entityType: "LEAD",
      entityId: lead.id,
      metadata: { previousAssignee, newAssignee: lead.assignedToName }
    });

    res.json({ message: "Lead assigned successfully", lead });
  } catch (err: any) {
    console.error("Assign Lead Error:", err);
    res.status(500).json({ error: err.message || "Failed to assign lead" });
  }
});

// POST /api/leads/:id/convert - Convert lead to customer policy
router.post("/:id/convert", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, tenantId, uid, permissions } = req.user;

    if (role === "TEAM_LEADER" || role === "CALLER") {
      if (permissions && !permissions.includes("policies.edit") && !permissions.includes("leads.edit")) {
        return res.status(403).json({ error: "Forbidden: You do not have permission to convert leads." });
      }
    }

    const { id } = req.params;
    const { policyNumber, companyName, premiumAmount, premiumFrequency } = req.body;

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const lead = await Lead.findOne(isObjectId ? { $or: [{ id }, { _id: id }] } : { id });
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    if (role !== "SUPER_ADMIN" && lead.tenantId !== tenantId) {
      return res.status(403).json({ error: "Forbidden: Cross-tenant conversion blocked" });
    }

    const startDate = new Date().toISOString().split("T")[0];
    const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const newPolicy = await PolicyModel.create({
      id: `pol_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId: uid,
      tenantId: lead.tenantId,
      teamLeaderId: lead.teamLeaderId,
      assignedTo: lead.assignedTo,
      customerName: lead.customerName,
      customerEmail: lead.customerEmail || `${lead.customerName.toLowerCase().replace(/\s+/g, "")}@example.com`,
      customerPhone: lead.customerPhone || "",
      policyNumber: policyNumber || `POL-${Math.floor(100000 + Math.random() * 900000)}`,
      companyName: companyName || "Star Health",
      policyType: lead.policyType || "Health Insurance",
      premiumAmount: premiumAmount || lead.estimatedAmount || 15000,
      premiumFrequency: premiumFrequency || "Yearly",
      startDate,
      expiryDate,
      nextDueDate: expiryDate,
      premiumStatus: "Paid"
    });

    lead.callStatus = "Converted";
    await lead.save();

    res.json({ message: "Lead converted to policy successfully", policy: newPolicy, lead });
  } catch (err: any) {
    console.error("Convert Lead Error:", err);
    res.status(500).json({ error: err.message || "Failed to convert lead" });
  }
});

// DELETE /api/leads/:id - Delete lead from MongoDB Atlas
router.delete("/:id", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, tenantId, permissions } = req.user;
    const { id } = req.params;

    if (role === "TEAM_LEADER" || role === "CALLER") {
      if (permissions && !permissions.includes("leads.delete")) {
        return res.status(403).json({ error: "Forbidden: You do not have permission to delete leads." });
      }
    }

    const isObjId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
    const query: any = isObjId ? { $or: [{ id }, { _id: id }] } : { id };
    if (role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }

    const deleted = await Lead.deleteOne(query);
    if (deleted.deletedCount === 0) {
      return res.status(404).json({ error: "Lead not found or permission denied" });
    }

    res.json({ success: true, message: "Lead deleted successfully from MongoDB Atlas" });
  } catch (err: any) {
    console.error("Delete Lead Error:", err);
    res.status(500).json({ error: err.message || "Failed to delete lead from MongoDB" });
  }
});

export default router;
