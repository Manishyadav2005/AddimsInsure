import mongoose from "mongoose";

export interface ICompanyTarget {
  companyId?: string;
  companyName: string;
  policyTarget: number;
  premiumTarget: number;
}

export interface IPerformanceTarget {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  role: string;
  bmId?: string;
  bmName?: string;
  teamManagerId?: string;
  teamManagerName?: string;
  teamLeaderId?: string;
  teamLeaderName?: string;
  teamId?: string;
  teamName?: string;
  month: number; // 1 to 12
  year: number;  // e.g. 2026
  targetMonth?: string; // YYYY-MM e.g. "2026-08"
  
  // Overall Calculated Targets
  totalPolicyTarget: number;
  totalPremiumTarget: number;

  // New Business Targets
  freshPolicyTarget: number;
  freshPremiumTarget: number;
  portPolicyTarget: number;
  portPremiumTarget: number;

  // Renewal Targets
  renewalPolicyTarget: number;
  renewalPremiumTarget: number;

  // Financial Sum Assured Target
  totalSumAssuredTarget: number;

  companyTargets: ICompanyTarget[];
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export const PerformanceTargetSchema = new mongoose.Schema<IPerformanceTarget>({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  employeeName: { type: String, required: true },
  role: { type: String, required: true },
  bmId: { type: String, index: true },
  bmName: { type: String },
  teamManagerId: { type: String, index: true },
  teamManagerName: { type: String },
  teamLeaderId: { type: String, index: true },
  teamLeaderName: { type: String },
  teamId: { type: String, index: true },
  teamName: { type: String },
  month: { type: Number, required: true, index: true },
  year: { type: Number, required: true, index: true },
  targetMonth: { type: String, index: true },
  
  totalPolicyTarget: { type: Number, default: 0 },
  totalPremiumTarget: { type: Number, default: 0 },

  freshPolicyTarget: { type: Number, default: 0 },
  freshPremiumTarget: { type: Number, default: 0 },
  portPolicyTarget: { type: Number, default: 0 },
  portPremiumTarget: { type: Number, default: 0 },

  renewalPolicyTarget: { type: Number, default: 0 },
  renewalPremiumTarget: { type: Number, default: 0 },

  totalSumAssuredTarget: { type: Number, default: 0 },
  companyTargets: [
    {
      companyId: { type: String },
      companyName: { type: String, required: true },
      policyTarget: { type: Number, default: 0 },
      premiumTarget: { type: Number, default: 0 }
    }
  ],
  notes: { type: String, default: "" },
  createdBy: { type: String },
  createdByName: { type: String },
  updatedBy: { type: String },
  updatedByName: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
}, {
  toJSON: {
    virtuals: true,
    transform: (doc, ret: any) => {
      if (ret._id) ret._id = ret._id.toString();
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (doc, ret: any) => {
      if (ret._id) ret._id = ret._id.toString();
      return ret;
    }
  }
});

PerformanceTargetSchema.index({ tenantId: 1, employeeId: 1, month: 1, year: 1 }, { unique: true });

if (mongoose.models && mongoose.models.PerformanceTarget) {
  delete (mongoose.models as any).PerformanceTarget;
}

export const PerformanceTargetModel = mongoose.model<IPerformanceTarget>("PerformanceTarget", PerformanceTargetSchema);
export default PerformanceTargetModel;