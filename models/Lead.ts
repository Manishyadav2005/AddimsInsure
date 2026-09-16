import mongoose from "mongoose";

export type CallStatus = 
  | "New"
  | "Contacted"
  | "Interested"
  | "Not Interested"
  | "No Answer"
  | "Call Back"
  | "Follow-up"
  | "Invalid Number"
  | "Closed"
  | "Converted";

export interface ILeadNote {
  note: string;
  addedBy: string;
  addedByName?: string;
  createdAt: Date;
}

export interface ILead {
  _id?: string;
  id: string;
  tenantId: string;
  teamLeaderId?: string;
  assignedTo?: string; // Caller User ID
  assignedToName?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  source?: string;
  policyType?: string;
  estimatedAmount?: number;
  callStatus: CallStatus;
  notes: ILeadNote[];
  followUpDate?: Date;
  nextFollowUpTime?: string;
  lastContactedAt?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const LeadSchema = new mongoose.Schema<ILead>(
  {
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    teamLeaderId: { type: String, index: true },
    assignedTo: { type: String, index: true },
    assignedToName: { type: String },
    customerName: { type: String, required: true },
    customerEmail: { type: String, default: "" },
    customerPhone: { type: String, default: "" },
    alternatePhone: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    source: { type: String, default: "Inbound Call" },
    policyType: { type: String, default: "General Insurance" },
    estimatedAmount: { type: Number, default: 0 },
    callStatus: { 
      type: String, 
      enum: ["New", "Contacted", "Interested", "Not Interested", "No Answer", "Call Back", "Follow-up", "Invalid Number", "Closed", "Converted"], 
      default: "New" 
    },
    notes: [
      {
        note: { type: String, required: true },
        addedBy: { type: String, required: true },
        addedByName: { type: String },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    followUpDate: { type: Date },
    nextFollowUpTime: { type: String, default: "" },
    lastContactedAt: { type: Date },
    createdBy: { type: String }
  },
  { timestamps: true }
);

export const Lead = (mongoose.models.Lead as mongoose.Model<ILead>) || mongoose.model<ILead>("Lead", LeadSchema);
export default Lead;
