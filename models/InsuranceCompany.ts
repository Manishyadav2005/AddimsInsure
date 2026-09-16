import mongoose from "mongoose";

export interface IInsuranceCompany {
  id: string;
  tenantId: string;
  name: string;
  code?: string;
  newBusinessPayoutPercentage: number;
  renewalPayoutPercentage: number;
  status: "Active" | "Inactive";
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export const InsuranceCompanySchema = new mongoose.Schema<IInsuranceCompany>({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  code: { type: String, default: "" },
  newBusinessPayoutPercentage: { type: Number, required: true, min: 0, max: 100, default: 0 },
  renewalPayoutPercentage: { type: Number, required: true, min: 0, max: 100, default: 0 },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active", index: true },
  createdBy: { type: String },
  createdByName: { type: String },
  updatedBy: { type: String },
  updatedByName: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

export const InsuranceCompanyModel =
  (mongoose.models.InsuranceCompany as mongoose.Model<IInsuranceCompany>) ||
  mongoose.model<IInsuranceCompany>("InsuranceCompany", InsuranceCompanySchema);

export default InsuranceCompanyModel;
