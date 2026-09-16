import {
  Policy, EmailLog, MailSettings, WhatsAppSettings, Tenant, SuperAdminStats,
  TeamMember, Lead, UserRole, PermissionKey, CallStatus, Customer, FollowUp, AuditLog,
  ReportSummary, CallerPerformance, InsuranceCompany, InsuranceCategory, InsuranceProduct,
  RenewalManagerMaster, RenewalExecutiveMaster, AgencyProfile, PerformanceDashboardData, PerformanceTargetRecord,
  Advisor, ActiveAdvisorItem, AdvisorDocument, CompanyRevenueBreakdown, HistoricalRevenuePayload, AdvisorInsuranceCompanyManagement,
  AdvisorBusinessReport
} from "../types";

export interface UserSession {
  uid: string;
  name?: string;
  email: string;
  role?: UserRole;
  tenantId?: string;
  teamLeaderId?: string;
  tenantName?: string;
  subscriptionStatus?: "Active" | "Expired" | "Suspended";
  validUntil?: string;
  permissions?: PermissionKey[];
  status?: "Active" | "Inactive" | "Suspended";
  isDemo?: boolean;
}

export interface AuthResponse {
  token: string;
  user: UserSession;
}

const API_BASE = "";

// Helper for making API requests with optional token
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("auth_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error(`API endpoint [${endpoint}] returned non-JSON response (${response.status}). Please check server route.`);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "API Request failed");
  }
  return data as T;
}

