import express, { Response } from "express";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import multer from "multer";
import HighlightModel from "../models/Highlight";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "policy_master_jwt_secret_key_2026_mongodb";

// Server-side uploads/highlights directory setup
const highlightsUploadDir = path.join(process.cwd(), "uploads", "highlights");
if (!fs.existsSync(highlightsUploadDir)) {
  fs.mkdirSync(highlightsUploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, highlightsUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".png";
    const uniqueName = `highlight-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${safeExt}`;
    cb(null, uniqueName);
  }
});

// Multer Upload Instance with validation (JPG, JPEG, PNG, WEBP & 5MB max)
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPG, JPEG, PNG, and WEBP image files are allowed."));
    }
  }
});

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

import { userHasPermission } from "../middleware/auth";

function isAdminUser(req: any): boolean {
  return userHasPermission(req.user, ["highlightsManagement.view", "highlights.create", "highlights.edit", "highlights.delete"]);
}

function generateId(): string {
  return "hl_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 7);
}

// POST /api/highlights/upload-banner - Upload Banner Image
router.post("/upload-banner", authenticateToken, (req: any, res: Response) => {
  const canUpload = userHasPermission(req.user, ["highlights.banner.upload", "highlights.create", "highlightsManagement.view"]);
  if (!canUpload) {
    return res.status(403).json({ error: "Forbidden: You do not have permission to upload highlight banners" });
  }

  upload.single("banner")(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "File size exceeds 5MB limit." });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || "File upload failed" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const relativeUrl = `/uploads/highlights/${req.file.filename}`;
    return res.status(200).json({ success: true, imageUrl: relativeUrl });
  });
});

// GET /api/highlights - Fetch highlights for tenant
router.get("/", authenticateToken, async (req: any, res: Response) => {
  try {
    const tenantId = req.user.role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");
    const isAdmin = isAdminUser(req);
    const today = new Date().toISOString().split("T")[0];

    const query: any = {};
    if (req.user.role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }

    if (!isAdmin) {
      // Non-admins only see active highlights within display range
      query.isActive = true;
      query.displayFrom = { $lte: today };
      query.displayUntil = { $gte: today };
    }

    const highlights = await HighlightModel.find(query).sort({ isFeatured: -1, createdAt: -1 }).lean();
    return res.json(highlights);
  } catch (err: any) {
    console.error("Fetch Highlights Error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch highlights" });
  }
});

// POST /api/highlights - Create highlight (Admin only)
router.post("/", authenticateToken, async (req: any, res: Response) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: "Forbidden: Admin privileges required to manage highlights" });
    }

    const tenantId = req.user.role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");
    const {
      type,
      title,
      personName,
      team,
      date,
      time,
      location,
      description,
      message,
      image,
      priority,
      displayFrom,
      displayUntil,
      isActive,
      isFeatured
    } = req.body;

    if (!type || !title || !displayFrom || !displayUntil) {
      return res.status(400).json({ error: "Type, Title, Display From, and Display Until are required fields." });
    }

    // If marked as featured, unset existing featured highlight for tenant
    if (isFeatured) {
      await HighlightModel.updateMany({ tenantId }, { isFeatured: false });
    }

    const newHighlight = await HighlightModel.create({
      id: generateId(),
      tenantId,
      type,
      title,
      personName: personName || "",
      team: team || "",
      date: date || "",
      time: time || "",
      location: location || "",
      description: description || "",
      message: message || "",
      image: image || "",
      priority: priority || "NORMAL",
      displayFrom,
      displayUntil,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      isFeatured: Boolean(isFeatured),
      createdBy: req.user.uid || req.user.id || "admin",
      createdByName: req.user.name || req.user.email || "Admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return res.status(201).json(newHighlight);
  } catch (err: any) {
    console.error("Create Highlight Error:", err);
    return res.status(500).json({ error: err.message || "Failed to create highlight" });
  }
});

// PUT /api/highlights/:id - Update highlight (Admin only)
router.put("/:id", authenticateToken, async (req: any, res: Response) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: "Forbidden: Admin privileges required to manage highlights" });
    }

    const { id } = req.params;
    const tenantId = req.user.role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");

    const existing = await HighlightModel.findOne({ id });
    if (!existing) {
      return res.status(404).json({ error: "Highlight record not found" });
    }

    if (req.user.role !== "SUPER_ADMIN" && existing.tenantId !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    delete updates._id;
    delete updates.id;
    delete updates.tenantId;

    // Cleanup old image file if replaced with a new image
    if (updates.image && updates.image !== existing.image) {
      if (existing.image && existing.image.startsWith("/uploads/highlights/")) {
        const oldFileName = path.basename(existing.image);
        const oldFilePath = path.join(highlightsUploadDir, oldFileName);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
          } catch (err) {
            console.error("Failed to delete old banner image file:", err);
          }
        }
      }
    }

    if (updates.isFeatured) {
      await HighlightModel.updateMany({ tenantId, id: { $ne: id } }, { isFeatured: false });
    }

    const updated = await HighlightModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    return res.json(updated);
  } catch (err: any) {
    console.error("Update Highlight Error:", err);
    return res.status(500).json({ error: err.message || "Failed to update highlight" });
  }
});

// DELETE /api/highlights/:id - Delete highlight (Admin only)
router.delete("/:id", authenticateToken, async (req: any, res: Response) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: "Forbidden: Admin privileges required to delete highlights" });
    }

    const { id } = req.params;
    const tenantId = req.user.role === "SUPER_ADMIN" ? "tenant-default" : (req.user.tenantId || "tenant-default");

    const existing = await HighlightModel.findOne({ id });
    if (!existing) {
      return res.status(404).json({ error: "Highlight record not found" });
    }

    if (req.user.role !== "SUPER_ADMIN" && existing.tenantId !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Cleanup image file from uploads/highlights/ when record is deleted
    if (existing.image && existing.image.startsWith("/uploads/highlights/")) {
      const fileName = path.basename(existing.image);
      const filePath = path.join(highlightsUploadDir, fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error("Failed to delete banner image file on disk:", err);
        }
      }
    }

    await HighlightModel.deleteOne({ id });
    return res.json({ success: true, message: "Highlight deleted successfully" });
  } catch (err: any) {
    console.error("Delete Highlight Error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete highlight" });
  }
});

export default router;
