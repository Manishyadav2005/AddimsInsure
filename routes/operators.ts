import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { User } from "../models";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "policy_master_jwt_secret_key_2026_mongodb";

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
  if (req.user.role !== "ADMIN" && req.user.role !== "TENANT_ADMIN" && req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Forbidden: Only Organization Admins can manage Operators" });
  }
  next();
}

// GET /api/operators - List Operators for current organization
router.get("/", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;

    const query: any = { role: "OPERATOR" };
    if (role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }

    const operators = await User.find(query).select("-password").sort({ createdAt: -1 });
    const formattedOperators = operators.map((op: any) => {
      const opObj = op.toObject ? op.toObject() : { ...op };
      delete opObj.password;
      const strId = (op._id || op.id || "").toString();
      return {
        ...opObj,
        _id: strId,
        id: strId
      };
    });

    res.json(formattedOperators);
  } catch (err: any) {
    console.error("Fetch Operators Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch operators" });
  }
});

// POST /api/operators - Create a new Operator
router.post("/", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { name, fullName, email, password, permissions, status } = req.body;
    const { tenantId, uid } = req.user;

    const resolvedName = (name || fullName || "").trim();
    if (!resolvedName || !email || !password) {
      return res.status(400).json({ error: "Full Name, Email, and Password are required" });
    }

    const lowerEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: lowerEmail });
    if (existingUser) {
      return res.status(400).json({ error: "A user with this email address already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const defaultPermissions = Array.isArray(permissions) ? permissions : [
      "overview.view", "policies.view", "policies.create_new_business", "policies.create_renewal", "policies.edit", "renewals.view", "birthdays.view"
    ];

    const newOperator = await User.create({
      name: resolvedName,
      email: lowerEmail,
      password: hashedPassword,
      role: "OPERATOR",
      tenantId: tenantId || "tenant-default",
      createdBy: uid,
      permissions: defaultPermissions,
      status: status || "Active",
      isDemo: false
    });

    const operatorObj = newOperator.toObject ? newOperator.toObject() : newOperator;
    delete operatorObj.password;
    const strId = newOperator._id.toString();
    operatorObj._id = strId;
    operatorObj.id = strId;

    res.json({ success: true, operator: operatorObj });
  } catch (err: any) {
    console.error("Create Operator Error:", err);
    res.status(500).json({ error: err.message || "Failed to create operator" });
  }
});

// PUT /api/operators/:id - Update Operator details, status & permissions
router.put("/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    let rawId = req.params.id;
    if (!rawId || rawId === "undefined" || rawId === "null") {
      rawId = req.body?.userId || req.body?.id || req.body?._id;
    }

    if (!rawId || rawId === "undefined" || rawId === "null" || typeof rawId !== "string" || !rawId.trim()) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const targetId = rawId.trim();

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const { name, fullName, email, password, permissions, status } = req.body;
    const { tenantId, role } = req.user;

    const query: any = { _id: targetId, role: "OPERATOR" };
    if (role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }

    const operator = await User.findOne(query);
    if (!operator) {
      return res.status(404).json({ error: "Operator record not found" });
    }

    const resolvedName = name !== undefined ? name : fullName;
    if (resolvedName !== undefined && typeof resolvedName === "string" && resolvedName.trim().length > 0) {
      operator.name = resolvedName.trim();
    }

    if (email && typeof email === "string" && email.toLowerCase().trim() !== operator.email) {
      const lowerEmail = email.toLowerCase().trim();
      const existing = await User.findOne({ email: lowerEmail, _id: { $ne: targetId } });
      if (existing) {
        return res.status(400).json({ error: "Email is already taken by another account" });
      }
      operator.email = lowerEmail;
    }

    if (password && typeof password === "string" && password.trim().length > 0) {
      operator.password = await bcrypt.hash(password.trim(), 10);
    }

    if (Array.isArray(permissions)) {
      operator.permissions = permissions;
      operator.markModified("permissions");
    }

    if (status && (status === "Active" || status === "Inactive" || status === "Suspended")) {
      operator.status = status;
    }

    await operator.save();
    const operatorObj = operator.toObject ? operator.toObject() : operator;
    delete operatorObj.password;
    const strId = operator._id.toString();
    operatorObj._id = strId;
    operatorObj.id = strId;

    res.json({ success: true, operator: operatorObj });
  } catch (err: any) {
    console.error("Update Operator Error:", err);
    res.status(500).json({ error: err.message || "Failed to update operator" });
  }
});

// DELETE /api/operators/:id - Deactivate Operator (soft delete/status update)
router.delete("/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    let rawId = req.params.id;
    if (!rawId || rawId === "undefined" || rawId === "null") {
      rawId = req.body?.userId || req.body?.id || req.body?._id;
    }

    if (!rawId || rawId === "undefined" || rawId === "null" || typeof rawId !== "string" || !rawId.trim()) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const targetId = rawId.trim();

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const { tenantId, role } = req.user;

    const query: any = { _id: targetId, role: "OPERATOR" };
    if (role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }

    const operator = await User.findOne(query);
    if (!operator) {
      return res.status(404).json({ error: "Operator record not found" });
    }

    operator.status = "Inactive";
    await operator.save();

    res.json({ success: true, message: "Operator deactivated successfully" });
  } catch (err: any) {
    console.error("Deactivate Operator Error:", err);
    res.status(500).json({ error: err.message || "Failed to deactivate operator" });
  }
});

export default router;

