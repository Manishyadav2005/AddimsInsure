import mongoose, { Schema, Document } from "mongoose";

export interface IAdvisorPersonalDetails {
  fullName: string;
  fatherOrSpouseName?: string;
  dateOfBirth?: string;
  gender?: "Male" | "Female" | "Other" | "Prefer not to say" | string;
  maritalStatus?: "Single" | "Married" | "Other" | string;
  profilePhoto?: string;
}

export interface IAdvisorIdentityDetails {
  panNumber?: string;
  aadhaarNumber?: string;
  advisorLicenseNumber?: string;
  licenseExpiryDate?: string;
}

export interface IAdvisorContactDetails {
  mobileNumber: string;
  alternateMobileNumber?: string;
  email?: string;
  whatsappNumber?: string;
}

export interface IAdvisorInsuranceDetails {
  insuranceCompanyId: string;
  insuranceCompanyName: string;
}

export interface IAdvisorBranchDetails {
  branchName: string;
  branchCode?: string;
  branchAddress?: string;
  branchArea?: string;
  branchCity?: string;
  branchState?: string;
  branchPincode?: string;
}

export interface IAdvisorInsuranceCompanyManagement {
  branchManagerName?: string;
  branchManagerMobile?: string;
  branchManagerEmail?: string;
  areaManagerName?: string;
  areaManagerMobile?: string;
  areaManagerEmail?: string;
  zonalManagerName?: string;
  zonalManagerMobile?: string;
  zonalManagerEmail?: string;
}

export interface IAdvisorBusinessDetails {
  businessType?: "Individual" | "Corporate" | "Agency" | "Broker" | "Other" | string;
  advisorType?: "Individual Advisor" | "Corporate Advisor" | "Agency" | "Broker" | "Other" | string;
  specialization?: string;
  yearsOfExperience?: number;
  dateOfJoining?: string;
  businessName?: string;
  gstNumber?: string;
  annualBusinessVolume?: number;
}

export interface IAdvisorLocationDetails {
  addressLine1?: string;
  addressLine2?: string;
  area?: string;
  landmark?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface IAdvisorBankDetails {
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
}

export interface IAdvisorInternalMapping {
  virtualManagerId?: string;
  virtualManagerName?: string;
  recruiterName?: string;
  recruiterMobile?: string;
  recruitmentDate?: string;
  internalDepartment?: string;
  internalNotes?: string;
}

export interface IAdvisorDocument {
  documentId: string;
  documentType:
    | "PAN Card"
    | "Aadhaar Card"
    | "Advisor License / Registration Certificate"
    | "Insurance Company Appointment Letter"
    | "Agreement / Contract"
    | "GST Certificate"
    | "Bank Proof / Cancelled Cheque"
    | "Address Proof"
    | "Other Documents"
    | string;
  documentName: string;
  originalName?: string;
  path: string;
  storedName?: string;
  size?: number;
  mimeType?: string;
  status?: "Verified" | "Pending" | "Rejected" | string;
  uploadedAt: string;
}

export interface IAdvisor extends Document {
  id: string;
  advisorCode: string;
  tenantId: string;
  personalDetails: IAdvisorPersonalDetails;
  identityDetails?: IAdvisorIdentityDetails;
  contactDetails: IAdvisorContactDetails;
  insuranceDetails: IAdvisorInsuranceDetails;
  branchDetails: IAdvisorBranchDetails;
  insuranceCompanyManagement?: IAdvisorInsuranceCompanyManagement;
  businessDetails?: IAdvisorBusinessDetails;
  locationDetails?: IAdvisorLocationDetails;
  bankDetails?: IAdvisorBankDetails;
  internalMapping?: IAdvisorInternalMapping;
  documents?: IAdvisorDocument[];
  status: "ACTIVE" | "INACTIVE";
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export const AdvisorSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    advisorCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    tenantId: { type: String, required: true, index: true },

    personalDetails: {
      fullName: { type: String, required: true, trim: true },
      fatherOrSpouseName: { type: String, trim: true, default: "" },
      dateOfBirth: { type: String, default: "" },
      gender: { type: String, default: "Male" },
      maritalStatus: { type: String, default: "Single" },
      profilePhoto: { type: String, default: "" }
    },

    identityDetails: {
      panNumber: { type: String, uppercase: true, trim: true, default: "" },
      aadhaarNumber: { type: String, trim: true, default: "" },
      advisorLicenseNumber: { type: String, trim: true, default: "" },
      licenseExpiryDate: { type: String, default: "" }
    },

