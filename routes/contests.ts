import express, { Response } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import ContestModel from "../models/Contest";
import InsuranceCompanyModel from "../models/InsuranceCompany";
import PolicyModel from "../models/Policy";
import { AuditLog } from "../models/AuditLog";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "policy_master_jwt_secret_key_2026_mongodb";

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

function generateId(): string {
  return 'cnt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
}

// GET /api/contests - Fetch all contests for tenant with calculated business achievement & qualification status
router.get("/", authenticateToken, async (req: any, res: Response) => {
  try {
    const tenantId = req.user.role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");
    const query: any = {};
    if (req.user.role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }

    const contests = await ContestModel.find(query).sort({ createdAt: -1 }).lean();

    const enrichedContests = await Promise.all(
      contests.map(async (contest) => {
        const policyQuery: any = {
          insuranceCompanyId: contest.insuranceCompanyId,
          businessType: "NEW BUSINESS",
          startDate: { $gte: contest.startDate, $lte: contest.endDate }
        };
        if (req.user.role !== "SUPER_ADMIN") {
          policyQuery.tenantId = tenantId;
        }

        const policies = await PolicyModel.find(policyQuery).select("premiumAmount").lean();
        const actualBusiness = policies.reduce((sum, p) => sum + (p.premiumAmount || 0), 0);
        const achievementPercentage = contest.targetAmount > 0 ? (actualBusiness / contest.targetAmount) * 100 : 0;
        const qualificationStatus = actualBusiness >= contest.targetAmount ? "QUALIFIED" : "NOT QUALIFIED";

        return {
          ...contest,
          actualBusiness,
          achievementPercentage: Math.round(achievementPercentage * 100) / 100,
          qualificationStatus
        };
      })
    );

    res.json(enrichedContests);
  } catch (error) {
    console.error("Error fetching contests:", error);
    res.status(500).json({ error: "Failed to fetch contests" });
  }
});

// POST /api/contests - Admin creates new contest
router.post("/", authenticateToken, async (req: any, res: Response) => {
  try {
    const tenantId = req.user.role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");
    const { name, insuranceCompanyId, companyName, type, startDate, endDate, targetAmount, rewardAmount, status } = req.body;

    if (!name || !insuranceCompanyId || !type || !startDate || !endDate || targetAmount === undefined || rewardAmount === undefined) {
      return res.status(400).json({ error: "Missing required contest fields" });
    }

    let finalCompanyName = companyName;
    if (!finalCompanyName) {
      const comp = await InsuranceCompanyModel.findOne({ id: insuranceCompanyId }).lean();
      finalCompanyName = comp ? comp.name : "Unknown Company";
    }

    const contest = new ContestModel({
      id: generateId(),
      tenantId,
      name,
      insuranceCompanyId,
      companyName: finalCompanyName,
      type,
      startDate,
      endDate,
      targetAmount: Number(targetAmount),
      rewardAmount: Number(rewardAmount),
      status: status || "Active",
      paymentStatus: "Unpaid",
      createdBy: req.user?.id || req.user?.uid,
      createdByName: req.user?.name || req.user?.email
    });

    await contest.save();

    // Audit Log
    try {
      await new AuditLog({
        id: 'audit_' + Date.now().toString(36),
        tenantId,
        userId: req.user?.id || req.user?.uid,
        userName: req.user?.name || req.user?.email,
        userRole: req.user?.role,
        action: "CREATE",
        entityType: "CONTEST",
        entityId: contest.id,
        metadata: { name: contest.name, targetAmount: contest.targetAmount }
      }).save();
    } catch (e) {}

    res.status(201).json(contest);
  } catch (error) {
    console.error("Error creating contest:", error);
    res.status(500).json({ error: "Failed to create contest" });
  }
});

