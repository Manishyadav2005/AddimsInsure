import { Router } from "express";
import jwt from "jsonwebtoken";
import { Lead, Customer, PolicyModel, User, CallLog, TeamLeader, Caller } from "../models";

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

// GET /api/reports/summary - Legacy lead-based analytics (backward compatible)
router.get("/summary", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, tenantId, uid, permissions } = req.user;

    if (role === "OPERATOR") {
      if (permissions && !permissions.includes("reports.view")) {
        return res.status(403).json({ error: "Forbidden: Permission required to view reports." });
      }
    }

    let scopeQuery: any = {};
    if (role === "SUPER_ADMIN") {
      scopeQuery = {};
    } else if (role === "ADMIN" || role === "TENANT_ADMIN") {
      scopeQuery = { tenantId };
    } else if (role === "OPERATOR") {
      scopeQuery = { tenantId };
    }

    const totalLeads = await Lead.countDocuments(scopeQuery);
    const newLeads = await Lead.countDocuments({ ...scopeQuery, callStatus: "New" });
    const interestedLeads = await Lead.countDocuments({ ...scopeQuery, callStatus: "Interested" });
    const convertedLeads = await Lead.countDocuments({ ...scopeQuery, callStatus: "Converted" });
    const totalCustomers = await Customer.countDocuments(scopeQuery);
    const totalPolicies = await PolicyModel.countDocuments(scopeQuery);
    const totalCalls = await CallLog.countDocuments(scopeQuery);

    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0.0";

    res.json({
      totalLeads,
      newLeads,
      interestedLeads,
      convertedLeads,
      totalCustomers,
      totalPolicies,
      totalCalls,
      conversionRate: `${conversionRate}%`
    });
  } catch (err: any) {
    console.error("Reports Summary Error:", err);
    res.status(500).json({ error: err.message || "Failed to load report summary" });
  }
});

// GET /api/reports/callers - Legacy caller performance (backward compatible)
router.get("/callers", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, tenantId, uid } = req.user;

    let userQuery: any = { role: { $in: ["CALLER", "AGENT"] } };
    if (role === "ADMIN" || role === "TENANT_ADMIN") {
      userQuery.tenantId = tenantId;
    } else if (role === "TEAM_LEADER") {
      userQuery.tenantId = tenantId;
      userQuery.teamLeaderId = uid;
    } else if (role === "CALLER" || role === "AGENT") {
      userQuery._id = uid;
    }

    const callers = await User.find(userQuery).select("_id name email role status").sort({ name: 1 });

    const reportData = await Promise.all(
      callers.map(async (c) => {
        const callerId = c._id.toString();
        const assignedLeads = await Lead.countDocuments({ assignedTo: callerId });
        const callsMade = await CallLog.countDocuments({ assignedTo: callerId });
        const interested = await Lead.countDocuments({ assignedTo: callerId, callStatus: "Interested" });
        const followUps = await Lead.countDocuments({ assignedTo: callerId, callStatus: "Follow-up" });
        const converted = await Lead.countDocuments({ assignedTo: callerId, callStatus: "Converted" });

        const conversionRate = assignedLeads > 0 ? ((converted / assignedLeads) * 100).toFixed(1) : "0.0";

        return {
          id: callerId,
          name: c.name || c.email,
          email: c.email,
          status: c.status || "Active",
          assignedLeads,
          callsMade,
          interested,
          followUps,
          converted,
          conversionRate: `${conversionRate}%`
        };
      })
    );

    res.json(reportData);
  } catch (err: any) {
    console.error("Caller Reports Error:", err);
    res.status(500).json({ error: err.message || "Failed to load caller performance report" });
  }
});

