import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { AgencyProfile } from "../models";

const router = Router();

// Multer config for company logo upload
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "agency");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `company_logo_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  }
});

// GET /api/agency-profile — fetch company profile
router.get("/", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId || (req as any).userId || (req.query.tenantId as string) || (req.query.userId as string);
    if (!tenantId) {
      res.status(400).json({ error: "tenantId is required" });
      return;
    }

    let profile = await AgencyProfile.findOne({ tenantId }).lean();
    if (!profile && tenantId.includes("-")) {
      profile = await AgencyProfile.findOne({ tenantId: tenantId.split("-")[0] }).lean();
    }

    if (!profile) {
      res.json({
        tenantId,
        companyName: "",
        gstNumber: "",
        mobileNumber: "",
        email: "",
        logoUrl: ""
      });
      return;
    }

    const companyName = profile.companyName || profile.agencyName || "";
    const mobileNumber = profile.mobileNumber || profile.mobile || "";

    res.json({
      ...profile,
      companyName,
      agencyName: companyName,
      mobileNumber,
      mobile: mobileNumber
    });
  } catch (err: any) {
    console.error("CompanyProfile GET error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch company profile" });
  }
});

// PUT /api/agency-profile — save simplified company profile
router.put("/", async (req, res) => {
  try {
    const tenantId = req.body.tenantId || (req as any).tenantId || (req as any).userId || req.query.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: "tenantId is required" });
      return;
    }

    const companyName = (req.body.companyName || req.body.agencyName || "").trim();
    const mobileNumber = (req.body.mobileNumber || req.body.mobile || "").trim();
    const gstNumber = (req.body.gstNumber || "").trim();
    const email = (req.body.email || "").trim();
    const logoUrl = (req.body.logoUrl || "").trim();

    if (!companyName) {
      res.status(400).json({ error: "Company Name is required" });
      return;
    }

    if (!mobileNumber) {
      res.status(400).json({ error: "Mobile Number is required" });
      return;
    }

    const updateFields = {
      tenantId,
      companyName,
      agencyName: companyName,
      gstNumber,
      mobileNumber,
      mobile: mobileNumber,
      email,
      logoUrl,
      updatedAt: new Date()
    };

    const updated = await AgencyProfile.findOneAndUpdate(
      { tenantId },
      { $set: updateFields },
      { upsert: true, new: true }
    );

    res.json({ success: true, profile: updated });
  } catch (err: any) {
    console.error("CompanyProfile PUT error:", err);
    res.status(500).json({ error: err.message || "Failed to save company profile" });
  }
});

// POST /api/agency-profile/logo — upload logo
router.post("/logo", upload.single("logo"), async (req, res) => {
  try {
    const tenantId = req.body.tenantId || (req as any).tenantId || (req as any).userId || req.query.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: "tenantId is required" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No logo file provided" });
      return;
    }

    const logoUrl = `/uploads/agency/${req.file.filename}`;

    const updated = await AgencyProfile.findOneAndUpdate(
      { tenantId },
      { $set: { tenantId, logoUrl, updatedAt: new Date() } },
      { upsert: true, new: true }
    );

    res.json({ success: true, logoUrl, profile: updated });
  } catch (err: any) {
    console.error("CompanyProfile logo upload error:", err);
    res.status(500).json({ error: err.message || "Failed to upload logo" });
  }
});

export default router;