// PUT /api/contests/:id - Admin updates contest details
router.put("/:id", authenticateToken, async (req: any, res: Response) => {
  try {
    const tenantId = req.user.role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");
    const { id } = req.params;
    const updates = req.body;

    const query: any = { id };
    if (req.user.role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }

    const contest = await ContestModel.findOne(query);
    if (!contest) {
      return res.status(404).json({ error: "Contest not found" });
    }

    if (updates.name !== undefined) contest.name = updates.name;
    if (updates.insuranceCompanyId !== undefined) contest.insuranceCompanyId = updates.insuranceCompanyId;
    if (updates.companyName !== undefined) contest.companyName = updates.companyName;
    if (updates.type !== undefined) contest.type = updates.type;
    if (updates.startDate !== undefined) contest.startDate = updates.startDate;
    if (updates.endDate !== undefined) contest.endDate = updates.endDate;
    if (updates.targetAmount !== undefined) contest.targetAmount = Number(updates.targetAmount);
    if (updates.rewardAmount !== undefined) contest.rewardAmount = Number(updates.rewardAmount);
    if (updates.status !== undefined) contest.status = updates.status;

    contest.updatedBy = req.user?.id || req.user?.uid;
    contest.updatedByName = req.user?.name || req.user?.email;
    contest.updatedAt = new Date().toISOString();

    await contest.save();
    res.json(contest);
  } catch (error) {
    console.error("Error updating contest:", error);
    res.status(500).json({ error: "Failed to update contest" });
  }
});

// PUT /api/contests/:id/payment-status - Admin marks contest reward payment status (Paid / Unpaid)
router.put("/:id/payment-status", authenticateToken, async (req: any, res: Response) => {
  try {
    const tenantId = req.user.role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");
    const { id } = req.params;
    const { paymentStatus } = req.body;

    if (!["Paid", "Unpaid"].includes(paymentStatus)) {
      return res.status(400).json({ error: "Invalid paymentStatus. Must be 'Paid' or 'Unpaid'" });
    }

    const query: any = { id };
    if (req.user.role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }

    const contest = await ContestModel.findOne(query);
    if (!contest) {
      return res.status(404).json({ error: "Contest not found" });
    }

    contest.paymentStatus = paymentStatus;
    if (paymentStatus === "Paid") {
      contest.paidAt = new Date().toISOString();
      contest.markedPaidBy = req.user?.name || req.user?.email || req.user?.id;
    } else {
      contest.paidAt = undefined;
      contest.markedPaidBy = undefined;
    }

    contest.updatedBy = req.user?.id || req.user?.uid;
    contest.updatedByName = req.user?.name || req.user?.email;
    contest.updatedAt = new Date().toISOString();

    await contest.save();

    // Audit Log
    try {
      await new AuditLog({
        id: 'audit_' + Date.now().toString(36),
        tenantId,
        userId: req.user?.id || req.user?.uid,
        userName: req.user?.name || req.user?.email,
        userRole: req.user?.role,
        action: "UPDATE",
        entityType: "CONTEST",
        entityId: contest.id,
        metadata: { paymentStatus }
      }).save();
    } catch (e) {}

    res.json(contest);
  } catch (error) {
    console.error("Error updating contest payment status:", error);
    res.status(500).json({ error: "Failed to update contest payment status" });
  }
});

// DELETE /api/contests/:id - Admin deletes contest from MongoDB Atlas
router.delete("/:id", authenticateToken, async (req: any, res: Response) => {
  try {
    const tenantId = req.user.role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");
    const { id } = req.params;
    const isObjId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
    const query: any = isObjId ? { $or: [{ id }, { _id: id }] } : { id };
    if (req.user.role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }

    const deleted = await ContestModel.deleteOne(query);
    if (deleted.deletedCount === 0) {
      return res.status(404).json({ error: "Contest not found" });
    }

    res.json({ success: true, message: "Contest deleted successfully from MongoDB Atlas" });
  } catch (error: any) {
    console.error("Error deleting contest:", error);
    res.status(500).json({ error: error.message || "Failed to delete contest" });
  }
});

export default router;
