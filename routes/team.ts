import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { TeamLeader, Caller, User, BranchManager, TeamManager, RenewalManager, RenewalExecutive } from "../models";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "policy_master_jwt_secret_key_2026_mongodb";

// Safe Query Helper for string ID vs MongoDB ObjectId
function buildMemberQuery(id: string, tenantId?: string, isSuperAdmin?: boolean) {
  const isObjId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
  const baseQuery: any = isObjId ? { $or: [{ id }, { _id: id }] } : { id };
  if (!isSuperAdmin && tenantId) {
    baseQuery.tenantId = tenantId;
  }
  return baseQuery;
}

// Auth & Permission Middleware
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

function requireAdmin(req: any, res: any, next: any) {
  if (req.user.role !== "ADMIN" && req.user.role !== "TENANT_ADMIN" && req.user.role !== "SUPER_ADMIN" && req.user.role !== "OPERATOR") {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
}

// GET /api/team/bms - List all Branch Managers for tenant
router.get("/bms", authenticateToken, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const query: any = role === "SUPER_ADMIN" ? {} : { tenantId };

    const bms = await (BranchManager as any).find(query).sort({ createdAt: -1 });
    res.json(bms);
  } catch (err: any) {
    console.error("Fetch Branch Managers Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch branch managers" });
  }
});

// POST /api/team/bms - Create a Branch Manager (Master Data)
router.post("/bms", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { tenantId, uid } = req.user;
    const { name, phone, email, employeeCode, dob, notes, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Branch Manager Name is required" });
    }

    const id = `bm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const bm = await BranchManager.create({
      id,
      tenantId: tenantId || "tenant-default",
      name: name.trim(),
      phone: phone ? phone.trim() : "",
      email: email ? email.toLowerCase().trim() : "",
      employeeCode: employeeCode ? employeeCode.trim() : "",
      dob: dob ? dob.trim() : "",
      notes: notes || "",
      status: status || "Active",
      createdBy: uid
    });

    res.status(201).json({ success: true, message: "Branch Manager created successfully", member: bm });
  } catch (err: any) {
    console.error("Create Branch Manager Error:", err);
    res.status(500).json({ error: err.message || "Failed to create Branch Manager" });
  }
});

// PUT /api/team/bms/:id - Update Branch Manager master data
router.put("/bms/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const { id } = req.params;
    const { name, phone, email, employeeCode, dob, notes, status } = req.body;

    const query: any = buildMemberQuery(id, tenantId, role === "SUPER_ADMIN");
    const bm = await (BranchManager as any).findOne(query);
    if (!bm) {
      return res.status(404).json({ error: "Branch Manager not found" });
    }

    if (name) bm.name = name.trim();
    if (phone !== undefined) bm.phone = phone.trim();
    if (email !== undefined) bm.email = email.toLowerCase().trim();
    if (employeeCode !== undefined) bm.employeeCode = employeeCode.trim();
    if (dob !== undefined) bm.dob = dob.trim();
    if (notes !== undefined) bm.notes = notes;
    if (status) bm.status = status;

    await bm.save();
    res.json({ success: true, message: "Branch Manager updated successfully", member: bm });
  } catch (err: any) {
    console.error("Update Branch Manager Error:", err);
    res.status(500).json({ error: err.message || "Failed to update Branch Manager" });
  }
});

// GET /api/team/tms - List all Team Managers for tenant (optionally filtered by bmId)
router.get("/tms", authenticateToken, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const { bmId } = req.query;
    const query: any = role === "SUPER_ADMIN" ? {} : { tenantId };
    if (bmId && bmId !== "All") query.bmId = bmId;

    const tms = await (TeamManager as any).find(query).sort({ createdAt: -1 });
    res.json(tms);
  } catch (err: any) {
    console.error("Fetch Team Managers Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch team managers" });
  }
});

// POST /api/team/tms - Create a Team Manager (Master Data)
router.post("/tms", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { tenantId, uid } = req.user;
    const { name, bmId, phone, email, employeeCode, dob, notes, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Team Manager Name is required" });
    }

    const id = `tm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tm = await TeamManager.create({
      id,
      tenantId: tenantId || "tenant-default",
      bmId: bmId || "",
      name: name.trim(),
      phone: phone ? phone.trim() : "",
      email: email ? email.toLowerCase().trim() : "",
      employeeCode: employeeCode ? employeeCode.trim() : "",
      dob: dob ? dob.trim() : "",
      notes: notes || "",
      status: status || "Active",
      createdBy: uid
    });

    res.status(201).json({ success: true, message: "Team Manager created successfully", member: tm });
  } catch (err: any) {
    console.error("Create Team Manager Error:", err);
    res.status(500).json({ error: err.message || "Failed to create Team Manager" });
  }
});

