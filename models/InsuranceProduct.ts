import mongoose from "mongoose";

export interface IInsuranceProduct {
  id: string;
  tenantId: string;
  companyId: string;
  companyName?: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  code?: string;
  description?: string;
  status: "Active" | "Inactive";
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export const InsuranceProductSchema = new mongoose.Schema<IInsuranceProduct>({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true, index: true },
  companyId: { type: String, required: true, index: true },
  companyName: { type: String, default: "" },
  categoryId: { type: String, required: true, index: true },
  categoryName: { type: String, default: "" },
  name: { type: String, required: true },
  code: { type: String, default: "" },
  description: { type: String, default: "" },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active", index: true },
  createdBy: { type: String },
  createdByName: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

export const InsuranceProductModel =
  (mongoose.models.InsuranceProduct as mongoose.Model<IInsuranceProduct>) ||
  mongoose.model<IInsuranceProduct>("InsuranceProduct", InsuranceProductSchema);

export default InsuranceProductModel;
