import mongoose from "mongoose";

export interface IEmailLog {
  id?: string;
  userId: string;
  policyId?: string;
  policyNumber?: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  sentAt: string;
  status: string;
  type: string;
  channel?: string;
  failureReason?: string;
  providerMessageId?: string;
}

export const EmailLogSchema = new mongoose.Schema<IEmailLog>({
  id: { type: String, unique: true, sparse: true },
  userId: { type: String, required: true, index: true },
  policyId: { type: String, default: "" },
  policyNumber: { type: String, default: "" },
  recipientEmail: { type: String, required: true },
  recipientName: { type: String, required: true },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  sentAt: { type: String, default: () => new Date().toISOString() },
  status: { type: String, default: "Sent", enum: ["Sent", "Failed", "Pending"] },
  type: { type: String, default: "RenewalReminder" },
  channel: { type: String, default: "Email" },
  failureReason: { type: String, default: "" },
  providerMessageId: { type: String, default: "" }
});

export const EmailLogModel = (mongoose.models.EmailLog as mongoose.Model<IEmailLog>) || mongoose.model<IEmailLog>("EmailLog", EmailLogSchema);
export default EmailLogModel;
