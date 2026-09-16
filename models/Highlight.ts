import mongoose from "mongoose";

export interface IHighlight {
  id: string;
  tenantId: string;
  type: "BIRTHDAY" | "EVENT" | "ANNOUNCEMENT" | "RECOGNITION" | "BANNER";
  title: string;
  personName?: string;
  team?: string;
  date?: string; // YYYY-MM-DD
  time?: string;
  location?: string;
  description?: string;
  message?: string;
  image?: string;
  priority?: "NORMAL" | "IMPORTANT" | "URGENT";
  displayFrom: string; // YYYY-MM-DD
  displayUntil: string; // YYYY-MM-DD
  isActive: boolean;
  isFeatured: boolean;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export const HighlightSchema = new mongoose.Schema<IHighlight>({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ["BIRTHDAY", "EVENT", "ANNOUNCEMENT", "RECOGNITION", "BANNER"],
    required: true,
    index: true
  },
  title: { type: String, required: true },
  personName: { type: String },
  team: { type: String },
  date: { type: String },
  time: { type: String },
  location: { type: String },
  description: { type: String },
  message: { type: String },
  image: { type: String },
  priority: {
    type: String,
    enum: ["NORMAL", "IMPORTANT", "URGENT"],
    default: "NORMAL"
  },
  displayFrom: { type: String, required: true },
  displayUntil: { type: String, required: true },
  isActive: { type: Boolean, default: true, index: true },
  isFeatured: { type: Boolean, default: false, index: true },
  createdBy: { type: String },
  createdByName: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

export const HighlightModel =
  (mongoose.models.Highlight as mongoose.Model<IHighlight>) ||
  mongoose.model<IHighlight>("Highlight", HighlightSchema);

export default HighlightModel;
