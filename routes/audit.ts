import { Router } from "express";
import jwt from "jsonwebtoken";
import { AuditLog } from "../models";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "policy_master_jwt_secret_key_2026_mongodb";

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Token missing" });

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = decoded;
    next();
  });
};

// GET /api/audit - List audit activity logs
router.get("/", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, tenantId, uid, permissions } = req.user;

    if (role === "CALLER") {
      return res.status(403).json({ error: "Forbidden: Callers cannot access system audit logs." });
    }

    let query: any = {};
    if (role === "SUPER_ADMIN") {
      query = {};
    } else if (role === "ADMIN" || role === "TENANT_ADMIN") {
      query = { tenantId };
    } else if (role === "TEAM_LEADER") {
      query = { tenantId, userId: uid };
    }

    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err: any) {
    console.error("Get Audit Logs Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch audit logs" });
  }
});

export default router;
