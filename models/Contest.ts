import mongoose from "mongoose";

export interface IContest {
  id: string;
  tenantId: string;
  name: string;
  insuranceCompanyId: string;
  companyName: string;
  type: "Monthly" | "Quarterly" | "Annual";
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  targetAmount: number;
  rewardAmount: number;
  status: "Active" | "Inactive";
  paymentStatus: "Unpaid" | "Paid";
  paidAt?: string;
  markedPaidBy?: string;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export const ContestSchema = new mongoose.Schema<IContest>({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  insuranceCompanyId: { type: String, required: true, index: true },
  companyName: { type: String, required: true },
  type: { type: String, enum: ["Monthly", "Quarterly", "Annual"], required: true, index: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  targetAmount: { type: Number, required: true, min: 0 },
  rewardAmount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active", index: true },
  paymentStatus: { type: String, enum: ["Unpaid", "Paid"], default: "Unpaid", index: true },
  paidAt: { type: String },
  markedPaidBy: { type: String },
  createdBy: { type: String },
  createdByName: { type: String },
  updatedBy: { type: String },
  updatedByName: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

export const ContestModel =
  (mongoose.models.Contest as mongoose.Model<IContest>) ||
  mongoose.model<IContest>("Contest", ContestSchema);

export default ContestModel;
