import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Customer, Lead, PolicyModel, CallLog, FollowUp, AuditLog, User } from "../models";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "policy_master_jwt_secret_key_2026_mongodb";

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. Authentication token missing." });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token." });
    }
    req.user = decoded;
    next();
  });
};

// GET /api/customers - List customers filtered by user role & data scope
router.get("/", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, tenantId, uid, permissions } = req.user;

    if (role === "TEAM_LEADER" || role === "CALLER") {
      if (permissions && !permissions.includes("customers.view") && !permissions.includes("policies.view")) {
        return res.status(403).json({ error: "Forbidden: You do not have permission to view customers." });
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

    const customers = await Customer.find(query).sort({ createdAt: -1 });
    res.json(customers);
  } catch (err: any) {
    console.error("Get Customers Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch customers" });
  }
});

// POST /api/customers - Create a new Customer
router.post("/", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, tenantId, uid, name: userName, permissions } = req.user;

    if (role === "TEAM_LEADER" || role === "CALLER") {
      if (permissions && !permissions.includes("customers.create") && !permissions.includes("customers.edit")) {
        return res.status(403).json({ error: "Forbidden: You do not have permission to create customers." });
      }
    }

    const {
      customerName,
      customerPhone,
      alternatePhone,
      customerEmail,
      dob,
      address,
      city,
      state,
      pincode,
      source,
      notes,
      assignedTo
    } = req.body;

    if (!customerName) {
      return res.status(400).json({ error: "Customer name is required" });
    }

    let targetTeamLeaderId = uid;
    let assignedCallerName = userName;

    if (assignedTo) {
      const assignedUser = await User.findById(assignedTo);
      if (assignedUser) {
        targetTeamLeaderId = assignedUser.teamLeaderId || uid;
        assignedCallerName = assignedUser.name || assignedUser.email;
      }
    }

    const newCustomer = await Customer.create({
      id: `cust_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      tenantId: tenantId || "standalone",
      teamLeaderId: targetTeamLeaderId,
      assignedTo: assignedTo || uid,
      assignedToName: assignedCallerName,
      customerName,
      customerPhone,
      alternatePhone,
      customerEmail,
      dob,
      address,
      city,
      state,
      pincode,
      source: source || "Direct Creation",
      notes,
      createdBy: uid
    });

    // Create Audit Log
    await AuditLog.create({
      id: `audit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      tenantId,
      userId: uid,
      userName,
      userRole: role,
      action: "CREATED_CUSTOMER",
      entityType: "CUSTOMER",
      entityId: newCustomer.id,
      metadata: { customerName, customerPhone }
    });

    res.status(201).json({ message: "Customer created successfully", customer: newCustomer });
  } catch (err: any) {
    console.error("Create Customer Error:", err);
    res.status(500).json({ error: err.message || "Failed to create customer" });
  }
});

// GET /api/customers/:id - Customer profile with multi-policy ledger, call timeline & followups
router.get("/:id", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, tenantId, uid } = req.user;
    const { id } = req.params;

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const customer = await Customer.findOne((isObjectId ? { _id: id } : { id }) as any);

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    if (role !== "SUPER_ADMIN" && customer.tenantId !== tenantId) {
      return res.status(403).json({ error: "Forbidden: Cross-tenant access blocked" });
    }

    // Fetch related policies, call logs, and follow-ups
    const policies = await PolicyModel.find({
      $or: [
        { customerId: customer.id },
        { customerEmail: customer.customerEmail },
        { customerPhone: customer.customerPhone }
      ]
    } as any).sort({ createdAt: -1 });

    const callLogs = await CallLog.find({ entityId: customer.id } as any).sort({ createdAt: -1 });

    const followUps = await FollowUp.find({ entityId: customer.id } as any).sort({ followUpDate: 1 });

    res.json({
      customer,
      policies,
      callLogs,
      followUps
    });
  } catch (err: any) {
    console.error("Get Customer Profile Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch customer profile" });
  }
});