// GET /api/reports/business - Real database-driven business analytics
router.get("/business", authenticateToken, async (req: any, res: any) => {
  try {
    const { role, tenantId, permissions } = req.user;

    // Permission gating for Operators
    if (role === "OPERATOR") {
      if (!permissions || !permissions.includes("reports.view")) {
        return res.status(403).json({ error: "Forbidden: reports.view permission required." });
      }
    }

    // Build base scope query for tenant isolation
    let scopeQuery: any = {};
    if (role === "ADMIN" || role === "TENANT_ADMIN" || role === "OPERATOR") {
      scopeQuery.tenantId = tenantId;
    }

    // Parse optional filter params
    const { dateFrom, dateTo, businessType, policyStatus, bmId, teamManagerId, tmId, teamLeaderId, callerId, companyName, policyType, premiumStatus, createdBy, sourceType, cashback, advisorId, advisor, commissionStatus } = req.query;

    const andConditions: any[] = [];

    // Advisor Filter
    const targetAdvisor = advisorId || advisor;
    if (targetAdvisor && targetAdvisor !== "All" && targetAdvisor !== "ALL") {
      andConditions.push({
        $or: [
          { advisorId: targetAdvisor },
          { advisorCode: targetAdvisor.toUpperCase() },
          { advisorName: new RegExp(`^${String(targetAdvisor).trim()}$`, "i") }
        ]
      });
    }

    // Commission Status Filter
    if (commissionStatus && commissionStatus !== "All") {
      scopeQuery.commissionStatus = commissionStatus;
    }

    if (businessType && businessType !== "All" && businessType !== "ALL" && businessType !== "All Types") {
      const bt = String(businessType).trim().toUpperCase();
      // 1. Combined New Business (Fresh + Port)
      if (bt === "NEW_BUSINESS" || bt === "NEW BUSINESS" || bt === "COMBINED" || bt === "NEW_BUSINESS_COMBINED" || bt === "NEW BUSINESS (FRESH + PORT)") {
        andConditions.push({
          $and: [
            { businessType: { $not: /^renewal$/i } },
            { businessSubtype: { $not: /^renewal$/i } }
          ]
        });
      }
      // 2. Fresh Only
      else if (bt === "FRESH" || bt === "NEW_BUSINESS_FRESH" || bt === "NEW BUSINESS (FRESH)") {
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
      }
      // 3. Port Only
      else if (bt === "PORT" || bt === "NEW_BUSINESS_PORT" || bt === "NEW BUSINESS (PORT)") {
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
      }
      // 4. Renewal Only
      else if (bt === "RENEWAL") {
        andConditions.push({
          $or: [
            { businessType: /^renewal$/i },
            { businessSubtype: /^renewal$/i }
          ]
        });
      }
      // 5. Fallback for any other custom business type
      else {
        scopeQuery.businessType = new RegExp(`^${businessType}$`, "i");
      }
    }
    if (policyStatus && policyStatus !== "All") {
      scopeQuery.policyStatus = new RegExp(`^${policyStatus}$`, "i");
    }
    if (bmId && bmId !== "All") scopeQuery.bmId = bmId;
    const targetTmId = teamManagerId || tmId;
    if (targetTmId && targetTmId !== "All") scopeQuery.teamManagerId = targetTmId;
    if (teamLeaderId && teamLeaderId !== "All") scopeQuery.teamLeaderId = teamLeaderId;
    if (callerId && callerId !== "All") {
      andConditions.push({
        $or: [{ callerId }, { tseId: callerId }]
      });
    }
    if (companyName && companyName !== "All") scopeQuery.companyName = companyName;
    if (policyType && policyType !== "All") scopeQuery.policyType = policyType;
    if (premiumStatus && premiumStatus !== "All") scopeQuery.premiumStatus = premiumStatus;
    if (createdBy && createdBy !== "All") scopeQuery.createdBy = createdBy;
    if (sourceType && sourceType !== "All") {
      if (sourceType === "sales_team") {
        andConditions.push({
          $or: [{ sourceType: "sales_team" }, { sourceType: { $exists: false } }, { sourceType: null }, { sourceType: "" }]
        });
      } else {
        scopeQuery.sourceType = sourceType;
      }
    }

    if (cashback && cashback !== "All" && cashback !== "ALL" && cashback !== "All Cashback") {
      const cbUpper = String(cashback).trim().toUpperCase();

      // 1. New Business Cashback (Fresh + Port with Cashback)
      if (cbUpper === "NEW_BUSINESS_CASHBACK" || cbUpper === "NEW BUSINESS CASHBACK" || cbUpper === "NEW_BUSINESS") {
        andConditions.push({
          cashbackEnabled: true,
          cashbackAmount: { $gt: 0 },
          $and: [
            { businessType: { $not: /^renewal$/i } },
            { businessSubtype: { $not: /^renewal$/i } }
          ]
        });
      }
      // 2. Fresh Cashback (Fresh only with Cashback)
      else if (cbUpper === "FRESH_CASHBACK" || cbUpper === "FRESH CASHBACK" || cbUpper === "FRESH") {
        andConditions.push({
          cashbackEnabled: true,
          cashbackAmount: { $gt: 0 },
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
      }
      // 3. Port Cashback (Port only with Cashback)
      else if (cbUpper === "PORT_CASHBACK" || cbUpper === "PORT CASHBACK" || cbUpper === "PORT") {
        andConditions.push({
          cashbackEnabled: true,
          cashbackAmount: { $gt: 0 },
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
      }
      // 4. Renewal Cashback (Renewal only with Cashback)
      else if (cbUpper === "RENEWAL_CASHBACK" || cbUpper === "RENEWAL CASHBACK" || cbUpper === "RENEWAL") {
        andConditions.push({
          cashbackEnabled: true,
          cashbackAmount: { $gt: 0 },
          $or: [
            { businessType: /^renewal$/i },
            { businessSubtype: /^renewal$/i }
          ]
        });
      }
      // 5. Cashback: Yes (Any business type with cashback)
      else if (cbUpper === "YES" || cbUpper === "TRUE" || cbUpper === "CASHBACK: YES") {
        andConditions.push({
          cashbackEnabled: true,
          cashbackAmount: { $gt: 0 }
        });
      }
      // 6. Cashback: No (Any business type with cashback disabled or 0 amount)
      else if (cbUpper === "NO" || cbUpper === "FALSE" || cbUpper === "CASHBACK: NO") {
        andConditions.push({
          $or: [
            { cashbackEnabled: false },
            { cashbackEnabled: { $exists: false } },
            { cashbackEnabled: null },
            { cashbackAmount: { $lte: 0 } },
            { cashbackAmount: { $exists: false } },
            { cashbackAmount: null }
          ]
        });
      }
    }

    if (dateFrom || dateTo) {
      const loginDateCond: any = {};
      if (dateFrom) loginDateCond.$gte = dateFrom;
      if (dateTo) loginDateCond.$lte = dateTo;

      const createdAtCond: any = {};
      if (dateFrom) createdAtCond.$gte = dateFrom;
      if (dateTo) createdAtCond.$lte = dateTo + "T23:59:59.999Z";

      andConditions.push({
        $or: [
          { businessLoginDate: loginDateCond },
          {
            $and: [
              {
                $or: [
                  { businessLoginDate: { $exists: false } },
                  { businessLoginDate: null },
                  { businessLoginDate: "" }
                ]
              },
              { createdAt: createdAtCond }
            ]
          }
        ]
      });
    }

    if (andConditions.length === 1) {
      Object.assign(scopeQuery, andConditions[0]);
    } else if (andConditions.length > 1) {
      scopeQuery.$and = andConditions;
    }

    // Fetch all policies matching scope
    const allPolicies = await PolicyModel.find(scopeQuery).lean();

    const totalPolicies = allPolicies.length;
    const totalPremium = allPolicies.reduce((sum: number, p: any) => sum + (p.premiumAmount || 0), 0);
    const totalSumAssured = allPolicies.reduce((sum: number, p: any) => sum + (p.sumAssured || 0), 0);
    const avgSumAssured = totalPolicies > 0 ? Math.round(totalSumAssured / totalPolicies) : 0;
    const totalExpectedCommission = allPolicies.reduce((sum: number, p: any) => sum + (p.expectedCommission || 0), 0);

    const isRenewalPolicy = (p: any) => {
      const bt = String(p.businessType || "").trim().toUpperCase();
      const bsub = String(p.businessSubtype || "").trim().toUpperCase();
      return bt === "RENEWAL" || bsub === "RENEWAL";
    };
    const isPortPolicy = (p: any) => {
      const bt = String(p.businessType || "").trim().toUpperCase();
      const bsub = String(p.businessSubtype || "").trim().toUpperCase();
      return bt === "PORT" || bsub === "PORT" || Boolean(p.portabilityDetails?.previousInsuranceCompany);
    };
    const isFreshPolicy = (p: any) => !isRenewalPolicy(p) && !isPortPolicy(p);
    const isNewBusinessPolicy = (p: any) => !isRenewalPolicy(p);

    const freshPolicies = allPolicies.filter((p: any) => isFreshPolicy(p));
    const portPolicies = allPolicies.filter((p: any) => isPortPolicy(p));
    const newBusinessPolicies = allPolicies.filter((p: any) => isNewBusinessPolicy(p));
    const renewalPolicies = allPolicies.filter((p: any) => isRenewalPolicy(p));

    const newBusinessCount = newBusinessPolicies.length;
    const newBusinessPremium = newBusinessPolicies.reduce((sum: number, p: any) => sum + (p.premiumAmount || 0), 0);
    const newBusinessCommission = newBusinessPolicies.reduce((sum: number, p: any) => sum + (p.expectedCommission || 0), 0);

    const freshCount = freshPolicies.length;
    const freshPremium = freshPolicies.reduce((sum: number, p: any) => sum + (p.premiumAmount || 0), 0);
    const freshCommission = freshPolicies.reduce((sum: number, p: any) => sum + (p.expectedCommission || 0), 0);

    const pendingNewBusiness = newBusinessPolicies.filter((p: any) => /^Pending$/i.test(p.policyStatus));
    const issuedNewBusiness = newBusinessPolicies.filter((p: any) => /^Issued$/i.test(p.policyStatus));

    const newBusinessStats = {
      total: newBusinessCount,
      totalPremium: newBusinessPremium,
      totalCommission: newBusinessCommission,
      freshCount,
      freshPremium,
      portCount: portPolicies.length,
      portPremium: portPolicies.reduce((sum: number, p: any) => sum + (p.premiumAmount || 0), 0),
      pendingCount: pendingNewBusiness.length,
      pendingPremium: pendingNewBusiness.reduce((sum: number, p: any) => sum + (p.premiumAmount || 0), 0),
      pendingCommission: pendingNewBusiness.reduce((sum: number, p: any) => sum + (p.expectedCommission || 0), 0),
      issuedCount: issuedNewBusiness.length,
      issuedPremium: issuedNewBusiness.reduce((sum: number, p: any) => sum + (p.premiumAmount || 0), 0),
      issuedCommission: issuedNewBusiness.reduce((sum: number, p: any) => sum + (p.expectedCommission || 0), 0),
    };

    const renewalCount = renewalPolicies.length;
    const renewalPremium = renewalPolicies.reduce((sum: number, p: any) => sum + (p.premiumAmount || 0), 0);
    const renewalCommission = renewalPolicies.reduce((sum: number, p: any) => sum + (p.expectedCommission || 0), 0);

    const portCount = portPolicies.length;
    const portPremium = portPolicies.reduce((sum: number, p: any) => sum + (p.premiumAmount || 0), 0);
    const portCommission = portPolicies.reduce((sum: number, p: any) => sum + (p.expectedCommission || 0), 0);

    // BM-wise breakdown
    const bmMap: Record<string, { name: string; newBusiness: number; renewal: number; port: number; total: number; premium: number; expectedCommission: number }> = {};
    allPolicies.forEach((p: any) => {
      const bId = p.bmId || "unassigned";
      const bName = p.bmName || "Unassigned";
      if (!bmMap[bId]) {
        bmMap[bId] = { name: bName, newBusiness: 0, renewal: 0, port: 0, total: 0, premium: 0, expectedCommission: 0 };
      }
      bmMap[bId].total += 1;
      bmMap[bId].premium += (p.premiumAmount || 0);
      bmMap[bId].expectedCommission += (p.expectedCommission || 0);
      if (isRenewalPolicy(p)) {
        bmMap[bId].renewal += 1;
      } else if (isPortPolicy(p)) {
        bmMap[bId].port += 1;
      } else {
        bmMap[bId].newBusiness += 1;
      }
    });

    // Team Manager-wise breakdown
    const tmMap: Record<string, { name: string; bmName: string; newBusiness: number; renewal: number; port: number; total: number; premium: number; expectedCommission: number }> = {};
    allPolicies.forEach((p: any) => {
      const tmId = p.teamManagerId || "unassigned";
      const tmName = p.teamManagerName || "Unassigned";
      const bmName = p.bmName || "Unassigned";
      if (!tmMap[tmId]) {
        tmMap[tmId] = { name: tmName, bmName, newBusiness: 0, renewal: 0, port: 0, total: 0, premium: 0, expectedCommission: 0 };
      }
      tmMap[tmId].total += 1;
      tmMap[tmId].premium += (p.premiumAmount || 0);
      tmMap[tmId].expectedCommission += (p.expectedCommission || 0);
      if (isRenewalPolicy(p)) {
        tmMap[tmId].renewal += 1;
      } else if (isPortPolicy(p)) {
        tmMap[tmId].port += 1;
      } else {
        tmMap[tmId].newBusiness += 1;
      }
    });

    // Team Leader-wise breakdown
    const teamLeaderMap: Record<string, { name: string; newBusiness: number; renewal: number; port: number; total: number; premium: number; expectedCommission: number }> = {};
    allPolicies.forEach((p: any) => {
      const tlId = p.teamLeaderId || "unassigned";
      const tlName = p.teamLeaderName || "Unassigned";
      if (!teamLeaderMap[tlId]) {
        teamLeaderMap[tlId] = { name: tlName, newBusiness: 0, renewal: 0, port: 0, total: 0, premium: 0, expectedCommission: 0 };
      }
      teamLeaderMap[tlId].total += 1;
      teamLeaderMap[tlId].premium += (p.premiumAmount || 0);
      teamLeaderMap[tlId].expectedCommission += (p.expectedCommission || 0);
      if (isRenewalPolicy(p)) {
        teamLeaderMap[tlId].renewal += 1;
      } else if (isPortPolicy(p)) {
        teamLeaderMap[tlId].port += 1;
      } else {
        teamLeaderMap[tlId].newBusiness += 1;
      }
    });

    // TSE-wise breakdown
    const tseMap: Record<string, { name: string; teamLeaderName: string; newBusiness: number; renewal: number; port: number; total: number; premium: number; expectedCommission: number }> = {};
    allPolicies.forEach((p: any) => {
      const tseId = p.callerId || p.tseId || "unassigned";
      const tseName = p.callerName || p.tseName || "Unassigned";
      const tlName = p.teamLeaderName || "—";
      if (!tseMap[tseId]) {
        tseMap[tseId] = { name: tseName, teamLeaderName: tlName, newBusiness: 0, renewal: 0, port: 0, total: 0, premium: 0, expectedCommission: 0 };
      }
      tseMap[tseId].total += 1;
      tseMap[tseId].premium += (p.premiumAmount || 0);
      tseMap[tseId].expectedCommission += (p.expectedCommission || 0);
      if (isRenewalPolicy(p)) {
        tseMap[tseId].renewal += 1;
      } else if (isPortPolicy(p)) {
        tseMap[tseId].port += 1;
      } else {
        tseMap[tseId].newBusiness += 1;
      }
    });

    // Operator-wise breakdown
    const operatorMap: Record<string, { name: string; recordsEntered: number; newBusiness: number; renewal: number; port: number }> = {};
    allPolicies.forEach((p: any) => {
      const opId = p.createdBy || "unknown";
      const opName = p.createdByName || "Unknown";
      if (!operatorMap[opId]) {
        operatorMap[opId] = { name: opName, recordsEntered: 0, newBusiness: 0, renewal: 0, port: 0 };
      }
      operatorMap[opId].recordsEntered += 1;
      if (isRenewalPolicy(p)) {
        operatorMap[opId].renewal += 1;
      } else if (isPortPolicy(p)) {
        operatorMap[opId].port += 1;
      } else {
        operatorMap[opId].newBusiness += 1;
      }
    });

    // Insurance Company-wise breakdown
    const companyMap: Record<string, { 
      name: string; 
      newBusinessCount: number; 
      newBusinessPremium: number; 
      renewalCount: number; 
      renewalPremium: number; 
      portCount: number;
      portPremium: number;
      totalPolicies: number; 
      totalPremium: number; 
      expectedCommission: number; 
    }> = {};

    allPolicies.forEach((p: any) => {
      const compName = p.companyName || "Unspecified Company";
      if (!companyMap[compName]) {
        companyMap[compName] = { 
          name: compName, 
          newBusinessCount: 0, 
          newBusinessPremium: 0, 
          renewalCount: 0, 
          renewalPremium: 0, 
          portCount: 0,
          portPremium: 0,
          totalPolicies: 0, 
          totalPremium: 0, 
          expectedCommission: 0 
        };
      }
      companyMap[compName].totalPolicies += 1;
      companyMap[compName].totalPremium += (p.premiumAmount || 0);
      companyMap[compName].expectedCommission += (p.expectedCommission || 0);

      if (isRenewalPolicy(p)) {
        companyMap[compName].renewalCount += 1;
        companyMap[compName].renewalPremium += (p.premiumAmount || 0);
      } else if (isPortPolicy(p)) {
        companyMap[compName].portCount += 1;
        companyMap[compName].portPremium += (p.premiumAmount || 0);
      } else {
        companyMap[compName].newBusinessCount += 1;
        companyMap[compName].newBusinessPremium += (p.premiumAmount || 0);
      }
    });

    // Renewal lifecycle stats (from premium status)
    const today = new Date().toISOString().split("T")[0];
    const renewalsDueToday = allPolicies.filter((p: any) => p.nextDueDate === today && p.premiumStatus !== "Paid").length;
    const upcomingRenewals = allPolicies.filter((p: any) => p.nextDueDate > today && p.premiumStatus !== "Paid").length;
    const overdueRenewals = allPolicies.filter((p: any) => p.nextDueDate < today && (p.premiumStatus === "Unpaid" || p.premiumStatus === "Overdue")).length;
    const paidPolicies = allPolicies.filter((p: any) => p.premiumStatus === "Paid").length;
    const lapsedPolicies = allPolicies.filter((p: any) => p.premiumStatus === "Lapsed").length;

    // Birthday stats
    const currentMonth = new Date().getMonth() + 1;
    const currentDay = new Date().getDate();
    const currentWeekEnd = new Date();
    currentWeekEnd.setDate(currentWeekEnd.getDate() + 7);

    const birthdaysToday = allPolicies.filter((p: any) => {
      if (!p.customerBirthday) return false;
      const parts = p.customerBirthday.split("-");
      return parts.length >= 3 && Number(parts[1]) === currentMonth && Number(parts[2]) === currentDay;
    }).length;

    const birthdaysThisMonth = allPolicies.filter((p: any) => {
      if (!p.customerBirthday) return false;
      const parts = p.customerBirthday.split("-");
      return parts.length >= 2 && Number(parts[1]) === currentMonth;
    }).length;

    const wishedCount = allPolicies.filter((p: any) => p.wishedStatus === "Wished" || p.wishedStatus === "Completed").length;
    const pendingWishes = allPolicies.filter((p: any) => !p.wishedStatus || p.wishedStatus === "Pending").length;

    // Source Type stats breakdown
    const salesTeamPolicies = allPolicies.filter((p: any) => !p.sourceType || p.sourceType === "sales_team");
    const directPolicies = allPolicies.filter((p: any) => p.sourceType === "direct");
    const referralPolicies = allPolicies.filter((p: any) => p.sourceType === "referral");

    const sourceStats = {
      salesTeamCount: salesTeamPolicies.length,
      salesTeamPremium: salesTeamPolicies.reduce((sum: number, p: any) => sum + (p.premiumAmount || 0), 0),
      salesTeamCommission: salesTeamPolicies.reduce((sum: number, p: any) => sum + (p.expectedCommission || 0), 0),
      directCount: directPolicies.length,
      directPremium: directPolicies.reduce((sum: number, p: any) => sum + (p.premiumAmount || 0), 0),
      directCommission: directPolicies.reduce((sum: number, p: any) => sum + (p.expectedCommission || 0), 0),
      referralCount: referralPolicies.length,
      referralPremium: referralPolicies.reduce((sum: number, p: any) => sum + (p.premiumAmount || 0), 0),
      referralCommission: referralPolicies.reduce((sum: number, p: any) => sum + (p.expectedCommission || 0), 0)
    };

    // Cashback Analytics Calculation
    const isCashback = (p: any) =>
      (p.cashbackEnabled === true || p.cashbackEnabled === "true" || p.cashbackEnabled === "Yes") &&
      (Number(p.cashbackAmount) > 0);

    const freshCashbackPolicies = freshPolicies.filter(isCashback);
    const freshCashbackTotal = freshCashbackPolicies.reduce((sum: number, p: any) => sum + (Number(p.cashbackAmount) || 0), 0);
    const freshCashbackCount = freshCashbackPolicies.length;

    const portCashbackPolicies = portPolicies.filter(isCashback);
    const portCashbackTotal = portCashbackPolicies.reduce((sum: number, p: any) => sum + (Number(p.cashbackAmount) || 0), 0);
    const portCashbackCount = portCashbackPolicies.length;

    const renewalCashbackPolicies = renewalPolicies.filter(isCashback);
    const renewalCashbackTotal = renewalCashbackPolicies.reduce((sum: number, p: any) => sum + (Number(p.cashbackAmount) || 0), 0);
    const renewalCashbackCount = renewalCashbackPolicies.length;

    const totalCashback = freshCashbackTotal + portCashbackTotal + renewalCashbackTotal;
    const totalCashbackCount = freshCashbackCount + portCashbackCount + renewalCashbackCount;

    const cashbackStats = {
      freshTotal: freshCashbackTotal,
      freshCount: freshCashbackCount,
      portTotal: portCashbackTotal,
      portCount: portCashbackCount,
      renewalTotal: renewalCashbackTotal,
      renewalCount: renewalCashbackCount,
      totalCashback,
      totalCashbackCount,
      newBusinessTotal: freshCashbackTotal + portCashbackTotal,
      newBusinessCount: freshCashbackCount + portCashbackCount
    };

    res.json({
      totalPolicies,
      totalPremium,
      totalSumAssured,
      avgSumAssured,
      totalExpectedCommission,
      cashbackStats,
      freshCashbackTotal,
      freshCashbackCount,
      portCashbackTotal,
      portCashbackCount,
      renewalCashbackTotal,
      renewalCashbackCount,
      totalCashback,
      totalCashbackCount,
      newBusinessCount,
      newBusinessPremium,
      newBusinessCommission,
      freshCount,
      freshPremium,
      freshCommission,
      newBusinessStats,
      renewalCount,
      renewalPremium,
      renewalCommission,
      portCount,
      portPremium,
      portCommission,
      bmReport: Object.entries(bmMap).map(([id, val]) => ({ id, ...val })),
      tmReport: Object.entries(tmMap).map(([id, val]) => ({ id, ...val })),
      teamLeaderReport: Object.entries(teamLeaderMap).map(([id, val]) => ({ id, ...val })),
      tseReport: Object.entries(tseMap).map(([id, val]) => ({ id, ...val })),
      operatorReport: Object.entries(operatorMap).map(([id, val]) => ({ id, ...val })),
      companyReport: Object.entries(companyMap).map(([id, val]) => ({ id, ...val })),
      sourceStats,
      renewalStats: {
        renewalsDueToday,
        upcomingRenewals,
        overdueRenewals,
        paidPolicies,
        lapsedPolicies
      },
      birthdayStats: {
        birthdaysToday,
        birthdaysThisMonth,
        wishedCount,
        pendingWishes
      },
      policies: allPolicies
    });
  } catch (err: any) {
    console.error("Reports Business Error:", err);
    res.status(500).json({ error: err.message || "Failed to load business reports" });
  }
});

export default router;
