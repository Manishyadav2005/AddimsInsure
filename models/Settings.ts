import mongoose from "mongoose";

export interface ISettings {
  userId: string;
  mailSettings: Record<string, any>;
  whatsAppSettings: Record<string, any>;
  updatedAt: Date;
}

export const SettingsSchema = new mongoose.Schema<ISettings>({
  userId: { type: String, required: true, unique: true },
  mailSettings: { type: Object, default: {} },
  whatsAppSettings: { type: Object, default: {} },
  updatedAt: { type: Date, default: Date.now }
});

export const SettingsModel = (mongoose.models.Settings as mongoose.Model<ISettings>) || mongoose.model<ISettings>("Settings", SettingsSchema);
export default SettingsModel;
