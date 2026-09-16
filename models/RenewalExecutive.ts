import mongoose, { Schema, Document } from "mongoose";

export interface IRenewalExecutive extends Document {
  id: string;
  tenantId: string;
  renewalManagerId?: string;
  renewalManagerName?: string;
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

const RenewalExecutiveSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    renewalManagerId: { type: String, index: true, default: "" },
    renewalManagerName: { type: String, default: "" },
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

export const RenewalExecutive =
  mongoose.models.RenewalExecutive || mongoose.model<IRenewalExecutive>("RenewalExecutive", RenewalExecutiveSchema);

export default RenewalExecutive;
