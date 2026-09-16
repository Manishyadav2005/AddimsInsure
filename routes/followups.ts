import { Router } from "express";
import jwt from "jsonwebtoken";
import { FollowUp, AuditLog } from "../models";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "policy_master_jwt_secret_key_2026_mongodb";

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. Token missing." });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token." });
    }
    req.user = decoded;
    next();
  });
};

// GET /api/followups - List follow-ups with role-scoped filters (today, upcoming, overdue, completed)
router.get("/", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, tenantId, uid } = req.user;
    const { filter = "all" } = req.query;

    let scopeQuery: any = {};
    if (role === "SUPER_ADMIN") {
      scopeQuery = {};
    } else if (role === "ADMIN" || role === "TENANT_ADMIN") {
      scopeQuery = { tenantId };
    } else if (role === "TEAM_LEADER") {
      scopeQuery = { tenantId, $or: [{ teamLeaderId: uid }, { createdBy: uid }] };
    } else if (role === "CALLER" || role === "AGENT") {
      scopeQuery = { tenantId, assignedTo: uid };
    }

    const todayStr = new Date().toISOString().split("T")[0];

    let filterQuery: any = {};
    if (filter === "today") {
      filterQuery = { followUpDate: todayStr, status: "PENDING" };
    } else if (filter === "upcoming") {
      filterQuery = { followUpDate: { $gt: todayStr }, status: "PENDING" };
    } else if (filter === "overdue") {
      filterQuery = { followUpDate: { $lt: todayStr }, status: "PENDING" };
    } else if (filter === "completed") {
      filterQuery = { status: "COMPLETED" };
    }

    const followUps = await FollowUp.find({ ...scopeQuery, ...filterQuery }).sort({ followUpDate: 1 });
    res.json(followUps);
  } catch (err: any) {
    console.error("Get FollowUps Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch follow-ups" });
  }
});

// POST /api/followups - Schedule a new follow-up
router.post("/", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, tenantId, uid, name: userName } = req.user;
    const { entityType, entityId, title, followUpDate, followUpTime, notes, assignedTo } = req.body;

    if (!entityId || !followUpDate) {
      return res.status(400).json({ error: "Entity ID and follow-up date are required." });
    }

    const newFollowUp = await FollowUp.create({
      id: `flw_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      tenantId,
      assignedTo: assignedTo || uid,
      assignedToName: userName,
      entityType: entityType || "LEAD",
      entityId,
      title: title || "Scheduled Callback",
      followUpDate,
      followUpTime: followUpTime || "10:00 AM",
      status: "PENDING",
      notes,
      createdBy: uid
    });

    res.status(201).json({ message: "Follow-up scheduled successfully", followUp: newFollowUp });
  } catch (err: any) {
    console.error("Create FollowUp Error:", err);
    res.status(500).json({ error: err.message || "Failed to schedule follow-up" });
  }
});

// PUT /api/followups/:id/status - Update follow-up status (COMPLETED/MISSED)
router.put("/:id/status", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, tenantId, uid, name: userName } = req.user;
    const { id } = req.params;
    const { status, notes } = req.body;

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const followUp = await FollowUp.findOne((isObjectId ? { _id: id } : { id }) as any);

    if (!followUp) {
      return res.status(404).json({ error: "Follow-up not found" });
    }

    if (role !== "SUPER_ADMIN" && followUp.tenantId !== tenantId) {
      return res.status(403).json({ error: "Forbidden: Cross-tenant operation blocked" });
    }

    followUp.status = status || "COMPLETED";
    if (notes) {
      followUp.notes = followUp.notes ? `${followUp.notes} | ${notes}` : notes;
    }
    await followUp.save();

    await AuditLog.create({
      id: `audit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      tenantId,
      userId: uid,
      userName,
      userRole: role,
      action: "UPDATED_FOLLOWUP_STATUS",
      entityType: "FOLLOWUP",
      entityId: followUp.id,
      metadata: { newStatus: status }
    });

    res.json({ message: "Follow-up status updated", followUp });
  } catch (err: any) {
    console.error("Update FollowUp Status Error:", err);
    res.status(500).json({ error: err.message || "Failed to update follow-up" });
  }
});

export default router;
