import mongoose from "mongoose";

export interface IInsuranceCategory {
  id: string;
  tenantId: string;
  companyId: string;
  companyName?: string;
  name: string;
  code?: string;
  description?: string;
  status: "Active" | "Inactive";
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export const InsuranceCategorySchema = new mongoose.Schema<IInsuranceCategory>({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true, index: true },
  companyId: { type: String, required: false, index: true },
  companyName: { type: String, default: "" },
  name: { type: String, required: true },
  code: { type: String, default: "" },
  description: { type: String, default: "" },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active", index: true },
  createdBy: { type: String },
  createdByName: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

export const InsuranceCategoryModel =
  (mongoose.models.InsuranceCategory as mongoose.Model<IInsuranceCategory>) ||
  mongoose.model<IInsuranceCategory>("InsuranceCategory", InsuranceCategorySchema);

export default InsuranceCategoryModel;