// PUT /api/team/tms/:id - Update Team Manager master data
router.put("/tms/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const { id } = req.params;
    const { name, bmId, phone, email, employeeCode, dob, notes, status } = req.body;

    const query: any = buildMemberQuery(id, tenantId, role === "SUPER_ADMIN");
    const tm = await (TeamManager as any).findOne(query);
    if (!tm) {
      return res.status(404).json({ error: "Team Manager not found" });
    }

    if (name) tm.name = name.trim();
    if (bmId !== undefined) tm.bmId = bmId;
    if (phone !== undefined) tm.phone = phone.trim();
    if (email !== undefined) tm.email = email.toLowerCase().trim();
    if (employeeCode !== undefined) tm.employeeCode = employeeCode.trim();
    if (dob !== undefined) tm.dob = dob.trim();
    if (notes !== undefined) tm.notes = notes;
    if (status) tm.status = status;

    await tm.save();
    res.json({ success: true, message: "Team Manager updated successfully", member: tm });
  } catch (err: any) {
    console.error("Update Team Manager Error:", err);
    res.status(500).json({ error: err.message || "Failed to update Team Manager" });
  }
});

// GET /api/team/team-leaders - List all Team Leaders for tenant (optionally filtered by bmId or teamManagerId)
router.get("/team-leaders", authenticateToken, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const { bmId, teamManagerId } = req.query;
    const query: any = role === "SUPER_ADMIN" ? {} : { tenantId };
    if (bmId && bmId !== "All") query.bmId = bmId;
    if (teamManagerId && teamManagerId !== "All") query.teamManagerId = teamManagerId;

    const teamLeaders = await (TeamLeader as any).find(query).sort({ createdAt: -1 });
    res.json(teamLeaders);
  } catch (err: any) {
    console.error("Fetch Team Leaders Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch team leaders" });
  }
});

