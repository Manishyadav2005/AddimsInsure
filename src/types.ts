export type UserRole = "SUPER_ADMIN" | "ADMIN" | "OPERATOR" | "TENANT_ADMIN" | "TEAM_LEADER" | "CALLER" | "AGENT";

export type PermissionKey =
  // Dashboard & Overview
  | "overview.view"
  | "dashboard.view"

  // Policy Management Ledger
  | "policies.view"
  | "policies.create"
  | "policies.edit"
  | "policies.delete"
  | "policies.export"
  | "policies.download"

  // New Business Portfolio
  | "newBusiness.view"
  | "newBusiness.create"
  | "newBusiness.edit"
  | "newBusiness.delete"
  | "newBusiness.export"

  // Fresh Business Portfolio
  | "fresh.view"
  | "fresh.create"
  | "fresh.edit"
  | "fresh.delete"
  | "fresh.export"

  // Portability Business Portfolio
  | "port.view"
  | "port.create"
  | "port.edit"
  | "port.delete"
  | "port.export"

  // Policy Renewals Hub
  | "renewal.view"
  | "renewal.create"
  | "renewal.edit"
  | "renewal.delete"
  | "renewal.export"

  // Client Birthdays
  | "birthdays.view"
  | "birthdays.create"
  | "birthdays.edit"
  | "birthdays.delete"

  // Revenue & Financials
  | "revenue.view"
  | "revenue.export"

  // Contests
  | "contests.view"
  | "contests.create"
  | "contests.edit"
  | "contests.delete"

  // Reports
  | "reports.view"
  | "reports.download"
  | "reports.export"

  // Dispatch / Communication Logs
  | "dispatch.view"
  | "dispatch.download"
  | "dispatch.export"

  // Team Management
  | "team.view"
  | "team.create"
  | "team.edit"
  | "team.delete"
  | "team.targets.manage"

  // Advisors Master Management
  | "advisors.view"
  | "advisors.create"
  | "advisors.edit"
  | "advisors.delete"
  | "advisors.manage"

  // Performance
  | "performance.view"
  | "performance.details"
  | "performance.targets.manage"
  | "performance.export"

  // Insurance Companies
  | "insuranceCompanies.view"
  | "insuranceCompanies.create"
  | "insuranceCompanies.edit"
  | "insuranceCompanies.delete"

  // Gateway & Integration Settings
  | "gatewaySettings.view"
  | "gatewaySettings.edit"

  // Highlights & Highlights Management
  | "highlights.view"
  | "highlightsManagement.view"
  | "highlights.create"
  | "highlights.edit"
  | "highlights.delete"
  | "highlights.banner.upload"
  | "highlights.banner.delete"

  // Executive / Operator Management
  | "operators.view"
  | "operators.create"
  | "operators.edit"
  | "operators.delete"

  // Leads
  | "leads.view"
  | "leads.create"
  | "leads.edit"
  | "leads.delete"
  | "leads.assign"

  // Scheduled Follow-ups
  | "followups.view"
  | "followups.create"
  | "followups.edit"
  | "followups.delete"

  // Customer CRM
  | "customers.view"
  | "customers.create"
  | "customers.edit"
  | "customers.delete"

  // Legacy mappings for backwards compatibility
  | "policies.create_new_business"
  | "policies.create_renewal"
  | "renewals.view"
  | "renewals.edit"
  | "callers.view"
  | "callers.create"
  | "callers.edit"
  | "activity_logs.view"
  | "settings.view"
  | "companies.view"
  | "companies.edit";

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

export interface LeadNote {
  note: string;
  addedBy: string;
  addedByName?: string;
  createdAt: string;
}

