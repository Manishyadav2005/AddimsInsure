import mongoose from "mongoose";

export interface IPolicy {
  id: string;
  userId: string;
  tenantId?: string;
  bmId?: string;
  bmName?: string;
  teamManagerId?: string;
  teamManagerName?: string;
  teamLeaderId?: string;
  teamLeaderName?: string;
  callerId?: string;
  callerName?: string;
  tseId?: string;
  tseName?: string;
  renewalManagerId?: string;
  renewalManagerName?: string;
  renewalExecutiveId?: string;
  renewalExecutiveName?: string;
  sourceType?: "sales_team" | "direct" | "referral";
  sourcePersonName?: string;
  sourcePersonMobile?: string;
  referenceType?: string;
  sourceRemark?: string;
  businessType?: string;
  businessSubtype?: string;
  businessLoginDate?: string;
  portabilityDetails?: {
    previousInsuranceCompany?: string;
    previousPolicyNumber?: string;
    previousProductName?: string;
    previousPolicyExpiryDate?: string;
    previousSumInsured?: number | string;
  };
  policyTenure?: number;
  policyStatus?: "Issued" | "Pending" | "Cancelled";
  paymentMode?: string;
  financeType?: string;
  financeVendor?: string;
  financedAmount?: number;
  downPayment?: number;
  emiAmount?: number;
  emiTenure?: number;
  emiStartDate?: string;
  wishedStatus?: string;
  wishedBy?: string;
  wishedAt?: string;
  wishedNote?: string;
  assignedTo?: string;
  assignedToName?: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  whatsappNumber?: string;
  customerBirthday?: string;
  customerType?: string;
  gender?: string;
  maritalStatus?: string;
  anniversaryDate?: string;
  occupation?: string;
  annualIncome?: string;
  height?: string;
  weight?: string;
  
  // Full Address
  houseFlat?: string;
  streetArea?: string;
  landmark?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;

  policyNumber?: string;
  insuranceCompanyId?: string;
  companyName: string;
  policyType: string;
  productId?: string;
  productName?: string;
  premiumAmount: number;
  sumAssured?: number | null;
  sumAssuredType?: "FIXED" | "UNLIMITED";
  appliedPayoutPercentage?: number;
  expectedCommission?: number;
  commissionStatus?: "Unpaid" | "Paid";
  commissionPaidAt?: string;
  commissionMarkedPaidBy?: string;
  premiumFrequency: string;
  startDate?: string;
  expiryDate?: string;
  nextDueDate?: string;
  premiumStatus: string;

  // Cashback Details
  cashbackEnabled?: boolean;
  cashbackAmount?: number;

  // Advisor Master Reference
  advisorId?: string;
  advisorName?: string;
  advisorCode?: string;

  // Historical Revenue Tracking
  isHistorical?: boolean;
  historicalRemarks?: string;

  includeFamily?: boolean;
  familyMembers?: string[];
  familyMembersList?: any[];
  healthDetails?: any;
  documents?: any[];
  notes?: string;

  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export const PolicySchema = new mongoose.Schema<IPolicy>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  tenantId: { type: String, index: true },
  bmId: { type: String, index: true },
  bmName: { type: String },
  teamManagerId: { type: String, index: true },
  teamManagerName: { type: String },
  teamLeaderId: { type: String, index: true },
  teamLeaderName: { type: String },
  callerId: { type: String, index: true },
  callerName: { type: String },
  tseId: { type: String, index: true },
  tseName: { type: String },
  sourceType: { type: String, enum: ["sales_team", "direct", "referral"], default: "sales_team", index: true },
  sourcePersonName: { type: String, default: "" },
  sourcePersonMobile: { type: String, default: "" },
  referenceType: { type: String, default: "" },
  sourceRemark: { type: String, default: "" },
  businessType: { type: String, default: "NEW BUSINESS", index: true },
  businessSubtype: { type: String, default: null, index: true },
  businessLoginDate: { type: String, index: true },
  portabilityDetails: { type: Object, default: undefined },
  policyTenure: { type: Number, default: 1 },
  policyStatus: { type: String, default: "Pending", index: true },
  paymentMode: { type: String, default: "Direct" },
  financeType: { type: String, default: "Vendor Finance" },
  financeVendor: { type: String },
  financedAmount: { type: Number },
  downPayment: { type: Number },
  emiAmount: { type: Number },
  emiTenure: { type: Number },
  emiStartDate: { type: String },
  wishedStatus: { type: String, default: "Pending" },
  wishedBy: { type: String },
  wishedAt: { type: String },
  wishedNote: { type: String },
  assignedTo: { type: String, index: true },
  assignedToName: { type: String },
  customerId: { type: String, index: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, default: "" },
  customerPhone: { type: String, default: "" },
  whatsappNumber: { type: String, default: "" },
  customerBirthday: { type: String, default: "" },
  customerType: { type: String, default: "Individual", index: true },
  gender: { type: String },
  maritalStatus: { type: String },
  anniversaryDate: { type: String },
  occupation: { type: String },
  annualIncome: { type: String },
  height: { type: String, default: "" },
  weight: { type: String, default: "" },

  houseFlat: { type: String },
  streetArea: { type: String },
  landmark: { type: String },
  address: { type: String },
  city: { type: String },
  district: { type: String },
  state: { type: String },
  pincode: { type: String },

  policyNumber: { type: String, default: "" },
  insuranceCompanyId: { type: String, index: true },
  companyName: { type: String, required: true },
  policyType: { type: String, required: true },
  productId: { type: String, index: true, default: "" },
  productName: { type: String, default: "" },
  premiumAmount: { type: Number, required: true },
  sumAssured: { type: Number, default: null },
  sumAssuredType: { type: String, enum: ["FIXED", "UNLIMITED"], default: "FIXED", index: true },
  appliedPayoutPercentage: { type: Number, default: 0 },
  expectedCommission: { type: Number, default: 0 },
  commissionStatus: { type: String, enum: ["Unpaid", "Paid"], default: "Unpaid", index: true },
  commissionPaidAt: { type: String },
  commissionMarkedPaidBy: { type: String },
  premiumFrequency: { type: String, default: "Yearly" },
  startDate: { type: String, default: "" },
  expiryDate: { type: String, default: "" },
  nextDueDate: { type: String, default: "" },
  premiumStatus: { type: String, default: "Pending" },
  
  cashbackEnabled: { type: Boolean, default: false, index: true },
  cashbackAmount: { type: Number, default: 0 },
  
  includeFamily: { type: Boolean, default: false },
  familyMembers: { type: [String], default: [] },
  familyMembersList: [mongoose.Schema.Types.Mixed] as any,
  healthDetails: { type: Object, default: {} },
  documents: [mongoose.Schema.Types.Mixed] as any,
  notes: { type: String },

  // Advisor Master Reference
  advisorId: { type: String, index: true },
  advisorName: { type: String },
  advisorCode: { type: String },

  // Historical Revenue Tracking
  isHistorical: { type: Boolean, default: false, index: true },
  historicalRemarks: { type: String },

  renewalManagerId: { type: String, index: true },
  renewalManagerName: { type: String },
  renewalExecutiveId: { type: String, index: true },
  renewalExecutiveName: { type: String },

  createdBy: { type: String },
  createdByName: { type: String },
  updatedBy: { type: String },
  updatedByName: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

if (mongoose.models && mongoose.models.Policy) {
  delete (mongoose.models as any).Policy;
}

export const PolicyModel = mongoose.model<IPolicy>("Policy", PolicySchema);
export default PolicyModel;