// POST /api/team/team-leaders - Create a Team Leader (Master Data)
router.post("/team-leaders", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { tenantId, uid } = req.user;
    const { name, bmId, teamManagerId, phone, email, employeeCode, dob, notes, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Team Leader Name is required" });
    }

    let resolvedBmId = bmId || undefined;
    if (teamManagerId && !resolvedBmId) {
      const tmDoc = await (TeamManager as any).findOne({ id: teamManagerId });
      if (tmDoc) resolvedBmId = tmDoc.bmId;
    }

    const id = `tl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const teamLeader = await TeamLeader.create({
      id,
      tenantId: tenantId || "tenant-default",
      bmId: resolvedBmId,
      teamManagerId: teamManagerId || undefined,
      name: name.trim(),
      phone: phone ? phone.trim() : "",
      email: email ? email.toLowerCase().trim() : "",
      employeeCode: employeeCode ? employeeCode.trim() : "",
      dob: dob ? dob.trim() : "",
      notes: notes || "",
      status: status || "Active",
      createdBy: uid
    });

    res.status(201).json({ success: true, message: "Team Leader created successfully", member: teamLeader });
  } catch (err: any) {
    console.error("Create Team Leader Error:", err);
    res.status(500).json({ error: err.message || "Failed to create Team Leader" });
  }
});

// PUT /api/team/team-leaders/:id - Update Team Leader master data
router.put("/team-leaders/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const { id } = req.params;
    const { name, bmId, teamManagerId, phone, email, employeeCode, dob, notes, status } = req.body;

    const query: any = buildMemberQuery(id, tenantId, role === "SUPER_ADMIN");
    const teamLeader = await (TeamLeader as any).findOne(query);
    if (!teamLeader) {
      return res.status(404).json({ error: "Team Leader not found" });
    }

    if (name) teamLeader.name = name.trim();
    if (bmId !== undefined) teamLeader.bmId = bmId;
    if (teamManagerId !== undefined) teamLeader.teamManagerId = teamManagerId;
    if (phone !== undefined) teamLeader.phone = phone.trim();
    if (email !== undefined) teamLeader.email = email.toLowerCase().trim();
    if (employeeCode !== undefined) teamLeader.employeeCode = employeeCode.trim();
    if (dob !== undefined) teamLeader.dob = dob.trim();
    if (notes !== undefined) teamLeader.notes = notes;
    if (status) teamLeader.status = status;

    await teamLeader.save();
    res.json({ success: true, message: "Team Leader updated successfully", member: teamLeader });
  } catch (err: any) {
    console.error("Update Team Leader Error:", err);
    res.status(500).json({ error: err.message || "Failed to update Team Leader" });
  }
});

// GET /api/team/callers - List all Callers for tenant (or filtered by teamLeaderId / teamManagerId / bmId)
router.get("/callers", authenticateToken, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const { teamLeaderId, teamManagerId, bmId } = req.query;

    const query: any = role === "SUPER_ADMIN" ? {} : { tenantId };
    if (teamLeaderId && teamLeaderId !== "All") {
      query.teamLeaderId = teamLeaderId;
    }
    if (teamManagerId && teamManagerId !== "All") {
      query.teamManagerId = teamManagerId;
    }
    if (bmId && bmId !== "All") {
      query.bmId = bmId;
    }

    const callers = await (Caller as any).find(query).sort({ createdAt: -1 });
    res.json(callers);
  } catch (err: any) {
    console.error("Fetch Callers Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch callers" });
  }
});

// POST /api/team/callers - Create a Caller master record
router.post("/callers", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { tenantId, uid } = req.user;
    const { name, teamLeaderId, teamManagerId, bmId, phone, email, employeeCode, dob, notes, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Caller Name is required" });
    }

    let teamLeader = null;
    if (teamLeaderId) {
      teamLeader = await (TeamLeader as any).findOne({ id: teamLeaderId, tenantId });
      if (!teamLeader && req.user.role !== "SUPER_ADMIN") {
        return res.status(400).json({ error: "Selected Team Leader is invalid or belongs to another organization" });
      }
    }

    let resolvedTmId = teamManagerId || teamLeader?.teamManagerId;
    let resolvedBmId = bmId || teamLeader?.bmId;

    if (resolvedTmId && !resolvedBmId) {
      const tmDoc = await (TeamManager as any).findOne({ id: resolvedTmId });
      if (tmDoc) resolvedBmId = tmDoc.bmId;
    }

    const id = `caller_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const caller = await Caller.create({
      id,
      tenantId: tenantId || "tenant-default",
      bmId: resolvedBmId || undefined,
      teamManagerId: resolvedTmId || undefined,
      teamLeaderId: teamLeaderId || undefined,
      name: name.trim(),
      phone: phone ? phone.trim() : "",
      email: email ? email.toLowerCase().trim() : "",
      employeeCode: employeeCode ? employeeCode.trim() : "",
      dob: dob ? dob.trim() : "",
      notes: notes || "",
      status: status || "Active",
      createdBy: uid
    });

    res.status(201).json({ success: true, message: "Caller created successfully", member: caller });
  } catch (err: any) {
    console.error("Create Caller Error:", err);
    res.status(500).json({ error: err.message || "Failed to create Caller" });
  }
});

