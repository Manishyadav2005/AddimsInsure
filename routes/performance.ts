import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import {
  PerformanceTargetModel,
  PolicyModel,
  InsuranceCompanyModel,
  BranchManager,
  TeamManager,
  TeamLeader,
  Caller,
  RenewalManager,
  RenewalExecutive,
  User
} from "../models";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "policy_master_jwt_secret_key_2026_mongodb";

function getUserFromToken(req: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

// Safe achievement helper
function calcAch(actual: number, target: number): number {
  if (target > 0) {
    return Math.round((actual / target) * 100);
  }
  return actual > 0 ? 100 : 0;
}

// --------------------------------------------------------------------------
// 1. GET /api/performance/targets - List assigned targets
// --------------------------------------------------------------------------
router.get("/targets", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const tenantId = user?.tenantId || "tenant-default";

    const { month, year, employeeId, teamId } = req.query;

    const query: any = { tenantId };
    if (month) query.month = parseInt(month as string, 10);
    if (year) query.year = parseInt(year as string, 10);
    if (employeeId) query.employeeId = employeeId;
    if (teamId) query.teamId = teamId;

    const targets = await PerformanceTargetModel.find(query).sort({ updatedAt: -1 }).lean();
    res.json(targets);
  } catch (err: any) {
    console.error("Fetch Performance Targets Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch targets" });
  }
});

