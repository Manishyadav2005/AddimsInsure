import mongoose from "mongoose";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "OPERATOR" | "TENANT_ADMIN" | "TEAM_LEADER" | "CALLER" | "AGENT";

export interface IUser {
  _id?: string;
  id?: string;
  name?: string;
  email: string;
  password?: string;
  role: UserRole;
  tenantId?: string;
  teamLeaderId?: string;
  createdBy?: string;
  permissions?: string[];
  status?: "Active" | "Inactive" | "Suspended";
  isDemo: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export const UserSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { 
      type: String, 
      enum: ["SUPER_ADMIN", "ADMIN", "OPERATOR", "TENANT_ADMIN", "TEAM_LEADER", "CALLER", "AGENT"], 
      default: "ADMIN" 
    },
    tenantId: { type: String, index: true },
    teamLeaderId: { type: String, index: true },
    createdBy: { type: String },
    permissions: { type: [String], default: [] },
    status: { type: String, enum: ["Active", "Inactive", "Suspended"], default: "Active" },
    isDemo: { type: Boolean, default: false }
  },
  { 
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret: any) => {
        if (ret._id) {
          ret.id = ret._id.toString();
          ret._id = ret._id.toString();
        }
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret: any) => {
        if (ret._id) {
          ret.id = ret._id.toString();
          ret._id = ret._id.toString();
        }
        return ret;
      }
    }
  }
);

export const User = (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>("User", UserSchema);
export default User;