// PUT /api/team/callers/:id - Update Caller master data
router.put("/callers/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const { id } = req.params;
    const { name, teamLeaderId, teamManagerId, bmId, phone, email, employeeCode, dob, notes, status } = req.body;

    const query: any = buildMemberQuery(id, tenantId, role === "SUPER_ADMIN");
    const caller = await (Caller as any).findOne(query);
    if (!caller) {
      return res.status(404).json({ error: "Caller record not found" });
    }

    if (teamLeaderId !== undefined) {
      if (teamLeaderId && teamLeaderId !== caller.teamLeaderId) {
        const teamLeader = await (TeamLeader as any).findOne({ id: teamLeaderId, tenantId });
        if (!teamLeader && role !== "SUPER_ADMIN") {
          return res.status(400).json({ error: "Selected Team Leader is invalid" });
        }
        if (!teamManagerId && teamLeader?.teamManagerId) caller.teamManagerId = teamLeader.teamManagerId;
        if (!bmId && teamLeader?.bmId) caller.bmId = teamLeader.bmId;
      }
      caller.teamLeaderId = teamLeaderId || undefined;
    }

    if (teamManagerId !== undefined) caller.teamManagerId = teamManagerId || undefined;
    if (bmId !== undefined) caller.bmId = bmId || undefined;
    if (name) caller.name = name.trim();
    if (phone !== undefined) caller.phone = phone.trim();
    if (email !== undefined) caller.email = email.toLowerCase().trim();
    if (employeeCode !== undefined) caller.employeeCode = employeeCode.trim();
    if (dob !== undefined) caller.dob = dob.trim();
    if (notes !== undefined) caller.notes = notes;
    if (status) caller.status = status;

    await caller.save();
    res.json({ success: true, message: "Caller updated successfully", member: caller });
  } catch (err: any) {
    console.error("Update Caller Error:", err);
    res.status(500).json({ error: err.message || "Failed to update Caller" });
  }
});

// GET /api/team/members - Unified List Endpoint for backward compatibility
router.get("/members", authenticateToken, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const query: any = role === "SUPER_ADMIN" ? {} : { tenantId };

    const tls = await (TeamLeader as any).find(query).sort({ createdAt: -1 });
    const callers = await (Caller as any).find(query).sort({ createdAt: -1 });

    const formattedTLs = tls.map((t: any) => ({
      _id: t._id,
      id: t.id,
      name: t.name,
      email: t.email || "",
      phone: t.phone || "",
      role: "TEAM_LEADER",
      status: t.status,
      tenantId: t.tenantId,
      createdAt: t.createdAt
    }));

    const formattedCallers = callers.map((c: any) => ({
      _id: c._id,
      id: c.id,
      name: c.name,
      email: c.email || "",
      phone: c.phone || "",
      role: "CALLER",
      teamLeaderId: c.teamLeaderId,
      status: c.status,
      tenantId: c.tenantId,
      createdAt: c.createdAt
    }));

    res.json([...formattedTLs, ...formattedCallers]);
  } catch (err: any) {
    console.error("Fetch Team Members Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch team members" });
  }
});

