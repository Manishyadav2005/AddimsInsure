import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  id: string;
  tenantId?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: any;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, index: true },
    userId: { type: String, index: true },
    userName: { type: String },
    userRole: { type: String },
    action: { type: String, required: true },
    entityType: { type: String },
    entityId: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
