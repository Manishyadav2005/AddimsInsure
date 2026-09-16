import { Router } from "express";
import { SettingsModel } from "../models";

const router = Router();

// SETTINGS: Get Settings
router.get("/", async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "UserId is required" });
      return;
    }
    const settings = await SettingsModel.findOne({ userId }).lean();
    res.json(settings || { userId, mailSettings: {}, whatsAppSettings: {} });
  } catch (err: any) {
    console.error("Fetch Settings Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch settings from MongoDB" });
  }
});

// SETTINGS: Save Settings
router.post("/", async (req, res) => {
  try {
    const { userId, mailSettings, whatsAppSettings } = req.body;
    if (!userId) {
      res.status(400).json({ error: "UserId is required" });
      return;
    }
    const updated = await SettingsModel.findOneAndUpdate(
      { userId },
      { userId, mailSettings, whatsAppSettings, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (err: any) {
    console.error("Save Settings Error:", err);
    res.status(500).json({ error: err.message || "Failed to save settings to MongoDB" });
  }
});

export default router;
