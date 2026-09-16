import mongoose from "mongoose";

export interface IAgencyProfile {
  tenantId: string;
  companyName: string;
  gstNumber?: string;
  mobileNumber?: string;
  email?: string;
  logoUrl?: string;
  // Aliases for backward compatibility
  agencyName?: string;
  mobile?: string;
  updatedAt: Date;
}

export const AgencyProfileSchema = new mongoose.Schema<IAgencyProfile>(
  {
    tenantId: { type: String, required: true, unique: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    gstNumber: { type: String, trim: true, default: "" },
    mobileNumber: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    logoUrl: { type: String, trim: true, default: "" },
    agencyName: { type: String, trim: true },
    mobile: { type: String, trim: true },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

if (mongoose.models && mongoose.models.AgencyProfile) {
  delete (mongoose.models as any).AgencyProfile;
}

export const AgencyProfile = mongoose.model<IAgencyProfile>("AgencyProfile", AgencyProfileSchema);

export default AgencyProfile;
