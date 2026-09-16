import { Router, Response } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import { AdvisorModel, PolicyModel, InsuranceCompanyModel, AuditLog } from "../models";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "policy_master_jwt_secret_key_2026_mongodb";

// Ensure Uploads Directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `adv-doc-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max limit
});

// Auth Middleware
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

function getSafeIdQuery(id: string, tenantId?: string, role?: string) {
  const isObjectId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
  const conditions: any[] = [{ id: id }];
  if (isObjectId) {
    conditions.push({ _id: id });
  }
  const query: any = conditions.length === 1 ? { ...conditions[0] } : { $or: conditions };
  if (role && role !== "SUPER_ADMIN" && tenantId) {
    query.tenantId = tenantId;
  }
  return query;
}

// Data Masking Helpers
export function maskPan(pan?: string): string {
  if (!pan || typeof pan !== "string") return "";
  const clean = pan.trim().toUpperCase();
  if (clean.length !== 10) return clean;
  return `${clean.substring(0, 5)}****${clean.substring(9)}`;
}

export function maskAadhaar(aadhaar?: string): string {
  if (!aadhaar || typeof aadhaar !== "string") return "";
  const clean = aadhaar.replace(/\s+/g, "");
  if (clean.length < 4) return clean;
  const last4 = clean.slice(-4);
  return `XXXX XXXX ${last4}`;
}

export function maskBankAccount(acc?: string): string {
  if (!acc || typeof acc !== "string") return "";
  const clean = acc.trim();
  if (clean.length <= 4) return clean;
  const last4 = clean.slice(-4);
  return `XXXX XXXX ${last4}`;
}