    contactDetails: {
      mobileNumber: { type: String, required: true, trim: true, index: true },
      alternateMobileNumber: { type: String, trim: true, default: "" },
      email: { type: String, lowercase: true, trim: true, default: "" },
      whatsappNumber: { type: String, trim: true, default: "" }
    },

    insuranceDetails: {
      insuranceCompanyId: { type: String, required: true, index: true },
      insuranceCompanyName: { type: String, required: true, trim: true }
    },

    branchDetails: {
      branchName: { type: String, required: true, trim: true },
      branchCode: { type: String, trim: true, default: "" },
      branchAddress: { type: String, trim: true, default: "" },
      branchArea: { type: String, trim: true, default: "" },
      branchCity: { type: String, trim: true, default: "" },
      branchState: { type: String, trim: true, default: "" },
      branchPincode: { type: String, trim: true, default: "" }
    },

    // Insurance Company Personnel Management (BM, AM, ZM)
    insuranceCompanyManagement: {
      branchManagerName: { type: String, trim: true, default: "" },
      branchManagerMobile: { type: String, trim: true, default: "" },
      branchManagerEmail: { type: String, trim: true, default: "" },
      areaManagerName: { type: String, trim: true, default: "" },
      areaManagerMobile: { type: String, trim: true, default: "" },
      areaManagerEmail: { type: String, trim: true, default: "" },
      zonalManagerName: { type: String, trim: true, default: "" },
      zonalManagerMobile: { type: String, trim: true, default: "" },
      zonalManagerEmail: { type: String, trim: true, default: "" }
    },

    businessDetails: {
      businessType: { type: String, default: "Individual" },
      advisorType: { type: String, default: "Individual Advisor" },
      specialization: { type: String, default: "General / Health Insurance" },
      yearsOfExperience: { type: Number, default: 0 },
      dateOfJoining: { type: String, default: "" },
      businessName: { type: String, default: "" },
      gstNumber: { type: String, uppercase: true, default: "" },
      annualBusinessVolume: { type: Number, default: 0 }
    },

    locationDetails: {
      addressLine1: { type: String, default: "" },
      addressLine2: { type: String, default: "" },
      area: { type: String, default: "" },
      landmark: { type: String, default: "" },
      city: { type: String, default: "" },
      district: { type: String, default: "" },
      state: { type: String, default: "" },
      pincode: { type: String, default: "" },
      country: { type: String, default: "India" },
      latitude: { type: Number },
      longitude: { type: Number }
    },

    bankDetails: {
      accountHolderName: { type: String, default: "" },
      bankName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      ifscCode: { type: String, uppercase: true, default: "" },
      branchName: { type: String, default: "" }
    },

    // Internal Team Mapping (Virtual Manager, Recruiter)
    internalMapping: {
      virtualManagerId: { type: String, default: "", index: true },
      virtualManagerName: { type: String, trim: true, default: "", index: true },
      recruiterName: { type: String, trim: true, default: "", index: true },
      recruiterMobile: { type: String, trim: true, default: "" },
      recruitmentDate: { type: String, default: "" },
      internalDepartment: { type: String, default: "Agency Channel" },
      internalNotes: { type: String, default: "" }
    },

    // Attached Advisor Verification & KYC Documents
    documents: [
      {
        documentId: { type: String, required: true },
        documentType: { type: String, required: true, default: "Other Documents" },
        documentName: { type: String, required: true },
        originalName: { type: String },
        path: { type: String, required: true },
        storedName: { type: String },
        size: { type: Number, default: 0 },
        mimeType: { type: String, default: "application/pdf" },
        status: { type: String, enum: ["Verified", "Pending", "Rejected"], default: "Pending" },
        uploadedAt: { type: String, default: () => new Date().toISOString() }
      }
    ],

    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE", index: true },
    notes: { type: String, default: "" },

    createdBy: { type: String },
    createdByName: { type: String },
    updatedBy: { type: String },
    updatedByName: { type: String },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
  },
  { timestamps: true }
);

// Compound Indexes for fast queries
AdvisorSchema.index({ tenantId: 1, advisorCode: 1 });
AdvisorSchema.index({ tenantId: 1, "insuranceDetails.insuranceCompanyId": 1 });
AdvisorSchema.index({ tenantId: 1, status: 1 });
AdvisorSchema.index({ tenantId: 1, "internalMapping.virtualManagerName": 1 });
AdvisorSchema.index({ tenantId: 1, "internalMapping.recruiterName": 1 });

if (mongoose.models && mongoose.models.Advisor) {
  delete (mongoose.models as any).Advisor;
}

export const AdvisorModel = mongoose.model<IAdvisor>("Advisor", AdvisorSchema);
export default AdvisorModel;