export interface Lead {
  _id?: string;
  id: string;
  tenantId: string;
  teamLeaderId?: string;
  assignedTo?: string;
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
  notes: LeadNote[];
  followUpDate?: string;
  nextFollowUpTime?: string;
  lastContactedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMemberItem {
  name: string;
  relationship: string;
  dob?: string;
  gender?: string;
  height?: string;
  weight?: string;
  hasPreExistingCondition?: "No" | "Yes";
  medicalDetails?: string;
  healthStatus?: string;
  notes?: string;
}

export interface HealthInfoDetails {
  hasHealthIssue?: "Yes" | "No";
  healthIssueDetails?: string;
  generalHealth?: string;
  bloodGroup?: string;
  height?: string;
  weight?: string;
  existingConditions?: string;
  previousSurgeries?: string;
  currentMedications?: string;
  smokingStatus?: string;
  alcoholStatus?: string;
  disability?: string;
  healthNotes?: string;
}

export interface Customer {
  _id?: string;
  id: string;
  tenantId?: string;
  teamLeaderId?: string;
  teamLeaderName?: string;
  callerId?: string;
  callerName?: string;
  assignedTo?: string;
  assignedToName?: string;
  customerName: string;
  customerPhone?: string;
  alternatePhone?: string;
  customerEmail?: string;
  dob?: string;
  gender?: string;
  maritalStatus?: "Single" | "Married" | "Divorced" | "Widowed";
  anniversaryDate?: string;
  occupation?: string;

  // Address
  houseFlat?: string;
  streetArea?: string;
  landmark?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;

  familyMembers?: FamilyMemberItem[];
  healthDetails?: HealthInfoDetails;