// POST /api/customers/convert-lead - Convert Lead into Customer & optional Policy
router.post("/convert-lead", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, tenantId, uid, name: userName, permissions } = req.user;
    const { leadId, companyName, policyType, premiumAmount, premiumFrequency } = req.body;

    if (role === "TEAM_LEADER" || role === "CALLER") {
      if (permissions && !permissions.includes("leads.edit") && !permissions.includes("customers.create")) {
        return res.status(403).json({ error: "Forbidden: Permission required to convert leads." });
      }
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(leadId);
    const lead = await Lead.findOne((isObjectId ? { _id: leadId } : { id: leadId }) as any);

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    if (role !== "SUPER_ADMIN" && lead.tenantId !== tenantId) {
      return res.status(403).json({ error: "Forbidden: Cross-tenant conversion blocked" });
    }

    // 1. Create or Find Customer
    let customer = await Customer.findOne({ customerPhone: lead.customerPhone } as any);

    if (!customer) {
      customer = await Customer.create({
        id: `cust_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        tenantId: lead.tenantId,
        teamLeaderId: lead.teamLeaderId,
        assignedTo: lead.assignedTo,
        assignedToName: lead.assignedToName,
        customerName: lead.customerName,
        customerPhone: lead.customerPhone,
        alternatePhone: lead.alternatePhone,
        customerEmail: lead.customerEmail,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        pincode: lead.pincode,
        source: lead.source || "Lead Conversion",
        notes: `Converted from lead ${lead.id}`,
        createdBy: uid
      });
    }

    // 2. Create Policy linked to Customer
    const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const newPolicy = await PolicyModel.create({
      id: `pol_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId: uid,
      tenantId: lead.tenantId,
      teamLeaderId: lead.teamLeaderId,
      assignedTo: lead.assignedTo,
      customerId: customer.id,
      customerName: lead.customerName,
      customerEmail: lead.customerEmail || `${lead.customerName.toLowerCase().replace(/\s+/g, ".")}@client.com`,
      customerPhone: lead.customerPhone,
      policyNumber: `POL-${Math.floor(100000 + Math.random() * 900000)}`,
      companyName: companyName || "Star Health Insurance",
      policyType: policyType || lead.policyType || "Health Insurance",
      premiumAmount: premiumAmount || lead.estimatedAmount || 15000,
      premiumFrequency: premiumFrequency || "Yearly",
      expiryDate,
      nextDueDate: expiryDate,
      premiumStatus: "Paid"
    });

    // 3. Mark Lead Converted
    lead.callStatus = "Converted";
    lead.notes.push({
      note: `Converted to Customer (${customer.customerName}) and Policy #${newPolicy.policyNumber}`,
      addedBy: uid,
      addedByName: userName,
      createdAt: new Date()
    });
    await lead.save();

    // 4. Audit Log
    await AuditLog.create({
      id: `audit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      tenantId: lead.tenantId,
      userId: uid,
      userName,
      userRole: role,
      action: "CONVERTED_LEAD_TO_CUSTOMER",
      entityType: "CUSTOMER",
      entityId: customer.id,
      metadata: { leadId: lead.id, policyNumber: newPolicy.policyNumber }
    });

    res.json({
      message: "Lead successfully converted to Customer and Policy created",
      customer,
      policy: newPolicy,
      lead
    });
  } catch (err: any) {
    console.error("Convert Lead to Customer Error:", err);
    res.status(500).json({ error: err.message || "Failed to convert lead" });
  }
});

// DELETE /api/customers/:id - Permanently delete customer from MongoDB Atlas
router.delete("/:id", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, tenantId } = req.user;
    const { id } = req.params;
    const isObjId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
    const query: any = isObjId ? { $or: [{ id }, { _id: id }] } : { id };
    if (role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }

    const deleted = await Customer.deleteOne(query);
    if (deleted.deletedCount === 0) {
      return res.status(404).json({ error: "Customer not found or permission denied" });
    }

    res.json({ success: true, message: "Customer deleted successfully from MongoDB Atlas" });
  } catch (err: any) {
    console.error("Delete Customer Error:", err);
    res.status(500).json({ error: err.message || "Failed to delete customer from MongoDB" });
  }
});

export default router;
