import mongoose, { Schema, Document } from "mongoose";

export interface ICallLog extends Document {
  id: string;
  tenantId?: string;
  teamLeaderId?: string;
  assignedTo?: string;
  assignedToName?: string;
  entityType: "LEAD" | "CUSTOMER";
  entityId: string;
  callStatus: string;
  notes?: string;
  nextFollowUpDate?: string;
  nextFollowUpTime?: string;
  createdBy?: string;
  createdAt: Date;
}

const CallLogSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, index: true },
    teamLeaderId: { type: String, index: true },
    assignedTo: { type: String, index: true },
    assignedToName: { type: String },
    entityType: { type: String, enum: ["LEAD", "CUSTOMER"], required: true },
    entityId: { type: String, required: true, index: true },
    callStatus: { type: String, required: true },
    notes: { type: String },
    nextFollowUpDate: { type: String },
    nextFollowUpTime: { type: String },
    createdBy: { type: String },
  },
  { timestamps: true }
);

export const CallLog = mongoose.models.CallLog || mongoose.model<ICallLog>("CallLog", CallLogSchema);