// ----------------------------------------------------
// 0. POST /api/advisors/upload - Upload Advisor Verification & KYC Documents
// ----------------------------------------------------
router.post("/upload", authenticateToken, (req: any, res: Response) => {
  upload.array("files", 10)(req, res, (err: any) => {
    if (err) {
      console.error("Advisor document upload error:", err);
      return res.status(400).json({ error: err.message || "File upload error" });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const docType = req.body.documentType || "Other Documents";

    const uploadedDocs = files.map(file => ({
      documentId: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      documentType: docType,
      documentName: file.originalname,
      originalName: file.originalname,
      storedName: file.filename,
      path: `/uploads/${file.filename}`,
      size: file.size,
      mimeType: file.mimetype,
      status: "Pending",
      uploadedAt: new Date().toISOString()
    }));

    res.json({ success: true, documents: uploadedDocs });
  });
});

// ----------------------------------------------------
// 0.1 GET /api/advisors/lookup/branch-personnel - Auto-suggest existing BM, AM, ZM
// ----------------------------------------------------
router.get("/lookup/branch-personnel", authenticateToken, async (req: any, res: Response) => {
  try {
    const { role } = req.user;
    const tenantId = role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");
    const { insuranceCompanyId, branchName } = req.query;

    if (!insuranceCompanyId || !branchName) {
      return res.json({ personnel: null });
    }

    const query: any = {
      "insuranceDetails.insuranceCompanyId": String(insuranceCompanyId),
      "branchDetails.branchName": new RegExp(`^${String(branchName).trim()}$`, "i"),
      "insuranceCompanyManagement.branchManagerName": { $exists: true, $ne: "" }
    };
    if (role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }

    const existing = await AdvisorModel.findOne(query)
      .select("branchDetails insuranceCompanyManagement")
      .lean();

    if (existing && existing.insuranceCompanyManagement) {
      res.json({
        personnel: existing.insuranceCompanyManagement,
        branchDetails: existing.branchDetails
      });
    } else {
      res.json({ personnel: null });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to lookup branch personnel" });
  }
});

// ----------------------------------------------------
// 1. GET /api/advisors - List Advisors with Filters, Search, KPIs & Pagination
// ----------------------------------------------------
router.get("/", authenticateToken, async (req: any, res: Response) => {
  try {
    const { role } = req.user;
    const tenantId = role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");

    const {
      search,
      insuranceCompanyId,
      branch,
      status,
      state,
      city,
      advisorType,
      virtualManager,
      recruiter,
      page = 1,
      limit = 25
    } = req.query;

    const query: any = {};
    if (role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }

    if (insuranceCompanyId && insuranceCompanyId !== "All") {
      query["insuranceDetails.insuranceCompanyId"] = insuranceCompanyId;
    }

    if (branch && branch !== "All") {
      query["branchDetails.branchName"] = new RegExp(`^${branch}$`, "i");
    }

    if (status && status !== "All") {
      query.status = status.toUpperCase();
    }

    if (state && state !== "All") {
      query.$or = [
        { "branchDetails.branchState": new RegExp(`^${state}$`, "i") },
        { "locationDetails.state": new RegExp(`^${state}$`, "i") }
      ];
    }

    if (city && city !== "All") {
      query.$or = [
        { "branchDetails.branchCity": new RegExp(`^${city}$`, "i") },
        { "locationDetails.city": new RegExp(`^${city}$`, "i") }
      ];
    }

    if (advisorType && advisorType !== "All") {
      query["businessDetails.advisorType"] = advisorType;
    }

    if (virtualManager && virtualManager !== "All") {
      query["internalMapping.virtualManagerName"] = new RegExp(`^${virtualManager}$`, "i");
    }

    if (recruiter && recruiter !== "All") {
      query["internalMapping.recruiterName"] = new RegExp(`^${recruiter}$`, "i");
    }

    if (search && String(search).trim()) {
      const s = String(search).trim();
      const sRegex = new RegExp(s, "i");
      query.$or = [
        { "personalDetails.fullName": sRegex },
        { advisorCode: sRegex },
        { "contactDetails.mobileNumber": sRegex },
        { "contactDetails.email": sRegex },
        { "identityDetails.panNumber": sRegex },
        { "insuranceDetails.insuranceCompanyName": sRegex },
        { "branchDetails.branchName": sRegex },
        { "branchDetails.branchCity": sRegex },
        { "locationDetails.city": sRegex },
        { "locationDetails.area": sRegex },
        { "internalMapping.virtualManagerName": sRegex },
        { "internalMapping.recruiterName": sRegex }
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    // Run query and counts in parallel
    const baseTenantQuery = role === "SUPER_ADMIN" ? {} : { tenantId };

    const [
      advisors,
      totalCount,
      totalAll,
      activeCount,
      inactiveCount,
      distinctCompanies,
      distinctVirtualManagers,
      distinctRecruiters
    ] = await Promise.all([
      AdvisorModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      AdvisorModel.countDocuments(query),
      AdvisorModel.countDocuments(baseTenantQuery),
      AdvisorModel.countDocuments({ ...baseTenantQuery, status: "ACTIVE" }),
      AdvisorModel.countDocuments({ ...baseTenantQuery, status: "INACTIVE" }),
      AdvisorModel.distinct("insuranceDetails.insuranceCompanyId", baseTenantQuery),
      AdvisorModel.distinct("internalMapping.virtualManagerName", {
        ...baseTenantQuery,
        "internalMapping.virtualManagerName": { $ne: "" }
      }),
      AdvisorModel.distinct("internalMapping.recruiterName", {
        ...baseTenantQuery,
        "internalMapping.recruiterName": { $ne: "" }
      })
    ]);

    // Attach linked policies count for each advisor
    const advisorIds = advisors.map(a => a.id);
    const policyCounts = await PolicyModel.aggregate([
      { $match: { advisorId: { $in: advisorIds } } },
      { $group: { _id: "$advisorId", count: { $sum: 1 } } }
    ]);
    const policyCountMap = new Map<string, number>();
    policyCounts.forEach(pc => policyCountMap.set(String(pc._id), pc.count));

    // Mask sensitive fields in list view
    const sanitizedAdvisors = advisors.map((adv: any) => ({
      ...adv,
      linkedPoliciesCount: policyCountMap.get(adv.id) || 0,
      identityDetails: adv.identityDetails ? {
        ...adv.identityDetails,
        panNumber: maskPan(adv.identityDetails.panNumber),
        aadhaarNumber: maskAadhaar(adv.identityDetails.aadhaarNumber)
      } : undefined,
      bankDetails: adv.bankDetails ? {
        ...adv.bankDetails,
        accountNumber: maskBankAccount(adv.bankDetails.accountNumber)
      } : undefined
    }));

    res.json({
      advisors: sanitizedAdvisors,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limitNum))
      },
      kpis: {
        totalAdvisors: totalAll,
        activeAdvisors: activeCount,
        inactiveAdvisors: inactiveCount,
        companiesCovered: distinctCompanies.length
      },
      filterOptions: {
        virtualManagers: distinctVirtualManagers.filter(Boolean),
        recruiters: distinctRecruiters.filter(Boolean)
      }
    });
  } catch (err: any) {
    console.error("List Advisors Error:", err);
    res.status(500).json({ error: err.message || "Failed to load advisors" });
  }
});

// ----------------------------------------------------
// 2. GET /api/advisors/active - Lightweight Active Advisors for Policy Dropdowns
// ----------------------------------------------------
router.get("/active", authenticateToken, async (req: any, res: Response) => {
  try {
    const { role } = req.user;
    const tenantId = role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");
    const { insuranceCompanyId } = req.query;

    const query: any = { status: "ACTIVE" };
    if (role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }
    if (insuranceCompanyId && insuranceCompanyId !== "All") {
      query["insuranceDetails.insuranceCompanyId"] = insuranceCompanyId;
    }

    const advisors = await AdvisorModel.find(query)
      .select("id advisorCode personalDetails.fullName insuranceDetails branchDetails contactDetails.mobileNumber internalMapping")
      .sort({ "personalDetails.fullName": 1 })
      .lean();

    const formatted = advisors.map((a: any) => ({
      id: a.id,
      advisorCode: a.advisorCode,
      name: a.personalDetails?.fullName || "Unnamed Advisor",
      insuranceCompanyId: a.insuranceDetails?.insuranceCompanyId,
      insuranceCompanyName: a.insuranceDetails?.insuranceCompanyName || "",
      branchName: a.branchDetails?.branchName || "",
      branchCity: a.branchDetails?.branchCity || "",
      mobileNumber: a.contactDetails?.mobileNumber || "",
      virtualManagerName: a.internalMapping?.virtualManagerName || "",
      recruiterName: a.internalMapping?.recruiterName || ""
    }));

    res.json(formatted);
  } catch (err: any) {
    console.error("Active Advisors Dropdown Error:", err);
    res.status(500).json({ error: err.message || "Failed to load active advisors" });
  }
});

// ----------------------------------------------------
// 3. GET /api/advisors/:id - Full Advisor Profile Details
// ----------------------------------------------------
router.get("/:id", authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.user;
    const tenantId = role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");

    const query = getSafeIdQuery(id, tenantId, role);
    const advisor = await AdvisorModel.findOne(query).lean();

    if (!advisor) {
      return res.status(404).json({ error: "Advisor not found" });
    }

    const linkedPoliciesCount = await PolicyModel.countDocuments({ advisorId: advisor.id });

    res.json({
      ...advisor,
      linkedPoliciesCount
    });
  } catch (err: any) {
    console.error("Get Advisor Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch advisor details" });
  }
});