// --------------------------------------------------------------------------
// 2. POST /api/performance/targets - Create or Upsert Monthly Target
// --------------------------------------------------------------------------
router.post("/targets", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const tenantId = user?.tenantId || "tenant-default";

    const {
      id: passedId,
      targetId: passedTargetId,
      employeeId,
      employeeName,
      role,
      bmId,
      bmName,
      teamManagerId,
      teamManagerName,
      teamLeaderId,
      teamLeaderName,
      teamId,
      teamName,
      month,
      year,
      assignedPremiumTarget,
      freshPolicyTarget,
      freshPremiumTarget,
      portPolicyTarget,
      portPremiumTarget,
      renewalPolicyTarget,
      renewalPremiumTarget,
      totalPremiumTarget,
      totalSumAssuredTarget,
      companyTargets,
      notes
    } = req.body;

    if (!employeeId || !employeeName) {
      return res.status(400).json({ error: "Employee is required" });
    }
    const targetMonthNum = parseInt(month, 10);
    const targetYearNum = parseInt(year, 10);

    if (!targetMonthNum || targetMonthNum < 1 || targetMonthNum > 12) {
      return res.status(400).json({ error: "Valid Target Month is required (1-12)" });
    }
    if (!targetYearNum || targetYearNum < 2020 || targetYearNum > 2050) {
      return res.status(400).json({ error: "Valid Target Year is required" });
    }

    const assignedPrem = Math.max(
      0,
      Number(
        assignedPremiumTarget !== undefined
          ? assignedPremiumTarget
          : totalPremiumTarget !== undefined
          ? totalPremiumTarget
          : freshPremiumTarget !== undefined
          ? freshPremiumTarget
          : 0
      ) || 0
    );

    const fPolTgt = Math.max(0, Number(freshPolicyTarget) || 0);
    const pPolTgt = Math.max(0, Number(portPolicyTarget) || 0);
    const rPolTgt = Math.max(0, Number(renewalPolicyTarget) || 0);

    const computedTotalPolicyTarget = fPolTgt + pPolTgt + rPolTgt;

    const id = `tgt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const nowIso = new Date().toISOString();
    const targetMonthStr = `${targetYearNum}-${String(targetMonthNum).padStart(2, '0')}`;

    const targetPayload: any = {
      tenantId,
      employeeId,
      employeeName: employeeName.trim(),
      role: role || "TSE",
      bmId: bmId || "",
      bmName: bmName || "",
      teamManagerId: teamManagerId || "",
      teamManagerName: teamManagerName || "",
      teamLeaderId: teamLeaderId || "",
      teamLeaderName: teamLeaderName || "",
      teamId: teamId || teamLeaderId || teamManagerId || bmId || "",
      teamName: teamName || teamLeaderName || teamManagerName || bmName || "Default Team",
      month: targetMonthNum,
      year: targetYearNum,
      targetMonth: targetMonthStr,

      freshPolicyTarget: fPolTgt,
      freshPremiumTarget: assignedPrem,
      portPolicyTarget: pPolTgt,
      portPremiumTarget: 0,

      renewalPolicyTarget: rPolTgt,
      renewalPremiumTarget: 0,

      totalPolicyTarget: computedTotalPolicyTarget,
      totalPremiumTarget: assignedPrem,
      totalSumAssuredTarget: Number(totalSumAssuredTarget) || 0,
      companyTargets: Array.isArray(companyTargets) ? companyTargets : [],
      notes: notes || "",
      updatedAt: nowIso,
      updatedBy: user?.uid,
      updatedByName: user?.name || user?.email
    };

    const editingId = passedId || passedTargetId;
    if (editingId) {
      // Edit mode: check if another target already exists for this employee for target month & year
      const isObjId = mongoose.Types.ObjectId.isValid(editingId) && editingId.length === 24;
      const querySelf: any = isObjId ? { $or: [{ id: editingId }, { _id: editingId }] } : { id: editingId };
      const currentTarget = await PerformanceTargetModel.findOne({ ...querySelf, tenantId });

      if (!currentTarget) {
        return res.status(404).json({ error: "Target record not found to update" });
      }

      const conflict = await PerformanceTargetModel.findOne({
        tenantId,
        employeeId: targetPayload.employeeId,
        month: targetPayload.month,
        year: targetPayload.year,
        $and: [{ id: { $ne: currentTarget.id } }, { _id: { $ne: currentTarget._id } }]
      });

      if (conflict) {
        const mName = MONTH_NAMES[targetPayload.month - 1] || `Month ${targetPayload.month}`;
        return res.status(400).json({
          error: `Target already exists for ${targetPayload.employeeName} for ${mName} ${targetPayload.year}.`
        });
      }

      Object.assign(currentTarget, targetPayload);
      const saved = await currentTarget.save();
      return res.json({ success: true, message: "Target updated successfully", target: saved });
    }

    // Create mode: Check for duplicate target for the same employee + target month
    const existing = await PerformanceTargetModel.findOne({
      tenantId,
      employeeId: targetPayload.employeeId,
      month: targetPayload.month,
      year: targetPayload.year
    });

    if (existing) {
      const mName = MONTH_NAMES[targetPayload.month - 1] || `Month ${targetPayload.month}`;
      return res.status(400).json({
        error: `Target already exists for ${targetPayload.employeeName} for ${mName} ${targetPayload.year}.`
      });
    }

    targetPayload.id = id;
    targetPayload.createdAt = nowIso;
    targetPayload.createdBy = user?.uid;
    targetPayload.createdByName = user?.name || user?.email;
    const savedTarget = await PerformanceTargetModel.create(targetPayload);

    res.status(201).json({ success: true, message: "Target saved successfully", target: savedTarget });
  } catch (err: any) {
    console.error("Save Performance Target Error:", err);
    res.status(500).json({ error: err.message || "Failed to save target" });
  }
});

// --------------------------------------------------------------------------
// 3. PUT /api/performance/targets/:id - Update Target
// --------------------------------------------------------------------------
router.put("/targets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = getUserFromToken(req);
    const tenantId = user?.tenantId || "tenant-default";

    const isObjId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
    const query: any = isObjId ? { $or: [{ id }, { _id: id }] } : { id };
    if (user?.role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }

    const existingTarget = await PerformanceTargetModel.findOne(query);
    if (!existingTarget) {
      return res.status(404).json({ error: "Target record not found" });
    }

    const updateData = { ...req.body, updatedAt: new Date().toISOString() };
    if (user) {
      updateData.updatedBy = user.uid;
      updateData.updatedByName = user.name || user.email;
    }

    const targetMonthNum = updateData.month ? parseInt(updateData.month, 10) : existingTarget.month;
    const targetYearNum = updateData.year ? parseInt(updateData.year, 10) : existingTarget.year;
    const targetEmpId = updateData.employeeId || existingTarget.employeeId;
    const targetEmpName = updateData.employeeName || existingTarget.employeeName;

    // Check duplicate conflict on other records
    const conflict = await PerformanceTargetModel.findOne({
      tenantId,
      employeeId: targetEmpId,
      month: targetMonthNum,
      year: targetYearNum,
      $and: [{ id: { $ne: existingTarget.id } }, { _id: { $ne: existingTarget._id } }]
    });

    if (conflict) {
      const mName = MONTH_NAMES[targetMonthNum - 1] || `Month ${targetMonthNum}`;
      return res.status(400).json({
        error: `Target already exists for ${targetEmpName} for ${mName} ${targetYearNum}.`
      });
    }

    updateData.month = targetMonthNum;
    updateData.year = targetYearNum;
    updateData.targetMonth = `${targetYearNum}-${String(targetMonthNum).padStart(2, '0')}`;

    if (updateData.assignedPremiumTarget !== undefined) {
      updateData.totalPremiumTarget = Math.max(0, Number(updateData.assignedPremiumTarget) || 0);
      updateData.freshPremiumTarget = updateData.totalPremiumTarget;
    }

    Object.assign(existingTarget, updateData);
    const updated = await existingTarget.save();

    res.json({ success: true, message: "Target updated successfully", target: updated });
  } catch (err: any) {
    console.error("Update Target Error:", err);
    res.status(500).json({ error: err.message || "Failed to update target" });
  }
});

// --------------------------------------------------------------------------
// 4. DELETE /api/performance/targets/:id - Delete Target
// --------------------------------------------------------------------------
router.delete("/targets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = getUserFromToken(req);
    const tenantId = user?.tenantId || "tenant-default";

    const isObjId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
    const query: any = isObjId ? { $or: [{ id }, { _id: id }] } : { id };
    if (user?.role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }

    const deleted = await PerformanceTargetModel.deleteOne(query);
    if (deleted.deletedCount === 0) {
      return res.status(404).json({ error: "Target record not found" });
    }

    res.json({ success: true, message: "Target deleted successfully" });
  } catch (err: any) {
    console.error("Delete Target Error:", err);
    res.status(500).json({ error: err.message || "Failed to delete target" });
  }
});

// Helper for Financial Year YTD months (April start)
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getYtdMonthsList(selectedMonth: number, selectedYear: number) {
  const list: { month: number; year: number; monthName: string }[] = [];
  if (selectedMonth >= 4) {
    for (let m = 4; m <= selectedMonth; m++) {
      list.push({ month: m, year: selectedYear, monthName: MONTH_NAMES[m - 1] });
    }
  } else {
    for (let m = 4; m <= 12; m++) {
      list.push({ month: m, year: selectedYear - 1, monthName: MONTH_NAMES[m - 1] });
    }
    for (let m = 1; m <= selectedMonth; m++) {
      list.push({ month: m, year: selectedYear, monthName: MONTH_NAMES[m - 1] });
    }
  }
  return list;
}

// --------------------------------------------------------------------------
// 5. GET /api/performance/dashboard - Dynamic Target vs Actual Aggregation
// --------------------------------------------------------------------------
router.get("/dashboard", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const tenantId = user?.tenantId || "tenant-default";

    const selMonth = parseInt((req.query.month as string) || (new Date().getMonth() + 1).toString(), 10);
    const selYear = parseInt((req.query.year as string) || new Date().getFullYear().toString(), 10);
    const filterTeam = (req.query.teamId as string) || "";
    const filterRole = (req.query.role as string) || "";
    const filterEmp = (req.query.employeeId as string) || "";

    const ytdMonths = getYtdMonthsList(selMonth, selYear);

    const tenantQuery = (user && user.role !== "SUPER_ADMIN" && user.tenantId) 
      ? { $or: [{ tenantId: user.tenantId }, { tenantId: { $exists: false } }, { tenantId: null }, { tenantId: "" }] }
      : {};

    // Fetch target records for all YTD months
    const ytdTargetQuery: any = {
      $and: [
        tenantQuery,
        { $or: ytdMonths.map(item => ({ month: item.month, year: item.year })) }
      ]
    };

    const [bms, tms, tls, callers, rms, rexs, activeCompanies, targetRecords, allPolicies] = await Promise.all([
      (BranchManager as any).find(tenantQuery).lean(),
      (TeamManager as any).find(tenantQuery).lean(),
      (TeamLeader as any).find(tenantQuery).lean(),
      (Caller as any).find(tenantQuery).lean(),
      (RenewalManager as any).find(tenantQuery).lean(),
      (RenewalExecutive as any).find(tenantQuery).lean(),
      InsuranceCompanyModel.find(tenantQuery).sort({ name: 1 }).lean(),
      PerformanceTargetModel.find(ytdTargetQuery).sort({ updatedAt: -1 }).lean(),
      PolicyModel.find(tenantQuery).lean()
    ]);

    const employeeMap = new Map<string, any>();

    callers.forEach((c: any) => {
      employeeMap.set(c.id, {
        id: c.id,
        name: c.name,
        role: "TSE",
        employeeCode: c.employeeCode || "",
        teamLeaderId: c.teamLeaderId,
        teamManagerId: c.teamManagerId,
        bmId: c.bmId,
        teamName: c.teamLeaderName || c.teamManagerName || "Team Sales",
        reportingManagerName: c.teamLeaderName || c.teamManagerName || c.bmName || "",
        status: c.status || "Active",
        createdAt: c.createdAt || ""
      });
    });

    tls.forEach((t: any) => {
      if (!employeeMap.has(t.id)) {
        employeeMap.set(t.id, {
          id: t.id,
          name: t.name,
          role: "Team Leader",
          employeeCode: t.employeeCode || "",
          teamLeaderId: t.id,
          teamManagerId: t.teamManagerId,
          bmId: t.bmId,
          teamName: t.name || "Team Leader",
          reportingManagerName: t.teamManagerName || t.bmName || "",
          status: t.status || "Active",
          createdAt: t.createdAt || ""
        });
      }
    });

   tms.forEach((tm: any) => {
      if (!employeeMap.has(tm.id)) {
        employeeMap.set(tm.id, {
          id: tm.id,
          name: tm.name,
          role: "Team Manager",
          employeeCode: tm.employeeCode || "",
          teamManagerId: tm.id,
          bmId: tm.bmId,
          teamName: tm.name || "Team Manager",
          reportingManagerName: tm.bmName || "",
          status: tm.status || "Active",
          createdAt: tm.createdAt || ""
        });
      }
    });

    bms.forEach((bm: any) => {
      if (!employeeMap.has(bm.id)) {
        employeeMap.set(bm.id, {
          id: bm.id,
          name: bm.name,
          role: "Branch Manager",
          employeeCode: bm.employeeCode || "",
          bmId: bm.id,
          teamName: bm.name || "Branch Manager",
          reportingManagerName: "",
          status: bm.status || "Active",
          createdAt: bm.createdAt || ""
        });
      }
    });

    rexs.forEach((rex: any) => {
      if (!employeeMap.has(rex.id)) {
        employeeMap.set(rex.id, {
          id: rex.id,
          name: rex.name,
          role: "Renewal Executive",
          employeeCode: rex.employeeCode || "",
          renewalManagerId: rex.renewalManagerId,
          teamName: rex.renewalManagerName || "Renewal Team",
          reportingManagerName: rex.renewalManagerName || "",
          status: rex.status || "Active",
          createdAt: rex.createdAt || ""
        });
      }
    });

    rms.forEach((rm: any) => {
      if (!employeeMap.has(rm.id)) {
        employeeMap.set(rm.id, {
          id: rm.id,
          name: rm.name,
          role: "Renewal Manager",
          employeeCode: rm.employeeCode || "",
          renewalManagerId: rm.id,
          teamName: rm.name || "Renewal Manager",
          reportingManagerName: "",
          status: rm.status || "Active",
          createdAt: rm.createdAt || ""
        });
      }
    });

    targetRecords.forEach((tr: any) => {
      if (!employeeMap.has(tr.employeeId)) {
        employeeMap.set(tr.employeeId, {
          id: tr.employeeId,
          name: tr.employeeName,
          role: tr.role || "TSE",
          teamName: tr.teamName || tr.teamLeaderName || "Team Sales",
          status: "Active",
          createdAt: tr.createdAt || ""
        });
      }
    });

    const employees = Array.from(employeeMap.values());

    // Helper to extract policy year and month
    function getPolicyMonthYear(p: any): { pMonth: number; pYear: number } | null {
      const dStr = p.businessLoginDate || p.startDate || p.createdAt || "";
      if (!dStr) return null;

      const yyyyMmMatch = String(dStr).match(/^(\d{4})-(\d{1,2})/);
      if (yyyyMmMatch) {
        return { pYear: parseInt(yyyyMmMatch[1], 10), pMonth: parseInt(yyyyMmMatch[2], 10) };
      }
      const pDate = new Date(dStr);
      if (!isNaN(pDate.getTime())) {
        return { pYear: pDate.getFullYear(), pMonth: pDate.getMonth() + 1 };
      }
      return null;
    }

    // Resolve organizational hierarchy for all Callers / TSEs
    const resolvedCallers = callers.map((c: any) => {
      const tl = tls.find((t: any) => t.id === c.teamLeaderId);
      const tmId = c.teamManagerId || tl?.teamManagerId || "";
      const tm = tms.find((m: any) => m.id === tmId);
      const bmId = c.bmId || tm?.bmId || tl?.bmId || "";
      return {
        ...c,
        teamLeaderId: c.teamLeaderId || "",
        teamManagerId: tmId,
        bmId: bmId
      };
    });

    // Active policies (excluding Cancelled)
    const activePolicies = allPolicies.filter((p: any) => p.policyStatus !== "Cancelled");

    // Helper to identify management roles
    const isMgmtRole = (role: string) => ["Team Leader", "Team Manager", "Branch Manager"].includes(role);

    // Pass 1: Calculate Individual Contributor (TSE / Caller) Performances
    const nonMgmtEmployees = employees.filter((emp: any) => !isMgmtRole(emp.role));
    const mgmtEmployees = employees.filter((emp: any) => isMgmtRole(emp.role));

    const tsePerformances: any[] = [];

    nonMgmtEmployees.forEach((emp: any) => {
      const empNameLower = (emp.name || "").toLowerCase().trim();

      const empPolicies = activePolicies.filter((p: any) => {
        return (
          p.callerId === emp.id ||
          p.tseId === emp.id ||
          p.renewalExecutiveId === emp.id ||
          p.renewalManagerId === emp.id ||
          p.userId === emp.id ||
          p.assignedTo === emp.id ||
          (p.callerName && p.callerName.toLowerCase().trim() === empNameLower) ||
          (p.tseName && p.tseName.toLowerCase().trim() === empNameLower) ||
          (p.assignedToName && p.assignedToName.toLowerCase().trim() === empNameLower) ||
          (p.createdByName && p.createdByName.toLowerCase().trim() === empNameLower)
        );
      });

      const empTargetsById = targetRecords.filter((tr: any) => tr.employeeId === emp.id);
      const empTargetsByName = targetRecords.filter((tr: any) => tr.employeeName && tr.employeeName.toLowerCase().trim() === empNameLower);
      const empTargets = empTargetsById.length > 0 ? empTargetsById : empTargetsByName;
      const selectedMonthTargetRecord = empTargets.find((tr: any) => tr.month === selMonth && tr.year === selYear);
      const mtdAssignedTarget = selectedMonthTargetRecord ? (Number(selectedMonthTargetRecord.totalPremiumTarget) || Number(selectedMonthTargetRecord.freshPremiumTarget) || 0) : 0;

      const mtdPolicies = empPolicies.filter((p: any) => {
        const my = getPolicyMonthYear(p);
        return my && my.pMonth === selMonth && my.pYear === selYear;
      });

      const mtdAchievement = mtdPolicies.reduce((sum: number, p: any) => sum + (Number(p.premiumAmount) || 0), 0);
      const mtdAchievementPercentage = mtdAssignedTarget > 0 ? Math.round((mtdAchievement / mtdAssignedTarget) * 100 * 100) / 100 : 0;
      const mtdRemainingTarget = Math.max(0, mtdAssignedTarget - mtdAchievement);

      let ytdAssignedTarget = 0;
      const monthlyBreakdown = ytdMonths.map(ym => {
        const tr = empTargets.find((t: any) => t.month === ym.month && t.year === ym.year);
        const monthTarget = tr ? (Number(tr.totalPremiumTarget) || Number(tr.freshPremiumTarget) || 0) : 0;
        ytdAssignedTarget += monthTarget;

        const mPolicies = empPolicies.filter((p: any) => {
          const my = getPolicyMonthYear(p);
          return my && my.pMonth === ym.month && my.pYear === ym.year;
        });
        const monthAch = mPolicies.reduce((sum: number, p: any) => sum + (Number(p.premiumAmount) || 0), 0);
        const monthPct = monthTarget > 0 ? Math.round((monthAch / monthTarget) * 100 * 100) / 100 : 0;
        const monthRem = Math.max(0, monthTarget - monthAch);

        return {
          month: ym.month,
          year: ym.year,
          monthName: ym.monthName,
          assignedTarget: monthTarget,
          achievement: monthAch,
          achievementPercentage: monthPct,
          remainingTarget: monthRem
        };
      });

      const ytdPolicies = empPolicies.filter((p: any) => {
        const my = getPolicyMonthYear(p);
        return my && ytdMonths.some(ym => ym.month === my.pMonth && ym.year === my.pYear);
      });

      const ytdAchievement = ytdPolicies.reduce((sum: number, p: any) => sum + (Number(p.premiumAmount) || 0), 0);
      const ytdAchievementPercentage = ytdAssignedTarget > 0 ? Math.round((ytdAchievement / ytdAssignedTarget) * 100 * 100) / 100 : 0;
      const ytdRemainingTarget = Math.max(0, ytdAssignedTarget - ytdAchievement);

      // Additive stats for Excel export only (does NOT affect achievement/target calculations above,
      // which correctly continue to use activePolicies excluding Cancelled)
      const empPoliciesAllStatus = allPolicies.filter((p: any) => {
        return (
          p.callerId === emp.id ||
          p.tseId === emp.id ||
          p.renewalExecutiveId === emp.id ||
          p.renewalManagerId === emp.id ||
          p.userId === emp.id ||
          p.assignedTo === emp.id ||
          (p.callerName && p.callerName.toLowerCase().trim() === empNameLower) ||
          (p.tseName && p.tseName.toLowerCase().trim() === empNameLower) ||
          (p.assignedToName && p.assignedToName.toLowerCase().trim() === empNameLower) ||
          (p.createdByName && p.createdByName.toLowerCase().trim() === empNameLower)
        );
      });
      const empMtdPoliciesAllStatus = empPoliciesAllStatus.filter((p: any) => {
        const my = getPolicyMonthYear(p);
        return my && my.pMonth === selMonth && my.pYear === selYear;
      });
      const policyStats = {
        total: empMtdPoliciesAllStatus.length,
        issued: empMtdPoliciesAllStatus.filter((p: any) => (p.policyStatus || "Issued") === "Issued").length,
        pending: empMtdPoliciesAllStatus.filter((p: any) => p.policyStatus === "Pending").length,
        cancelled: empMtdPoliciesAllStatus.filter((p: any) => p.policyStatus === "Cancelled").length
      };

      const companyMapMTD = new Map<string, { policies: number; premium: number }>();
      mtdPolicies.forEach((p: any) => {
        const cName = p.companyName || "Other";
        const cur = companyMapMTD.get(cName) || { policies: 0, premium: 0 };
        cur.policies += 1;
        cur.premium += Number(p.premiumAmount) || 0;
        companyMapMTD.set(cName, cur);
      });

      const companyBreakdown = Array.from(companyMapMTD.entries()).map(([companyName, data]) => ({
        companyName,
        actualPolicies: data.policies,
        actualPremium: data.premium
      }));

      const companyMapYTD = new Map<string, { policies: number; premium: number }>();
      ytdPolicies.forEach((p: any) => {
        const cName = p.companyName || "Other";
        const cur = companyMapYTD.get(cName) || { policies: 0, premium: 0 };
        cur.policies += 1;
        cur.premium += Number(p.premiumAmount) || 0;
        companyMapYTD.set(cName, cur);
      });

      const ytdCompanyBreakdown = Array.from(companyMapYTD.entries()).map(([companyName, data]) => ({
        companyName,
        actualPolicies: data.policies,
        actualPremium: data.premium
      }));

      const productMapMTD = new Map<string, { policies: number; premium: number }>();
      mtdPolicies.forEach((p: any) => {
        const prName = p.productName || p.policyType || "General Product";
        const cur = productMapMTD.get(prName) || { policies: 0, premium: 0 };
        cur.policies += 1;
        cur.premium += Number(p.premiumAmount) || 0;
        productMapMTD.set(prName, cur);
      });

      const productBreakdown = Array.from(productMapMTD.entries()).map(([productName, data]) => ({
        productName,
        policies: data.policies,
        premium: data.premium
      }));

      const productMapYTD = new Map<string, { policies: number; premium: number }>();
      ytdPolicies.forEach((p: any) => {
        const prName = p.productName || p.policyType || "General Product";
        const cur = productMapYTD.get(prName) || { policies: 0, premium: 0 };
        cur.policies += 1;
        cur.premium += Number(p.premiumAmount) || 0;
        productMapYTD.set(prName, cur);
      });

      const ytdProductBreakdown = Array.from(productMapYTD.entries()).map(([productName, data]) => ({
        productName,
        policies: data.policies,
        premium: data.premium
      }));

      const policyDetails = mtdPolicies.map((p: any) => ({
        id: p.id || p._id,
        customerName: p.customerName || "N/A",
        policyNumber: p.policyNumber || "N/A",
        companyName: p.companyName || "N/A",
        productName: p.productName || p.policyType || "N/A",
        businessType: p.businessType || p.businessSubtype || "NEW BUSINESS",
        premiumAmount: Number(p.premiumAmount) || 0,
        policyStatus: p.policyStatus || "Issued",
        businessLoginDate: p.businessLoginDate || p.startDate || (p.createdAt ? String(p.createdAt).split("T")[0] : "N/A"),
        sourcePersonName: p.tseName || p.callerName || p.sourcePersonName || emp.name
      }));

      let status: "Excellent" | "On Track" | "Needs Attention" | "Critical" | "Target Not Assigned" = "Critical";
      if (mtdAssignedTarget === 0) {
        status = "Target Not Assigned";
      } else if (mtdAchievementPercentage >= 90) {
        status = "Excellent";
      } else if (mtdAchievementPercentage >= 75) {
        status = "On Track";
      } else if (mtdAchievementPercentage >= 50) {
        status = "Needs Attention";
      } else {
        status = "Critical";
      }

      tsePerformances.push({
        targetId: selectedMonthTargetRecord?.id || null,
        employeeId: emp.id,
        employeeName: emp.name,
        month: selectedMonthTargetRecord?.month || selMonth,
        year: selectedMonthTargetRecord?.year || selYear,
        targetMonth: selectedMonthTargetRecord?.targetMonth || `${selYear}-${String(selMonth).padStart(2, '0')}`,
        role: emp.role || "TSE",
        employeeCode: emp.employeeCode || "",
        reportingManagerName: emp.reportingManagerName || "",
        policyStats,
        teamName: emp.teamName || "Team Sales",
        doj: emp.createdAt ? (typeof emp.createdAt === "string" ? emp.createdAt.split("T")[0] : new Date(emp.createdAt).toISOString().split("T")[0]) : "",
        hasTargetAssigned: Boolean(selectedMonthTargetRecord),

        mtd: {
          assignedTarget: mtdAssignedTarget,
          achievement: mtdAchievement,
          achievementPercentage: mtdAchievementPercentage,
          remainingTarget: mtdRemainingTarget,
          actualPolicies: mtdPolicies.length
        },
        ytd: {
          assignedTarget: ytdAssignedTarget,
          achievement: ytdAchievement,
          achievementPercentage: ytdAchievementPercentage,
          remainingTarget: ytdRemainingTarget,
          actualPolicies: ytdPolicies.length
        },
        monthlyBreakdown,
        companyBreakdown,
        productBreakdown,
        ytdCompanyBreakdown,
        ytdProductBreakdown,
        policyDetails,

        freshPolicyTarget: 0,
        freshPremiumTarget: mtdAssignedTarget,
        actualFreshPolicies: mtdPolicies.length,
        actualFreshPremium: mtdAchievement,
        freshAchievement: mtdAchievementPercentage,
        freshPremiumAchievement: mtdAchievementPercentage,

        portPolicyTarget: 0,
        portPremiumTarget: 0,
        actualPortPolicies: 0,
        actualPortPremium: 0,
        portAchievement: 0,
        portPremiumAchievement: 0,

        newBusinessPolicyTarget: 0,
        newBusinessPremiumTarget: mtdAssignedTarget,
        actualNewBusinessPolicies: mtdPolicies.length,
        actualNewBusinessPremium: mtdAchievement,
        newBusinessAchievement: mtdAchievementPercentage,
        newBusinessPremiumAchievement: mtdAchievementPercentage,

        renewalPolicyTarget: 0,
        renewalPremiumTarget: 0,
        actualRenewalPolicies: 0,
        actualRenewalPremium: 0,
        renewalAchievement: 0,
        renewalPremiumAchievement: 0,

        policyTarget: 0,
        actualPolicies: mtdPolicies.length,
        policyAchievement: mtdAchievementPercentage,
        remainingPolicies: 0,

        premiumTarget: mtdAssignedTarget,
        actualPremium: mtdAchievement,
        premiumAchievement: mtdAchievementPercentage,
        remainingPremium: mtdRemainingTarget,

        sumAssuredTarget: 0,
        actualSumAssured: mtdPolicies.reduce((s: number, p: any) => s + (Number(p.sumAssured) || 0), 0),

        status,
        notes: selectedMonthTargetRecord?.notes || ""
      });
    });

    // Pass 2: Calculate Hierarchical Targets & Achievements for Management Roles (TL, TM, BM)
    const mgmtPerformances: any[] = mgmtEmployees.map((emp: any) => {
      const empNameLower = (emp.name || "").toLowerCase().trim();

      // Determine reporting TSEs based on organizational hierarchy
      let underlyingTseIds = new Set<string>();
      if (emp.role === "Team Leader") {
        resolvedCallers.filter((c: any) => c.teamLeaderId === emp.id).forEach((c: any) => underlyingTseIds.add(c.id));
      } else if (emp.role === "Team Manager") {
        resolvedCallers.filter((c: any) => c.teamManagerId === emp.id).forEach((c: any) => underlyingTseIds.add(c.id));
      } else if (emp.role === "Branch Manager") {
        resolvedCallers.filter((c: any) => c.bmId === emp.id).forEach((c: any) => underlyingTseIds.add(c.id));
      }

      const underlyingTsePerfs = tsePerformances.filter((p: any) => underlyingTseIds.has(p.employeeId));

      // Hierarchical Target: Sum of targets of underlying TSEs
      const mtdAssignedTarget = underlyingTsePerfs.reduce((sum: number, p: any) => sum + (p.mtd?.assignedTarget || 0), 0);
      const ytdAssignedTarget = underlyingTsePerfs.reduce((sum: number, p: any) => sum + (p.ytd?.assignedTarget || 0), 0);

      // Direct policies assigned specifically to the management user
      const directPolicies = activePolicies.filter((p: any) => {
        return (
          p.callerId === emp.id ||
          p.tseId === emp.id ||
          (emp.role === "Team Leader" && p.teamLeaderId === emp.id && !underlyingTseIds.has(p.callerId || p.tseId)) ||
          (emp.role === "Team Manager" && p.teamManagerId === emp.id && !underlyingTseIds.has(p.callerId || p.tseId)) ||
          (emp.role === "Branch Manager" && p.bmId === emp.id && !underlyingTseIds.has(p.callerId || p.tseId))
        );
      });

      const directMtdPolicies = directPolicies.filter((p: any) => {
        const my = getPolicyMonthYear(p);
        return my && my.pMonth === selMonth && my.pYear === selYear;
      });
      const directMtdAch = directMtdPolicies.reduce((s: number, p: any) => s + (Number(p.premiumAmount) || 0), 0);

      const directYtdPolicies = directPolicies.filter((p: any) => {
        const my = getPolicyMonthYear(p);
        return my && ytdMonths.some(ym => ym.month === my.pMonth && ym.year === my.pYear);
      });
      const directYtdAch = directYtdPolicies.reduce((s: number, p: any) => s + (Number(p.premiumAmount) || 0), 0);

      // Additive policy status stats for Excel export only
      const directAllPolicies = allPolicies.filter((p: any) => {
        return (
          p.callerId === emp.id ||
          p.tseId === emp.id ||
          (emp.role === "Team Leader" && p.teamLeaderId === emp.id && !underlyingTseIds.has(p.callerId || p.tseId)) ||
          (emp.role === "Team Manager" && p.teamManagerId === emp.id && !underlyingTseIds.has(p.callerId || p.tseId)) ||
          (emp.role === "Branch Manager" && p.bmId === emp.id && !underlyingTseIds.has(p.callerId || p.tseId))
        );
      });
      const directAllMtdPolicies = directAllPolicies.filter((p: any) => {
        const my = getPolicyMonthYear(p);
        return my && my.pMonth === selMonth && my.pYear === selYear;
      });
      const sumUnderlyingStats = underlyingTsePerfs.reduce(
        (acc: any, p: any) => {
          const s = p.policyStats || { total: 0, issued: 0, pending: 0, cancelled: 0 };
          acc.total += s.total; acc.issued += s.issued; acc.pending += s.pending; acc.cancelled += s.cancelled;
          return acc;
        },
        { total: 0, issued: 0, pending: 0, cancelled: 0 }
      );
      const policyStats = {
        total: sumUnderlyingStats.total + directAllMtdPolicies.length,
        issued: sumUnderlyingStats.issued + directAllMtdPolicies.filter((p: any) => (p.policyStatus || "Issued") === "Issued").length,
        pending: sumUnderlyingStats.pending + directAllMtdPolicies.filter((p: any) => p.policyStatus === "Pending").length,
        cancelled: sumUnderlyingStats.cancelled + directAllMtdPolicies.filter((p: any) => p.policyStatus === "Cancelled").length
      };

      // Hierarchical Achievement: Sum of achievements of underlying TSEs + direct management sales
      const mtdAchievement = underlyingTsePerfs.reduce((sum: number, p: any) => sum + (p.mtd?.achievement || 0), 0) + directMtdAch;
      const ytdAchievement = underlyingTsePerfs.reduce((sum: number, p: any) => sum + (p.ytd?.achievement || 0), 0) + directYtdAch;

      const mtdAchievementPercentage = mtdAssignedTarget > 0 ? Math.round((mtdAchievement / mtdAssignedTarget) * 100 * 100) / 100 : (mtdAchievement > 0 ? 100 : 0);
      const mtdRemainingTarget = Math.max(0, mtdAssignedTarget - mtdAchievement);

      const ytdAchievementPercentage = ytdAssignedTarget > 0 ? Math.round((ytdAchievement / ytdAssignedTarget) * 100 * 100) / 100 : (ytdAchievement > 0 ? 100 : 0);
      const ytdRemainingTarget = Math.max(0, ytdAssignedTarget - ytdAchievement);

      const mtdActualPolicies = underlyingTsePerfs.reduce((s, p) => s + (p.actualPolicies || p.mtd?.actualPolicies || 0), 0) + directMtdPolicies.length;
      const ytdActualPolicies = underlyingTsePerfs.reduce((s, p) => s + (p.ytd?.actualPolicies || p.actualPolicies || 0), 0) + directYtdPolicies.length;

      let status: "Excellent" | "On Track" | "Needs Attention" | "Critical" | "Target Not Assigned" = "Critical";
      if (mtdAssignedTarget === 0) {
        status = "Target Not Assigned";
      } else if (mtdAchievementPercentage >= 90) {
        status = "Excellent";
      } else if (mtdAchievementPercentage >= 75) {
        status = "On Track";
      } else if (mtdAchievementPercentage >= 50) {
        status = "Needs Attention";
      } else {
        status = "Critical";
      }

      return {
        targetId: null,
        employeeId: emp.id,
        employeeName: emp.name,
        role: emp.role,
        employeeCode: emp.employeeCode || "",
        reportingManagerName: emp.reportingManagerName || "",
        policyStats,
        teamName: emp.teamName || emp.name || "Management",
        doj: emp.createdAt ? (typeof emp.createdAt === "string" ? emp.createdAt.split("T")[0] : new Date(emp.createdAt).toISOString().split("T")[0]) : "",
        hasTargetAssigned: mtdAssignedTarget > 0,

        mtd: {
          assignedTarget: mtdAssignedTarget,
          achievement: mtdAchievement,
          achievementPercentage: mtdAchievementPercentage,
          remainingTarget: mtdRemainingTarget,
          actualPolicies: mtdActualPolicies
        },
        ytd: {
          assignedTarget: ytdAssignedTarget,
          achievement: ytdAchievement,
          achievementPercentage: ytdAchievementPercentage,
          remainingTarget: ytdRemainingTarget,
          actualPolicies: ytdActualPolicies
        },
        monthlyBreakdown: ytdMonths.map(ym => ({
          month: ym.month,
          year: ym.year,
          monthName: ym.monthName,
          assignedTarget: underlyingTsePerfs.reduce((s, p) => {
            const mb = p.monthlyBreakdown?.find((m: any) => m.month === ym.month && m.year === ym.year);
            return s + (mb?.assignedTarget || 0);
          }, 0),
          achievement: underlyingTsePerfs.reduce((s, p) => {
            const mb = p.monthlyBreakdown?.find((m: any) => m.month === ym.month && m.year === ym.year);
            return s + (mb?.achievement || 0);
          }, 0),
          achievementPercentage: 0,
          remainingTarget: 0
        })),
        companyBreakdown: [],
        productBreakdown: [],
        ytdCompanyBreakdown: [],
        ytdProductBreakdown: [],
        policyDetails: [],

        freshPolicyTarget: 0,
        freshPremiumTarget: mtdAssignedTarget,
        actualFreshPolicies: mtdActualPolicies,
        actualFreshPremium: mtdAchievement,
        freshAchievement: mtdAchievementPercentage,
        freshPremiumAchievement: mtdAchievementPercentage,

        portPolicyTarget: 0,
        portPremiumTarget: 0,
        actualPortPolicies: 0,
        actualPortPremium: 0,
        portAchievement: 0,
        portPremiumAchievement: 0,

        newBusinessPolicyTarget: 0,
        newBusinessPremiumTarget: mtdAssignedTarget,
        actualNewBusinessPolicies: mtdActualPolicies,
        actualNewBusinessPremium: mtdAchievement,
        newBusinessAchievement: mtdAchievementPercentage,
        newBusinessPremiumAchievement: mtdAchievementPercentage,

        renewalPolicyTarget: 0,
        renewalPremiumTarget: 0,
        actualRenewalPolicies: 0,
        actualRenewalPremium: 0,
        renewalAchievement: 0,
        renewalPremiumAchievement: 0,

        policyTarget: 0,
        actualPolicies: mtdActualPolicies,
        ytdActualPolicies: ytdActualPolicies,
        policyAchievement: mtdAchievementPercentage,
        remainingPolicies: 0,

        premiumTarget: mtdAssignedTarget,
        actualPremium: mtdAchievement,
        premiumAchievement: mtdAchievementPercentage,
        remainingPremium: mtdRemainingTarget,

        sumAssuredTarget: 0,
        actualSumAssured: 0,

        status,
        notes: "Hierarchically calculated target from underlying TSEs"
      };
    });

    let employeePerformances: any[] = [...tsePerformances, ...mgmtPerformances];

    if (filterRole && filterRole !== "All") {
      employeePerformances = employeePerformances.filter(e => e.role === filterRole);
    }
    if (filterTeam && filterTeam !== "All") {
      employeePerformances = employeePerformances.filter(e => e.teamName === filterTeam || e.employeeId === filterTeam);
    }
    if (filterEmp && filterEmp !== "All") {
      employeePerformances = employeePerformances.filter(e => e.employeeId === filterEmp);
    }

    employeePerformances.sort((a, b) => b.mtd.achievementPercentage - a.mtd.achievementPercentage);

    employeePerformances = employeePerformances.map((emp, index) => ({
      sNo: index + 1,
      ...emp
    }));

    // Explicit Management Performances payload for Team Performance Distribution widget
    const managementPerformances = mgmtPerformances.map((m: any) => {
      let tseCount = 0;
      if (m.role === "Team Leader") {
        tseCount = resolvedCallers.filter((c: any) => c.teamLeaderId === m.employeeId).length;
      } else if (m.role === "Team Manager") {
        tseCount = resolvedCallers.filter((c: any) => c.teamManagerId === m.employeeId).length;
      } else if (m.role === "Branch Manager") {
        tseCount = resolvedCallers.filter((c: any) => c.bmId === m.employeeId).length;
      }
      return {
        id: m.employeeId,
        name: m.employeeName,
        role: m.role,
        tseCount,
        actualPolicies: m.actualPolicies || 0,
        policyStats: m.policyStats,
        mtd: m.mtd,
        ytd: m.ytd
      };
    });

    // 3. Aggregate Team Performance


    const teamGroups = new Map<string, any>();

    employeePerformances.forEach((emp: any) => {
      const tName = emp.teamName || "Unassigned Team";
      if (!teamGroups.has(tName)) {
        teamGroups.set(tName, {
          teamName: tName,
          memberCount: 0,
          mtdAssignedTarget: 0,
          mtdAchievement: 0,
          ytdAssignedTarget: 0,
          ytdAchievement: 0,
          companyMap: new Map<string, { policies: number; premium: number }>(),
          productMap: new Map<string, { policies: number; premium: number }>(),
          members: []
        });
      }

      const team = teamGroups.get(tName);
      team.memberCount++;
      team.mtdAssignedTarget += emp.mtd.assignedTarget;
      team.mtdAchievement += emp.mtd.achievement;
      team.ytdAssignedTarget += emp.ytd.assignedTarget;
      team.ytdAchievement += emp.ytd.achievement;
      team.members.push(emp);

      emp.companyBreakdown.forEach((cb: any) => {
        const cur = team.companyMap.get(cb.companyName) || { policies: 0, premium: 0 };
        cur.policies += cb.actualPolicies;
        cur.premium += cb.actualPremium;
        team.companyMap.set(cb.companyName, cur);
      });

      emp.productBreakdown.forEach((pb: any) => {
        const cur = team.productMap.get(pb.productName) || { policies: 0, premium: 0 };
        cur.policies += pb.policies;
        cur.premium += pb.premium;
        team.productMap.set(pb.productName, cur);
      });
    });

    const teamPerformanceList = Array.from(teamGroups.values()).map(t => {
      const mtdPct = t.mtdAssignedTarget > 0 ? Math.round((t.mtdAchievement / t.mtdAssignedTarget) * 100 * 100) / 100 : 0;
      const ytdPct = t.ytdAssignedTarget > 0 ? Math.round((t.ytdAchievement / t.ytdAssignedTarget) * 100 * 100) / 100 : 0;

      const companyTotals = Array.from(t.companyMap.entries()).map(([companyName, data]: any) => ({
        companyName,
        actualPolicies: data.policies,
        actualPremium: data.premium
      }));

      const productTotals = Array.from(t.productMap.entries()).map(([productName, data]: any) => ({
        productName,
        actualPolicies: data.policies,
        actualPremium: data.premium
      }));

      return {
        teamName: t.teamName,
        memberCount: t.memberCount,
        mtd: {
          assignedTarget: t.mtdAssignedTarget,
          achievement: t.mtdAchievement,
          achievementPercentage: mtdPct,
          remainingTarget: Math.max(0, t.mtdAssignedTarget - t.mtdAchievement)
        },
        ytd: {
          assignedTarget: t.ytdAssignedTarget,
          achievement: t.ytdAchievement,
          achievementPercentage: ytdPct,
          remainingTarget: Math.max(0, t.ytdAssignedTarget - t.ytdAchievement)
        },
        companyTotals,
        productTotals,
        members: t.members,

        // Backward compatibility fields
        freshTarget: 0,
        freshPremiumTarget: t.mtdAssignedTarget,
        actualFresh: t.members.reduce((s: number, m: any) => s + m.actualPolicies, 0),
        actualFreshPremium: t.mtdAchievement,
        freshAchievement: mtdPct,
        freshPremiumAchievement: mtdPct,

        portTarget: 0,
        portPremiumTarget: 0,
        actualPort: 0,
        actualPortPremium: 0,
        portAchievement: 0,
        portPremiumAchievement: 0,

        newBusinessPolicyTarget: 0,
        newBusinessPremiumTarget: t.mtdAssignedTarget,
        actualNewBusinessPolicies: t.members.reduce((s: number, m: any) => s + m.actualPolicies, 0),
        actualNewBusinessPremium: t.mtdAchievement,
        newBusinessAchievement: mtdPct,
        newBusinessPremiumAchievement: mtdPct,

        renewalPolicyTarget: 0,
        renewalPremiumTarget: 0,
        actualRenewalPolicies: 0,
        actualRenewalPremium: 0,
        renewalAchievement: 0,
        renewalPremiumAchievement: 0,

        policyTarget: 0,
        actualPolicies: t.members.reduce((s: number, m: any) => s + m.actualPolicies, 0),
        policyAchievement: mtdPct,

        premiumTarget: t.mtdAssignedTarget,
        actualPremium: t.mtdAchievement,
        premiumAchievement: mtdPct
      };
    });

    // Overall Company Production List
    const companyProductionMap = new Map<string, { policies: number; premium: number }>();
    employeePerformances.forEach((emp: any) => {
      emp.companyBreakdown.forEach((cb: any) => {
        const cur = companyProductionMap.get(cb.companyName) || { policies: 0, premium: 0 };
        cur.policies += cb.actualPolicies;
        cur.premium += cb.actualPremium;
        companyProductionMap.set(cb.companyName, cur);
      });
    });

    const companyProductionList = Array.from(companyProductionMap.entries()).map(([companyName, data]) => ({
      companyName,
      targetPolicies: 0,
      actualPolicies: data.policies,
      policyAchievement: 100,
      targetPremium: 0,
      actualPremium: data.premium,
      actualNewBusinessPremium: data.premium,
      actualRenewalPremium: 0,
      premiumAchievement: 100
    }));

    const companyList = companyProductionList.map(c => c.companyName);

    // MTD Summary Totals (using TSE performances to avoid double-counting management targets)
    const totalMtdAssignedTarget = tsePerformances.reduce((s, e) => s + e.mtd.assignedTarget, 0);
    const totalMtdAchievement = tsePerformances.reduce((s, e) => s + e.mtd.achievement, 0);
    const overallMtdPercentage = totalMtdAssignedTarget > 0 ? Math.round((totalMtdAchievement / totalMtdAssignedTarget) * 100 * 100) / 100 : 0;
    const totalMtdRemaining = Math.max(0, totalMtdAssignedTarget - totalMtdAchievement);

    // YTD Summary Totals
    const totalYtdAssignedTarget = tsePerformances.reduce((s, e) => s + e.ytd.assignedTarget, 0);
    const totalYtdAchievement = tsePerformances.reduce((s, e) => s + e.ytd.achievement, 0);
    const overallYtdPercentage = totalYtdAssignedTarget > 0 ? Math.round((totalYtdAchievement / totalYtdAssignedTarget) * 100 * 100) / 100 : 0;
    const totalYtdRemaining = Math.max(0, totalYtdAssignedTarget - totalYtdAchievement);

    const topPerformers = [...employeePerformances]
      .filter(e => (e.mtd?.achievement ?? 0) > 0)
      .sort((a, b) => (b.mtd?.achievementPercentage ?? 0) - (a.mtd?.achievementPercentage ?? 0))
      .slice(0, 5);
    const needsAttention = employeePerformances.filter(e => e.hasTargetAssigned && e.mtd.achievementPercentage < 50);

    res.json({
      month: selMonth,
      year: selYear,
      mtdSummary: {
        assignedTarget: totalMtdAssignedTarget,
        achievement: totalMtdAchievement,
        achievementPercentage: overallMtdPercentage,
        remainingTarget: totalMtdRemaining
      },
      ytdSummary: {
        assignedTarget: totalYtdAssignedTarget,
        achievement: totalYtdAchievement,
        achievementPercentage: overallYtdPercentage,
        remainingTarget: totalYtdRemaining
      },
      summary: {
        totalPolicyTarget: 0,
        totalActualPolicies: tsePerformances.reduce((s, e) => s + e.actualPolicies, 0),
        overallPolicyAchievement: overallMtdPercentage,
        totalPremiumTarget: totalMtdAssignedTarget,
        totalActualPremium: totalMtdAchievement,
        overallPremiumAchievement: overallMtdPercentage,

        totalFreshTarget: 0,
        totalFreshPremiumTarget: totalMtdAssignedTarget,
        totalActualFresh: tsePerformances.reduce((s, e) => s + e.actualPolicies, 0),
        totalActualFreshPremium: totalMtdAchievement,
        overallFreshAchievement: overallMtdPercentage,
        overallFreshPremiumAchievement: overallMtdPercentage,

        totalPortTarget: 0,
        totalPortPremiumTarget: 0,
        totalActualPort: 0,
        totalActualPortPremium: 0,
        overallPortAchievement: 0,
        overallPortPremiumAchievement: 0,

        totalNewBusinessPolicyTarget: 0,
        totalNewBusinessPremiumTarget: totalMtdAssignedTarget,
        totalActualNewBusinessPolicies: tsePerformances.reduce((s, e) => s + e.actualPolicies, 0),
        totalActualNewBusinessPremium: totalMtdAchievement,
        overallNewBusinessAchievement: overallMtdPercentage,
        overallNewBusinessPremiumAchievement: overallMtdPercentage,

        totalRenewalTarget: 0,
        totalRenewalPremiumTarget: 0,
        totalActualRenewal: 0,
        totalActualRenewalPremium: 0,
        overallRenewalAchievement: 0,
        overallRenewalPremiumAchievement: 0,

        remainingPremium: totalMtdRemaining,
        remainingPolicies: 0,
        employeeCount: employeePerformances.length
      },
      employeePerformances,
      managementPerformances,
      teamPerformanceList,
      companyProductionList,
      companyList,
      topPerformers,
      needsAttention
    });


  } catch (err: any) {
    console.error("Performance Dashboard Error:", err);
    res.status(500).json({ error: err.message || "Failed to calculate performance dashboard" });
  }
});

export default router;

