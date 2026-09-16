import express, { Response } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { PolicyModel, ContestModel, InsuranceCompanyModel, AuditLog } from "../models";

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

// ----------------------------------------------------
// 1. GET /api/revenue/summary - Revenue Overview combining Commission & Qualified Contest Revenue
// ----------------------------------------------------
router.get("/summary", authenticateToken, async (req: any, res: Response) => {
  try {
    const tenantId = req.user.role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");
    const {
      datePreset,
      dateFrom,
      dateTo,
      month,
      year,
      insuranceCompanyId,
      companyName,
      businessType,
      policyStatus,
      bmId,
      teamManagerId,
      tmId,
      teamLeaderId,
      callerId,
      commissionStatus,
      contestType,
      contestPaymentStatus,
      sourceType,
      cashback
    } = req.query;

    // 1. Build Policy filter query
    const andConditions: any[] = [];
    const policyQuery: any = {};
    if (req.user.role !== "SUPER_ADMIN") {
      policyQuery.tenantId = tenantId;
    }

    // Date Filtering & Previous Month Preset Logic
    let effectiveDateFrom = dateFrom ? String(dateFrom) : "";
    let effectiveDateTo = dateTo ? String(dateTo) : "";

    const pad = (n: number) => String(n).padStart(2, "0");
    const now = new Date();

    if (datePreset === "last_month" || datePreset === "previous_month") {
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevYear = prevMonthDate.getFullYear();
      const prevMonth = prevMonthDate.getMonth() + 1;
      const lastDayOfPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
      effectiveDateFrom = `${prevYear}-${pad(prevMonth)}-01`;
      effectiveDateTo = `${prevYear}-${pad(prevMonth)}-${pad(lastDayOfPrevMonth)}`;
    } else if (datePreset === "this_month") {
      const curYear = now.getFullYear();
      const curMonth = now.getMonth() + 1;
      const lastDayOfCurMonth = new Date(curYear, curMonth, 0).getDate();
      effectiveDateFrom = `${curYear}-${pad(curMonth)}-01`;
      effectiveDateTo = `${curYear}-${pad(curMonth)}-${pad(lastDayOfCurMonth)}`;
    } else if (month && year) {
      const m = parseInt(String(month), 10);
      const y = parseInt(String(year), 10);
      const lastDay = new Date(y, m, 0).getDate();
      effectiveDateFrom = `${y}-${pad(m)}-01`;
      effectiveDateTo = `${y}-${pad(m)}-${pad(lastDay)}`;
    }

    if (effectiveDateFrom || effectiveDateTo) {
      andConditions.push({
        $or: [
          {
            businessLoginDate: {
              ...(effectiveDateFrom ? { $gte: effectiveDateFrom } : {}),
              ...(effectiveDateTo ? { $lte: effectiveDateTo } : {})
            }
          },
          {
            $and: [
              { $or: [{ businessLoginDate: { $exists: false } }, { businessLoginDate: null }, { businessLoginDate: "" }] },
              {
                startDate: {
                  ...(effectiveDateFrom ? { $gte: effectiveDateFrom } : {}),
                  ...(effectiveDateTo ? { $lte: effectiveDateTo } : {})
                }
              }
            ]
          }
        ]
      });
    }

    if (insuranceCompanyId && insuranceCompanyId !== "All") policyQuery.insuranceCompanyId = String(insuranceCompanyId);
    if (companyName && companyName !== "All") policyQuery.companyName = String(companyName);

    if (businessType && businessType !== "All" && businessType !== "ALL" && businessType !== "All Types") {
      const bt = String(businessType).trim().toUpperCase();
      if (bt === "NEW_BUSINESS" || bt === "NEW BUSINESS" || bt === "COMBINED" || bt === "NEW_BUSINESS_COMBINED" || bt === "NEW BUSINESS (FRESH + PORT)") {
        andConditions.push({
          $and: [
            { businessType: { $not: /^renewal$/i } },
            { businessSubtype: { $not: /^renewal$/i } }
          ]
        });
      } else if (bt === "FRESH" || bt === "NEW_BUSINESS_FRESH" || bt === "NEW BUSINESS (FRESH)") {
        andConditions.push({
          $and: [
            { businessType: { $not: /^renewal$/i } },
            { businessSubtype: { $not: /^renewal$/i } },
            { businessType: { $not: /^port$/i } },
            { businessSubtype: { $not: /^port$/i } },
            {
              $or: [
                { portabilityDetails: { $exists: false } },
                { "portabilityDetails.previousInsuranceCompany": { $exists: false } },
                { "portabilityDetails.previousInsuranceCompany": null },
                { "portabilityDetails.previousInsuranceCompany": "" }
              ]
            }
          ]
        });
      } else if (bt === "PORT" || bt === "NEW_BUSINESS_PORT" || bt === "NEW BUSINESS (PORT)") {
        andConditions.push({
          $and: [
            { businessType: { $not: /^renewal$/i } },
            { businessSubtype: { $not: /^renewal$/i } },
            {
              $or: [
                { businessType: /^port$/i },
                { businessSubtype: /^port$/i },
                {
                  $and: [
                    { "portabilityDetails.previousInsuranceCompany": { $exists: true } },
                    { "portabilityDetails.previousInsuranceCompany": { $ne: null } },
                    { "portabilityDetails.previousInsuranceCompany": { $ne: "" } }
                  ]
                }
              ]
            }
          ]
        });
      } else if (bt === "RENEWAL") {
        andConditions.push({
          $or: [
            { businessType: /^renewal$/i },
            { businessSubtype: /^renewal$/i }
          ]
        });
      } else {
        policyQuery.businessType = new RegExp(`^${businessType}$`, "i");
      }
    }

    if (policyStatus && policyStatus !== "All") policyQuery.policyStatus = new RegExp(`^${policyStatus}$`, "i");
    if (bmId && bmId !== "All") policyQuery.bmId = String(bmId);
    const targetTmId = teamManagerId || tmId;
    if (targetTmId && targetTmId !== "All") policyQuery.teamManagerId = String(targetTmId);
    if (teamLeaderId && teamLeaderId !== "All") policyQuery.teamLeaderId = String(teamLeaderId);
    if (callerId && callerId !== "All") {
      andConditions.push({
        $or: [{ callerId: String(callerId) }, { tseId: String(callerId) }]
      });
    }
    if (commissionStatus && commissionStatus !== "All") policyQuery.commissionStatus = String(commissionStatus);

    if (sourceType && sourceType !== "All") {
      if (sourceType === "sales_team") {
        andConditions.push({
          $or: [{ sourceType: "sales_team" }, { sourceType: { $exists: false } }, { sourceType: null }, { sourceType: "" }]
        });
      } else {
        policyQuery.sourceType = String(sourceType);
      }
    }

    if (cashback && cashback !== "All" && cashback !== "ALL" && cashback !== "All Cashback") {
      const cbUpper = String(cashback).trim().toUpperCase();
      if (cbUpper === "NEW_BUSINESS_CASHBACK" || cbUpper === "NEW BUSINESS CASHBACK" || cbUpper === "NEW_BUSINESS") {
        andConditions.push({
          cashbackEnabled: true,
          cashbackAmount: { $gt: 0 },
          $and: [
            { businessType: { $not: /^renewal$/i } },
            { businessSubtype: { $not: /^renewal$/i } }
          ]
        });
      } else if (cbUpper === "FRESH_CASHBACK" || cbUpper === "FRESH CASHBACK" || cbUpper === "FRESH") {
        andConditions.push({
          cashbackEnabled: true,
          cashbackAmount: { $gt: 0 },
          $and: [
            { businessType: { $not: /^renewal$/i } },
            { businessSubtype: { $not: /^renewal$/i } },
            { businessType: { $not: /^port$/i } },
            { businessSubtype: { $not: /^port$/i } }
          ]
        });
      } else if (cbUpper === "PORT_CASHBACK" || cbUpper === "PORT CASHBACK" || cbUpper === "PORT") {
        andConditions.push({
          cashbackEnabled: true,
          cashbackAmount: { $gt: 0 },
          $or: [{ businessType: /^port$/i }, { businessSubtype: /^port$/i }]
        });
      } else if (cbUpper === "RENEWAL_CASHBACK" || cbUpper === "RENEWAL CASHBACK" || cbUpper === "RENEWAL") {
        andConditions.push({
          cashbackEnabled: true,
          cashbackAmount: { $gt: 0 },
          $or: [{ businessType: /^renewal$/i }, { businessSubtype: /^renewal$/i }]
        });
      } else if (cbUpper === "YES") {
        andConditions.push({
          cashbackEnabled: true,
          cashbackAmount: { $gt: 0 }
        });
      } else if (cbUpper === "NO") {
        andConditions.push({
          $or: [
            { cashbackEnabled: false },
            { cashbackEnabled: { $exists: false } },
            { cashbackAmount: { $lte: 0 } },
            { cashbackAmount: null },
            { cashbackAmount: { $exists: false } }
          ]
        });
      }
    }

    const finalQuery = andConditions.length > 0 ? { ...policyQuery, $and: andConditions } : policyQuery;
    const policies = await PolicyModel.find(finalQuery).sort({ createdAt: -1 }).lean();

    let totalExpectedCommission = 0;
    let paidCommission = 0;
    let unpaidCommission = 0;

    // Detailed Subtype Breakdown Metrics
    let freshRevenue = 0;
    let freshPremium = 0;
    let freshCount = 0;

    let portRevenue = 0;
    let portPremium = 0;
    let portCount = 0;

    let renewalRevenue = 0;
    let renewalPremium = 0;
    let renewalCount = 0;

    // Company-wise aggregate map
    const companyMap = new Map<string, {
      companyId: string;
      companyName: string;
      freshRevenue: number;
      portRevenue: number;
      renewalRevenue: number;
      totalNewBusinessRevenue: number;
      totalRenewalRevenue: number;
      totalRevenue: number;
      freshPremium: number;
      portPremium: number;
      renewalPremium: number;
      totalPremium: number;
      freshCount: number;
      portCount: number;
      renewalCount: number;
      totalCount: number;
    }>();

    policies.forEach((p: any) => {
      const comm = p.expectedCommission || 0;
      const prem = p.premiumAmount || 0;
      const cName = p.companyName || "Other Partner";
      const cId = p.insuranceCompanyId || cName;

      totalExpectedCommission += comm;
      if (p.commissionStatus === "Paid") {
        paidCommission += comm;
      } else {
        unpaidCommission += comm;
      }

      // Identify Business Subtype
      const isRen = (p.businessType && /^renewal$/i.test(p.businessType)) || (p.businessSubtype && /^renewal$/i.test(p.businessSubtype));
      const isPrt = !isRen && ((p.businessType && /^port$/i.test(p.businessType)) || (p.businessSubtype && /^port$/i.test(p.businessSubtype)) || Boolean(p.portabilityDetails?.previousInsuranceCompany));
      const isFrsh = !isRen && !isPrt;

      if (!companyMap.has(cId)) {
        companyMap.set(cId, {
          companyId: cId,
          companyName: cName,
          freshRevenue: 0,
          portRevenue: 0,
          renewalRevenue: 0,
          totalNewBusinessRevenue: 0,
          totalRenewalRevenue: 0,
          totalRevenue: 0,
          freshPremium: 0,
          portPremium: 0,
          renewalPremium: 0,
          totalPremium: 0,
          freshCount: 0,
          portCount: 0,
          renewalCount: 0,
          totalCount: 0
        });
      }
      const cEntry = companyMap.get(cId)!;

      if (isFrsh) {
        freshRevenue += comm;
        freshPremium += prem;
        freshCount += 1;
        cEntry.freshRevenue += comm;
        cEntry.freshPremium += prem;
        cEntry.freshCount += 1;
      } else if (isPrt) {
        portRevenue += comm;
        portPremium += prem;
        portCount += 1;
        cEntry.portRevenue += comm;
        cEntry.portPremium += prem;
        cEntry.portCount += 1;
      } else if (isRen) {
        renewalRevenue += comm;
        renewalPremium += prem;
        renewalCount += 1;
        cEntry.renewalRevenue += comm;
        cEntry.renewalPremium += prem;
        cEntry.renewalCount += 1;
      }

      cEntry.totalNewBusinessRevenue = cEntry.freshRevenue + cEntry.portRevenue;
      cEntry.totalRenewalRevenue = cEntry.renewalRevenue;
      cEntry.totalRevenue = cEntry.totalNewBusinessRevenue + cEntry.totalRenewalRevenue;
      cEntry.totalPremium = cEntry.freshPremium + cEntry.portPremium + cEntry.renewalPremium;
      cEntry.totalCount = cEntry.freshCount + cEntry.portCount + cEntry.renewalCount;
    });

    const totalNewBusinessRevenue = freshRevenue + portRevenue;
    const totalRenewalRevenue = renewalRevenue;
    const totalRevenue = totalNewBusinessRevenue + totalRenewalRevenue;

    const totalNewBusinessPremium = freshPremium + portPremium;
    const totalRenewalPremium = renewalPremium;
    const totalPremium = totalNewBusinessPremium + totalRenewalPremium;

    // 2. Fetch Contests and Calculate Qualification Status
    const contestQuery: any = {};
    if (req.user.role !== "SUPER_ADMIN") {
      contestQuery.tenantId = tenantId;
    }
    if (insuranceCompanyId && insuranceCompanyId !== "All") contestQuery.insuranceCompanyId = String(insuranceCompanyId);
    if (contestType && contestType !== "All") contestQuery.type = String(contestType);
    if (contestPaymentStatus && contestPaymentStatus !== "All") contestQuery.paymentStatus = String(contestPaymentStatus);

    const contests = await ContestModel.find(contestQuery).sort({ createdAt: -1 }).lean();

    const enrichedContests = await Promise.all(
      contests.map(async (contest) => {
        const eligibleQuery: any = {
          insuranceCompanyId: contest.insuranceCompanyId,
          businessType: "NEW BUSINESS",
          startDate: { $gte: contest.startDate, $lte: contest.endDate }
        };
        if (req.user.role !== "SUPER_ADMIN") {
          eligibleQuery.tenantId = tenantId;
        }

        const eligiblePolicies = await PolicyModel.find(eligibleQuery).select("premiumAmount").lean();

        const actualBusiness = eligiblePolicies.reduce((sum, p) => sum + (p.premiumAmount || 0), 0);
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

    let totalQualifiedContestRewards = 0;
    let paidQualifiedContestRewards = 0;
    let unpaidQualifiedContestRewards = 0;

    enrichedContests.forEach((c) => {
      if (c.qualificationStatus === "QUALIFIED") {
        const rwd = c.rewardAmount || 0;
        totalQualifiedContestRewards += rwd;
        if (c.paymentStatus === "Paid") {
          paidQualifiedContestRewards += rwd;
        } else {
          unpaidQualifiedContestRewards += rwd;
        }
      }
    });

    const totalEarnedRevenue = totalExpectedCommission + totalQualifiedContestRewards;
    const receivedRevenue = paidCommission + paidQualifiedContestRewards;
    const pendingRevenue = unpaidCommission + unpaidQualifiedContestRewards;

    res.json({
      summary: {
        totalEarnedRevenue,
        receivedRevenue,
        pendingRevenue,
        pendingCommission: unpaidCommission,
        pendingContestReward: unpaidQualifiedContestRewards,
        totalExpectedCommission,
        paidCommission,
        unpaidCommission,
        totalQualifiedContestRewards,
        paidQualifiedContestRewards,
        unpaidQualifiedContestRewards,
        policyCount: policies.length,
        contestCount: contests.length,
        qualifiedContestCount: enrichedContests.filter((c) => c.qualificationStatus === "QUALIFIED").length,

        // Specific Fresh, Port, Renewal Revenue & Premium Breakdown
        freshRevenue,
        freshPremium,
        freshCount,
        portRevenue,
        portPremium,
        portCount,
        renewalRevenue,
        renewalPremium,
        renewalCount,
        totalNewBusinessRevenue,
        totalNewBusinessPremium,
        totalNewBusinessCount: freshCount + portCount,
        totalRenewalRevenue,
        totalRenewalPremium,
        totalRevenue,
        totalPremium
      },
      commissionPolicies: policies,
      contestItems: enrichedContests,
      companyBreakdown: Array.from(companyMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)
    });
  } catch (err: any) {
    console.error("Revenue Summary Error:", err);
    res.status(500).json({ error: err.message || "Failed to load revenue summary" });
  }
});

// ----------------------------------------------------
// 2. POST /api/revenue/historical - Add Controlled Historical Revenue Record
// ----------------------------------------------------
router.post("/historical", authenticateToken, async (req: any, res: Response) => {
  try {
    const { role, uid, name: userName } = req.user;
    const tenantId = role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");

    const {
      policyId,
      policyNumber,
      customerName,
      customerPhone,
      insuranceCompanyId,
      companyName,
      businessType = "NEW_BUSINESS",
      businessSubtype = "FRESH",
      premiumAmount,
      appliedPayoutPercentage,
      revenueAmount,
      revenueDate,
      commissionStatus = "Paid",
      advisorId,
      advisorName,
      notes
    } = req.body;

    const prem = Number(premiumAmount || 0);
    const rev = Number(revenueAmount || 0);

    if (prem <= 0 && rev <= 0) {
      return res.status(400).json({ error: "Please enter a valid Premium or Revenue / Commission Amount" });
    }

    if (!insuranceCompanyId && !companyName) {
      return res.status(400).json({ error: "Insurance Company is required" });
    }

    let finalCompanyName = companyName;
    if (!finalCompanyName && insuranceCompanyId) {
      const comp = await InsuranceCompanyModel.findOne({ id: insuranceCompanyId }).lean();
      if (comp) finalCompanyName = comp.name;
    }

    const effectiveDate = revenueDate || new Date().toISOString().split("T")[0];
    const nowIso = new Date().toISOString();

    // If an existing policy ID is provided, update that policy's revenue fields without creating duplicates
    if (policyId) {
      const existing = await PolicyModel.findOne({
        id: policyId,
        ...(role !== "SUPER_ADMIN" ? { tenantId } : {})
      });

      if (existing) {
        existing.appliedPayoutPercentage = appliedPayoutPercentage !== undefined ? Number(appliedPayoutPercentage) : existing.appliedPayoutPercentage;
        existing.expectedCommission = rev > 0 ? rev : existing.expectedCommission;
        existing.commissionStatus = commissionStatus || existing.commissionStatus;
        if (commissionStatus === "Paid" && !existing.commissionPaidAt) {
          existing.commissionPaidAt = nowIso;
          existing.commissionMarkedPaidBy = userName || "Admin";
        }
        existing.isHistorical = true;
        existing.historicalRemarks = notes || "Historical revenue updated";
        existing.updatedBy = uid;
        existing.updatedByName = userName;
        existing.updatedAt = nowIso;
        await existing.save();

        await AuditLog.create({
          tenantId,
          userId: uid,
          userName: userName || "Admin",
          action: "UPDATE_HISTORICAL_REVENUE",
          module: "REVENUE_MANAGEMENT",
          details: `Updated historical revenue for policy ${existing.policyNumber || existing.id}: Revenue ₹${rev}`
        }).catch(() => {});

        return res.json({ success: true, policy: existing });
      }
    }

    // Otherwise, create a new historical revenue policy record
    const uniquePolicyId = `hist_pol_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const autoPolicyNumber = policyNumber?.trim() || `HIST-${Date.now().toString().slice(-6)}`;

    const newHistoricalPolicy = new PolicyModel({
      id: uniquePolicyId,
      policyNumber: autoPolicyNumber,
      tenantId,
      userId: uid,
      userName: userName || "Admin",
      insuranceCompanyId: insuranceCompanyId || "other_company",
      companyName: finalCompanyName || "Insurance Partner",
      policyType: "General / Health Insurance",
      premiumAmount: prem,
      sumAssured: prem * 10,
      appliedPayoutPercentage: Number(appliedPayoutPercentage || 0),
      expectedCommission: rev,
      commissionStatus: commissionStatus === "Paid" ? "Paid" : "Unpaid",
      commissionPaidAt: commissionStatus === "Paid" ? nowIso : undefined,
      commissionMarkedPaidBy: commissionStatus === "Paid" ? (userName || "Admin") : undefined,
      premiumFrequency: "Yearly",
      startDate: effectiveDate,
      businessLoginDate: effectiveDate,
      businessType: businessType === "RENEWAL" ? "RENEWAL" : "NEW_BUSINESS",
      businessSubtype: businessSubtype,
      premiumStatus: "Paid",
      policyStatus: "Issued",
      customerName: customerName?.trim() || `Historical Customer (${autoPolicyNumber})`,
      customerPhone: customerPhone?.trim() || "0000000000",
      advisorId: advisorId || undefined,
      advisorName: advisorName || undefined,
      isHistorical: true,
      historicalRemarks: notes || "Manual historical revenue entry",
      createdBy: uid,
      createdByName: userName || "Admin",
      createdAt: `${effectiveDate}T12:00:00.000Z`,
      updatedAt: nowIso
    });

    await newHistoricalPolicy.save();

    // Audit Log
    await AuditLog.create({
      tenantId,
      userId: uid,
      userName: userName || "Admin",
      action: "CREATE_HISTORICAL_REVENUE",
      module: "REVENUE_MANAGEMENT",
      details: `Added historical revenue: ₹${rev} (Premium: ₹${prem}) for ${newHistoricalPolicy.companyName} on ${effectiveDate}`
    }).catch(() => {});

    res.status(201).json({ success: true, policy: newHistoricalPolicy });
  } catch (err: any) {
    console.error("Add Historical Revenue Error:", err);
    res.status(500).json({ error: err.message || "Failed to save historical revenue" });
  }
});

// ----------------------------------------------------
// 3. PUT /api/revenue/policy-commission/:id - Edit Commission Percentage
// ----------------------------------------------------
router.put("/policy-commission/:id", authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { appliedPayoutPercentage, commissionStatus } = req.body;
    const { role, uid, name: userName } = req.user;
    const tenantId = role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");

    const conditions: any[] = [{ id: id }];
    if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
      conditions.push({ _id: id });
    }
    const query: any = conditions.length === 1 ? { ...conditions[0] } : { $or: conditions };
    if (role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }

    const policy = await PolicyModel.findOne(query);
    if (!policy) {
      return res.status(404).json({ error: "Policy not found" });
    }

    if (appliedPayoutPercentage !== undefined) {
      const percentage = Number(appliedPayoutPercentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        return res.status(400).json({ error: "Applied Payout Percentage must be between 0 and 100" });
      }
      policy.appliedPayoutPercentage = percentage;
      policy.expectedCommission = Math.round((policy.premiumAmount * percentage) / 100);
    }

    if (commissionStatus && ["Paid", "Unpaid"].includes(commissionStatus)) {
      policy.commissionStatus = commissionStatus;
      if (commissionStatus === "Paid") {
        policy.commissionPaidAt = new Date().toISOString();
        policy.commissionMarkedPaidBy = userName || "Admin";
      } else {
        policy.commissionPaidAt = undefined;
        policy.commissionMarkedPaidBy = undefined;
      }
    }

    policy.updatedBy = uid;
    policy.updatedByName = userName || "Admin";
    policy.updatedAt = new Date().toISOString();

    await policy.save();

    res.json({ success: true, policy });
  } catch (err: any) {
    console.error("Update Policy Commission Error:", err);
    res.status(500).json({ error: err.message || "Failed to update commission" });
  }
});

export default router;
