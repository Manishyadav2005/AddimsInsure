import mongoose, { Schema, Document } from "mongoose";

export interface IFollowUp extends Document {
  id: string;
  tenantId?: string;
  teamLeaderId?: string;
  assignedTo?: string;
  assignedToName?: string;
  entityType: "LEAD" | "CUSTOMER";
  entityId: string;
  title?: string;
  followUpDate: string;
  followUpTime?: string;
  status: "PENDING" | "COMPLETED" | "MISSED";
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FollowUpSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, index: true },
    teamLeaderId: { type: String, index: true },
    assignedTo: { type: String, index: true },
    assignedToName: { type: String },
    entityType: { type: String, enum: ["LEAD", "CUSTOMER"], required: true },
    entityId: { type: String, required: true, index: true },
    title: { type: String },
    followUpDate: { type: String, required: true, index: true },
    followUpTime: { type: String },
    status: { type: String, enum: ["PENDING", "COMPLETED", "MISSED"], default: "PENDING", index: true },
    notes: { type: String },
    createdBy: { type: String },
  },
  { timestamps: true }
);

export const FollowUp = mongoose.models.FollowUp || mongoose.model<IFollowUp>("FollowUp", FollowUpSchema);
