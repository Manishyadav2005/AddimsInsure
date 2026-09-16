import mongoose, { Schema, Document } from "mongoose";

export interface ITeamLeader extends Document {
  id: string;
  tenantId: string;
  bmId?: string;
  teamManagerId?: string;
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

const TeamLeaderSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    bmId: { type: String, index: true },
    teamManagerId: { type: String, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    employeeCode: { type: String, trim: true },
    dob: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    notes: { type: String },
    createdBy: { type: String }
  },

  { timestamps: true }
);

export const TeamLeader = mongoose.models.TeamLeader || mongoose.model<ITeamLeader>("TeamLeader", TeamLeaderSchema);
export default TeamLeader;
