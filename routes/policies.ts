import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { PolicyModel, TeamLeader, Caller, Customer, InsuranceCompanyModel, BranchManager, TeamManager, RenewalManager, RenewalExecutive } from "../models";

import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "policy_master_jwt_secret_key_2026_mongodb";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBaseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
    const uniqueSuffix = Date.now() + "_" + Math.random().toString(36).substr(2, 6);
    cb(null, `doc_${cleanBaseName}_${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
  const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }
});

// POLICIES: Document Upload Endpoint
router.post("/upload", (req, res) => {
  upload.array("files", 10)(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || "File upload error" });
    }
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const uploadedDocs = files.map(file => ({
      originalName: file.originalname,
      storedName: file.filename,
      path: `/uploads/${file.filename}`,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString()
    }));

    res.json({ success: true, documents: uploadedDocs });
  });
});

// POLICIES: Safe Document Download Endpoint
router.get("/download/:filename", (req, res) => {
  try {
    const rawFilename = req.params.filename;
    const safeFilename = path.basename(rawFilename);
    const filePath = path.join(uploadsDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on server" });
    }

    const originalName = (req.query.originalName as string) || safeFilename;
    res.download(filePath, originalName, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ error: "Failed to download file" });
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Download error" });
  }
});

// Helper to extract user token
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

// POLICIES: Clear All Dummy Data
router.all("/clear-all", async (req, res) => {
  try {
    const deleted = await PolicyModel.deleteMany({});
    res.json({ success: true, message: `Cleared ${deleted.deletedCount} policies from MongoDB Atlas.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POLICIES: Get All (with Strict Data Scope Isolation)
router.get("/", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const userIdQuery = req.query.userId as string;

    let query: any = {};
    if (user) {
      if (user.role === "SUPER_ADMIN") {
        query = userIdQuery ? { userId: userIdQuery } : {};
      } else {
        query = { tenantId: user.tenantId || "tenant-default" };
      }
    } else if (userIdQuery) {
      query = { userId: userIdQuery };
    }

    const policies = await PolicyModel.find(query).sort({ createdAt: -1 }).lean();
    res.json(policies);
  } catch (err: any) {
    console.error("Fetch Policies Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch policies from MongoDB" });
  }
});