// ----------------------------------------------------
// 3.5 GET /api/advisors/:id/business-report - Real-Time Advisor Business Analytics, Summary & Policies
// ----------------------------------------------------
router.get("/:id/business-report", authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.user;
    const tenantId = role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");

    const query = getSafeIdQuery(id, tenantId, role);
    let advisor = await AdvisorModel.findOne(query).lean();

    if (!advisor) {
      // Fallback search by advisorCode
      const codeQuery: any = { advisorCode: id.toUpperCase() };
      if (role !== "SUPER_ADMIN") codeQuery.tenantId = tenantId;
      advisor = await AdvisorModel.findOne(codeQuery).lean();
    }

    if (!advisor) {
      return res.status(404).json({ error: "Advisor not found" });
    }

    const {
      datePreset,
      dateFrom,
      dateTo,
      insuranceCompanyId,
      companyName,
      businessType,
      commissionStatus
    } = req.query;

    const andConditions: any[] = [
      {
        $or: [
          { advisorId: advisor.id },
          { advisorCode: advisor.advisorCode },
          { advisorName: advisor.personalDetails?.fullName }
        ]
      }
    ];

    if (role !== "SUPER_ADMIN") {
      andConditions.push({ tenantId });
    }

    // 1. Date Filtering
    let computedFrom = dateFrom ? String(dateFrom) : "";
    let computedTo = dateTo ? String(dateTo) : "";

    if (datePreset) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const y = now.getFullYear();
      const m = now.getMonth();
      const d = now.getDate();

      if (datePreset === "today") {
        computedFrom = `${y}-${pad(m + 1)}-${pad(d)}`;
        computedTo = computedFrom;
      } else if (datePreset === "this_week") {
        const dayOfWeek = now.getDay();
        const start = new Date(now);
        start.setDate(d - dayOfWeek);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        computedFrom = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
        computedTo = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
      } else if (datePreset === "this_month") {
        computedFrom = `${y}-${pad(m + 1)}-01`;
        computedTo = `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`;
      } else if (datePreset === "last_month" || datePreset === "previous_month") {
        const lm = m === 0 ? 11 : m - 1;
        const ly = m === 0 ? y - 1 : y;
        computedFrom = `${ly}-${pad(lm + 1)}-01`;
        computedTo = `${ly}-${pad(lm + 1)}-${pad(new Date(ly, lm + 1, 0).getDate())}`;
      }
    }

    if (computedFrom || computedTo) {
      const dateCond: any = {};
      if (computedFrom) dateCond.$gte = computedFrom;
      if (computedTo) dateCond.$lte = computedTo;

      andConditions.push({
        $or: [
          { businessLoginDate: dateCond },
          { startDate: dateCond },
          {
            $and: [
              {
                $or: [
                  { businessLoginDate: { $exists: false } },
                  { businessLoginDate: null },
                  { businessLoginDate: "" }
                ]
              },
              { createdAt: { ...(computedFrom ? { $gte: `${computedFrom}T00:00:00.000Z` } : {}), ...(computedTo ? { $lte: `${computedTo}T23:59:59.999Z` } : {}) } }
            ]
          }
        ]
      });
    }

    // 2. Insurance Company Filter
    if (insuranceCompanyId && insuranceCompanyId !== "All") {
      andConditions.push({ insuranceCompanyId: String(insuranceCompanyId) });
    } else if (companyName && companyName !== "All") {
      andConditions.push({ companyName: new RegExp(`^${String(companyName).trim()}$`, "i") });
    }

    // 3. Business Type Hierarchy Filter
    if (businessType && businessType !== "All" && businessType !== "ALL" && businessType !== "All Types") {
      const bt = String(businessType).trim().toUpperCase();
      if (bt === "NEW_BUSINESS" || bt === "NEW BUSINESS") {
        andConditions.push({
          $and: [
            { businessType: { $not: /^renewal$/i } },
            { businessSubtype: { $not: /^renewal$/i } }
          ]
        });
      } else if (bt === "FRESH") {
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
      } else if (bt === "PORT") {
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
      }
    }

    // 4. Commission Status Filter
    if (commissionStatus && commissionStatus !== "All") {
      andConditions.push({ commissionStatus: String(commissionStatus) });
    }

    const policyQuery = andConditions.length === 1 ? andConditions[0] : { $and: andConditions };

    const policies = await PolicyModel.find(policyQuery)
      .sort({ businessLoginDate: -1, startDate: -1, createdAt: -1 })
      .lean();

    // Calculate Dynamic Metrics
    let totalPolicies = 0;
    let freshPolicies = 0;
    let portPolicies = 0;
    let renewalPolicies = 0;

    let totalPremium = 0;
    let freshPremium = 0;
    let portPremium = 0;
    let renewalPremium = 0;

    let totalCommission = 0;
    let freshCommission = 0;
    let portCommission = 0;
    let renewalCommission = 0;

    let paidRevenue = 0;
    let pendingRevenue = 0;

    const companyMap: Record<string, {
      companyId: string;
      companyName: string;
      totalCount: number;
      freshCount: number;
      portCount: number;
      renewalCount: number;
      totalPremium: number;
      freshPremium: number;
      portPremium: number;
      renewalPremium: number;
      totalRevenue: number;
      freshRevenue: number;
      portRevenue: number;
      renewalRevenue: number;
      paidRevenue: number;
      pendingRevenue: number;
    }> = {};

    policies.forEach((p: any) => {
      totalPolicies += 1;

      const prem = Number(p.premiumAmount || 0);
      const pct = Number(p.appliedPayoutPercentage || 0);
      let comm = Number(p.expectedCommission || 0);
      if (comm === 0 && pct > 0 && prem > 0) {
        comm = Math.round((prem * pct) / 100);
      }

      const isPaid = p.commissionStatus === "Paid";
      if (isPaid) {
        paidRevenue += comm;
      } else {
        pendingRevenue += comm;
      }

      totalPremium += prem;
      totalCommission += comm;

      const btUpper = (p.businessType || "").toUpperCase();
      const bstUpper = (p.businessSubtype || "").toUpperCase();
      const hasPrevComp = !!(p.portabilityDetails && p.portabilityDetails.previousInsuranceCompany);

      const isRenewal = btUpper === "RENEWAL" || bstUpper === "RENEWAL";
      const isPort = !isRenewal && (btUpper === "PORT" || bstUpper === "PORT" || hasPrevComp);
      const isFresh = !isRenewal && !isPort;

      if (isRenewal) {
        renewalPolicies += 1;
        renewalPremium += prem;
        renewalCommission += comm;
      } else if (isPort) {
        portPolicies += 1;
        portPremium += prem;
        portCommission += comm;
      } else {
        freshPolicies += 1;
        freshPremium += prem;
        freshCommission += comm;
      }

      // Company Breakdown
      const cId = p.insuranceCompanyId || p.companyName || "other";
      const cName = p.companyName || "Insurance Partner";

      if (!companyMap[cId]) {
        companyMap[cId] = {
          companyId: cId,
          companyName: cName,
          totalCount: 0,
          freshCount: 0,
          portCount: 0,
          renewalCount: 0,
          totalPremium: 0,
          freshPremium: 0,
          portPremium: 0,
          renewalPremium: 0,
          totalRevenue: 0,
          freshRevenue: 0,
          portRevenue: 0,
          renewalRevenue: 0,
          paidRevenue: 0,
          pendingRevenue: 0
        };
      }

      const cEntry = companyMap[cId];
      cEntry.totalCount += 1;
      cEntry.totalPremium += prem;
      cEntry.totalRevenue += comm;
      if (isPaid) cEntry.paidRevenue += comm;
      else cEntry.pendingRevenue += comm;

      if (isRenewal) {
        cEntry.renewalCount += 1;
        cEntry.renewalPremium += prem;
        cEntry.renewalRevenue += comm;
      } else if (isPort) {
        cEntry.portCount += 1;
        cEntry.portPremium += prem;
        cEntry.portRevenue += comm;
      } else {
        cEntry.freshCount += 1;
        cEntry.freshPremium += prem;
        cEntry.freshRevenue += comm;
      }
    });

    const companyBreakdown = Object.values(companyMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

    res.json({
      success: true,
      advisor: {
        id: advisor.id,
        advisorCode: advisor.advisorCode,
        fullName: advisor.personalDetails?.fullName,
        mobileNumber: advisor.contactDetails?.mobileNumber,
        email: advisor.contactDetails?.email,
        insuranceCompanyName: advisor.insuranceDetails?.insuranceCompanyName,
        branchName: advisor.branchDetails?.branchName,
        branchCity: advisor.branchDetails?.branchCity,
        branchManagerName: advisor.insuranceCompanyManagement?.branchManagerName,
        areaManagerName: advisor.insuranceCompanyManagement?.areaManagerName,
        zonalManagerName: advisor.insuranceCompanyManagement?.zonalManagerName,
        virtualManagerName: advisor.internalMapping?.virtualManagerName,
        recruiterName: advisor.internalMapping?.recruiterName,
        status: advisor.status
      },
      filters: {
        datePreset: datePreset || "all",
        dateFrom: computedFrom,
        dateTo: computedTo,
        insuranceCompanyId: insuranceCompanyId || "All",
        companyName: companyName || "All",
        businessType: businessType || "All",
        commissionStatus: commissionStatus || "All"
      },
      summary: {
        totalPolicies,
        freshPolicies,
        portPolicies,
        renewalPolicies,
        totalNewBusinessPolicies: freshPolicies + portPolicies,

        totalPremium: Math.round(totalPremium * 100) / 100,
        freshPremium: Math.round(freshPremium * 100) / 100,
        portPremium: Math.round(portPremium * 100) / 100,
        renewalPremium: Math.round(renewalPremium * 100) / 100,
        totalNewBusinessPremium: Math.round((freshPremium + portPremium) * 100) / 100,

        totalCommission: Math.round(totalCommission * 100) / 100,
        totalRevenue: Math.round(totalCommission * 100) / 100,
        freshCommission: Math.round(freshCommission * 100) / 100,
        freshRevenue: Math.round(freshCommission * 100) / 100,
        portCommission: Math.round(portCommission * 100) / 100,
        portRevenue: Math.round(portCommission * 100) / 100,
        renewalCommission: Math.round(renewalCommission * 100) / 100,
        renewalRevenue: Math.round(renewalCommission * 100) / 100,
        totalNewBusinessRevenue: Math.round((freshCommission + portCommission) * 100) / 100,

        paidRevenue: Math.round(paidRevenue * 100) / 100,
        pendingRevenue: Math.round(pendingRevenue * 100) / 100
      },
      policies,
      companyBreakdown
    });
  } catch (err: any) {
    console.error("Advisor Business Report Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate advisor business report" });
  }
});