  source?: string;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Contest {
  _id?: string;
  id: string;
  tenantId: string;
  name: string;
  insuranceCompanyId: string;
  companyName: string;
  type: "Monthly" | "Quarterly" | "Annual";
  startDate: string;
  endDate: string;
  targetAmount: number;
  rewardAmount: number;
  status: "Active" | "Inactive";
  paymentStatus: "Unpaid" | "Paid";
  actualBusiness?: number;
  achievementPercentage?: number;
  qualificationStatus?: "QUALIFIED" | "NOT QUALIFIED";
  paidAt?: string;
  markedPaidBy?: string;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BranchManagerMaster {
  _id?: string;
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
  employeeCode?: string;
  dob?: string;
  status: "Active" | "Inactive";
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeamManagerMaster {
  _id?: string;
  id: string;
  tenantId: string;
  bmId?: string;
  bmName?: string;
  name: string;
  phone?: string;
  email?: string;
  employeeCode?: string;
  dob?: string;
  status: "Active" | "Inactive";
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeamLeaderMaster {
  _id?: string;
  id: string;
  tenantId: string;
  bmId?: string;
  bmName?: string;
  teamManagerId?: string;
  teamManagerName?: string;
  name: string;
  phone?: string;
  email?: string;
  employeeCode?: string;
  dob?: string;
  status: "Active" | "Inactive";
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CallerMaster {
  _id?: string;
  id: string;
  tenantId: string;
  bmId?: string;
  bmName?: string;
  teamManagerId?: string;
  teamManagerName?: string;
  teamLeaderId?: string;
  teamLeaderName?: string;
  name: string;
  phone?: string;
  email?: string;
  employeeCode?: string;
  dob?: string;
  status: "Active" | "Inactive";
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type TSEMaster = CallerMaster;

export interface RenewalManagerMaster {
  _id?: string;
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
  employeeCode?: string;
  dob?: string;
  status: "Active" | "Inactive";
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RenewalExecutiveMaster {
  _id?: string;
  id: string;
  tenantId: string;
  renewalManagerId?: string;
  renewalManagerName?: string;
  name: string;
  phone?: string;
  email?: string;
  employeeCode?: string;
  dob?: string;
  status: "Active" | "Inactive";
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}


export interface FollowUp {
  _id?: string;
  id: string;
  tenantId?: string;
  teamLeaderId?: string;
  assignedTo?: string;
  assignedToName?: string;
  entityType: "LEAD" | "CUSTOMER";
  entityId: string;
  title?: string;
  followUpDate: string;
  followUpTime?: string;
  status: "PENDING" | "COMPLETED" | "MISSED";
  notes?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface CallLog {
  _id?: string;
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
  createdAt: string;
}

export interface AuditLog {
  _id?: string;
  id: string;
  tenantId?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: any;
  createdAt: string;
}

export interface TeamMember {
  _id: string;
  id?: string;
  name?: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  teamLeaderId?: string;
  permissions?: PermissionKey[];
  status?: "Active" | "Inactive" | "Suspended";
  createdAt?: string;
}

export interface InsuranceCompany {
  _id?: string;
  id: string;
  tenantId: string;
  name: string;
  code?: string;
  newBusinessPayoutPercentage: number;
  renewalPayoutPercentage: number;
  status: "Active" | "Inactive";
  categoryCount?: number;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InsuranceCategory {
  _id?: string;
  id: string;
  tenantId: string;
  companyId: string;
  companyName?: string;
  name: string;
  code?: string;
  description?: string;
  status: "Active" | "Inactive";
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InsuranceProduct {
  _id?: string;
  id: string;
  tenantId: string;
  companyId: string;
  companyName?: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  code?: string;
  description?: string;
  status: "Active" | "Inactive";
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Policy {
  id?: string;
  policyNumber?: string;
  insuranceCompanyId?: string;
  companyName: string;
  policyType: string;
  productId?: string;
  productName?: string;
  // Advisor Master Reference
  advisorId?: string;
  advisorName?: string;
  advisorCode?: string;

  premiumAmount: number;
  sumAssured?: number | null;
  sumAssuredType?: "FIXED" | "UNLIMITED";
  appliedPayoutPercentage?: number;
  expectedCommission?: number;
  commissionStatus?: "Unpaid" | "Paid";
  commissionPaidAt?: string;
  commissionMarkedPaidBy?: string;
  premiumFrequency: 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly';
  startDate: string; // YYYY-MM-DD
  expiryDate?: string; // YYYY-MM-DD
  nextDueDate?: string; // YYYY-MM-DD
  premiumStatus: 'Paid' | 'Unpaid' | 'Overdue' | 'Lapsed';
  
  // Cashback Details
  cashbackEnabled?: boolean;
  cashbackAmount?: number;

  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  whatsappNumber?: string;
  customerBirthday?: string; // YYYY-MM-DD
  customerType?: "Individual" | "Floater" | string;
  gender?: string;
  maritalStatus?: string;
  anniversaryDate?: string;
  occupation?: string;
  annualIncome?: string;
  height?: string;
  weight?: string;

  // Address
  houseFlat?: string;
  streetArea?: string;
  landmark?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;

  businessType?: "NEW_BUSINESS" | "NEW BUSINESS" | "RENEWAL" | "PORT" | string;
  businessSubtype?: "FRESH" | "PORT" | null | string;
  businessLoginDate?: string;
  portabilityDetails?: {
    previousInsuranceCompany?: string;
    previousPolicyNumber?: string;
    previousProductName?: string;
    previousPolicyExpiryDate?: string;
    previousSumInsured?: number | string;
  };
  policyTenure?: number;

  // EMI / Finance
  paymentMode?: "Direct" | "Finance/EMI";
  financeType?: "Company EMI" | "Vendor Finance";
  financeVendor?: string;
  financedAmount?: number;
  downPayment?: number;
  emiAmount?: number;
  emiTenure?: number; // in months
  emiStartDate?: string;

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
  referenceType?: "customer" | "agent" | "employee" | "other" | string;
  sourceRemark?: string;
  policyStatus?: "Issued" | "Pending" | "Cancelled" | string;
  assignedTo?: string;
  customerId?: string;

  wishedBy?: string;
  wishedAt?: string;
  wishedNote?: string;
  wishedStatus?: "Pending" | "Contacted" | "Wished" | "Completed";

  includeFamily?: boolean;
  familyMembers?: string[];
  familyMembersList?: FamilyMemberItem[];
  healthDetails?: HealthInfoDetails;
  documents?: any[];
  notes?: string;

  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;

  createdAt: string;
  updatedAt: string;
}

export interface ReportSummary {
  totalLeads: number;
  newLeads: number;
  interestedLeads: number;
  convertedLeads: number;
  totalCustomers: number;
  totalPolicies: number;
  totalCalls: number;
  conversionRate: string;
}

export interface CallerPerformance {
  id: string;
  name: string;
  email: string;
  status: string;
  assignedLeads: number;
  callsMade: number;
  interested: number;
  followUps: number;
  converted: number;
  conversionRate: string;
}

export interface EmailLog {
  id?: string;
  policyId?: string;
  policyNumber: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  sentAt: string;
  status: 'Sent' | 'Failed' | 'Pending' | 'Delivered';
  type: 'RenewalReminder' | 'ExpiryAlert' | 'Welcome' | 'Promotion' | 'BirthdayWish' | 'Onboarding' | 'PaymentReminder' | 'Other';
  channel?: 'Email' | 'WhatsApp' | 'Both';
  userId?: string;
  recipientPhone?: string;
  failureReason?: string;
  providerMessageId?: string;
}

export interface MailSettings {
  senderName: string;
  senderEmail: string;
  smtpHost: string;
  smtpPort: string;
  username: string;
  apiKey: string;
  credentialEmail?: string;
  smtpPassword?: string;
  enabled: boolean;
}

export interface WhatsAppSettings {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  enabled: boolean;
  templates: {
    renewals: string;
    birthdays: string;
    onboarding: string;
  };
}

export interface Notification {
  id?: string;
  policyId: string;
  title: string;
  message: string;
  type: 'PremiumDue' | 'ExpiryAlert' | 'General' | 'Birthday' | 'Onboarding';
  isRead: boolean;
  createdAt: string;
  userId: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface Tenant {
  _id: string;
  name: string;
  adminName?: string;
  adminEmail: string;
  adminUserId: string;
  plan: 'Basic' | 'Pro' | 'Enterprise';
  status: 'Active' | 'Expired' | 'Suspended';
  validUntil: string;
  maxPolicies?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SuperAdminStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  expiredTenants: number;
  totalPolicies: number;
}



export interface AgencyProfile {
  tenantId?: string;

  // Essential Information Only
  companyName: string;
  gstNumber?: string;
  mobileNumber?: string;
  email?: string;
  logoUrl?: string | null;

  // Backward compatibility aliases
  agencyName?: string;
  mobile?: string;
}

export type CompanyProfile = AgencyProfile;

export interface CompanyTargetItem {
  companyId?: string;
  companyName: string;
  policyTarget: number;
  premiumTarget: number;
}

export interface PerformanceTargetRecord {
  id?: string;
  tenantId?: string;
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
  month: number;
  year: number;
  targetMonth?: string;

  assignedPremiumTarget?: number;
  totalPolicyTarget: number;
  totalPremiumTarget: number;

  freshPolicyTarget: number;
  freshPremiumTarget: number;
  portPolicyTarget: number;
  portPremiumTarget: number;

  renewalPolicyTarget: number;
  renewalPremiumTarget: number;

  totalSumAssuredTarget: number;
  companyTargets: CompanyTargetItem[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyBreakdownItem {
  companyId?: string;
  companyName: string;
  policyTarget?: number;
  actualPolicies: number;
  policyAchievement?: number;
  premiumTarget?: number;
  actualPremium: number;
  actualNewBusinessPremium?: number;
  actualRenewalPremium?: number;
  premiumAchievement?: number;
}

export interface MonthlyBreakdownItem {
  month: number;
  year: number;
  monthName: string;
  assignedTarget: number;
  achievement: number;
  achievementPercentage: number;
  remainingTarget: number;
}

export interface ProductBreakdownItem {
  productId?: string;
  productName: string;
  policies: number;
  premium: number;
}

export interface PolicyDetailItem {
  id: string;
  customerName: string;
  policyNumber: string;
  companyName: string;
  productName: string;
  businessType: string;
  premiumAmount: number;
  policyStatus: string;
  businessLoginDate: string;
  sourcePersonName?: string;
}

export interface PerformanceSummaryMetrics {
  assignedTarget: number;
  achievement: number;
  achievementPercentage: number;
  remainingTarget: number;
  actualPolicies?: number;
  policyStats?: {
    total: number;
    issued: number;
    pending: number;
    cancelled: number;
  };
}

export interface EmployeePerformanceItem {
  sNo: number;
  targetId: string | null;
  employeeId: string;
  employeeName: string;
  role: string;
  employeeCode?: string;
  teamName: string;
  doj?: string;
  hasTargetAssigned: boolean;
  month?: number;
  year?: number;
  targetMonth?: string;
  policyStats?: {
    total: number;
    issued: number;
    pending: number;
    cancelled: number;
  };

  // MTD (Month To Date) Metrics
  mtd: PerformanceSummaryMetrics;

  // YTD (Year To Date: April to Selected Month) Metrics
  ytd: PerformanceSummaryMetrics;

  // Monthly Breakdown (April to Selected Month)
  monthlyBreakdown: MonthlyBreakdownItem[];

  // Dynamic Company & Product Breakdowns (MTD & YTD)
  companyBreakdown: CompanyBreakdownItem[];
  productBreakdown: ProductBreakdownItem[];
  ytdCompanyBreakdown: CompanyBreakdownItem[];
  ytdProductBreakdown: ProductBreakdownItem[];

  // Detailed Contributing Policy Ledger Entries
  policyDetails: PolicyDetailItem[];

  // Backward-compatibility fields
  freshPolicyTarget: number;
  freshPremiumTarget: number;
  actualFreshPolicies: number;
  actualFreshPremium: number;
  freshAchievement: number;
  freshPremiumAchievement: number;

  portPolicyTarget: number;
  portPremiumTarget: number;
  actualPortPolicies: number;
  actualPortPremium: number;
  portAchievement: number;
  portPremiumAchievement: number;

  newBusinessPolicyTarget: number;
  newBusinessPremiumTarget: number;
  actualNewBusinessPolicies: number;
  actualNewBusinessPremium: number;
  newBusinessAchievement: number;
  newBusinessPremiumAchievement: number;

  renewalPolicyTarget: number;
  renewalPremiumTarget: number;
  actualRenewalPolicies: number;
  actualRenewalPremium: number;
  renewalAchievement: number;
  renewalPremiumAchievement: number;

  policyTarget: number;
  actualPolicies: number;
  policyAchievement: number;
  remainingPolicies: number;

  premiumTarget: number;
  actualPremium: number;
  premiumAchievement: number;
  remainingPremium: number;

  sumAssuredTarget: number;
  actualSumAssured: number;

  status: "Excellent" | "On Track" | "Needs Attention" | "Critical" | "Target Not Assigned";
  notes?: string;
}

export interface TeamPerformanceItem {
  teamName: string;
  memberCount: number;

  // MTD & YTD Team Totals
  mtd: PerformanceSummaryMetrics;
  ytd: PerformanceSummaryMetrics;

  companyTotals: { companyName: string; actualPolicies: number; actualPremium: number }[];
  productTotals: { productName: string; actualPolicies: number; actualPremium: number }[];

  // Backward compatibility fields
  freshTarget: number;
  freshPremiumTarget: number;
  actualFresh: number;
  actualFreshPremium: number;
  freshAchievement: number;
  freshPremiumAchievement: number;

  portTarget: number;
  portPremiumTarget: number;
  actualPort: number;
  actualPortPremium: number;
  portAchievement: number;
  portPremiumAchievement: number;

  newBusinessPolicyTarget: number;
  newBusinessPremiumTarget: number;
  actualNewBusinessPolicies: number;
  actualNewBusinessPremium: number;
  newBusinessAchievement: number;
  newBusinessPremiumAchievement: number;

  renewalPolicyTarget: number;
  renewalPremiumTarget: number;
  actualRenewalPolicies: number;
  actualRenewalPremium: number;
  renewalAchievement: number;
  renewalPremiumAchievement: number;

  policyTarget: number;
  actualPolicies: number;
  policyAchievement: number;

  premiumTarget: number;
  actualPremium: number;
  premiumAchievement: number;

  members: EmployeePerformanceItem[];
}

export interface CompanyProductionItem {
  companyId?: string;
  companyName: string;
  targetPolicies: number;
  actualPolicies: number;
  policyAchievement: number;
  targetPremium: number;
  actualPremium: number;
  actualNewBusinessPremium: number;
  actualRenewalPremium: number;
  premiumAchievement: number;
}

export interface PerformanceDashboardData {
  month: number;
  year: number;
  mtdSummary: PerformanceSummaryMetrics;
  ytdSummary: PerformanceSummaryMetrics;
  summary: {
    totalPolicyTarget: number;
    totalActualPolicies: number;
    overallPolicyAchievement: number;
    totalPremiumTarget: number;
    totalActualPremium: number;
    overallPremiumAchievement: number;

    totalFreshTarget: number;
    totalFreshPremiumTarget: number;
    totalActualFresh: number;
    totalActualFreshPremium: number;
    overallFreshAchievement: number;
    overallFreshPremiumAchievement: number;

    totalPortTarget: number;
    totalPortPremiumTarget: number;
    totalActualPort: number;
    totalActualPortPremium: number;
    overallPortAchievement: number;
    overallPortPremiumAchievement: number;

    totalNewBusinessPolicyTarget: number;
    totalNewBusinessPremiumTarget: number;
    totalActualNewBusinessPolicies: number;
    totalActualNewBusinessPremium: number;
    overallNewBusinessAchievement: number;
    overallNewBusinessPremiumAchievement: number;

    totalRenewalTarget: number;
    totalRenewalPremiumTarget: number;
    totalActualRenewal: number;
    totalActualRenewalPremium: number;
    overallRenewalAchievement: number;
    overallRenewalPremiumAchievement: number;

    remainingPremium: number;
    remainingPolicies: number;
    employeeCount: number;
  };
  employeePerformances: EmployeePerformanceItem[];
  teamPerformanceList: TeamPerformanceItem[];
  companyProductionList: CompanyProductionItem[];
  companyList: string[];
  topPerformers: EmployeePerformanceItem[];
  needsAttention: EmployeePerformanceItem[];
  managementPerformances?: ManagementPerformanceItem[];
}

export interface ManagementPerformanceItem {
  id: string;
  name: string;
  role: "Team Leader" | "Team Manager" | "Branch Manager" | string;
  tseCount: number;
  actualPolicies?: number;
  policyStats?: {
    total: number;
    issued: number;
    pending: number;
    cancelled: number;
  };
  mtd: PerformanceSummaryMetrics;
  ytd: PerformanceSummaryMetrics;
}

// ----------------------------------------------------
// ADVISOR MASTER MANAGEMENT TYPES
// ----------------------------------------------------

export interface AdvisorPersonalDetails {
  fullName: string;
  fatherOrSpouseName?: string;
  dateOfBirth?: string;
  gender?: "Male" | "Female" | "Other" | "Prefer not to say" | string;
  maritalStatus?: "Single" | "Married" | "Other" | string;
  profilePhoto?: string;
}

export interface AdvisorIdentityDetails {
  panNumber?: string;
  aadhaarNumber?: string;
  advisorLicenseNumber?: string;
  licenseExpiryDate?: string;
}

export interface AdvisorContactDetails {
  mobileNumber: string;
  alternateMobileNumber?: string;
  email?: string;
  whatsappNumber?: string;
}

export interface AdvisorInsuranceDetails {
  insuranceCompanyId: string;
  insuranceCompanyName: string;
}

export interface AdvisorBranchDetails {
  branchName: string;
  branchCode?: string;
  branchAddress?: string;
  branchArea?: string;
  branchCity?: string;
  branchState?: string;
  branchPincode?: string;
}

export interface AdvisorBusinessDetails {
  businessType?: "Individual" | "Corporate" | "Agency" | "Broker" | "Other" | string;
  advisorType?: "Individual Advisor" | "Corporate Advisor" | "Agency" | "Broker" | "Other" | string;
  specialization?: string;
  yearsOfExperience?: number;
  dateOfJoining?: string;
  businessName?: string;
  gstNumber?: string;
  annualBusinessVolume?: number;
}

export interface AdvisorLocationDetails {
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

export interface AdvisorBankDetails {
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
}

export interface AdvisorInsuranceCompanyManagement {
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

export interface AdvisorInternalMapping {
  virtualManagerId?: string;
  virtualManagerName?: string;
  recruiterName?: string;
  recruiterMobile?: string;
  recruitmentDate?: string;
  internalDepartment?: string;
  internalNotes?: string;
}

export interface AdvisorDocument {
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

export interface Advisor {
  _id?: string;
  id: string;
  advisorCode: string;
  tenantId: string;
  personalDetails: AdvisorPersonalDetails;
  identityDetails?: AdvisorIdentityDetails;
  contactDetails: AdvisorContactDetails;
  insuranceDetails: AdvisorInsuranceDetails;
  branchDetails: AdvisorBranchDetails;
  insuranceCompanyManagement?: AdvisorInsuranceCompanyManagement;
  businessDetails?: AdvisorBusinessDetails;
  locationDetails?: AdvisorLocationDetails;
  bankDetails?: AdvisorBankDetails;
  internalMapping?: AdvisorInternalMapping;
  documents?: AdvisorDocument[];
  status: "ACTIVE" | "INACTIVE";
  notes?: string;
  linkedPoliciesCount?: number;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveAdvisorItem {
  id: string;
  advisorCode: string;
  name: string;
  insuranceCompanyId: string;
  insuranceCompanyName: string;
  branchName: string;
  branchCity?: string;
  mobileNumber?: string;
  virtualManagerName?: string;
  recruiterName?: string;
}

export interface AdvisorFormState {
  advisorCode: string;
  fullName: string;
  fatherOrSpouseName: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  profilePhoto: string;

  panNumber: string;
  aadhaarNumber: string;
  advisorLicenseNumber: string;
  licenseExpiryDate: string;

  mobileNumber: string;
  alternateMobileNumber: string;
  email: string;
  whatsappNumber: string;

  insuranceCompanyId: string;
  insuranceCompanyName: string;

  branchName: string;
  branchCode: string;
  branchAddress: string;
  branchArea: string;
  branchCity: string;
  branchState: string;
  branchPincode: string;

  // Insurance Company Management (BM, AM, ZM)
  branchManagerName: string;
  branchManagerMobile: string;
  branchManagerEmail: string;
  areaManagerName: string;
  areaManagerMobile: string;
  areaManagerEmail: string;
  zonalManagerName: string;
  zonalManagerMobile: string;
  zonalManagerEmail: string;

  businessType: string;
  advisorType: string;
  specialization: string;
  yearsOfExperience: number;
  dateOfJoining: string;
  businessName: string;
  gstNumber: string;
  annualBusinessVolume: number;

  addressLine1: string;
  addressLine2: string;
  area: string;
  landmark: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  country: string;

  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchNameBank: string;

  // Internal Mapping
  virtualManagerId: string;
  virtualManagerName: string;
  recruiterName: string;
  recruiterMobile: string;
  recruitmentDate: string;
  internalDepartment: string;
  internalNotes: string;

  documents: AdvisorDocument[];
  status: "ACTIVE" | "INACTIVE";
  notes: string;
}

// ----------------------------------------------------
// REVENUE MANAGEMENT EXPANDED TYPES
// ----------------------------------------------------

export interface CompanyRevenueBreakdown {
  companyId: string;
  companyName: string;
  freshRevenue: number;
  portRevenue: number;
  renewalRevenue: number;
  totalNewBusinessRevenue: number;
  totalRenewalRevenue: number;
  totalRevenue: number;
  freshPremium: number;
  portPremium: number;
  renewalPremium: number;
  totalPremium: number;
  freshCount: number;
  portCount: number;
  renewalCount: number;
  totalCount: number;
  paidRevenue?: number;
  pendingRevenue?: number;
}

export interface HistoricalRevenuePayload {
  policyId?: string;
  policyNumber?: string;
  customerName?: string;
  customerPhone?: string;
  insuranceCompanyId: string;
  companyName: string;
  businessType: "NEW_BUSINESS" | "RENEWAL" | string;
  businessSubtype: "FRESH" | "PORT" | "RENEWAL" | string;
  premiumAmount: number;
  appliedPayoutPercentage?: number;
  revenueAmount: number;
  revenueDate: string;
  commissionStatus: "Paid" | "Unpaid";
  advisorId?: string;
  advisorName?: string;
  notes?: string;
}

export interface AdvisorBusinessSummary {
  totalPolicies: number;
  freshPolicies: number;
  portPolicies: number;
  renewalPolicies: number;
  totalNewBusinessPolicies: number;

  totalPremium: number;
  freshPremium: number;
  portPremium: number;
  renewalPremium: number;
  totalNewBusinessPremium: number;

  totalCommission: number;
  totalRevenue: number;
  freshCommission: number;
  freshRevenue: number;
  portCommission: number;
  portRevenue: number;
  renewalCommission: number;
  renewalRevenue: number;
  totalNewBusinessRevenue: number;

  paidRevenue: number;
  pendingRevenue: number;
}

export interface AdvisorBusinessReport {
  success: boolean;
  advisor: {
    id: string;
    advisorCode: string;
    fullName: string;
    mobileNumber?: string;
    email?: string;
    insuranceCompanyName?: string;
    branchName?: string;
    branchCity?: string;
    branchManagerName?: string;
    areaManagerName?: string;
    zonalManagerName?: string;
    virtualManagerName?: string;
    recruiterName?: string;
    status: string;
  };
  filters: {
    datePreset: string;
    dateFrom: string;
    dateTo: string;
    insuranceCompanyId: string;
    companyName: string;
    businessType: string;
    commissionStatus: string;
  };
  summary: AdvisorBusinessSummary;
  policies: Policy[];
  companyBreakdown: CompanyRevenueBreakdown[];
}

// ── Exact Sum Assured Options Master (Fixed Amounts & Unlimited) ──
export const SUM_ASSURED_OPTIONS = [
  { label: "₹5 Lakh", value: 500000, type: "FIXED" as const },
  { label: "₹7.5 Lakh", value: 750000, type: "FIXED" as const },
  { label: "₹10 Lakh", value: 1000000, type: "FIXED" as const },
  { label: "₹15 Lakh", value: 1500000, type: "FIXED" as const },
  { label: "₹20 Lakh", value: 2000000, type: "FIXED" as const },
  { label: "₹25 Lakh", value: 2500000, type: "FIXED" as const },
  { label: "₹50 Lakh", value: 5000000, type: "FIXED" as const },
  { label: "₹75 Lakh", value: 7500000, type: "FIXED" as const },
  { label: "₹1 Crore", value: 10000000, type: "FIXED" as const },
  { label: "₹2 Crore", value: 20000000, type: "FIXED" as const },
  { label: "₹3 Crore", value: 30000000, type: "FIXED" as const },
  { label: "Unlimited", value: "UNLIMITED", type: "UNLIMITED" as const },
] as const;

export function formatSumAssuredDisplay(sumAssured?: number | null | string, sumAssuredType?: "FIXED" | "UNLIMITED" | string): string {
  if (sumAssuredType === "UNLIMITED" || sumAssured === "UNLIMITED" || sumAssured === null) {
    return "Unlimited";
  }
  const val = Number(sumAssured);
  if (!val && val !== 0) return "—";
  if (val === 0) return "—";

  if (val === 500000) return "₹5 Lakh";
  if (val === 750000) return "₹7.5 Lakh";
  if (val === 1000000) return "₹10 Lakh";
  if (val === 1500000) return "₹15 Lakh";
  if (val === 2000000) return "₹20 Lakh";
  if (val === 2500000) return "₹25 Lakh";
  if (val === 5000000) return "₹50 Lakh";
  if (val === 7500000) return "₹75 Lakh";
  if (val === 10000000) return "₹1 Crore";
  if (val === 20000000) return "₹2 Crore";
  if (val === 30000000) return "₹3 Crore";

  if (val >= 10000000) {
    const cr = val / 10000000;
    return `₹${Number.isInteger(cr) ? cr : cr.toFixed(2)} Crore`;
  }
  if (val >= 100000) {
    const lk = val / 100000;
    return `₹${Number.isInteger(lk) ? lk : lk.toFixed(2)} Lakh`;
  }
  return `₹${val.toLocaleString("en-IN")}`;
}