// POLICIES: Add New with Relationship & Permission Validation
router.post("/", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const policyData = { ...req.body };

    if (!policyData.id) {
      policyData.id = "pol_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
    }
    if (!policyData.policyNumber || typeof policyData.policyNumber !== "string" || !policyData.policyNumber.trim()) {
      policyData.policyNumber = "POL-" + Date.now().toString().slice(-6);
    }

    const userUid = user?.uid || user?._id || "system-user";
    policyData.userId = policyData.userId && policyData.userId !== "undefined" ? policyData.userId : userUid;

    if (user) {
      policyData.tenantId = user.tenantId || "tenant-default";
      policyData.createdBy = userUid;
      policyData.createdByName = user.name || user.email;
    }

    if (!policyData.callerId && policyData.tseId) policyData.callerId = policyData.tseId;
    if (!policyData.tseId && policyData.callerId) policyData.tseId = policyData.callerId;

    // Normalize Business Type & Subtype
    let bType = policyData.businessType || "NEW_BUSINESS";
    let bSubtype = policyData.businessSubtype || null;

    if (bType === "PORT") {
      bType = "NEW_BUSINESS";
      bSubtype = "PORT";
    } else if (bType === "NEW BUSINESS" || bType === "NEW_BUSINESS") {
      bType = "NEW_BUSINESS";
      if (!bSubtype) bSubtype = "FRESH";
    } else if (bType === "RENEWAL") {
      bType = "RENEWAL";
      bSubtype = null;
    }

    policyData.businessType = bType;
    policyData.businessSubtype = bSubtype;

    // Backend Security Authorization Validation for Data Executives
    if (user && user.role === "OPERATOR") {
      const userPerms = Array.isArray(user.permissions) ? user.permissions : [];
      if (bType === "RENEWAL") {
        const hasRenewal = userPerms.includes("policies.create_renewal") || userPerms.includes("policies.create");
        if (!hasRenewal) {
          return res.status(403).json({ error: "Forbidden: You do not have permission to create Renewal policy records" });
        }
      } else {
        const hasNewBusiness = userPerms.includes("policies.create_new_business") || userPerms.includes("policies.create");
        if (!hasNewBusiness) {
          return res.status(403).json({ error: "Forbidden: You do not have permission to create New Business policy records" });
        }
      }
    }

    if (!policyData.policyType || typeof policyData.policyType !== "string" || !policyData.policyType.trim()) {
      policyData.policyType = policyData.categoryName || "Health Insurance";
    }

    // Business Type & Portability Details Handling
    if (bSubtype === "PORT") {
      const prevComp = (policyData.portabilityDetails?.previousInsuranceCompany || policyData.previousInsuranceCompany || "").trim();
      policyData.portabilityDetails = {
        previousInsuranceCompany: prevComp,
        previousPolicyNumber: policyData.portabilityDetails?.previousPolicyNumber || policyData.previousPolicyNumber || "",
        previousProductName: policyData.portabilityDetails?.previousProductName || policyData.previousProductName || "",
        previousPolicyExpiryDate: policyData.portabilityDetails?.previousPolicyExpiryDate || policyData.previousPolicyExpiryDate || "",
        previousSumInsured: policyData.portabilityDetails?.previousSumInsured || policyData.previousSumInsured || 0
      };
    } else {
      policyData.portabilityDetails = undefined;
    }

    // Policy Source Handling
    const sourceType = policyData.sourceType || "sales_team";
    policyData.sourceType = sourceType;

    if (sourceType === "direct" || sourceType === "referral") {
      policyData.sourcePersonName = policyData.sourcePersonName || "";
      policyData.bmId = "";
      policyData.bmName = "";
      policyData.teamLeaderId = "";
      policyData.teamLeaderName = "";
      policyData.callerId = "";
      policyData.callerName = "";
      policyData.tseId = "";
      policyData.tseName = "";
    } else {
      policyData.sourcePersonName = "";
      policyData.sourcePersonMobile = "";
      policyData.referenceType = "";
      policyData.sourceRemark = "";
    }

    // Default Fallbacks for Optional Period & Status fields
    policyData.customerType = policyData.customerType || "Individual";
    policyData.whatsappNumber = policyData.whatsappNumber || "";
    policyData.premiumFrequency = policyData.premiumFrequency || "Yearly";
    
    // Sum Assured & Sum Assured Type Handling (Fixed vs Unlimited)
    if (policyData.sumAssuredType === "UNLIMITED" || policyData.sumAssured === "UNLIMITED" || (policyData.sumAssured === null && policyData.sumAssuredType === "UNLIMITED")) {
      policyData.sumAssuredType = "UNLIMITED";
      policyData.sumAssured = null;
    } else {
      policyData.sumAssuredType = "FIXED";
      policyData.sumAssured = Number(policyData.sumAssured) || 0;
    }

    policyData.premiumStatus = policyData.premiumStatus || (policyData.businessType === "RENEWAL" ? "Not Set" : "Pending");
    policyData.startDate = policyData.startDate || policyData.businessLoginDate || new Date().toISOString().split('T')[0];

    // Cashback Details Handling
    const isCashback = policyData.cashbackEnabled === true || policyData.cashbackEnabled === "true" || policyData.cashbackEnabled === "Yes" || policyData.cashback === "Yes";
    policyData.cashbackEnabled = isCashback;
    policyData.cashbackAmount = isCashback ? (Number(policyData.cashbackAmount) || 0) : 0;

    // Auto-calculate & snapshot payout percentage & expected commission if company specified
    if (policyData.companyName || policyData.insuranceCompanyId) {
      let companyDoc: any = null;
      if (policyData.insuranceCompanyId) {
        companyDoc = await InsuranceCompanyModel.findOne({ id: policyData.insuranceCompanyId });
      }
      if (!companyDoc && policyData.companyName) {
        companyDoc = await InsuranceCompanyModel.findOne({
          tenantId: policyData.tenantId,
          name: { $regex: new RegExp(`^${policyData.companyName.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, "i") }
        });
      }
      if (companyDoc) {
        policyData.insuranceCompanyId = companyDoc.id;
        if (policyData.appliedPayoutPercentage === undefined) {
          policyData.appliedPayoutPercentage = policyData.businessType === "RENEWAL" 
            ? companyDoc.renewalPayoutPercentage 
            : companyDoc.newBusinessPayoutPercentage;
        }
      }
      const pAmt = Number(policyData.premiumAmount || 0);
      const pPct = Number(policyData.appliedPayoutPercentage || 0);
      if (policyData.expectedCommission === undefined) {
        policyData.expectedCommission = Math.round((pAmt * pPct) / 100);
      }
    }

    // Relationship Validation & Attribution for TSE / Caller
    const targetCallerId = policyData.callerId || policyData.tseId;
    if (targetCallerId) {
      const isObjId = mongoose.Types.ObjectId.isValid(targetCallerId) && targetCallerId.length === 24;
      const callerQuery = isObjId ? { $or: [{ id: targetCallerId }, { _id: targetCallerId }] } : { id: targetCallerId };
      const callerRecord = await (Caller as any).findOne(callerQuery);

      if (callerRecord) {
        policyData.callerName = callerRecord.name;
        policyData.tseName = callerRecord.name;
        policyData.callerId = callerRecord.id;
        policyData.tseId = callerRecord.id;
      }
    }

   if (!policyData.policyStatus) {
      policyData.policyStatus = "Issued";
    }

    // Relationship & Attribution Validation for Renewal vs Sales Team
    if (bType === "RENEWAL") {
      policyData.bmId = "";
      policyData.bmName = "";
      policyData.teamManagerId = "";
      policyData.teamManagerName = "";
      policyData.teamLeaderId = "";
      policyData.teamLeaderName = "";
      policyData.callerId = "";
      policyData.callerName = "";
      policyData.tseId = "";
      policyData.tseName = "";

      if (policyData.renewalManagerId) {
        const rmDoc = await (RenewalManager as any).findOne({
          $or: [
            { id: policyData.renewalManagerId },
            ...(mongoose.Types.ObjectId.isValid(policyData.renewalManagerId) && policyData.renewalManagerId.length === 24 ? [{ _id: policyData.renewalManagerId }] : [])
          ]
        });
        if (rmDoc) {
          policyData.renewalManagerName = rmDoc.name;
          policyData.renewalManagerId = rmDoc.id;
        }
      }

      if (policyData.renewalExecutiveId) {
        const reDoc = await (RenewalExecutive as any).findOne({
          $or: [
            { id: policyData.renewalExecutiveId },
            ...(mongoose.Types.ObjectId.isValid(policyData.renewalExecutiveId) && policyData.renewalExecutiveId.length === 24 ? [{ _id: policyData.renewalExecutiveId }] : [])
          ]
        });
        if (reDoc) {
          policyData.renewalExecutiveName = reDoc.name;
          policyData.renewalExecutiveId = reDoc.id;
          if (!policyData.renewalManagerId && reDoc.renewalManagerId) {
            policyData.renewalManagerId = reDoc.renewalManagerId;
            const rmDoc = await (RenewalManager as any).findOne({ id: reDoc.renewalManagerId });
            if (rmDoc) policyData.renewalManagerName = rmDoc.name;
          }
        }
      }
    } else {
      policyData.renewalManagerId = "";
      policyData.renewalManagerName = "";
      policyData.renewalExecutiveId = "";
      policyData.renewalExecutiveName = "";

      if (policyData.bmId) {
        const bmDoc = await (BranchManager as any).findOne({ id: policyData.bmId });
        if (bmDoc) policyData.bmName = bmDoc.name;
      }

      if (policyData.teamManagerId) {
        const tmDoc = await (TeamManager as any).findOne({ id: policyData.teamManagerId });
        if (tmDoc) policyData.teamManagerName = tmDoc.name;
      }

      if (policyData.teamLeaderId) {
        const tlDoc = await (TeamLeader as any).findOne({ id: policyData.teamLeaderId });
        if (tlDoc) {
          policyData.teamLeaderName = tlDoc.name;
          if (!policyData.bmId && tlDoc.bmId) {
            policyData.bmId = tlDoc.bmId;
            const bmDoc = await (BranchManager as any).findOne({ id: tlDoc.bmId });
            if (bmDoc) policyData.bmName = bmDoc.name;
          }
          if (!policyData.teamManagerId && tlDoc.teamManagerId) {
            policyData.teamManagerId = tlDoc.teamManagerId;
            const tmDoc = await (TeamManager as any).findOne({ id: tlDoc.teamManagerId });
            if (tmDoc) policyData.teamManagerName = tmDoc.name;
          }
        }
      }
    }

    const newPolicy = await PolicyModel.create(policyData);

    // Also sync/create Customer record if not existing
    if (policyData.customerName) {
      try {
        const custId = policyData.customerId || `cust_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        await (Customer as any).findOneAndUpdate(
          { customerEmail: policyData.customerEmail, tenantId: policyData.tenantId },
          {
            id: custId,
            tenantId: policyData.tenantId,
            customerName: policyData.customerName,
            customerPhone: policyData.customerPhone,
            customerEmail: policyData.customerEmail,
            dob: policyData.customerBirthday,
            gender: policyData.gender,
            maritalStatus: policyData.maritalStatus,
            anniversaryDate: policyData.anniversaryDate,
            occupation: policyData.occupation,
            houseFlat: policyData.houseFlat,
            streetArea: policyData.streetArea,
            landmark: policyData.landmark,
            address: policyData.address,
            city: policyData.city,
            district: policyData.district,
            state: policyData.state,
            pincode: policyData.pincode,
            familyMembers: policyData.familyMembersList || [],
            healthDetails: policyData.healthDetails || {},
            teamLeaderId: policyData.teamLeaderId,
            teamLeaderName: policyData.teamLeaderName,
            callerId: policyData.callerId,
            callerName: policyData.callerName,
            createdBy: user?.uid,
            createdByName: user?.name || user?.email
          },
          { upsert: true, new: true }
        );
      } catch (cErr) {
        console.warn("Customer auto-sync note:", cErr);
      }
    }

    res.json(newPolicy);
  } catch (err: any) {
    console.error("Add Policy Error:", err);
    res.status(500).json({ error: err.message || "Failed to create policy in MongoDB" });
  }
});

// POLICIES: Update
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = getUserFromToken(req);

    if (user && user.role === "OPERATOR") {
      if (!user.permissions || !user.permissions.includes("policies.edit")) {
        return res.status(403).json({ error: "Access denied: Missing policies.edit permission" });
      }
    }

    const updatedData = { ...req.body, updatedAt: new Date().toISOString() };

    if (user) {
      updatedData.updatedBy = user.uid;
      updatedData.updatedByName = user.name || user.email;
    }

    if (updatedData.policyType !== undefined && (!updatedData.policyType || typeof updatedData.policyType !== "string" || !updatedData.policyType.trim())) {
      updatedData.policyType = "Health Insurance";
    }

    if (updatedData.businessType !== undefined || updatedData.businessSubtype !== undefined) {
      let rawType = String(updatedData.businessType || "").toUpperCase();
      let rawSubtype = String(updatedData.businessSubtype || "").toUpperCase();

      let bType = "NEW_BUSINESS";
      let bSubtype: string | null = "FRESH";

      if (rawType === "PORT" || rawSubtype === "PORT") {
        bType = "NEW_BUSINESS";
        bSubtype = "PORT";
      } else if (rawType === "RENEWAL") {
        bType = "RENEWAL";
        bSubtype = null;
      } else {
        bType = "NEW_BUSINESS";
        bSubtype = "FRESH";
      }

      updatedData.businessType = bType;
      updatedData.businessSubtype = bSubtype;

      if (bSubtype === "PORT") {
        const prevComp = (updatedData.portabilityDetails?.previousInsuranceCompany || updatedData.previousInsuranceCompany || "").trim();
        updatedData.portabilityDetails = {
          previousInsuranceCompany: prevComp,
          previousPolicyNumber: updatedData.portabilityDetails?.previousPolicyNumber || updatedData.previousPolicyNumber || "",
          previousProductName: updatedData.portabilityDetails?.previousProductName || updatedData.previousProductName || "",
          previousPolicyExpiryDate: updatedData.portabilityDetails?.previousPolicyExpiryDate || updatedData.previousPolicyExpiryDate || "",
          previousSumInsured: updatedData.portabilityDetails?.previousSumInsured || updatedData.previousSumInsured || 0
        };
      } else {
        updatedData.portabilityDetails = undefined;
      }
    }

    if (updatedData.sourceType !== undefined) {
      const sType = updatedData.sourceType || "sales_team";
      updatedData.sourceType = sType;

      if (sType === "direct" || sType === "referral") {
        if (!updatedData.sourcePersonName || !updatedData.sourcePersonName.trim()) {
          const label = sType === "referral" ? "Referred By" : "Source Person Name";
          return res.status(400).json({ error: `${label} is required for ${sType === "referral" ? "Referral" : "Direct"} policies` });
        }
        updatedData.bmId = "";
        updatedData.bmName = "";
        updatedData.teamLeaderId = "";
        updatedData.teamLeaderName = "";
        updatedData.callerId = "";
        updatedData.callerName = "";
        updatedData.tseId = "";
        updatedData.tseName = "";
      } else if (sType === "sales_team") {
        updatedData.sourcePersonName = "";
        updatedData.sourcePersonMobile = "";
        updatedData.referenceType = "";
        updatedData.sourceRemark = "";
      }
    }

    // Relationship Validation & Attribution for Renewal vs Sales Team
    if (updatedData.businessType === "RENEWAL") {
      updatedData.bmId = "";
      updatedData.bmName = "";
      updatedData.teamManagerId = "";
      updatedData.teamManagerName = "";
      updatedData.teamLeaderId = "";
      updatedData.teamLeaderName = "";
      updatedData.callerId = "";
      updatedData.callerName = "";
      updatedData.tseId = "";
      updatedData.tseName = "";

      if (updatedData.renewalManagerId) {
        const rmDoc = await (RenewalManager as any).findOne({
          $or: [
            { id: updatedData.renewalManagerId },
            ...(mongoose.Types.ObjectId.isValid(updatedData.renewalManagerId) && updatedData.renewalManagerId.length === 24 ? [{ _id: updatedData.renewalManagerId }] : [])
          ]
        });
        if (rmDoc) {
          updatedData.renewalManagerName = rmDoc.name;
          updatedData.renewalManagerId = rmDoc.id;
        }
      }

      if (updatedData.renewalExecutiveId) {
        const reDoc = await (RenewalExecutive as any).findOne({
          $or: [
            { id: updatedData.renewalExecutiveId },
            ...(mongoose.Types.ObjectId.isValid(updatedData.renewalExecutiveId) && updatedData.renewalExecutiveId.length === 24 ? [{ _id: updatedData.renewalExecutiveId }] : [])
          ]
        });
        if (reDoc) {
          updatedData.renewalExecutiveName = reDoc.name;
          updatedData.renewalExecutiveId = reDoc.id;
          if (!updatedData.renewalManagerId && reDoc.renewalManagerId) {
            updatedData.renewalManagerId = reDoc.renewalManagerId;
            const rmDoc = await (RenewalManager as any).findOne({ id: reDoc.renewalManagerId });
            if (rmDoc) updatedData.renewalManagerName = rmDoc.name;
          }
        }
      }
    } else {
      updatedData.renewalManagerId = "";
      updatedData.renewalManagerName = "";
      updatedData.renewalExecutiveId = "";
      updatedData.renewalExecutiveName = "";

      // Relationship Validation & Attribution for TSE / Caller
      const targetCallerId = updatedData.callerId || updatedData.tseId;
      if (targetCallerId) {
        const isObjId = mongoose.Types.ObjectId.isValid(targetCallerId) && targetCallerId.length === 24;
        const callerQuery = isObjId ? { $or: [{ id: targetCallerId }, { _id: targetCallerId }] } : { id: targetCallerId };
        const callerRecord = await (Caller as any).findOne(callerQuery);

        if (callerRecord) {
          updatedData.callerName = callerRecord.name;
          updatedData.tseName = callerRecord.name;
        }
      }

      if (updatedData.bmId) {
        const bmDoc = await (BranchManager as any).findOne({ id: updatedData.bmId });
        if (bmDoc) updatedData.bmName = bmDoc.name;
      }

      if (updatedData.teamManagerId) {
        const tmDoc = await (TeamManager as any).findOne({ id: updatedData.teamManagerId });
        if (tmDoc) updatedData.teamManagerName = tmDoc.name;
      }

      if (updatedData.teamLeaderId) {
        const tl = await (TeamLeader as any).findOne({ id: updatedData.teamLeaderId });
        if (tl) {
          updatedData.teamLeaderName = tl.name;
          if (!updatedData.bmId && tl.bmId) {
            updatedData.bmId = tl.bmId;
            const bmDoc = await (BranchManager as any).findOne({ id: tl.bmId });
            if (bmDoc) updatedData.bmName = bmDoc.name;
          }
          if (!updatedData.teamManagerId && tl.teamManagerId) {
            updatedData.teamManagerId = tl.teamManagerId;
            const tmDoc = await (TeamManager as any).findOne({ id: tl.teamManagerId });
            if (tmDoc) updatedData.teamManagerName = tmDoc.name;
          }
        }
      }
    }

    // Auto-calculate & snapshot payout percentage & expected commission if company updated
    if (updatedData.companyName || updatedData.insuranceCompanyId) {
      let companyDoc: any = null;
      if (updatedData.insuranceCompanyId) {
        companyDoc = await InsuranceCompanyModel.findOne({ id: updatedData.insuranceCompanyId });
      }
      if (!companyDoc && updatedData.companyName) {
        companyDoc = await InsuranceCompanyModel.findOne({
          tenantId: user?.tenantId || "tenant-default",
          name: { $regex: new RegExp(`^${updatedData.companyName.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, "i") }
        });
      }
      if (companyDoc) {
        updatedData.insuranceCompanyId = companyDoc.id;
        if (updatedData.appliedPayoutPercentage === undefined) {
          const bType = updatedData.businessType || "NEW BUSINESS";
          updatedData.appliedPayoutPercentage = bType === "RENEWAL" 
            ? companyDoc.renewalPayoutPercentage 
            : companyDoc.newBusinessPayoutPercentage;
        }
      }
    }

    if (updatedData.premiumAmount !== undefined || updatedData.appliedPayoutPercentage !== undefined) {
      const pAmt = Number(updatedData.premiumAmount ?? 0);
      const pPct = Number(updatedData.appliedPayoutPercentage ?? 0);
      if (updatedData.expectedCommission === undefined) {
        updatedData.expectedCommission = Math.round(((pAmt * pPct) / 100) * 100) / 100;
      }
    }

    if (updatedData.commissionStatus !== undefined) {
      if (updatedData.commissionStatus === "Paid") {
        updatedData.commissionPaidAt = updatedData.commissionPaidAt || new Date().toISOString();
        updatedData.commissionMarkedPaidBy = updatedData.commissionMarkedPaidBy || (user ? (user.name || user.email || user.uid) : "System");
      } else {
        updatedData.commissionPaidAt = undefined;
        updatedData.commissionMarkedPaidBy = undefined;
      }
    }

    // Cashback Details Update Handling
    if (updatedData.cashbackEnabled !== undefined || updatedData.cashbackAmount !== undefined || (updatedData as any).cashback !== undefined) {
      const isCashback = updatedData.cashbackEnabled === true || updatedData.cashbackEnabled === "true" || updatedData.cashbackEnabled === "Yes" || (updatedData as any).cashback === "Yes";
      updatedData.cashbackEnabled = isCashback;
      updatedData.cashbackAmount = isCashback ? (Number(updatedData.cashbackAmount) || 0) : 0;
    }

    // Sum Assured & Sum Assured Type Update Handling (Fixed vs Unlimited)
    if (updatedData.sumAssuredType !== undefined || updatedData.sumAssured !== undefined) {
      if (updatedData.sumAssuredType === "UNLIMITED" || updatedData.sumAssured === "UNLIMITED" || (updatedData.sumAssured === null && updatedData.sumAssuredType === "UNLIMITED")) {
        updatedData.sumAssuredType = "UNLIMITED";
        updatedData.sumAssured = null;
      } else if (updatedData.sumAssured !== undefined) {
        updatedData.sumAssuredType = "FIXED";
        updatedData.sumAssured = Number(updatedData.sumAssured) || 0;
      }
    }

    const isObjId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
    const baseQuery: any = isObjId ? { $or: [{ id }, { _id: id }] } : { id };
    const query: any = { ...baseQuery };
    if (user && user.role !== "SUPER_ADMIN") {
      query.tenantId = user.tenantId || "tenant-default";
    }

    const updatedPolicy = await PolicyModel.findOneAndUpdate(query, { $set: updatedData }, { new: true });
    if (!updatedPolicy) {
      return res.status(404).json({ error: "Policy record not found or permission denied" });
    }

    res.json(updatedPolicy);
  } catch (err: any) {
    console.error("Update Policy Error:", err);
    res.status(500).json({ error: err.message || "Failed to update policy in MongoDB" });
  }
});

// POLICIES: Update Commission Payment Status
router.put("/:id/commission-status", async (req, res) => {
  try {
    const { id } = req.params;
    const { commissionStatus } = req.body;
    const user = getUserFromToken(req);

    if (!["Paid", "Unpaid"].includes(commissionStatus)) {
      return res.status(400).json({ error: "Invalid commissionStatus. Must be 'Paid' or 'Unpaid'" });
    }

    const query: any = { id };
    if (user && user.role !== "SUPER_ADMIN") {
      query.tenantId = user.tenantId || "tenant-default";
    }

    const update: any = {
      commissionStatus,
      updatedAt: new Date().toISOString()
    };

    if (user) {
      update.updatedBy = user.uid;
      update.updatedByName = user.name || user.email;
    }

    if (commissionStatus === "Paid") {
      update.commissionPaidAt = new Date().toISOString();
      update.commissionMarkedPaidBy = user ? (user.name || user.email || user.uid) : "System";
    } else {
      update.commissionPaidAt = "";
      update.commissionMarkedPaidBy = "";
    }

    const updatedPolicy = await PolicyModel.findOneAndUpdate(query, { $set: update }, { new: true });
    if (!updatedPolicy) {
      return res.status(404).json({ error: "Policy record not found or permission denied" });
    }

    res.json(updatedPolicy);
  } catch (err: any) {
    console.error("Update Commission Status Error:", err);
    res.status(500).json({ error: err.message || "Failed to update commission status" });
  }
});

// POLICIES: Update Policy-wise Commission Percentage Override
router.put("/:id/commission", async (req, res) => {
  try {
    const { id } = req.params;
    const user = getUserFromToken(req);

    // Access control: SUPER_ADMIN, ADMIN, TENANT_ADMIN or OPERATOR with permission
    if (user && user.role === "OPERATOR") {
      const userPerms = Array.isArray(user.permissions) ? user.permissions : [];
      if (!userPerms.includes("policies.edit") && !userPerms.includes("revenue.view")) {
        return res.status(403).json({ error: "Access denied: You do not have permission to edit policy commission" });
      }
    }

    const { payoutPercentage, commissionPercentage, appliedPayoutPercentage } = req.body;
    const rawPct = payoutPercentage !== undefined 
      ? payoutPercentage 
      : commissionPercentage !== undefined 
      ? commissionPercentage 
      : appliedPayoutPercentage;

    if (rawPct === undefined || rawPct === null || isNaN(Number(rawPct)) || Number(rawPct) < 0) {
      return res.status(400).json({ error: "Invalid commission percentage. Must be a valid positive number." });
    }

    const pct = Math.round(Number(rawPct) * 100) / 100;

    const isObjId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
    const baseQuery: any = isObjId ? { $or: [{ id }, { _id: id }] } : { id };
    const query: any = { ...baseQuery };
    if (user && user.role !== "SUPER_ADMIN") {
      query.tenantId = user.tenantId || "tenant-default";
    }

    const existingPolicy = await PolicyModel.findOne(query);
    if (!existingPolicy) {
      return res.status(404).json({ error: "Policy record not found or permission denied" });
    }

    const premiumAmount = Number(existingPolicy.premiumAmount || 0);
    // Calculated Commission: Premium * Percentage / 100
    const expectedCommission = Math.round(((premiumAmount * pct) / 100) * 100) / 100;

    existingPolicy.appliedPayoutPercentage = pct;
    existingPolicy.expectedCommission = expectedCommission;
    existingPolicy.updatedAt = new Date().toISOString();
    if (user) {
      existingPolicy.updatedBy = user.uid;
      existingPolicy.updatedByName = user.name || user.email;
    }

    await existingPolicy.save();

    res.json({
      success: true,
      message: "Policy commission updated successfully",
      policy: existingPolicy
    });
  } catch (err: any) {
    console.error("Update Policy Commission Error:", err);
    res.status(500).json({ error: err.message || "Failed to update policy commission" });
  }
});

// POLICIES: Wipe All Dummy Data
router.post("/wipe-all-dummy-data", async (req, res) => {
  try {
    const p = await PolicyModel.deleteMany({});
    res.json({ success: true, message: `Successfully wiped ${p.deletedCount} dummy policies from MongoDB Atlas!` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POLICIES: Delete
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = getUserFromToken(req);

    if (user && user.role === "OPERATOR") {
      if (!user.permissions || !user.permissions.includes("policies.delete")) {
        return res.status(403).json({ error: "Access denied: Missing policies.delete permission" });
      }
    }

    const isObjId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
    const conditions: any[] = [{ id: id }];
    if (isObjId) {
      conditions.push({ _id: id });
    }
    const query: any = conditions.length === 1 ? { ...conditions[0] } : { $or: conditions };
    if (user && user.role !== "SUPER_ADMIN" && user.tenantId) {
      query.tenantId = user.tenantId;
    }

    let deleted = await PolicyModel.deleteOne(query);
    if (deleted.deletedCount === 0) {
      // Fallback delete by id field without tenant restriction if tenant match missed
      deleted = await PolicyModel.deleteOne({ id: id });
    }

    if (deleted.deletedCount === 0) {
      return res.status(404).json({ error: "Policy record not found or permission denied" });
    }

    res.json({ success: true, message: "Policy deleted successfully from MongoDB" });
  } catch (err: any) {
    console.error("Delete Policy Error:", err);
    res.status(500).json({ error: err.message || "Failed to delete policy from MongoDB" });
  }
});

// POLICIES: Bulk Import
router.post("/import", async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const { policies, userId } = req.body;
    if (!Array.isArray(policies) || policies.length === 0) {
      res.status(400).json({ error: "No policies provided for import" });
      return;
    }
    const formatted = policies.map((p: any) => {
      const isCashback = p.cashbackEnabled === true || p.cashbackEnabled === "true" || p.cashbackEnabled === "Yes" || p.cashback === "Yes";
      return {
        ...p,
        id: p.id || ("imp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5)),
        cashbackEnabled: isCashback,
        cashbackAmount: isCashback ? (Number(p.cashbackAmount) || 0) : 0,
        userId: userId || p.userId || "guest",
        tenantId: user?.tenantId || p.tenantId || "tenant-default",
        createdBy: user?.uid,
        createdByName: user?.name || user?.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    const result = await PolicyModel.insertMany(formatted);
    res.json({ success: true, count: result.length, data: result });
  } catch (err: any) {
    console.error("Import Policies Error:", err);
    res.status(500).json({ error: err.message || "Failed to import policies into MongoDB" });
  }
});

export default router;