export const api = {
  // DB Health Status
  getDbStatus: () => apiFetch<{ connected: boolean; status: string; database: string }>("/api/db-status"),

  // Auth Operations
  register: (name: string, email: string, password: string) =>
    apiFetch<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    }),

  login: (email: string, password: string) =>
    apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),

  demoAuth: () =>
    apiFetch<AuthResponse>("/api/auth/demo", {
      method: "POST"
    }),

  // SuperAdmin Operations
  getSuperAdminStats: () => apiFetch<SuperAdminStats>("/api/superadmin/stats"),

  getTenants: () => apiFetch<Tenant[]>("/api/superadmin/tenants"),

  createTenant: (tenantData: { name: string; adminName?: string; adminEmail: string; password?: string; plan: string; monthsValid: number }) =>
    apiFetch<{ success: boolean; tenant: Tenant }>("/api/superadmin/tenants", {
      method: "POST",
      body: JSON.stringify(tenantData)
    }),

  updateTenantSubscription: (id: string, updateData: { name?: string; adminName?: string; adminEmail?: string; status?: string; plan?: string; addMonths?: number; validUntil?: string }) =>
    apiFetch<{ success: boolean; tenant: Tenant }>(`/api/superadmin/tenants/${id}`, {
      method: "PUT",
      body: JSON.stringify(updateData)
    }),

  deleteTenant: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/superadmin/tenants/${id}`, {
      method: "DELETE"
    }),

  // Team Operations
  getTeamMembers: () => apiFetch<TeamMember[]>("/api/team/members"),

  createTeamLeader: (data: { name: string; email: string; password: string; permissions: PermissionKey[] }) =>
    apiFetch<{ message: string; member: TeamMember }>("/api/team/team-leaders", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateTeamLeader: (id: string, data: { name?: string; permissions?: PermissionKey[]; status?: string }) =>
    apiFetch<{ message: string; member: TeamMember }>(`/api/team/team-leaders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),

  createCaller: (data: { name: string; email: string; password: string; teamLeaderId?: string }) =>
    apiFetch<{ message: string; member: TeamMember }>("/api/team/callers", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateMemberStatus: (id: string, status: "Active" | "Inactive") =>
    apiFetch<{ message: string; member: TeamMember }>(`/api/team/members/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status })
    }),

  // Lead Operations
  getLeads: () => apiFetch<Lead[]>("/api/leads"),

  createLead: (data: Partial<Lead>) =>
    apiFetch<Lead>("/api/leads", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateLeadStatus: (id: string, data: { callStatus: CallStatus; note?: string; followUpDate?: string; nextFollowUpTime?: string }) =>
    apiFetch<{ message: string; lead: Lead }>(`/api/leads/${id}/status`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),

  assignLead: (id: string, assignedTo: string) =>
    apiFetch<{ message: string; lead: Lead }>(`/api/leads/${id}/assign`, {
      method: "PUT",
      body: JSON.stringify({ assignedTo })
    }),

  convertLead: (id: string, policyData: { policyNumber?: string; companyName?: string; policyType?: string; premiumAmount?: number; premiumFrequency?: string }) =>
    apiFetch<{ message: string; policy: Policy; lead: Lead }>(`/api/leads/${id}/convert`, {
      method: "POST",
      body: JSON.stringify(policyData)
    }),

  deleteLead: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/leads/${id}`, {
      method: "DELETE"
    }),

  // Customer Operations
  getCustomers: () => apiFetch<Customer[]>("/api/customers"),

  createCustomer: (data: Partial<Customer>) =>
    apiFetch<{ message: string; customer: Customer }>("/api/customers", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  getCustomerProfile: (id: string) =>
    apiFetch<{ customer: Customer; policies: Policy[]; callLogs: any[]; followUps: FollowUp[] }>(`/api/customers/${id}`),

  convertLeadToCustomer: (leadId: string, policyData?: { companyName?: string; policyType?: string; premiumAmount?: number; premiumFrequency?: string }) =>
    apiFetch<{ message: string; customer: Customer; policy: Policy; lead: Lead }>("/api/customers/convert-lead", {
      method: "POST",
      body: JSON.stringify({ leadId, ...policyData })
    }),

  deleteCustomer: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/customers/${id}`, {
      method: "DELETE"
    }),

  // Follow-up Operations
  getFollowUps: (filter: "all" | "today" | "upcoming" | "overdue" | "completed" = "all") =>
    apiFetch<FollowUp[]>(`/api/followups?filter=${filter}`),

  createFollowUp: (data: Partial<FollowUp>) =>
    apiFetch<{ message: string; followUp: FollowUp }>("/api/followups", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateFollowUpStatus: (id: string, status: "COMPLETED" | "MISSED", notes?: string) =>
    apiFetch<{ message: string; followUp: FollowUp }>(`/api/followups/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, notes })
    }),

  // Reports Operations
  getReportSummary: () => apiFetch<ReportSummary>("/api/reports/summary"),

  getCallerPerformance: () => apiFetch<CallerPerformance[]>("/api/reports/callers"),

  getBusinessReports: (filters?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== "All") params.append(k, v);
      });
    }
    const qs = params.toString();
    return apiFetch<any>(`/api/reports/business${qs ? "?" + qs : ""}`);
  },

  // Audit Log Operations
  getAuditLogs: () => apiFetch<AuditLog[]>("/api/audit"),

  // Policies Operations
  uploadDocuments: async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));

    const token = localStorage.getItem("auth_token");
    const res = await fetch("/api/policies/upload", {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to upload files" }));
      throw new Error(err.error || "Failed to upload files");
    }

    return res.json() as Promise<{ success: boolean; documents: any[] }>;
  },

  getPolicies: (userId: string) =>
    apiFetch<Policy[]>(`/api/policies?userId=${encodeURIComponent(userId)}`),

  addPolicy: (policy: Partial<Policy>) =>
    apiFetch<Policy>("/api/policies", {
      method: "POST",
      body: JSON.stringify(policy)
    }),

  updatePolicy: (id: string, policy: Partial<Policy>) =>
    apiFetch<Policy>(`/api/policies/${id}`, {
      method: "PUT",
      body: JSON.stringify(policy)
    }),

  deletePolicy: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/policies/${id}`, {
      method: "DELETE"
    }),

  importPolicies: (policies: Partial<Policy>[], userId: string) =>
    apiFetch<{ success: boolean; count: number; data: Policy[] }>("/api/policies/import", {
      method: "POST",
      body: JSON.stringify({ policies, userId })
    }),

  // Email Logs Operations
  getEmailLogs: (userId: string) =>
    apiFetch<EmailLog[]>(`/api/emails?userId=${encodeURIComponent(userId)}`),

  addEmailLog: (emailLog: Partial<EmailLog>) =>
    apiFetch<EmailLog>("/api/emails", {
      method: "POST",
      body: JSON.stringify(emailLog)
    }),

  // Settings Operations
  getSettings: (userId: string) =>
    apiFetch<{ userId: string; mailSettings: MailSettings; whatsAppSettings: WhatsAppSettings }>(`/api/settings?userId=${encodeURIComponent(userId)}`),

  saveSettings: (userId: string, mailSettings: MailSettings, whatsAppSettings: WhatsAppSettings) =>
    apiFetch<{ userId: string; mailSettings: MailSettings; whatsAppSettings: WhatsAppSettings }>("/api/settings", {
      method: "POST",
      body: JSON.stringify({ userId, mailSettings, whatsAppSettings })
    }),

  // Operator Management Operations
  getOperators: () => apiFetch<TeamMember[]>("/api/operators"),

  createOperator: (data: any) =>
    apiFetch<{ success: boolean; operator: TeamMember }>("/api/operators", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateOperator: (id: string, data: any) => {
    const targetId = (id || data?.userId || data?._id || data?.id || "").toString().trim();
    if (!targetId || targetId === "undefined" || targetId === "null") {
      return Promise.reject(new Error("User ID is required"));
    }
    const payload = {
      ...data,
      userId: targetId,
      _id: targetId,
      id: targetId
    };
    return apiFetch<{ success: boolean; operator: TeamMember }>(`/api/operators/${encodeURIComponent(targetId)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },

  deleteOperator: (id: string) => {
    const targetId = (id || "").toString().trim();
    if (!targetId || targetId === "undefined" || targetId === "null") {
      return Promise.reject(new Error("User ID is required"));
    }
    return apiFetch<{ success: boolean; message: string }>(`/api/operators/${encodeURIComponent(targetId)}`, {
      method: "DELETE"
    });
  },

  // Branch Manager Master Operations
  getBMsMaster: () => apiFetch<any[]>("/api/team/bms"),

  createBMMaster: (data: any) =>
    apiFetch<{ success: boolean; member: any }>("/api/team/bms", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateBMMaster: (id: string, data: any) =>
    apiFetch<{ success: boolean; member: any }>(`/api/team/bms/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),

  // Team Manager Master Operations
  getTMsMaster: (bmId?: string) =>
    apiFetch<any[]>(`/api/team/tms${bmId ? `?bmId=${encodeURIComponent(bmId)}` : ""}`),

  createTMMaster: (data: any) =>
    apiFetch<{ success: boolean; member: any }>("/api/team/tms", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateTMMaster: (id: string, data: any) =>
    apiFetch<{ success: boolean; member: any }>(`/api/team/tms/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),

  // Team Leader Master Operations
  getTeamLeadersMaster: (bmId?: string, teamManagerId?: string) => {
    const params = new URLSearchParams();
    if (bmId) params.append("bmId", bmId);
    if (teamManagerId) params.append("teamManagerId", teamManagerId);
    const qs = params.toString();
    return apiFetch<any[]>(`/api/team/team-leaders${qs ? "?" + qs : ""}`);
  },

  createTeamLeaderMaster: (data: any) =>
    apiFetch<{ success: boolean; member: any }>("/api/team/team-leaders", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateTeamLeaderMaster: (id: string, data: any) =>
    apiFetch<{ success: boolean; member: any }>(`/api/team/team-leaders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),

  // Caller Master Operations
  getCallersMaster: (teamLeaderId?: string, teamManagerId?: string, bmId?: string) => {
    const params = new URLSearchParams();
    if (teamLeaderId) params.append("teamLeaderId", teamLeaderId);
    if (teamManagerId) params.append("teamManagerId", teamManagerId);
    if (bmId) params.append("bmId", bmId);
    const qs = params.toString();
    return apiFetch<any[]>(`/api/team/callers${qs ? "?" + qs : ""}`);
  },

  createCallerMaster: (data: any) =>
    apiFetch<{ success: boolean; member: any }>("/api/team/callers", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateCallerMaster: (id: string, data: any) =>
    apiFetch<{ success: boolean; member: any }>(`/api/team/callers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),

  deleteBranchManagerMaster: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/team/bms/${id}`, {
      method: "DELETE"
    }),

  deleteTeamManagerMaster: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/team/tms/${id}`, {
      method: "DELETE"
    }),

  deleteTeamLeaderMaster: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/team/team-leaders/${id}`, {
      method: "DELETE"
    }),

  deleteCallerMaster: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/team/callers/${id}`, {
      method: "DELETE"
    }),

  // Renewal Manager Master Operations
  getRenewalManagersMaster: () => apiFetch<RenewalManagerMaster[]>("/api/team/renewal-managers"),

  createRenewalManagerMaster: (data: any) =>
    apiFetch<{ success: boolean; member: RenewalManagerMaster }>("/api/team/renewal-managers", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateRenewalManagerMaster: (id: string, data: any) =>
    apiFetch<{ success: boolean; member: RenewalManagerMaster }>(`/api/team/renewal-managers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),

  deleteRenewalManagerMaster: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/team/renewal-managers/${id}`, {
      method: "DELETE"
    }),

  // Renewal Executive Master Operations
  getRenewalExecutivesMaster: (renewalManagerId?: string) => {
    const qs = renewalManagerId ? `?renewalManagerId=${encodeURIComponent(renewalManagerId)}` : "";
    return apiFetch<RenewalExecutiveMaster[]>(`/api/team/renewal-executives${qs}`);
  },

  createRenewalExecutiveMaster: (data: any) =>
    apiFetch<{ success: boolean; member: RenewalExecutiveMaster }>("/api/team/renewal-executives", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateRenewalExecutiveMaster: (id: string, data: any) =>
    apiFetch<{ success: boolean; member: RenewalExecutiveMaster }>(`/api/team/renewal-executives/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),

  deleteRenewalExecutiveMaster: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/team/renewal-executives/${id}`, {
      method: "DELETE"
    }),

  // Insurance Company Master Operations
  getInsuranceCompanies: () => apiFetch<InsuranceCompany[]>("/api/companies"),

  getActiveInsuranceCompanies: () => apiFetch<InsuranceCompany[]>("/api/companies/active"),

  createInsuranceCompany: (data: { name: string; code?: string; newBusinessPayoutPercentage: number; renewalPayoutPercentage: number; status?: "Active" | "Inactive" }) =>
    apiFetch<InsuranceCompany>("/api/companies", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateInsuranceCompany: (id: string, data: Partial<InsuranceCompany>) =>
    apiFetch<InsuranceCompany>(`/api/companies/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),

  toggleInsuranceCompanyStatus: (id: string, status: "Active" | "Inactive") =>
    apiFetch<InsuranceCompany>(`/api/companies/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    }),

  // Insurance Category Master Operations
  getInsuranceCategories: (companyId?: string) =>
    apiFetch<InsuranceCategory[]>(`/api/companies/categories${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ""}`),

  getActiveInsuranceCategories: (companyId?: string) =>
    apiFetch<InsuranceCategory[]>(`/api/companies/categories/active${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ""}`),

  getCompanyCategories: (companyId: string) =>
    apiFetch<InsuranceCategory[]>(`/api/companies/${companyId}/categories`),

  createInsuranceCategory: (data: { companyId: string; name: string; code?: string; description?: string; status?: "Active" | "Inactive" }) =>
    apiFetch<InsuranceCategory>("/api/companies/categories", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateInsuranceCategory: (id: string, data: Partial<InsuranceCategory>) =>
    apiFetch<InsuranceCategory>(`/api/companies/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),

  deleteInsuranceCategory: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/companies/categories/${id}`, {
      method: "DELETE"
    }),

  // Insurance Product Master Operations
  getInsuranceProducts: (companyId?: string, categoryId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append("companyId", companyId);
    if (categoryId) params.append("categoryId", categoryId);
    if (status) params.append("status", status);
    const qs = params.toString();
    return apiFetch<InsuranceProduct[]>(`/api/companies/products${qs ? `?${qs}` : ""}`);
  },

  getActiveInsuranceProducts: (companyId?: string, categoryId?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append("companyId", companyId);
    if (categoryId) params.append("categoryId", categoryId);
    const qs = params.toString();
    return apiFetch<InsuranceProduct[]>(`/api/companies/products/active${qs ? `?${qs}` : ""}`);
  },

  createInsuranceProduct: (data: { companyId: string; categoryId?: string; name: string; code?: string; description?: string; status?: "Active" | "Inactive" }) =>
    apiFetch<InsuranceProduct>("/api/companies/products", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateInsuranceProduct: (id: string, data: Partial<InsuranceProduct>) =>
    apiFetch<InsuranceProduct>(`/api/companies/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),

  toggleInsuranceProductStatus: (id: string, status: "Active" | "Inactive") =>
    apiFetch<InsuranceProduct>(`/api/companies/products/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    }),

  deleteInsuranceProduct: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/companies/products/${id}`, {
      method: "DELETE"
    }),

  // Commission Payment Status & Policy-wise Override
  updatePolicyCommissionStatus: (id: string, commissionStatus: "Paid" | "Unpaid") =>
    apiFetch<Policy>(`/api/policies/${id}/commission-status`, {
      method: "PUT",
      body: JSON.stringify({ commissionStatus })
    }),

  updatePolicyCommission: (id: string, payoutPercentage: number) =>
    apiFetch<{ success: boolean; message: string; policy: Policy }>(`/api/policies/${id}/commission`, {
      method: "PUT",
      body: JSON.stringify({ payoutPercentage })
    }),

  // Contest Management API Operations
  getContests: () => apiFetch<any[]>("/api/contests"),

  createContest: (data: {
    name: string;
    insuranceCompanyId: string;
    companyName?: string;
    type: "Monthly" | "Quarterly" | "Annual";
    startDate: string;
    endDate: string;
    targetAmount: number;
    rewardAmount: number;
    status?: "Active" | "Inactive";
  }) =>
    apiFetch<any>("/api/contests", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateContest: (id: string, data: any) =>
    apiFetch<any>(`/api/contests/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),

  updateContestPaymentStatus: (id: string, paymentStatus: "Paid" | "Unpaid") =>
    apiFetch<any>(`/api/contests/${id}/payment-status`, {
      method: "PUT",
      body: JSON.stringify({ paymentStatus })
    }),

  deleteContest: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/contests/${id}`, {
      method: "DELETE"
    }),

  // Revenue Management Summary API
  getRevenueSummary: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch<{
      summary: {
        totalEarnedRevenue: number;
        receivedRevenue: number;
        pendingRevenue: number;
        pendingCommission: number;
        pendingContestReward: number;
        totalExpectedCommission: number;
        paidCommission: number;
        unpaidCommission: number;
        totalQualifiedContestRewards: number;
        paidQualifiedContestRewards: number;
        unpaidQualifiedContestRewards: number;
        policyCount: number;
        contestCount: number;
        qualifiedContestCount: number;

        freshRevenue: number;
        freshPremium: number;
        freshCount: number;
        portRevenue: number;
        portPremium: number;
        portCount: number;
        renewalRevenue: number;
        renewalPremium: number;
        renewalCount: number;
        totalNewBusinessRevenue: number;
        totalNewBusinessPremium: number;
        totalNewBusinessCount: number;
        totalRenewalRevenue: number;
        totalRenewalPremium: number;
        totalRevenue: number;
        totalPremium: number;
      };
      commissionPolicies: Policy[];
      contestItems: any[];
      companyBreakdown: CompanyRevenueBreakdown[];
    }>(`/api/revenue/summary${query ? `?${query}` : ""}`);
  },

  // Add Manual Historical Revenue Record
  addHistoricalRevenue: (payload: HistoricalRevenuePayload) =>
    apiFetch<{ success: boolean; policy: Policy }>("/api/revenue/historical", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  // Performance & Monthly Target Operations
  getPerformanceDashboard: (month: number, year: number, filters?: { teamId?: string; role?: string; employeeId?: string }) => {
    const params = new URLSearchParams({ month: month.toString(), year: year.toString() });
    if (filters?.teamId) params.append("teamId", filters.teamId);
    if (filters?.role) params.append("role", filters.role);
    if (filters?.employeeId) params.append("employeeId", filters.employeeId);
    return apiFetch<PerformanceDashboardData>(`/api/performance/dashboard?${params.toString()}`);
  },

  getPerformanceTargets: (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.append("month", month.toString());
    if (year) params.append("year", year.toString());
    const qs = params.toString();
    return apiFetch<PerformanceTargetRecord[]>(`/api/performance/targets${qs ? `?${qs}` : ""}`);
  },

  savePerformanceTarget: (targetData: Partial<PerformanceTargetRecord>) =>
    apiFetch<{ success: boolean; message: string; target: PerformanceTargetRecord }>("/api/performance/targets", {
      method: "POST",
      body: JSON.stringify(targetData)
    }),

  updatePerformanceTarget: (id: string, targetData: Partial<PerformanceTargetRecord>) =>
    apiFetch<{ success: boolean; message: string; target: PerformanceTargetRecord }>(`/api/performance/targets/${id}`, {
      method: "PUT",
      body: JSON.stringify(targetData)
    }),

  deletePerformanceTarget: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/api/performance/targets/${id}`, {
      method: "DELETE"
    }),

  // Highlight Module Operations
  getHighlights: () => apiFetch<any[]>("/api/highlights"),

  createHighlight: (data: any) =>
    apiFetch<any>("/api/highlights", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateHighlight: (id: string, data: any) =>
    apiFetch<any>(`/api/highlights/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),

  deleteHighlight: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/api/highlights/${id}`, {
      method: "DELETE"
    }),

  uploadHighlightBanner: async (file: File) => {
    const token = localStorage.getItem("auth_token");
    const formData = new FormData();
    formData.append("banner", file);

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch("/api/highlights/upload-banner", {
      method: "POST",
      headers,
      body: formData
    });

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Server returned non-JSON response during banner file upload.");
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Banner image upload failed.");
    }
    return data as { success: boolean; imageUrl: string };
  },

  // Advisor Master Management APIs
  getAdvisors: (params: Record<string, string | number> = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    return apiFetch<{
      advisors: Advisor[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
      kpis: { totalAdvisors: number; activeAdvisors: number; inactiveAdvisors: number; companiesCovered: number };
      filterOptions?: { virtualManagers: string[]; recruiters: string[] };
    }>(`/api/advisors${query ? `?${query}` : ""}`);
  },

  getActiveAdvisors: (insuranceCompanyId?: string) => {
    const query = insuranceCompanyId && insuranceCompanyId !== "All"
      ? `?insuranceCompanyId=${encodeURIComponent(insuranceCompanyId)}`
      : "";
    return apiFetch<ActiveAdvisorItem[]>(`/api/advisors/active${query}`);
  },

  getAdvisorById: (id: string) =>
    apiFetch<Advisor>(`/api/advisors/${id}`),

  lookupBranchPersonnel: (insuranceCompanyId: string, branchName: string) =>
    apiFetch<{ personnel: AdvisorInsuranceCompanyManagement | null; branchDetails?: any }>(
      `/api/advisors/lookup/branch-personnel?insuranceCompanyId=${encodeURIComponent(insuranceCompanyId)}&branchName=${encodeURIComponent(branchName)}`
    ),

  uploadAdvisorDocuments: async (files: File[], documentType: string = "Other Documents") => {
    const token = localStorage.getItem("auth_token");
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));
    formData.append("documentType", documentType);

    const res = await fetch("/api/advisors/upload", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Advisor document upload failed");
    }
    return res.json() as Promise<{ success: boolean; documents: AdvisorDocument[] }>;
  },

  uploadAdvisorDocumentsDirect: async (advisorId: string, files: File[], documentType: string, customTitle?: string) => {
    const formData = new FormData();
    files.forEach(f => formData.append("files", f));
    formData.append("documentType", documentType);
    if (customTitle) formData.append("customTitle", customTitle);

    const token = localStorage.getItem("auth_token");
    const res = await fetch(`/api/advisors/${advisorId}/documents`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Direct advisor document upload failed");
    }
    return res.json() as Promise<{ success: boolean; documents: AdvisorDocument[]; addedDocuments: AdvisorDocument[] }>;
  },

  deleteAdvisorDocument: (advisorId: string, documentId: string) =>
    apiFetch<{ success: boolean; documents: AdvisorDocument[] }>(
      `/api/advisors/${advisorId}/documents/${documentId}`,
      { method: "DELETE" }
    ),

  createAdvisor: (payload: Partial<Advisor>) =>
    apiFetch<Advisor>("/api/advisors", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  updateAdvisor: (id: string, payload: Partial<Advisor>) =>
    apiFetch<Advisor>(`/api/advisors/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),

  updateAdvisorStatus: (id: string, status: "ACTIVE" | "INACTIVE") =>
    apiFetch<Advisor>(`/api/advisors/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    }),

  getAdvisorBusinessReport: (advisorId: string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch<AdvisorBusinessReport>(`/api/advisors/${encodeURIComponent(advisorId)}/business-report${qs ? `?${qs}` : ""}`);
  },

  deleteAdvisor: (id: string) =>
    apiFetch<{ success: boolean; message?: string }>(`/api/advisors/${id}`, {
      method: "DELETE"
    })
};


// ── Standalone agency profile helpers ──────────────────────────────────────────
export async function fetchAgencyProfile(tenantId: string): Promise<AgencyProfile> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`/api/agency-profile?tenantId=${encodeURIComponent(tenantId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) return { companyName: "", agencyName: "", tenantId };
  return res.json();
}

export async function saveAgencyProfile(profile: AgencyProfile): Promise<{ success: boolean; profile: AgencyProfile }> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch("/api/agency-profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(profile)
  });
  return res.json();
}

export async function uploadAgencyLogo(file: File): Promise<{ success: boolean; logoUrl: string }> {
  const token = localStorage.getItem("auth_token");
  const fd = new FormData();
  fd.append("logo", file);
  const res = await fetch("/api/agency-profile/logo", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd
  });
  return res.json();
}

