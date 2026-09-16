import mongoose, { Schema, Document } from "mongoose";

export interface IRenewalManager extends Document {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
  employeeCode?: string;
  dob?: string;
  status: "Active" | "Inactive";
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RenewalManagerSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, lowercase: true, trim: true, default: "" },
    employeeCode: { type: String, trim: true, default: "" },
    dob: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    notes: { type: String, default: "" },
    createdBy: { type: String }
  },

  { timestamps: true }
);

export const RenewalManager =
  mongoose.models.RenewalManager || mongoose.model<IRenewalManager>("RenewalManager", RenewalManagerSchema);

export default RenewalManager;