// ----------------------------------------------------
// 4. POST /api/advisors - Create New Advisor
// ----------------------------------------------------
router.post("/", authenticateToken, async (req: any, res: Response) => {
  try {
    const { role, uid, name: userName } = req.user;
    const tenantId = role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");

    const {
      advisorCode: requestedCode,
      personalDetails,
      identityDetails,
      contactDetails,
      insuranceDetails,
      branchDetails,
      insuranceCompanyManagement,
      businessDetails,
      locationDetails,
      bankDetails,
      internalMapping,
      documents = [],
      status = "ACTIVE",
      notes
    } = req.body;

    // Required Field Validations
    if (!personalDetails?.fullName || !personalDetails.fullName.trim()) {
      return res.status(400).json({ error: "Advisor Full Name is required" });
    }

    if (!contactDetails?.mobileNumber || !contactDetails.mobileNumber.trim()) {
      return res.status(400).json({ error: "Primary Mobile Number is required" });
    }

    const mobileClean = contactDetails.mobileNumber.trim().replace(/\D/g, "");
    if (mobileClean.length < 10) {
      return res.status(400).json({ error: "Valid 10-digit Mobile Number is required" });
    }

    if (!insuranceDetails?.insuranceCompanyId || !insuranceDetails.insuranceCompanyId.trim()) {
      return res.status(400).json({ error: "Associated Insurance Company is required" });
    }

    if (!branchDetails?.branchName || !branchDetails.branchName.trim()) {
      return res.status(400).json({ error: "Branch Name is required" });
    }

    // Auto-fill Insurance Company Name if missing
    let compName = insuranceDetails.insuranceCompanyName;
    if (!compName) {
      const comp = await InsuranceCompanyModel.findOne({ id: insuranceDetails.insuranceCompanyId }).lean();
      if (comp) compName = comp.name;
    }

    // PAN Validation
    if (identityDetails?.panNumber && identityDetails.panNumber.trim()) {
      const panUpper = identityDetails.panNumber.trim().toUpperCase();
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(panUpper)) {
        return res.status(400).json({ error: "Invalid PAN Number format. Expected format: ABCDE1234F" });
      }
      identityDetails.panNumber = panUpper;
    }

    // Aadhaar Validation
    if (identityDetails?.aadhaarNumber && identityDetails.aadhaarNumber.trim()) {
      const aadhDigits = identityDetails.aadhaarNumber.trim().replace(/\s+/g, "");
      if (!/^\d{12}$/.test(aadhDigits)) {
        return res.status(400).json({ error: "Aadhaar Number must be exactly 12 numeric digits" });
      }
    }

    // Advisor Code Generation or Validation
    let finalCode = (requestedCode || "").trim().toUpperCase();
    if (!finalCode) {
      const countTotal = await AdvisorModel.countDocuments({ tenantId });
      finalCode = `ADV-${String(countTotal + 1).padStart(4, "0")}`;
    } else {
      const existingCode = await AdvisorModel.findOne({ tenantId, advisorCode: finalCode });
      if (existingCode) {
        return res.status(400).json({ error: `Advisor Code "${finalCode}" already exists. Please choose a unique code.` });
      }
    }

    const uniqueId = `adv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const nowIso = new Date().toISOString();

    const newAdvisor = new AdvisorModel({
      id: uniqueId,
      advisorCode: finalCode,
      tenantId,
      personalDetails: {
        fullName: personalDetails.fullName.trim(),
        fatherOrSpouseName: personalDetails.fatherOrSpouseName || "",
        dateOfBirth: personalDetails.dateOfBirth || "",
        gender: personalDetails.gender || "Male",
        maritalStatus: personalDetails.maritalStatus || "Single",
        profilePhoto: personalDetails.profilePhoto || ""
      },
      identityDetails: {
        panNumber: identityDetails?.panNumber || "",
        aadhaarNumber: identityDetails?.aadhaarNumber || "",
        advisorLicenseNumber: identityDetails?.advisorLicenseNumber || "",
        licenseExpiryDate: identityDetails?.licenseExpiryDate || ""
      },
      contactDetails: {
        mobileNumber: contactDetails.mobileNumber.trim(),
        alternateMobileNumber: contactDetails.alternateMobileNumber || "",
        email: (contactDetails.email || "").trim().toLowerCase(),
        whatsappNumber: contactDetails.whatsappNumber || ""
      },
      insuranceDetails: {
        insuranceCompanyId: insuranceDetails.insuranceCompanyId,
        insuranceCompanyName: compName || "Insurance Partner"
      },
      branchDetails: {
        branchName: branchDetails.branchName.trim(),
        branchCode: branchDetails.branchCode || "",
        branchAddress: branchDetails.branchAddress || "",
        branchArea: branchDetails.branchArea || "",
        branchCity: branchDetails.branchCity || "",
        branchState: branchDetails.branchState || "",
        branchPincode: branchDetails.branchPincode || ""
      },
      insuranceCompanyManagement: {
        branchManagerName: insuranceCompanyManagement?.branchManagerName || "",
        branchManagerMobile: insuranceCompanyManagement?.branchManagerMobile || "",
        branchManagerEmail: insuranceCompanyManagement?.branchManagerEmail || "",
        areaManagerName: insuranceCompanyManagement?.areaManagerName || "",
        areaManagerMobile: insuranceCompanyManagement?.areaManagerMobile || "",
        areaManagerEmail: insuranceCompanyManagement?.areaManagerEmail || "",
        zonalManagerName: insuranceCompanyManagement?.zonalManagerName || "",
        zonalManagerMobile: insuranceCompanyManagement?.zonalManagerMobile || "",
        zonalManagerEmail: insuranceCompanyManagement?.zonalManagerEmail || ""
      },
      businessDetails: {
        businessType: businessDetails?.businessType || "Individual",
        advisorType: businessDetails?.advisorType || "Individual Advisor",
        specialization: businessDetails?.specialization || "General / Health Insurance",
        yearsOfExperience: Number(businessDetails?.yearsOfExperience || 0),
        dateOfJoining: businessDetails?.dateOfJoining || "",
        businessName: businessDetails?.businessName || "",
        gstNumber: (businessDetails?.gstNumber || "").trim().toUpperCase(),
        annualBusinessVolume: Number(businessDetails?.annualBusinessVolume || 0)
      },
      locationDetails: {
        addressLine1: locationDetails?.addressLine1 || "",
        addressLine2: locationDetails?.addressLine2 || "",
        area: locationDetails?.area || "",
        landmark: locationDetails?.landmark || "",
        city: locationDetails?.city || "",
        district: locationDetails?.district || "",
        state: locationDetails?.state || "",
        pincode: locationDetails?.pincode || "",
        country: locationDetails?.country || "India",
        latitude: locationDetails?.latitude,
        longitude: locationDetails?.longitude
      },
      bankDetails: {
        accountHolderName: bankDetails?.accountHolderName || "",
        bankName: bankDetails?.bankName || "",
        accountNumber: bankDetails?.accountNumber || "",
        ifscCode: (bankDetails?.ifscCode || "").trim().toUpperCase(),
        branchName: bankDetails?.branchName || ""
      },
      internalMapping: {
        virtualManagerId: internalMapping?.virtualManagerId || "",
        virtualManagerName: internalMapping?.virtualManagerName || "",
        recruiterName: internalMapping?.recruiterName || "",
        recruiterMobile: internalMapping?.recruiterMobile || "",
        recruitmentDate: internalMapping?.recruitmentDate || "",
        internalDepartment: internalMapping?.internalDepartment || "Agency Channel",
        internalNotes: internalMapping?.internalNotes || ""
      },
      documents: Array.isArray(documents) ? documents : [],
      status: status.toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      notes: notes || "",
      createdBy: uid,
      createdByName: userName || "Admin",
      updatedBy: uid,
      updatedByName: userName || "Admin",
      createdAt: nowIso,
      updatedAt: nowIso
    });

    await newAdvisor.save();

    // Audit Log
    await AuditLog.create({
      tenantId,
      userId: uid,
      userName: userName || "Admin",
      action: "CREATE",
      module: "ADVISOR_MANAGEMENT",
      details: `Created new advisor: ${newAdvisor.personalDetails.fullName} (${newAdvisor.advisorCode}) linked to ${newAdvisor.insuranceDetails.insuranceCompanyName}`
    }).catch(() => {});

    res.status(201).json(newAdvisor);
  } catch (err: any) {
    console.error("Create Advisor Error:", err);
    res.status(500).json({ error: err.message || "Failed to create advisor" });
  }
});

// ----------------------------------------------------
// 5. PUT /api/advisors/:id - Update Advisor Record
// ----------------------------------------------------
router.put("/:id", authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { role, uid, name: userName } = req.user;
    const tenantId = role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");

    const query = getSafeIdQuery(id, tenantId, role);
    const existing = await AdvisorModel.findOne(query);

    if (!existing) {
      return res.status(404).json({ error: "Advisor not found" });
    }

    const {
      advisorCode,
      personalDetails,
      identityDetails,
      contactDetails,
      insuranceDetails,
      branchDetails,
      insuranceCompanyManagement,
      businessDetails,
      locationDetails,
      bankDetails,
      internalMapping,
      documents,
      status,
      notes
    } = req.body;

    if (personalDetails?.fullName && !personalDetails.fullName.trim()) {
      return res.status(400).json({ error: "Advisor Full Name cannot be empty" });
    }
    if (contactDetails?.mobileNumber && !contactDetails.mobileNumber.trim()) {
      return res.status(400).json({ error: "Primary Mobile Number cannot be empty" });
    }

    // Check unique advisor code if changed
    if (advisorCode && advisorCode.trim().toUpperCase() !== existing.advisorCode) {
      const codeUpper = advisorCode.trim().toUpperCase();
      const duplicateCode = await AdvisorModel.findOne({ tenantId, advisorCode: codeUpper, id: { $ne: existing.id } });
      if (duplicateCode) {
        return res.status(400).json({ error: `Advisor Code "${codeUpper}" is already in use by another advisor.` });
      }
      existing.advisorCode = codeUpper;
    }

    if (personalDetails) {
      existing.personalDetails = {
        fullName: personalDetails.fullName?.trim() || existing.personalDetails.fullName,
        fatherOrSpouseName: personalDetails.fatherOrSpouseName !== undefined ? personalDetails.fatherOrSpouseName : existing.personalDetails.fatherOrSpouseName,
        dateOfBirth: personalDetails.dateOfBirth !== undefined ? personalDetails.dateOfBirth : existing.personalDetails.dateOfBirth,
        gender: personalDetails.gender || existing.personalDetails.gender,
        maritalStatus: personalDetails.maritalStatus || existing.personalDetails.maritalStatus,
        profilePhoto: personalDetails.profilePhoto !== undefined ? personalDetails.profilePhoto : existing.personalDetails.profilePhoto
      };
    }

    if (identityDetails) {
      existing.identityDetails = {
        panNumber: (identityDetails.panNumber || "").trim().toUpperCase(),
        aadhaarNumber: (identityDetails.aadhaarNumber || "").trim(),
        advisorLicenseNumber: (identityDetails.advisorLicenseNumber || "").trim(),
        licenseExpiryDate: identityDetails.licenseExpiryDate || ""
      };
    }

    if (contactDetails) {
      existing.contactDetails = {
        mobileNumber: contactDetails.mobileNumber?.trim() || existing.contactDetails.mobileNumber,
        alternateMobileNumber: contactDetails.alternateMobileNumber !== undefined ? contactDetails.alternateMobileNumber : existing.contactDetails.alternateMobileNumber,
        email: contactDetails.email !== undefined ? contactDetails.email.trim().toLowerCase() : existing.contactDetails.email,
        whatsappNumber: contactDetails.whatsappNumber !== undefined ? contactDetails.whatsappNumber : existing.contactDetails.whatsappNumber
      };
    }

    if (insuranceDetails) {
      let compName = insuranceDetails.insuranceCompanyName;
      if (!compName && insuranceDetails.insuranceCompanyId) {
        const comp = await InsuranceCompanyModel.findOne({ id: insuranceDetails.insuranceCompanyId }).lean();
        if (comp) compName = comp.name;
      }
      existing.insuranceDetails = {
        insuranceCompanyId: insuranceDetails.insuranceCompanyId || existing.insuranceDetails.insuranceCompanyId,
        insuranceCompanyName: compName || existing.insuranceDetails.insuranceCompanyName
      };
    }

    if (branchDetails) {
      existing.branchDetails = {
        branchName: branchDetails.branchName?.trim() || existing.branchDetails.branchName,
        branchCode: branchDetails.branchCode !== undefined ? branchDetails.branchCode : existing.branchDetails.branchCode,
        branchAddress: branchDetails.branchAddress !== undefined ? branchDetails.branchAddress : existing.branchDetails.branchAddress,
        branchArea: branchDetails.branchArea !== undefined ? branchDetails.branchArea : existing.branchDetails.branchArea,
        branchCity: branchDetails.branchCity !== undefined ? branchDetails.branchCity : existing.branchDetails.branchCity,
        branchState: branchDetails.branchState !== undefined ? branchDetails.branchState : existing.branchDetails.branchState,
        branchPincode: branchDetails.branchPincode !== undefined ? branchDetails.branchPincode : existing.branchDetails.branchPincode
      };
    }

    if (insuranceCompanyManagement) {
      existing.insuranceCompanyManagement = {
        branchManagerName: insuranceCompanyManagement.branchManagerName !== undefined ? insuranceCompanyManagement.branchManagerName : existing.insuranceCompanyManagement?.branchManagerName,
        branchManagerMobile: insuranceCompanyManagement.branchManagerMobile !== undefined ? insuranceCompanyManagement.branchManagerMobile : existing.insuranceCompanyManagement?.branchManagerMobile,
        branchManagerEmail: insuranceCompanyManagement.branchManagerEmail !== undefined ? insuranceCompanyManagement.branchManagerEmail : existing.insuranceCompanyManagement?.branchManagerEmail,
        areaManagerName: insuranceCompanyManagement.areaManagerName !== undefined ? insuranceCompanyManagement.areaManagerName : existing.insuranceCompanyManagement?.areaManagerName,
        areaManagerMobile: insuranceCompanyManagement.areaManagerMobile !== undefined ? insuranceCompanyManagement.areaManagerMobile : existing.insuranceCompanyManagement?.areaManagerMobile,
        areaManagerEmail: insuranceCompanyManagement.areaManagerEmail !== undefined ? insuranceCompanyManagement.areaManagerEmail : existing.insuranceCompanyManagement?.areaManagerEmail,
        zonalManagerName: insuranceCompanyManagement.zonalManagerName !== undefined ? insuranceCompanyManagement.zonalManagerName : existing.insuranceCompanyManagement?.zonalManagerName,
        zonalManagerMobile: insuranceCompanyManagement.zonalManagerMobile !== undefined ? insuranceCompanyManagement.zonalManagerMobile : existing.insuranceCompanyManagement?.zonalManagerMobile,
        zonalManagerEmail: insuranceCompanyManagement.zonalManagerEmail !== undefined ? insuranceCompanyManagement.zonalManagerEmail : existing.insuranceCompanyManagement?.zonalManagerEmail
      };
    }

    if (businessDetails) {
      existing.businessDetails = {
        businessType: businessDetails.businessType || existing.businessDetails?.businessType || "Individual",
        advisorType: businessDetails.advisorType || existing.businessDetails?.advisorType || "Individual Advisor",
        specialization: businessDetails.specialization || existing.businessDetails?.specialization || "",
        yearsOfExperience: Number(businessDetails.yearsOfExperience ?? existing.businessDetails?.yearsOfExperience ?? 0),
        dateOfJoining: businessDetails.dateOfJoining !== undefined ? businessDetails.dateOfJoining : existing.businessDetails?.dateOfJoining,
        businessName: businessDetails.businessName !== undefined ? businessDetails.businessName : existing.businessDetails?.businessName,
        gstNumber: businessDetails.gstNumber !== undefined ? businessDetails.gstNumber.trim().toUpperCase() : existing.businessDetails?.gstNumber,
        annualBusinessVolume: Number(businessDetails.annualBusinessVolume ?? existing.businessDetails?.annualBusinessVolume ?? 0)
      };
    }

    if (locationDetails) {
      existing.locationDetails = {
        addressLine1: locationDetails.addressLine1 !== undefined ? locationDetails.addressLine1 : existing.locationDetails?.addressLine1,
        addressLine2: locationDetails.addressLine2 !== undefined ? locationDetails.addressLine2 : existing.locationDetails?.addressLine2,
        area: locationDetails.area !== undefined ? locationDetails.area : existing.locationDetails?.area,
        landmark: locationDetails.landmark !== undefined ? locationDetails.landmark : existing.locationDetails?.landmark,
        city: locationDetails.city !== undefined ? locationDetails.city : existing.locationDetails?.city,
        district: locationDetails.district !== undefined ? locationDetails.district : existing.locationDetails?.district,
        state: locationDetails.state !== undefined ? locationDetails.state : existing.locationDetails?.state,
        pincode: locationDetails.pincode !== undefined ? locationDetails.pincode : existing.locationDetails?.pincode,
        country: locationDetails.country || existing.locationDetails?.country || "India",
        latitude: locationDetails.latitude,
        longitude: locationDetails.longitude
      };
    }

    if (bankDetails) {
      existing.bankDetails = {
        accountHolderName: bankDetails.accountHolderName !== undefined ? bankDetails.accountHolderName : existing.bankDetails?.accountHolderName,
        bankName: bankDetails.bankName !== undefined ? bankDetails.bankName : existing.bankDetails?.bankName,
        accountNumber: bankDetails.accountNumber !== undefined ? bankDetails.accountNumber : existing.bankDetails?.accountNumber,
        ifscCode: bankDetails.ifscCode !== undefined ? bankDetails.ifscCode.trim().toUpperCase() : existing.bankDetails?.ifscCode,
        branchName: bankDetails.branchName !== undefined ? bankDetails.branchName : existing.bankDetails?.branchName
      };
    }

    if (internalMapping) {
      existing.internalMapping = {
        virtualManagerId: internalMapping.virtualManagerId !== undefined ? internalMapping.virtualManagerId : existing.internalMapping?.virtualManagerId,
        virtualManagerName: internalMapping.virtualManagerName !== undefined ? internalMapping.virtualManagerName : existing.internalMapping?.virtualManagerName,
        recruiterName: internalMapping.recruiterName !== undefined ? internalMapping.recruiterName : existing.internalMapping?.recruiterName,
        recruiterMobile: internalMapping.recruiterMobile !== undefined ? internalMapping.recruiterMobile : existing.internalMapping?.recruiterMobile,
        recruitmentDate: internalMapping.recruitmentDate !== undefined ? internalMapping.recruitmentDate : existing.internalMapping?.recruitmentDate,
        internalDepartment: internalMapping.internalDepartment || existing.internalMapping?.internalDepartment || "Agency Channel",
        internalNotes: internalMapping.internalNotes !== undefined ? internalMapping.internalNotes : existing.internalMapping?.internalNotes
      };
    }

    if (documents && Array.isArray(documents)) {
      existing.documents = documents;
    }

    if (status) {
      existing.status = status.toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE";
    }

    if (notes !== undefined) {
      existing.notes = notes;
    }

    existing.updatedBy = uid;
    existing.updatedByName = userName || "Admin";
    existing.updatedAt = new Date().toISOString();

    await existing.save();

    // Propagate advisorName & advisorCode updates to linked policies
    await PolicyModel.updateMany(
      { advisorId: existing.id },
      {
        $set: {
          advisorName: existing.personalDetails.fullName,
          advisorCode: existing.advisorCode
        }
      }
    ).catch(() => {});

    // Audit Log
    await AuditLog.create({
      tenantId,
      userId: uid,
      userName: userName || "Admin",
      action: "UPDATE",
      module: "ADVISOR_MANAGEMENT",
      details: `Updated advisor details for: ${existing.personalDetails.fullName} (${existing.advisorCode})`
    }).catch(() => {});

    res.json(existing);
  } catch (err: any) {
    console.error("Update Advisor Error:", err);
    res.status(500).json({ error: err.message || "Failed to update advisor" });
  }
});

// ----------------------------------------------------
// 5.5 POST /api/advisors/:id/documents - Directly Upload & Attach Documents to an Advisor
// ----------------------------------------------------
router.post("/:id/documents", authenticateToken, (req: any, res: Response) => {
  upload.array("files", 10)(req, res, async (err: any) => {
    if (err) {
      console.error("Advisor direct document upload error:", err);
      return res.status(400).json({ error: err.message || "File upload error" });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    try {
      const { id } = req.params;
      const { role, uid, name: userName } = req.user;
      const tenantId = role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");

      const query = getSafeIdQuery(id, tenantId, role);
      const advisor = await AdvisorModel.findOne(query);

      if (!advisor) {
        return res.status(404).json({ error: "Advisor not found" });
      }

      const docType = req.body.documentType || "Other Documents";
      const customTitle = req.body.customTitle || "";

      const newDocs = files.map(file => ({
        documentId: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        documentType: docType,
        documentName: customTitle || file.originalname,
        originalName: file.originalname,
        storedName: file.filename,
        path: `/uploads/${file.filename}`,
        size: file.size,
        mimeType: file.mimetype,
        status: "Verified",
        uploadedAt: new Date().toISOString()
      }));

      advisor.documents = [...(advisor.documents || []), ...newDocs];
      advisor.updatedBy = uid;
      advisor.updatedByName = userName || "Admin";
      advisor.updatedAt = new Date().toISOString();

      await advisor.save();

      // Audit Log
      await AuditLog.create({
        tenantId,
        userId: uid,
        userName: userName || "Admin",
        action: "UPLOAD_DOCUMENT",
        module: "ADVISOR_MANAGEMENT",
        details: `Uploaded ${newDocs.length} document(s) (${docType}) for advisor: ${advisor.personalDetails.fullName} (${advisor.advisorCode})`
      }).catch(() => {});

      res.json({ success: true, documents: advisor.documents, addedDocuments: newDocs });
    } catch (saveErr: any) {
      console.error("Direct document upload save error:", saveErr);
      res.status(500).json({ error: saveErr.message || "Failed to attach document to advisor" });
    }
  });
});

// ----------------------------------------------------
// 6. DELETE /api/advisors/:id/documents/:docId - Remove Attached Document
// ----------------------------------------------------
router.delete("/:id/documents/:docId", authenticateToken, async (req: any, res: Response) => {
  try {
    const { id, docId } = req.params;
    const { role, uid, name: userName } = req.user;
    const tenantId = role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");

    const query = getSafeIdQuery(id, tenantId, role);
    const advisor = await AdvisorModel.findOne(query);

    if (!advisor) {
      return res.status(404).json({ error: "Advisor not found" });
    }

    const initialCount = advisor.documents?.length || 0;
    advisor.documents = (advisor.documents || []).filter((d: any) => d.documentId !== docId && d._id?.toString() !== docId);

    if (advisor.documents.length === initialCount) {
      return res.status(404).json({ error: "Document not found" });
    }

    advisor.updatedBy = uid;
    advisor.updatedByName = userName || "Admin";
    advisor.updatedAt = new Date().toISOString();
    await advisor.save();

    res.json({ success: true, documents: advisor.documents });
  } catch (err: any) {
    console.error("Delete Advisor Document Error:", err);
    res.status(500).json({ error: err.message || "Failed to delete advisor document" });
  }
});

// ----------------------------------------------------
// 7. PATCH /api/advisors/:id/status - Toggle Advisor Status
// ----------------------------------------------------
router.patch("/:id/status", authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { role, uid, name: userName } = req.user;
    const tenantId = role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");

    if (!status || !["ACTIVE", "INACTIVE"].includes(status.toUpperCase())) {
      return res.status(400).json({ error: "Invalid status value. Must be ACTIVE or INACTIVE" });
    }

    const query = getSafeIdQuery(id, tenantId, role);
    const updated = await AdvisorModel.findOneAndUpdate(
      query,
      {
        $set: {
          status: status.toUpperCase(),
          updatedBy: uid,
          updatedByName: userName || "Admin",
          updatedAt: new Date().toISOString()
        }
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Advisor not found" });
    }

    // Audit Log
    await AuditLog.create({
      tenantId,
      userId: uid,
      userName: userName || "Admin",
      action: "UPDATE_STATUS",
      module: "ADVISOR_MANAGEMENT",
      details: `Changed status of advisor ${updated.personalDetails.fullName} (${updated.advisorCode}) to ${updated.status}`
    }).catch(() => {});

    res.json(updated);
  } catch (err: any) {
    console.error("Update Advisor Status Error:", err);
    res.status(500).json({ error: err.message || "Failed to update advisor status" });
  }
});

// ----------------------------------------------------
// 8. DELETE /api/advisors/:id - Safe Advisor Deletion Check
// ----------------------------------------------------
router.delete("/:id", authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { role, uid, name: userName } = req.user;
    const tenantId = role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");

    const query = getSafeIdQuery(id, tenantId, role);
    const advisor = await AdvisorModel.findOne(query);

    if (!advisor) {
      return res.status(404).json({ error: "Advisor not found" });
    }

    // Check linked policies in MongoDB Atlas
    const linkedPoliciesCount = await PolicyModel.countDocuments({ advisorId: advisor.id });

    if (linkedPoliciesCount > 0) {
      return res.status(400).json({
        error: `Cannot delete Advisor "${advisor.personalDetails.fullName}". This advisor is referenced by ${linkedPoliciesCount} policy records in the system. Please deactivate this advisor instead to preserve historical policy ledger records.`,
        linkedPoliciesCount
      });
    }

    await AdvisorModel.deleteOne({ _id: advisor._id });

    // Audit Log
    await AuditLog.create({
      tenantId,
      userId: uid,
      userName: userName || "Admin",
      action: "DELETE",
      module: "ADVISOR_MANAGEMENT",
      details: `Deleted advisor: ${advisor.personalDetails.fullName} (${advisor.advisorCode})`
    }).catch(() => {});

    res.json({ success: true, message: "Advisor successfully deleted" });
  } catch (err: any) {
    console.error("Delete Advisor Error:", err);
    res.status(500).json({ error: err.message || "Failed to delete advisor" });
  }
});

export default router;
