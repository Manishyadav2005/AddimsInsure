import mongoose from "mongoose";

export interface ITenant {
  _id?: string;
  name: string;
  adminName?: string;
  adminEmail: string;
  adminUserId: string;
  plan: "Basic" | "Pro" | "Enterprise";
  status: "Active" | "Expired" | "Suspended";
  validUntil: Date;
  maxPolicies?: number;
  createdAt: Date;
  updatedAt: Date;
}

export const TenantSchema = new mongoose.Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true },
    adminName: { type: String, trim: true },
    adminEmail: { type: String, required: true, unique: true, lowercase: true, trim: true },
    adminUserId: { type: String, required: true },
    plan: { type: String, enum: ["Basic", "Pro", "Enterprise"], default: "Pro" },
    status: { type: String, enum: ["Active", "Expired", "Suspended"], default: "Active" },
    validUntil: { type: Date, required: true },
    maxPolicies: { type: Number, default: 1000 }
  },
  { timestamps: true }
);

export const Tenant = (mongoose.models.Tenant as mongoose.Model<ITenant>) || mongoose.model<ITenant>("Tenant", TenantSchema);
export default Tenant;