// DELETE /api/team/bms/:id - Permanently delete Branch Manager
router.delete("/bms/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const { id } = req.params;
    const query: any = buildMemberQuery(id, tenantId, role === "SUPER_ADMIN");
    const deleted = await BranchManager.deleteOne(query);
    if (deleted.deletedCount === 0) return res.status(404).json({ error: "Branch Manager not found" });
    res.json({ success: true, message: "Branch Manager deleted from MongoDB Atlas" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/team/tms/:id - Permanently delete Team Manager
router.delete("/tms/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const { id } = req.params;
    const query: any = buildMemberQuery(id, tenantId, role === "SUPER_ADMIN");
    const deleted = await TeamManager.deleteOne(query);
    if (deleted.deletedCount === 0) return res.status(404).json({ error: "Team Manager not found" });
    res.json({ success: true, message: "Team Manager deleted from MongoDB Atlas" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/team/team-leaders/:id - Permanently delete Team Leader
router.delete("/team-leaders/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const { id } = req.params;
    const query: any = buildMemberQuery(id, tenantId, role === "SUPER_ADMIN");
    const deleted = await TeamLeader.deleteOne(query);
    if (deleted.deletedCount === 0) return res.status(404).json({ error: "Team Leader not found" });
    res.json({ success: true, message: "Team Leader deleted from MongoDB Atlas" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/team/callers/:id - Permanently delete Caller/TSE
router.delete("/callers/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const { id } = req.params;
    const query: any = buildMemberQuery(id, tenantId, role === "SUPER_ADMIN");
    const deleted = await Caller.deleteOne(query);
    if (deleted.deletedCount === 0) return res.status(404).json({ error: "Caller not found" });
    res.json({ success: true, message: "TSE / Caller deleted from MongoDB Atlas" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/team/renewal-managers - List all Renewal Managers for tenant
router.get("/renewal-managers", authenticateToken, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const query: any = role === "SUPER_ADMIN" ? {} : { tenantId };
    const rms = await (RenewalManager as any).find(query).sort({ createdAt: -1 });
    res.json(rms);
  } catch (err: any) {
    console.error("Fetch Renewal Managers Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch Renewal Managers" });
  }
});

// POST /api/team/renewal-managers - Create Renewal Manager
router.post("/renewal-managers", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { tenantId, uid } = req.user;
    const { name, phone, email, employeeCode, dob, notes, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Renewal Manager Name is required" });
    }

    const id = `rm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const rm = await RenewalManager.create({
      id,
      tenantId: tenantId || "tenant-default",
      name: name.trim(),
      phone: phone ? phone.trim() : "",
      email: email ? email.toLowerCase().trim() : "",
      employeeCode: employeeCode ? employeeCode.trim() : "",
      dob: dob ? dob.trim() : "",
      notes: notes || "",
      status: status || "Active",
      createdBy: uid
    });

    res.status(201).json({ success: true, message: "Renewal Manager created successfully", member: rm });
  } catch (err: any) {
    console.error("Create Renewal Manager Error:", err);
    res.status(500).json({ error: err.message || "Failed to create Renewal Manager" });
  }
});

// PUT /api/team/renewal-managers/:id - Update Renewal Manager
router.put("/renewal-managers/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const { id } = req.params;
    const { name, phone, email, employeeCode, dob, notes, status } = req.body;

    const query: any = buildMemberQuery(id, tenantId, role === "SUPER_ADMIN");
    const rm = await (RenewalManager as any).findOne(query);
    if (!rm) {
      return res.status(404).json({ error: "Renewal Manager not found" });
    }

    if (name) rm.name = name.trim();
    if (phone !== undefined) rm.phone = phone.trim();
    if (email !== undefined) rm.email = email.toLowerCase().trim();
    if (employeeCode !== undefined) rm.employeeCode = employeeCode.trim();
    if (dob !== undefined) rm.dob = dob.trim();
    if (notes !== undefined) rm.notes = notes;
    if (status) rm.status = status;

    await rm.save();

    if (name) {
      await (RenewalExecutive as any).updateMany(
        { renewalManagerId: id },
        { $set: { renewalManagerName: rm.name } }
      );
    }

    res.json({ success: true, message: "Renewal Manager updated successfully", member: rm });
  } catch (err: any) {
    console.error("Update Renewal Manager Error:", err);
    res.status(500).json({ error: err.message || "Failed to update Renewal Manager" });
  }
});

// DELETE /api/team/renewal-managers/:id - Permanently delete Renewal Manager
router.delete("/renewal-managers/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const { id } = req.params;
    const query: any = buildMemberQuery(id, tenantId, role === "SUPER_ADMIN");
    
    const rmDoc = await (RenewalManager as any).findOne(query);
    if (!rmDoc) return res.status(404).json({ error: "Renewal Manager not found" });

    const targetId = rmDoc.id || id;
    await RenewalManager.deleteOne(query);

    await (RenewalExecutive as any).updateMany(
      { renewalManagerId: targetId },
      { $set: { renewalManagerId: "", renewalManagerName: "" } }
    );

    res.json({ success: true, message: "Renewal Manager deleted and linked executives unassigned" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/team/renewal-executives - List all Renewal Executives (optionally filtered by renewalManagerId)
router.get("/renewal-executives", authenticateToken, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const { renewalManagerId } = req.query;
    const query: any = role === "SUPER_ADMIN" ? {} : { tenantId };
    if (renewalManagerId) query.renewalManagerId = renewalManagerId;

    const rexList = await (RenewalExecutive as any).find(query).sort({ createdAt: -1 });
    res.json(rexList);
  } catch (err: any) {
    console.error("Fetch Renewal Executives Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch Renewal Executives" });
  }
});

// POST /api/team/renewal-executives - Create Renewal Executive
router.post("/renewal-executives", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { tenantId, uid } = req.user;
    const { name, renewalManagerId, phone, email, employeeCode, dob, notes, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Renewal Executive Name is required" });
    }

    let rmName = "";
    if (renewalManagerId) {
      const rmDoc = await (RenewalManager as any).findOne({ id: renewalManagerId });
      if (rmDoc) rmName = rmDoc.name;
    }

    const id = `re_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const rex = await RenewalExecutive.create({
      id,
      tenantId: tenantId || "tenant-default",
      renewalManagerId: renewalManagerId || "",
      renewalManagerName: rmName,
      name: name.trim(),
      phone: phone ? phone.trim() : "",
      email: email ? email.toLowerCase().trim() : "",
      employeeCode: employeeCode ? employeeCode.trim() : "",
      dob: dob ? dob.trim() : "",
      notes: notes || "",
      status: status || "Active",
      createdBy: uid
    });

    res.status(201).json({ success: true, message: "Renewal Executive created successfully", member: rex });
  } catch (err: any) {
    console.error("Create Renewal Executive Error:", err);
    res.status(500).json({ error: err.message || "Failed to create Renewal Executive" });
  }
});

// PUT /api/team/renewal-executives/:id - Update Renewal Executive
router.put("/renewal-executives/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const { id } = req.params;
    const { name, renewalManagerId, phone, email, employeeCode, dob, notes, status } = req.body;

    const query: any = buildMemberQuery(id, tenantId, role === "SUPER_ADMIN");
    const rex = await (RenewalExecutive as any).findOne(query);
    if (!rex) {
      return res.status(404).json({ error: "Renewal Executive not found" });
    }

    if (name) rex.name = name.trim();
    if (renewalManagerId !== undefined) {
      if (renewalManagerId && renewalManagerId !== rex.renewalManagerId) {
        const rmDoc = await (RenewalManager as any).findOne({ id: renewalManagerId, tenantId });
        if (rmDoc) {
          rex.renewalManagerName = rmDoc.name;
        }
      } else if (!renewalManagerId) {
        rex.renewalManagerName = "";
      }
      rex.renewalManagerId = renewalManagerId || "";
    }
    if (phone !== undefined) rex.phone = phone.trim();
    if (email !== undefined) rex.email = email.toLowerCase().trim();
    if (employeeCode !== undefined) rex.employeeCode = employeeCode.trim();
    if (dob !== undefined) rex.dob = dob.trim();
    if (notes !== undefined) rex.notes = notes;
    if (status) rex.status = status;

    await rex.save();
    res.json({ success: true, message: "Renewal Executive updated successfully", member: rex });
  } catch (err: any) {
    console.error("Update Renewal Executive Error:", err);
    res.status(500).json({ error: err.message || "Failed to update Renewal Executive" });
  }
});

// DELETE /api/team/renewal-executives/:id - Permanently delete Renewal Executive
router.delete("/renewal-executives/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const { id } = req.params;
    const query: any = buildMemberQuery(id, tenantId, role === "SUPER_ADMIN");
    const deleted = await RenewalExecutive.deleteOne(query);
    if (deleted.deletedCount === 0) return res.status(404).json({ error: "Renewal Executive not found" });
    res.json({ success: true, message: "Renewal Executive deleted from MongoDB Atlas" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
