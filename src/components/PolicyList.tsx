import React, { useState, useEffect } from "react";
import { Policy, EmailLog, InsuranceCompany, InsuranceProduct, AgencyProfile, HealthInfoDetails, ActiveAdvisorItem, SUM_ASSURED_OPTIONS, formatSumAssuredDisplay } from "../types";
import {
  Plus, Edit, Trash2, Search, Filter, Mail, Calendar, FileText, CheckCircle,
  X, Check, AlertTriangle, Shield, Clock, Send, Sparkles, Loader2, Eye, Cake, Users,
  User as UserIcon, AlertCircle, PhoneCall, MapPin, Download, FileSpreadsheet, ChevronDown, Upload, Paperclip, RefreshCw
} from "lucide-react";
import { INSURANCE_COMPANIES, POLICY_TYPES, PAYMENT_FREQUENCIES, PREMIUM_STATUSES, INDIAN_STATES } from "../constants";
import { api, fetchAgencyProfile } from "../lib/api";
import { getPolicyClassification, getPolicyStatusType } from "../lib/metrics";

import { motion, AnimatePresence } from "motion/react";
import ConfirmModal from "./ConfirmModal";
import PolicyDetailsView from "./PolicyDetailsView";

interface PolicyListProps {
  policies: Policy[];
  user?: any;
  userId: string;
  onRefresh: () => void;
  onAddEmailLog: (log: EmailLog) => void;
  // External states injected when clicking metric cards
  externalFilter?: string;
  onClearExternalFilter?: () => void;
}

function formatDateDisplay(dateStr?: string) {
  if (!dateStr) return "N/A";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day < 10 ? '0' + day : day} ${months[monthIdx]} ${year}`;
      }
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

const formatFileSize = (bytes?: number) => {
  if (!bytes || isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileTypeBadge = (originalName?: string, storedName?: string, mimeType?: string) => {
  const name = originalName || storedName || "";
  const ext = name.substring(name.lastIndexOf(".")).toLowerCase();
  if (ext === ".pdf" || mimeType?.includes("pdf")) return { label: "PDF", bg: "bg-rose-100 text-rose-800 border-rose-200" };
  if (ext === ".jpg" || ext === ".jpeg" || mimeType?.includes("jpeg")) return { label: "JPG", bg: "bg-emerald-100 text-emerald-800 border-emerald-200" };
  if (ext === ".png" || mimeType?.includes("png")) return { label: "PNG", bg: "bg-sky-100 text-sky-800 border-sky-200" };
  return { label: ext.replace(".", "").toUpperCase() || "DOC", bg: "bg-slate-100 text-slate-700 border-slate-200" };
};

const getDocumentDownloadUrl = (doc: any) => {
  const filename = doc.storedName || (doc.path ? doc.path.split("/").pop() : "");
  if (filename) {
    return `/api/policies/download/${encodeURIComponent(filename)}?originalName=${encodeURIComponent(doc.originalName || filename)}`;
  }
  return doc.path || "#";
};

const STANDARD_OCCUPATIONS = [
  "Salaried / Employee",
  "Self Employed",
  "Business Owner",
  "Government Employee",
  "Retired",
  "Homemaker / Housewife",
  "Student",
  "Farmer / Agriculturist",
];

type PolicyFormFamilyMember = {
  name: string;
  relationship: string;
  dob?: string;
  gender?: string;
  height?: string;
  weight?: string;
  hasPreExistingCondition?: "No" | "Yes";
  medicalDetails?: string;
  healthStatus?: string;
};

type PolicyFormState = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  alternatePhone: string;
  whatsappNumber: string;
  customerBirthday: string;
  customerType: string;
  gender: string;
  maritalStatus: string;
  anniversaryDate: string;
  occupation: string;
  annualIncome: string;
  height: string;
  weight: string;
  houseFlat: string;
  streetArea: string;
  landmark: string;
  address: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  includeFamily: boolean;
  familyMembersText: string;
  familyMembersList: PolicyFormFamilyMember[];
  hasHealthIssue: "No" | "Yes";
  healthIssueDetails: string;
  healthDetails: Partial<HealthInfoDetails>;
  policyNumber: string;
  insuranceCompanyId: string;
  companyName: string;
  policyType: string;
  productId: string;
  productName: string;
  businessType: string;
  businessSubtype: "FRESH" | "PORT" | null;
  previousInsuranceCompany: string;
  previousPolicyNumber: string;
  previousProductName: string;
  previousPolicyExpiryDate: string;
  previousSumInsured: string;
  policyTenure: number;
  policyStatus: "Issued" | "Pending" | "Cancelled" | "Not Set";
  premiumAmount: number;
  sumAssured: number | null | string;
  sumAssuredType?: "FIXED" | "UNLIMITED";
  appliedPayoutPercentage?: number;
  expectedCommission?: number;
  premiumFrequency: Policy["premiumFrequency"];
  startDate: string;
  expiryDate: string;
  nextDueDate: string;
  premiumStatus: "Paid" | "Unpaid" | "Overdue" | "Lapsed";
  paymentMode: "Direct" | "Finance/EMI";
  financeType: "Company EMI" | "Vendor Finance";
  financeVendor: string;
  financedAmount: number;
  downPayment: number;
  emiAmount: number;
  emiTenure: number;
  emiStartDate: string;
  businessLoginDate: string;
  cashbackEnabled: boolean;
  cashbackAmount: number;
  sourceType: "sales_team" | "direct" | "referral";
  sourcePersonName: string;
  sourcePersonMobile: string;
  referenceType: string;
  sourceRemark: string;
  bmId: string;
  bmName?: string;
  teamManagerId: string;
  teamManagerName?: string;
  teamLeaderId: string;
  teamLeaderName?: string;
  callerId: string;
  callerName?: string;
  renewalManagerId: string;
  renewalManagerName: string;
  renewalExecutiveId: string;
  renewalExecutiveName: string;
  advisorId?: string;
  advisorName?: string;
  advisorCode?: string;
  notes: string;
};

export default function PolicyList({
  policies,
  user,
  userId,
  onRefresh,
  onAddEmailLog,
  externalFilter,
  onClearExternalFilter
}: PolicyListProps) {
  // Permission checks for Data Executives vs Admins
  const canCreateNewBusiness = (() => {
    if (!user) return true;
    if (user.role !== "OPERATOR") return true;
    const perms = user.permissions || [];
    return perms.includes("policies.create_new_business") || perms.includes("policies.create");
  })();

  const canCreateRenewal = (() => {
    if (!user) return true;
    if (user.role !== "OPERATOR") return true;
    const perms = user.permissions || [];
    return perms.includes("policies.create_renewal") || perms.includes("policies.create");
  })();

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedSourceType, setSelectedSourceType] = useState("");
  const [selectedBusinessType, setSelectedBusinessType] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(""); // format: "YYYY-MM"

  // Sync external filter from Overview & Segment smart navigation
  useEffect(() => {
    if (externalFilter !== undefined) {
      const raw = String(externalFilter);
      const parts = raw.split(":");
      let seg = "";
      let stat = "";
      if (parts.length === 2) {
        seg = parts[0];
        stat = parts[1];
      } else {
        stat = parts[0];
      }

      // Handle Business Type Filter
      const segUpper = seg.trim().toUpperCase();
      if (segUpper === "NEW_BUSINESS") {
        setSelectedBusinessType("NEW_BUSINESS");
      } else if (segUpper === "FRESH") {
        setSelectedBusinessType("FRESH");
      } else if (segUpper === "PORT") {
        setSelectedBusinessType("PORT");
      } else if (segUpper === "RENEWAL") {
        setSelectedBusinessType("RENEWAL");
      } else {
        setSelectedBusinessType("");
      }

      // Handle Status Filter
      const statLower = stat.trim().toLowerCase();
      if (statLower === "all" || !statLower) {
        setSelectedStatus("");
      } else if (statLower === "issued") {
        setSelectedStatus("Issued");
      } else if (statLower === "pending") {
        setSelectedStatus("Pending");
      } else if (statLower === "cancelled") {
        setSelectedStatus("Cancelled");
      }
    }
  }, [externalFilter]);

  // Policy Start Date Filter States
  const [startDateFrom, setStartDateFrom] = useState("");
  const [startDateTo, setStartDateTo] = useState("");
  const [appliedStartDateFrom, setAppliedStartDateFrom] = useState("");
  const [appliedStartDateTo, setAppliedStartDateTo] = useState("");

 const isDateRangeInvalid = !!startDateFrom && !!startDateTo && startDateTo < startDateFrom;

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Reset to page 1 whenever filters, search, or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCompany, selectedType, selectedStatus, selectedSourceType, selectedBusinessType, selectedMonth, appliedStartDateFrom, appliedStartDateTo, pageSize]);

  const handleApplyDateFilter = () => {
    if (startDateFrom && startDateTo && startDateTo < startDateFrom) {
      return;
    }
    setAppliedStartDateFrom(startDateFrom);
    setAppliedStartDateTo(startDateTo);
  };

  const handleClearDateFilter = () => {
    setStartDateFrom("");
    setStartDateTo("");
    setAppliedStartDateFrom("");
    setAppliedStartDateTo("");
  };

  // UI States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isNewBusinessChoiceOpen, setIsNewBusinessChoiceOpen] = useState(false);
  const [newBusinessSubtypeChoice, setNewBusinessSubtypeChoice] = useState<"FRESH" | "PORT">("FRESH");
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState<string | null>(null); // policyId
  const [emailStatusMessage, setEmailStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleOpenNewBusinessModal = () => {
    setNewBusinessSubtypeChoice("FRESH");
    setIsNewBusinessChoiceOpen(true);
  };

  const handleContinueNewBusinessChoice = () => {
    setIsNewBusinessChoiceOpen(false);
    setEditingPolicy(null);
    setForm({
      ...initialFormState,
      businessType: "NEW_BUSINESS",
      businessSubtype: newBusinessSubtypeChoice,
      policyStatus: "Issued"
    });
    setPendingFiles([]);
    setExistingDocuments([]);
    setIsAddOpen(true);
  };

 const openCreateForRenewal = () => {
    setEditingPolicy(null);
    setForm({
      ...initialFormState,
      businessType: "RENEWAL",
      businessSubtype: null,
      policyStatus: "Issued"
    });
    setPendingFiles([]);
    setExistingDocuments([]);
    setIsAddOpen(true);
  };

  // Custom Detail Modal State
  const [viewingDetailsPolicy, setViewingDetailsPolicy] = useState<Policy | null>(null);
  const [isSendingDetailsBatch, setIsSendingDetailsBatch] = useState(false);
  const [agencyProfile, setAgencyProfile] = useState<AgencyProfile | null>(null);

  // Fetch agency profile once on mount for PDF branding
  useEffect(() => {
    const tid = user?.tenantId || userId;
    if (tid) {
      fetchAgencyProfile(tid)
        .then((p) => { if (p && (p.companyName || p.agencyName)) setAgencyProfile(p); })
        .catch(() => {});
    }
  }, [userId, user?.tenantId]);

  const companyDisplayName = agencyProfile?.companyName || agencyProfile?.agencyName || "Policy Master";
  const companyDisplayUpper = (agencyProfile?.companyName || agencyProfile?.agencyName || "POLICY MASTER").toUpperCase();

  // Export Dropdown State & Ref
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Team Leaders, Callers, BMs, TMs, Renewal Managers, Renewal Executives & Insurance Companies Master State for Dropdowns
  const [masterBMs, setMasterBMs] = useState<any[]>([]);
  const [masterTMs, setMasterTMs] = useState<any[]>([]);
  const [masterTeamLeaders, setMasterTeamLeaders] = useState<any[]>([]);
  const [masterCallers, setMasterCallers] = useState<any[]>([]);
  const [masterRenewalManagers, setMasterRenewalManagers] = useState<any[]>([]);
  const [masterRenewalExecutives, setMasterRenewalExecutives] = useState<any[]>([]);
  const [masterCompanies, setMasterCompanies] = useState<InsuranceCompany[]>([]);
  const [masterCategories, setMasterCategories] = useState<any[]>([]);
  const [masterProducts, setMasterProducts] = useState<InsuranceProduct[]>([]);
  const [masterAdvisors, setMasterAdvisors] = useState<ActiveAdvisorItem[]>([]);
  const [selectedPolicyStatus, setSelectedPolicyStatus] = useState("");

  React.useEffect(() => {
    api.getActiveInsuranceCompanies().then(setMasterCompanies).catch(() => { });
    api.getActiveInsuranceCategories().then(setMasterCategories).catch(() => { });
    api.getActiveInsuranceProducts().then(setMasterProducts).catch(() => { });
    api.getActiveAdvisors().then(setMasterAdvisors).catch(() => { });
    api.getBMsMaster().then(setMasterBMs).catch(() => { });
    api.getTMsMaster().then(setMasterTMs).catch(() => { });
    api.getTeamLeadersMaster().then(setMasterTeamLeaders).catch(() => { });
    api.getCallersMaster().then(setMasterCallers).catch(() => { });
    api.getRenewalManagersMaster().then(setMasterRenewalManagers).catch(() => { });
    api.getRenewalExecutivesMaster().then(setMasterRenewalExecutives).catch(() => { });
  }, []);

  React.useEffect(() => {
    if (isAddOpen) {
      api.getBMsMaster().then(setMasterBMs).catch(() => { });
      api.getTMsMaster().then(setMasterTMs).catch(() => { });
      api.getTeamLeadersMaster().then(setMasterTeamLeaders).catch(() => { });
      api.getCallersMaster().then(setMasterCallers).catch(() => { });
      api.getRenewalManagersMaster().then(setMasterRenewalManagers).catch(() => { });
      api.getRenewalExecutivesMaster().then(setMasterRenewalExecutives).catch(() => { });
      api.getActiveAdvisors().then(setMasterAdvisors).catch(() => { });
      api.getActiveInsuranceCompanies().then(res => {
        setMasterCompanies(res);
        if (res.length > 0 && !form.companyName) {
          setForm(prev => ({ ...prev, companyName: res[0].name, insuranceCompanyId: res[0].id }));
        }
      }).catch(() => { });
      api.getActiveInsuranceCategories().then(setMasterCategories).catch(() => { });
      api.getActiveInsuranceProducts().then(setMasterProducts).catch(() => { });
    }
  }, [isAddOpen]);

  const availableCompaniesFilter = Array.from(new Set([
    ...masterCompanies.map(c => c.name),
    ...policies.map(p => p.companyName).filter(Boolean)
  ]));

  const availableCategoriesFilter = Array.from(new Set([
    ...masterCategories.map(c => c.name),
    ...policies.map(p => p.policyType).filter(Boolean)
  ]));

  const initialFormState: PolicyFormState = {
    // 01 Personal Details
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    alternatePhone: "",
    whatsappNumber: "",
    customerBirthday: "",
    customerType: "Individual",
    gender: "Male" as any,
    maritalStatus: "Single" as any,
    anniversaryDate: "",
    occupation: "",
    annualIncome: "",
    height: "",
    weight: "",

    // 02 Contact & Address
    houseFlat: "",
    streetArea: "",
    landmark: "",
    address: "",
    city: "",
    district: "",
    state: "",
    pincode: "",

    // 03 Family Details
    includeFamily: false,
    familyMembersText: "",
    familyMembersList: [] as { name: string; relationship: string; dob?: string; gender?: string; height?: string; weight?: string; hasPreExistingCondition?: "No" | "Yes"; medicalDetails?: string; healthStatus?: string }[],

    // 04 Health Info & Client Conditions
    hasHealthIssue: "No" as "No" | "Yes",
    healthIssueDetails: "",
    healthDetails: {
      generalHealth: "Good",
      bloodGroup: "",
      height: "",
      weight: "",
      existingConditions: "",
      previousSurgeries: "",
      currentMedications: "",
      smokingStatus: "Never",
      alcoholStatus: "Never",
      healthNotes: ""
    },

    // 05 Policy & Premium Schedule
    policyNumber: "",
    insuranceCompanyId: "",
    companyName: "",
    policyType: POLICY_TYPES[0],
    productId: "",
    productName: "",
    businessType: "NEW_BUSINESS" as string,
    businessSubtype: "FRESH" as "FRESH" | "PORT" | null,
    previousInsuranceCompany: "",
    previousPolicyNumber: "",
    previousProductName: "",
    previousPolicyExpiryDate: "",
    previousSumInsured: "",
    policyTenure: 1,
    policyStatus: "Issued" as "Issued" | "Pending" | "Cancelled",
    premiumAmount: 0,
    sumAssured: "",
    sumAssuredType: "FIXED" as "FIXED" | "UNLIMITED",
    appliedPayoutPercentage: undefined as number | undefined,
    expectedCommission: undefined as number | undefined,
    premiumFrequency: "Yearly",
    startDate: "",
    expiryDate: "",
    nextDueDate: "",
    premiumStatus: "Paid",

    // 06 EMI / Finance
    paymentMode: "Direct" as "Direct" | "Finance/EMI",
    financeType: "Company EMI" as "Company EMI" | "Vendor Finance",
    financeVendor: "",
    financedAmount: 0,
    downPayment: 0,
    emiAmount: 0,
    emiTenure: 0,
    emiStartDate: "",

    // 00 Business Login Date
    businessLoginDate: new Date().toISOString().split("T")[0],

    // Cashback Details
    cashbackEnabled: false,
    cashbackAmount: 0,

    // 07 Policy Source & Sales Reference
    sourceType: "sales_team" as "sales_team" | "direct" | "referral",
    sourcePersonName: "",
    sourcePersonMobile: "",
    referenceType: "Customer" as "Customer" | "Agent" | "Employee" | "Other" | string,
    sourceRemark: "",
    bmId: "",
    teamManagerId: "",
    teamLeaderId: "",
    callerId: "",
    renewalManagerId: "",
    renewalManagerName: "",
    renewalExecutiveId: "",
    renewalExecutiveName: "",
    advisorId: "",
    advisorName: "",
    advisorCode: "",

    // 08 Notes
    notes: ""
  };
  const [form, setForm] = useState<PolicyFormState>(initialFormState);

  // Documents & Attachments State
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<any[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files) as File[];
    const validFiles: File[] = [];
    const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    const allowedExts = [".pdf", ".jpg", ".jpeg", ".png"];

    for (const f of selected) {
      const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
      if (!allowed.includes(f.type) && !allowedExts.includes(ext)) {
        alert(`Invalid file type for "${f.name}". Only PDF, JPG, JPEG, and PNG files are allowed.`);
        continue;
      }
      if (f.size > 25 * 1024 * 1024) {
        alert(`File "${f.name}" exceeds the 25MB size limit.`);
        continue;
      }
      validFiles.push(f);
    }
    setPendingFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Helper for Auto-calculating Next Premium Due Date based on Start Date & Frequency
  const calculateNextDueDate = (startDateStr: string, frequency: string): string => {
    if (!startDateStr) return "";
    const parts = startDateStr.split("-");
    if (parts.length !== 3) return "";
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return "";

    const d = new Date(year, month, day);
    const freqLower = (frequency || "").toLowerCase();

    if (freqLower.includes("half") || freqLower.includes("semi")) {
      d.setMonth(d.getMonth() + 6);
    } else if (freqLower.includes("quarter")) {
      d.setMonth(d.getMonth() + 3);
    } else if (freqLower.includes("month")) {
      d.setMonth(d.getMonth() + 1);
    } else {
      // Yearly, Annual, Single, or Default -> +1 Year
      d.setFullYear(d.getFullYear() + 1);
    }

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Helper for Auto-calculating Policy Expiry / Maturity Date based on Start Date & Policy Tenure
  const calculateExpiryDate = (startDateStr: string, tenureYears: number): string => {
    if (!startDateStr) return "";
    const parts = startDateStr.split("-");
    if (parts.length !== 3) return "";
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return "";

    const d = new Date(year, month, day);
    d.setFullYear(d.getFullYear() + (Number(tenureYears) || 1));

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Handle Input Changes with Auto Due Date & Expiry Calculation
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setForm(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setForm(prev => {
        const nextState = {
          ...prev,
          [name]: name === "premiumAmount" ? Number(value) : (name === "policyTenure" || name === "cashbackAmount" ? Number(value) : value)
        };

        if (name === "startDate") {
          const newNextDue = calculateNextDueDate(value, nextState.premiumFrequency);
          if (newNextDue) nextState.nextDueDate = newNextDue;
          const newExpiry = calculateExpiryDate(value, nextState.policyTenure);
          if (newExpiry) nextState.expiryDate = newExpiry;
        } else if (name === "premiumFrequency") {
          const newNextDue = calculateNextDueDate(nextState.startDate, value);
          if (newNextDue) nextState.nextDueDate = newNextDue;
        } else if (name === "policyTenure") {
          const tenureVal = Number(value) || 1;
          nextState.policyTenure = tenureVal;
          const newExpiry = calculateExpiryDate(nextState.startDate, tenureVal);
          if (newExpiry) nextState.expiryDate = newExpiry;
        } else if (name === "maritalStatus" && value !== "Married") {
          nextState.anniversaryDate = "";
        }

        return nextState;
      });
    }
  };

  // Submit Add Policy
  const handleAddPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName) {
      alert("Please fill in Customer Name before saving.");
      return;
    }

    if (form.cashbackEnabled && (!form.cashbackAmount || Number(form.cashbackAmount) <= 0)) {
      alert("Please enter a valid Cashback Amount greater than 0.");
      return;
    }

    const sType = form.sourceType || "sales_team";

    try {
      const familyMembersListProcessed = form.familyMembersList.map(fam => {
        const hasCond = fam.hasPreExistingCondition || "No";
        const med = hasCond === "Yes" ? (fam.medicalDetails || "").trim() : "";
        return {
          name: fam.name,
          relationship: fam.relationship,
          dob: fam.dob || "",
          gender: fam.gender || "Male",
          height: fam.height || "",
          weight: fam.weight || "",
          hasPreExistingCondition: hasCond,
          medicalDetails: med,
          healthStatus: hasCond === "Yes" ? (med || "Pre-existing condition reported") : "Healthy"
        };
      });

      const familyMembers = form.includeFamily && familyMembersListProcessed.length > 0
        ? familyMembersListProcessed.map(f => {
          const detailsStr = f.hasPreExistingCondition === "Yes" && f.medicalDetails ? ` (${f.medicalDetails})` : "";
          return `${f.name} (${f.relationship}, ${f.gender}${detailsStr})`;
        })
        : (form.includeFamily && form.familyMembersText ? form.familyMembersText.split(",").map(n => n.trim()).filter(Boolean) : []);

      const now = new Date().toISOString();
      const resolvedEmail = form.customerEmail && form.customerEmail.trim()
        ? form.customerEmail.trim()
        : `${form.customerName.toLowerCase().replace(/[^a-z0-9]/g, "") || "client"}@policymaster.local`;

      let uploadedDocs: any[] = [];
      if (pendingFiles.length > 0) {
        setUploadingDocs(true);
        try {
          const uploadRes = await api.uploadDocuments(pendingFiles);
          if (uploadRes && uploadRes.documents) {
            uploadedDocs = uploadRes.documents;
          }
        } catch (uploadErr: any) {
          setUploadingDocs(false);
          alert(`Document upload failed: ${uploadErr.message || "Failed to upload files"}`);
          return;
        }
        setUploadingDocs(false);
      }
      const finalDocuments = [...existingDocuments, ...uploadedDocs];

      const newPolicy: Omit<Policy, 'id'> = {
        policyNumber: form.policyNumber,
        companyName: form.companyName,
        policyType: form.policyType,
        productId: form.productId || "",
        productName: form.productName || "",
        businessType: form.businessType || "NEW BUSINESS",
        businessSubtype: form.businessSubtype || (form.businessType === "PORT" ? "PORT" : form.businessType === "RENEWAL" ? null : "FRESH"),
        businessLoginDate: form.businessLoginDate || new Date().toISOString().split("T")[0],
        portabilityDetails: (form.businessType === "PORT" || form.businessSubtype === "PORT") ? {
          previousInsuranceCompany: form.previousInsuranceCompany,
          previousPolicyNumber: form.previousPolicyNumber,
          previousProductName: form.previousProductName,
          previousPolicyExpiryDate: form.previousPolicyExpiryDate,
          previousSumInsured: form.previousSumInsured
        } : undefined,
        policyTenure: Number(form.policyTenure) || 1,
        policyStatus: form.policyStatus || "Issued",
        premiumAmount: form.premiumAmount,
        sumAssured: (form.sumAssuredType === "UNLIMITED" || form.sumAssured === "UNLIMITED") ? null : (Number(form.sumAssured) || 0),
        sumAssuredType: (form.sumAssuredType === "UNLIMITED" || form.sumAssured === "UNLIMITED") ? "UNLIMITED" : "FIXED",
        premiumFrequency: form.premiumFrequency,
        startDate: form.startDate,
        expiryDate: form.expiryDate,
        nextDueDate: form.nextDueDate,
        premiumStatus: form.premiumStatus,
        customerName: form.customerName,
        customerEmail: resolvedEmail,
        customerPhone: form.customerPhone,
        whatsappNumber: (form as any).whatsappNumber || "",
        customerBirthday: form.customerBirthday,
        customerType: (form as any).customerType || "Individual",
        gender: form.gender,
        maritalStatus: form.maritalStatus,
        anniversaryDate: form.maritalStatus === "Married" ? form.anniversaryDate : "",
        occupation: form.occupation,
        annualIncome: (form as any).annualIncome || "",
        height: (form as any).height || "",
        weight: (form as any).weight || "",
        houseFlat: form.houseFlat,
        streetArea: form.streetArea,
        landmark: form.landmark,
        address: form.address || [form.houseFlat, form.streetArea, form.city, form.state].filter(Boolean).join(", "),
        city: form.city,
        district: form.district,
        state: form.state,
        pincode: form.pincode,
        includeFamily: form.includeFamily,
        familyMembers: familyMembers,
        familyMembersList: familyMembersListProcessed,
        healthDetails: {
          ...form.healthDetails,
          hasHealthIssue: form.hasHealthIssue,
          healthIssueDetails: form.hasHealthIssue === "Yes" ? form.healthIssueDetails : "",
          existingConditions: form.hasHealthIssue === "Yes" ? form.healthIssueDetails : (form.healthDetails?.existingConditions || "")
        },
        documents: finalDocuments,
        sourceType: sType,
        sourcePersonName: sType !== "sales_team" ? form.sourcePersonName : undefined,
        sourcePersonMobile: sType !== "sales_team" ? form.sourcePersonMobile : undefined,
        referenceType: sType === "referral" ? form.referenceType : undefined,
        sourceRemark: sType !== "sales_team" ? form.sourceRemark : undefined,
        bmId: sType === "sales_team" && form.businessType !== "RENEWAL" ? form.bmId : undefined,
        teamManagerId: sType === "sales_team" && form.businessType !== "RENEWAL" ? form.teamManagerId : undefined,
        teamLeaderId: sType === "sales_team" && form.businessType !== "RENEWAL" ? form.teamLeaderId : undefined,
        callerId: sType === "sales_team" && form.businessType !== "RENEWAL" ? form.callerId : undefined,
        tseId: sType === "sales_team" && form.businessType !== "RENEWAL" ? form.callerId : undefined,
        renewalManagerId: sType === "sales_team" && form.businessType === "RENEWAL" ? form.renewalManagerId : undefined,
        renewalManagerName: sType === "sales_team" && form.businessType === "RENEWAL" ? form.renewalManagerName : undefined,
        renewalExecutiveId: sType === "sales_team" && form.businessType === "RENEWAL" ? form.renewalExecutiveId : undefined,
        renewalExecutiveName: sType === "sales_team" && form.businessType === "RENEWAL" ? form.renewalExecutiveName : undefined,
        advisorId: form.advisorId || undefined,
        advisorName: form.advisorName || undefined,
        advisorCode: form.advisorCode || undefined,
        paymentMode: form.paymentMode,
        financeType: form.paymentMode === "Finance/EMI" ? form.financeType : undefined,
        financeVendor: form.paymentMode === "Finance/EMI" && form.financeType === "Vendor Finance" ? form.financeVendor : undefined,
        financedAmount: form.paymentMode === "Finance/EMI" && form.financeType === "Vendor Finance" ? form.financedAmount : undefined,
        downPayment: form.paymentMode === "Finance/EMI" && form.financeType === "Vendor Finance" ? form.downPayment : undefined,
        emiAmount: form.paymentMode === "Finance/EMI" ? form.emiAmount : undefined,
        emiTenure: form.paymentMode === "Finance/EMI" ? form.emiTenure : undefined,
        emiStartDate: form.paymentMode === "Finance/EMI" ? form.emiStartDate : undefined,
        cashbackEnabled: Boolean(form.cashbackEnabled),
        cashbackAmount: form.cashbackEnabled ? (Number(form.cashbackAmount) || 0) : 0,
        notes: form.notes,
        userId,
        createdAt: now,
        updatedAt: now
      };

      if (userId === "local-agent-session" || userId.startsWith("local")) {
        const localPoliciesStr = localStorage.getItem(`policies_${userId}`);
        const localPolicies: Policy[] = localPoliciesStr ? JSON.parse(localPoliciesStr) : [];
        const policyWithId: Policy = {
          ...newPolicy,
          id: `local_policy_${Date.now()}`
        };
        localPolicies.push(policyWithId);
        localStorage.setItem(`policies_${userId}`, JSON.stringify(localPolicies));
      } else {
        await api.addPolicy({ ...newPolicy, userId });
      }
      setIsAddOpen(false);
      setForm(initialFormState);
      onRefresh();
    } catch (err) {
      console.error("Error adding policy:", err);
    }
  };

  // Setup Edit Form
  const startEdit = (policy: Policy) => {
    const isRenewal = policy.businessType === "RENEWAL";
    let initRmId = isRenewal ? (policy.renewalManagerId || "") : "";
    let initRmName = isRenewal ? (policy.renewalManagerName || "") : "";

    if (isRenewal && !initRmId && initRmName && masterRenewalManagers.length > 0) {
      const match = masterRenewalManagers.find(r => r.name?.trim().toLowerCase() === initRmName?.trim().toLowerCase() || r.id === initRmName || (r as any)._id === initRmName);
      if (match) {
        initRmId = match.id || (match as any)._id;
        initRmName = match.name;
      }
    }

    let initReId = isRenewal ? (policy.renewalExecutiveId || "") : "";
    let initReName = isRenewal ? (policy.renewalExecutiveName || "") : "";

    if (isRenewal && !initReId && initReName && masterRenewalExecutives.length > 0) {
      const match = masterRenewalExecutives.find(r => r.name?.trim().toLowerCase() === initReName?.trim().toLowerCase() || r.id === initReName || (r as any)._id === initReName);
      if (match) {
        initReId = match.id || (match as any)._id;
        initReName = match.name;
      }
    }

    setEditingPolicy(policy);
    setForm({
      customerName: policy.customerName || "",
      customerEmail: policy.customerEmail || "",
      customerPhone: policy.customerPhone || "",
      alternatePhone: (policy as any).alternatePhone || "",
      whatsappNumber: (policy as any).whatsappNumber || "",
      customerBirthday: policy.customerBirthday || "",
      customerType: (policy as any).customerType || "Individual",
      gender: policy.gender || "Male",
      maritalStatus: (policy.maritalStatus as any) || "Single",
      anniversaryDate: policy.anniversaryDate || "",
      occupation: policy.occupation || "",
      annualIncome: (policy as any).annualIncome || "",
      height: policy.height || (policy as any).healthDetails?.height || "",
      weight: policy.weight || (policy as any).healthDetails?.weight || "",
      houseFlat: policy.houseFlat || "",
      streetArea: policy.streetArea || "",
      landmark: policy.landmark || "",
      address: policy.address || "",
      city: policy.city || "",
      district: policy.district || "",
      state: policy.state || "",
      pincode: policy.pincode || "",
      includeFamily: policy.includeFamily || false,
      familyMembersText: policy.familyMembers ? policy.familyMembers.join(", ") : "",
      familyMembersList: (policy.familyMembersList || []).map((fam: any) => {
        let hasPreExisting = fam.hasPreExistingCondition;
        let medDetails = fam.medicalDetails || "";

        if (!hasPreExisting) {
          const hs = (fam.healthStatus || "").trim();
          if (!hs || ["healthy", "good", "normal", "fine", "no", "none"].includes(hs.toLowerCase())) {
            hasPreExisting = "No";
            medDetails = "";
          } else {
            hasPreExisting = "Yes";
            medDetails = hs;
          }
        }

        return {
          name: fam.name || "",
          relationship: fam.relationship || "Spouse",
          dob: fam.dob || "",
          gender: fam.gender || "Male",
          height: fam.height || "",
          weight: fam.weight || "",
          hasPreExistingCondition: hasPreExisting as "No" | "Yes",
          medicalDetails: medDetails,
          healthStatus: fam.healthStatus || (hasPreExisting === "Yes" ? medDetails : "Healthy")
        };
      }),
      hasHealthIssue: (policy.healthDetails?.hasHealthIssue as any) || (policy.healthDetails?.existingConditions ? "Yes" : "No"),
      healthIssueDetails: policy.healthDetails?.healthIssueDetails || policy.healthDetails?.existingConditions || "",
      healthDetails: policy.healthDetails || {
        generalHealth: "Good",
        bloodGroup: "",
        height: "",
        weight: "",
        existingConditions: "",
        previousSurgeries: "",
        currentMedications: "",
        smokingStatus: "Never",
        alcoholStatus: "Never",
        healthNotes: ""
      },
      policyNumber: policy.policyNumber || "",
      insuranceCompanyId: policy.insuranceCompanyId || "",
      companyName: policy.companyName || "",
      policyType: policy.policyType || "",
      productId: policy.productId || "",
      productName: policy.productName || "",
      businessType: isRenewal ? "RENEWAL" : (policy.businessType === "PORT" || (policy as any).businessSubtype === "PORT" || policy.portabilityDetails?.previousInsuranceCompany) ? "NEW_BUSINESS" : (policy.businessType || "NEW_BUSINESS"),
      businessSubtype: isRenewal ? null : ((policy as any).businessSubtype || (policy.businessType === "PORT" || policy.portabilityDetails?.previousInsuranceCompany ? "PORT" : "FRESH")),
      businessLoginDate: policy.businessLoginDate || policy.startDate || (policy.createdAt ? policy.createdAt.split("T")[0] : new Date().toISOString().split("T")[0]),
      previousInsuranceCompany: policy.portabilityDetails?.previousInsuranceCompany || (policy as any).previousInsuranceCompany || "",
      previousPolicyNumber: policy.portabilityDetails?.previousPolicyNumber || (policy as any).previousPolicyNumber || "",
      previousProductName: policy.portabilityDetails?.previousProductName || (policy as any).previousProductName || "",
      previousPolicyExpiryDate: policy.portabilityDetails?.previousPolicyExpiryDate || (policy as any).previousPolicyExpiryDate || "",
      previousSumInsured: policy.portabilityDetails?.previousSumInsured || (policy as any).previousSumInsured || "",
      policyTenure: (policy as any).policyTenure || 1,
      policyStatus: (policy.policyStatus as PolicyFormState["policyStatus"]) || (isRenewal ? "Issued" : "Pending"),
      premiumAmount: policy.premiumAmount || 0,
      sumAssured: (policy.sumAssuredType === "UNLIMITED" || policy.sumAssured === null || (policy as any).sumAssured === "UNLIMITED") ? "UNLIMITED" : (policy.sumAssured !== undefined && policy.sumAssured !== null ? policy.sumAssured : ""),
      sumAssuredType: policy.sumAssuredType || (policy.sumAssured === null || (policy as any).sumAssured === "UNLIMITED" ? "UNLIMITED" : "FIXED"),
      appliedPayoutPercentage: policy.appliedPayoutPercentage,
      expectedCommission: policy.expectedCommission,
      premiumFrequency: policy.premiumFrequency || "Yearly",
      startDate: policy.startDate || "",
      expiryDate: policy.expiryDate || "",
      nextDueDate: policy.nextDueDate || "",
      premiumStatus: policy.premiumStatus || "Paid",
      paymentMode: (policy as any).paymentMode || "Direct",
      financeType: (policy as any).financeType || ((policy as any).financeVendor ? "Vendor Finance" : "Company EMI"),
      financeVendor: (policy as any).financeVendor || "",
      financedAmount: (policy as any).financedAmount || 0,
      downPayment: (policy as any).downPayment || 0,
      emiAmount: (policy as any).emiAmount || 0,
      emiTenure: (policy as any).emiTenure || 0,
      emiStartDate: (policy as any).emiStartDate || "",
      sourceType: policy.sourceType || "sales_team",
      sourcePersonName: policy.sourcePersonName || "",
      sourcePersonMobile: policy.sourcePersonMobile || "",
      referenceType: policy.referenceType || "Customer",
      sourceRemark: policy.sourceRemark || "",
      bmId: isRenewal ? "" : (policy.bmId || ""),
      teamManagerId: isRenewal ? "" : (policy.teamManagerId || ""),
      teamLeaderId: isRenewal ? "" : (policy.teamLeaderId || ""),
      callerId: isRenewal ? "" : (policy.callerId || policy.tseId || ""),
      renewalManagerId: initRmId,
      renewalManagerName: initRmName,
      renewalExecutiveId: initReId,
      renewalExecutiveName: initReName,
      advisorId: policy.advisorId || "",
      advisorName: policy.advisorName || "",
      advisorCode: policy.advisorCode || "",
      cashbackEnabled: Boolean(policy.cashbackEnabled),
      cashbackAmount: policy.cashbackAmount || 0,
      notes: policy.notes || ""
    });
    setPendingFiles([]);
    setExistingDocuments(policy.documents || []);
    setIsAddOpen(true);
  };

  // Submit Edit Policy
  const handleEditPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy?.id) return;

    const sType = form.sourceType || "sales_team";
    if (sType === "direct" && !form.sourcePersonName.trim()) {
      alert("Please fill in Source Person Name for Direct source policy.");
      return;
    }
    if (sType === "referral" && !form.sourcePersonName.trim()) {
      alert("Please fill in Referred By for Referral source policy.");
      return;
    }

    if (form.cashbackEnabled && (!form.cashbackAmount || Number(form.cashbackAmount) <= 0)) {
      alert("Please enter a valid Cashback Amount greater than 0.");
      return;
    }

    try {
      const familyMembersListProcessed = form.familyMembersList.map(fam => {
        const hasCond = fam.hasPreExistingCondition || "No";
        const med = hasCond === "Yes" ? (fam.medicalDetails || "").trim() : "";
        return {
          name: fam.name,
          relationship: fam.relationship,
          dob: fam.dob || "",
          gender: fam.gender || "Male",
          hasPreExistingCondition: hasCond,
          medicalDetails: med,
          healthStatus: hasCond === "Yes" ? (med || "Pre-existing condition reported") : "Healthy"
        };
      });

      const familyMembers = form.includeFamily && familyMembersListProcessed.length > 0
        ? familyMembersListProcessed.map(f => {
          const detailsStr = f.hasPreExistingCondition === "Yes" && f.medicalDetails ? ` (${f.medicalDetails})` : "";
          return `${f.name} (${f.relationship}, ${f.gender}${detailsStr})`;
        })
        : (form.includeFamily && form.familyMembersText ? form.familyMembersText.split(",").map(n => n.trim()).filter(Boolean) : []);

      let uploadedDocs: any[] = [];
      if (pendingFiles.length > 0) {
        setUploadingDocs(true);
        try {
          const uploadRes = await api.uploadDocuments(pendingFiles);
          if (uploadRes && uploadRes.documents) {
            uploadedDocs = uploadRes.documents;
          }
        } catch (uploadErr: any) {
          setUploadingDocs(false);
          alert(`Document upload failed: ${uploadErr.message || "Failed to upload files"}`);
          return;
        }
        setUploadingDocs(false);
      }
      const finalDocuments = [...existingDocuments, ...uploadedDocs];

      const now = new Date().toISOString();
      const isRenewal = form.businessType === "RENEWAL";
      const updatedFields: Partial<Policy> = {
        policyNumber: form.policyNumber,
        companyName: form.companyName,
        policyType: form.policyType,
        productId: form.productId || "",
        productName: form.productName || "",
        businessType: isRenewal ? "RENEWAL" : "NEW_BUSINESS",
        businessSubtype: isRenewal ? null : (form.businessSubtype === "PORT" || form.businessType === "PORT" ? "PORT" : "FRESH"),
        businessLoginDate: form.businessLoginDate || editingPolicy.businessLoginDate || new Date().toISOString().split("T")[0],
        documents: finalDocuments,
        portabilityDetails: (!isRenewal && (form.businessType === "PORT" || form.businessSubtype === "PORT")) ? {
          previousInsuranceCompany: form.previousInsuranceCompany,
          previousPolicyNumber: form.previousPolicyNumber,
          previousProductName: form.previousProductName,
          previousPolicyExpiryDate: form.previousPolicyExpiryDate,
          previousSumInsured: form.previousSumInsured
        } : undefined,
        policyTenure: Number(form.policyTenure) || 1,
        premiumAmount: form.premiumAmount,
        sumAssured: (form.sumAssuredType === "UNLIMITED" || form.sumAssured === "UNLIMITED") ? null : (Number(form.sumAssured) || 0),
        sumAssuredType: (form.sumAssuredType === "UNLIMITED" || form.sumAssured === "UNLIMITED") ? "UNLIMITED" : "FIXED",
        appliedPayoutPercentage: form.appliedPayoutPercentage,
        expectedCommission: form.expectedCommission,
        premiumFrequency: form.premiumFrequency,
        startDate: form.startDate,
        expiryDate: form.expiryDate,
        nextDueDate: form.nextDueDate,
        premiumStatus: form.premiumStatus,
        policyStatus: (form.policyStatus || (isRenewal ? "Issued" : "Pending")) as Policy["policyStatus"],
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        whatsappNumber: (form as any).whatsappNumber || "",
        customerBirthday: form.customerBirthday,
        customerType: (form as any).customerType || "Individual",
        gender: form.gender,
        maritalStatus: form.maritalStatus,
        anniversaryDate: form.maritalStatus === "Married" ? form.anniversaryDate : "",
        occupation: form.occupation,
        annualIncome: (form as any).annualIncome || "",
        height: (form as any).height || "",
        weight: (form as any).weight || "",
        houseFlat: form.houseFlat,
        streetArea: form.streetArea,
        landmark: form.landmark,
        address: form.address || [form.houseFlat, form.streetArea, form.city, form.state].filter(Boolean).join(", "),
        city: form.city,
        district: form.district,
        state: form.state,
        pincode: form.pincode,
        includeFamily: form.includeFamily,
        familyMembers: familyMembers,
        familyMembersList: familyMembersListProcessed,
        healthDetails: {
          ...form.healthDetails,
          hasHealthIssue: form.hasHealthIssue,
          healthIssueDetails: form.hasHealthIssue === "Yes" ? form.healthIssueDetails : "",
          existingConditions: form.hasHealthIssue === "Yes" ? form.healthIssueDetails : (form.healthDetails?.existingConditions || "")
        },
        sourceType: sType,
        sourcePersonName: sType !== "sales_team" ? form.sourcePersonName : "",
        sourcePersonMobile: sType !== "sales_team" ? form.sourcePersonMobile : "",
        referenceType: sType === "referral" ? form.referenceType : "",
        sourceRemark: sType !== "sales_team" ? form.sourceRemark : "",
        bmId: sType === "sales_team" && !isRenewal ? form.bmId : "",
        bmName: sType === "sales_team" && !isRenewal ? form.bmName : "",
        teamManagerId: sType === "sales_team" && !isRenewal ? form.teamManagerId : "",
        teamManagerName: sType === "sales_team" && !isRenewal ? form.teamManagerName : "",
        teamLeaderId: sType === "sales_team" && !isRenewal ? form.teamLeaderId : "",
        teamLeaderName: sType === "sales_team" && !isRenewal ? form.teamLeaderName : "",
        callerId: sType === "sales_team" && !isRenewal ? form.callerId : "",
        callerName: sType === "sales_team" && !isRenewal ? form.callerName : "",
        tseId: sType === "sales_team" && !isRenewal ? form.callerId : "",
        tseName: sType === "sales_team" && !isRenewal ? form.callerName : "",
        renewalManagerId: sType === "sales_team" && isRenewal ? form.renewalManagerId : "",
        renewalManagerName: sType === "sales_team" && isRenewal ? form.renewalManagerName : "",
        renewalExecutiveId: sType === "sales_team" && isRenewal ? form.renewalExecutiveId : "",
        renewalExecutiveName: sType === "sales_team" && isRenewal ? form.renewalExecutiveName : "",
        advisorId: form.advisorId || undefined,
        advisorName: form.advisorName || undefined,
        advisorCode: form.advisorCode || undefined,
        paymentMode: form.paymentMode,
        financeType: form.paymentMode === "Finance/EMI" ? form.financeType : undefined,
        financeVendor: form.paymentMode === "Finance/EMI" && form.financeType === "Vendor Finance" ? form.financeVendor : undefined,
        financedAmount: form.paymentMode === "Finance/EMI" && form.financeType === "Vendor Finance" ? form.financedAmount : undefined,
        downPayment: form.paymentMode === "Finance/EMI" && form.financeType === "Vendor Finance" ? form.downPayment : undefined,
        emiAmount: form.paymentMode === "Finance/EMI" ? form.emiAmount : undefined,
        emiTenure: form.paymentMode === "Finance/EMI" ? form.emiTenure : undefined,
        emiStartDate: form.paymentMode === "Finance/EMI" ? form.emiStartDate : undefined,
        cashbackEnabled: Boolean(form.cashbackEnabled),
        cashbackAmount: form.cashbackEnabled ? (Number(form.cashbackAmount) || 0) : 0,
        notes: form.notes,
        updatedAt: now
      };

      if (userId === "local-agent-session" || userId.startsWith("local")) {
        const localPoliciesStr = localStorage.getItem(`policies_${userId}`);
        let localPolicies: Policy[] = localPoliciesStr ? JSON.parse(localPoliciesStr) : [];
        localPolicies = localPolicies.map(p => p.id === editingPolicy.id ? { ...p, ...updatedFields } : p);
        localStorage.setItem(`policies_${userId}`, JSON.stringify(localPolicies));
      } else {
        const targetId = editingPolicy.id || (editingPolicy as any)._id;
        await api.updatePolicy(targetId, updatedFields);
      }
      setEditingPolicy(null);
      setIsAddOpen(false);
      setForm(initialFormState);
      onRefresh();
    } catch (err) {
      console.error("Error editing policy:", err);
    }
  };

  const [deleteConfirmState, setDeleteConfirmState] = useState<{ isOpen: boolean; policyId: string }>({
    isOpen: false,
    policyId: ""
  });

  const handleDeletePolicyClick = (policyId: string) => {
    setDeleteConfirmState({ isOpen: true, policyId });
  };

  const handleConfirmDeletePolicy = async () => {
    if (!deleteConfirmState.policyId) return;
    const policyId = deleteConfirmState.policyId;
    try {
      if (userId === "local-agent-session" || userId.startsWith("local")) {
        const localPoliciesStr = localStorage.getItem(`policies_${userId}`);
        let localPolicies: Policy[] = localPoliciesStr ? JSON.parse(localPoliciesStr) : [];
        localPolicies = localPolicies.filter(p => p.id !== policyId && (p as any)._id !== policyId);
        localStorage.setItem(`policies_${userId}`, JSON.stringify(localPolicies));
      } else {
        await api.deletePolicy(policyId);
      }
      onRefresh();
    } catch (err: any) {
      console.error("Error deleting policy:", err);
      alert("Failed to delete policy: " + (err?.message || err?.error || "Unknown error"));
    } finally {
      setDeleteConfirmState({ isOpen: false, policyId: "" });
    }
  };

  // Simulate Trigger Automated Email Reminder via server-side Gemini AI
  const triggerAutomatedEmail = async (policy: Policy) => {
    if (!policy.id) return;
    setIsGeneratingEmail(policy.id);
    setEmailStatusMessage(null);

    try {
      // Step 1: Generate Email Content using Gemini AI
      const generateResponse = await fetch("/api/generate-reminder-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: policy.customerName || "",
          policyNumber: policy.policyNumber || "",
          companyName: policy.companyName || "",
          premiumAmount: policy.premiumAmount || 0,
          nextDueDate: policy.nextDueDate || "",
          emailType: policy.premiumStatus === "Overdue" ? "overdue warning alert" : "upcoming renewal notice"
        })
      });

      const generatedContent = await generateResponse.json();

      if (generatedContent.error) {
        throw new Error(generatedContent.error);
      }

      const emailSubject = generatedContent.subject || `Premium Due Reminder: Policy #${policy.policyNumber || ""}`;
      const emailBody = generatedContent.body || `Dear ${policy.customerName || "Customer"}, your premium is due.`;

      // Step 2: Send Real Email via POST /api/emails/send
      const sendResponse = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          recipientEmail: policy.customerEmail || "",
          recipientName: policy.customerName || "",
          subject: emailSubject,
          body: emailBody,
          policyId: policy.id,
          type: policy.premiumStatus === "Overdue" ? "ExpiryAlert" : "RenewalReminder"
        })
      });

      const sendData = await sendResponse.json();

      if (!sendResponse.ok || !sendData.success) {
        throw new Error(sendData.error || "Failed to send renewal reminder email");
      }

      // Add to logs via onAddEmailLog
      const newLog = sendData.log;
      onAddEmailLog(newLog);

      setEmailStatusMessage({
        type: "success",
        text: `✅ ${policy.premiumStatus === "Overdue" ? "Overdue Warning" : "Renewal Reminder"} Email successfully generated and dispatched to ${policy.customerName} (${policy.customerEmail})!`
      });
    } catch (err: any) {
      console.error("Automated email error:", err);
      setEmailStatusMessage({
        type: "error",
        text: `Failed to send automated email: ${err.message || "Unknown error occurred"}`
      });
    } finally {
      setIsGeneratingEmail(null);
      setTimeout(() => setEmailStatusMessage(null), 8000);
    }
  };

  // One click action to send reminder emails to all due policies of displayed policyholder
  const sendRemindersToAllDueForDetails = async (customerEmail?: string) => {
    const safeCustomerEmail = customerEmail || "";
    const duePolicies = policies.filter(p => p.customerEmail === safeCustomerEmail && (p.premiumStatus === "Unpaid" || p.premiumStatus === "Overdue"));
    if (duePolicies.length === 0) {
      alert("No due or pending policies found for this policyholder.");
      return;
    }

    setIsSendingDetailsBatch(true);
    try {
      for (const policy of duePolicies) {
        await triggerAutomatedEmail(policy);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingDetailsBatch(false);
      setViewingDetailsPolicy(null);
    }
  };

  // ─── SECURITY HELPERS FOR EXPORT ──────────────────────────────────────────────
  const escapeHtml = (str: string | number | undefined | null): string => {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const sanitizeCsvCell = (val: string | number | undefined | null): string => {
    if (val == null) return '""';
    let str = String(val).trim();
    // Neutralize potential CSV injection / formula execution (=, +, -, @, \t, \r)
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  // ─── EXPORT AS PDF / PRINT ──────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (filteredPolicies.length === 0) {
      alert("No policy data available for export with the current filters.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups in your browser to export as PDF.");
      return;
    }

    const totalPremium = filteredPolicies.reduce((acc, p) => acc + (p.premiumAmount || 0), 0);
    const paidCount = filteredPolicies.filter(p => p.premiumStatus === "Paid").length;
    const unpaidCount = filteredPolicies.filter(p => p.premiumStatus === "Unpaid").length;
    const overdueCount = filteredPolicies.filter(p => p.premiumStatus === "Overdue").length;

    const getTodayISO = () => new Date().toISOString().split("T")[0];
    const filename = `PolicyMaster_PolicyLedger_Statement_${getTodayISO()}`;

    const rows = filteredPolicies.map(p => `
      <tr>
        <td class="em">${escapeHtml(p.customerName)}<br/><span class="muted">${escapeHtml(p.customerEmail || p.customerPhone || "N/A")}</span></td>
        <td class="bold font-mono">${escapeHtml(p.policyNumber)}</td>
        <td>${escapeHtml(p.companyName)}</td>
        <td>${escapeHtml(p.policyType)}</td>
        <td>${escapeHtml(p.businessType || "N/A")}</td>
        <td class="r bold font-mono">₹${(p.premiumAmount || 0).toLocaleString("en-IN")}</td>
        <td class="c font-mono">${escapeHtml(p.startDate || "-")}</td>
        <td class="c font-mono">${escapeHtml(p.nextDueDate || "-")}</td>
        <td class="c"><span class="badge ${p.premiumStatus === "Paid" ? "b-grn" : p.premiumStatus === "Overdue" ? "b-red" : "b-amber"}">${escapeHtml(p.premiumStatus)}</span></td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escapeHtml(filename)}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 32px; color: #0f172a; font-size: 12px; }
            .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0d9488; padding-bottom: 16px; margin-bottom: 20px; }
            .brand { font-size: 24px; font-weight: 900; color: #0d9488; text-transform: uppercase; letter-spacing: -0.5px; }
            .subbrand { font-size: 12px; font-weight: 700; color: #475569; margin-top: 4px; }
            .meta { text-align: right; font-size: 11px; color: #64748b; font-weight: 600; line-height: 1.6; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
            .s-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; text-align: center; }
            .s-box .lbl { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: #64748b; }
            .s-box .val { font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
            th { background: #f1f5f9; color: #475569; font-weight: 800; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; padding: 10px 8px; border-bottom: 2px solid #cbd5e1; text-align: left; }
            td { padding: 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
            .em { font-weight: 700; color: #0f172a; }
            .bold { font-weight: 800; }
            .font-mono { font-family: monospace; }
            .muted { color: #64748b; font-size: 10px; }
            .r { text-align: right; }
            .c { text-align: center; }
            .badge { display: inline-block; padding: 2px 7px; border-radius: 6px; font-size: 9px; font-weight: 800; text-transform: uppercase; }
            .b-grn { background: #dcfce7; color: #166534; }
            .b-amber { background: #fef3c7; color: #92400e; }
            .b-red { background: #fee2e2; color: #991b1b; }
            .total-row { background: #f8fafc; font-weight: 800; }
            .footer { margin-top: 35px; border-top: 1px solid #e2e8f0; padding-top: 12px; text-align: center; font-size: 10px; color: #94a3b8; font-weight: 600; }
            @media print { body { padding: 0; } @page { margin: 1.5cm; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">${escapeHtml(companyDisplayUpper)}</div>
              <div class="subbrand">${escapeHtml(companyDisplayName)} Policyholder Ledger Statement Report</div>
            </div>
            <div class="meta">
              <div><strong>Generated On:</strong> ${escapeHtml(new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }))}</div>
              <div><strong>Total Records:</strong> ${filteredPolicies.length}</div>
            </div>
          </div>

          <div class="summary-grid">
            <div class="s-box"><div class="lbl">Total Policies</div><div class="val">${filteredPolicies.length}</div></div>
            <div class="s-box"><div class="lbl">Total Premium</div><div class="val">₹${totalPremium.toLocaleString("en-IN")}</div></div>
            <div class="s-box"><div class="lbl">Paid Policies</div><div class="val">${paidCount}</div></div>
            <div class="s-box"><div class="lbl">Unpaid / Overdue</div><div class="val">${unpaidCount + overdueCount}</div></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Customer Details</th>
                <th>Policy Number</th>
                <th>Insurance Provider</th>
                <th>Category</th>
                <th>Business Type</th>
                <th class="r">Premium (₹)</th>
                <th class="c">Start Date</th>
                <th class="c">Next Due</th>
                <th class="c">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              <tr class="total-row">
                <td colspan="5" class="bold">Total (${filteredPolicies.length} Policies)</td>
                <td class="r bold font-mono">₹${totalPremium.toLocaleString("en-IN")}</td>
                <td colspan="3"></td>
              </tr>
            </tbody>
          </table>

          <div class="footer">Confidential ${escapeHtml(companyDisplayName)} Ledger Audit &bull; Authorized Personnel Only &bull; Generated ${escapeHtml(new Date().toLocaleString("en-IN"))}</div>
          <script>window.onload = function() { window.print(); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ─── EXPORT AS EXCEL (.CSV) ─────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (filteredPolicies.length === 0) {
      alert("No policy data available for export with the current filters.");
      return;
    }

    const getTodayISO = () => new Date().toISOString().split("T")[0];
    const filename = `${companyDisplayUpper.replace(/[^A-Za-z0-9_]/g, "_")}_PolicyLedger_Export_${getTodayISO()}.csv`;

    let csv = "\uFEFF"; // UTF-8 BOM for Excel unicode rendering
    csv += `${companyDisplayUpper} — POLICYHOLDER LEDGER & DIRECTORY STATEMENT\n`;
    csv += `Generated On: ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}\n`;
    csv += `Total Records Exported: ${filteredPolicies.length}\n\n`;

    // CSV Headers
    csv += "Business Login Date,Customer Name,Customer Email,Customer Phone,Policy Number,Insurance Provider,Policy Category,Insurance Product,Business Type,Source Type,Branch Manager / Source Person,Team Manager,Team Leader / Ref Type,TSE / Source Mobile,Policy Status,Sum Assured (INR),Premium Amount (INR),Payment Frequency,Cashback Enabled,Cashback Amount (INR),Start Date,Expiry Date,Next Due Date,Payment Status,City,State,Address,Notes\n";

    // CSV Data Rows
    filteredPolicies.forEach(p => {
      const sTypeLabel = !p.sourceType || p.sourceType === "sales_team" ? "Sales Team" : p.sourceType === "direct" ? "Direct" : "Referral";
      const row = [
        sanitizeCsvCell(p.businessLoginDate || p.startDate || (p.createdAt ? p.createdAt.split("T")[0] : "")),
        sanitizeCsvCell(p.customerName),
        sanitizeCsvCell(p.customerEmail || ""),
        sanitizeCsvCell(p.customerPhone),
        sanitizeCsvCell(p.policyNumber),
        sanitizeCsvCell(p.companyName),
        sanitizeCsvCell(p.policyType),
        sanitizeCsvCell(p.productName || ""),
        sanitizeCsvCell(p.businessType || "NEW BUSINESS"),
        sanitizeCsvCell(sTypeLabel),
        sanitizeCsvCell(p.bmName || p.sourcePersonName || ""),
        sanitizeCsvCell(p.teamManagerName || ""),
        sanitizeCsvCell(p.teamLeaderName || p.referenceType || ""),
        sanitizeCsvCell(p.tseName || p.callerName || p.sourcePersonMobile || ""),
        sanitizeCsvCell(p.policyStatus || "Pending"),
        sanitizeCsvCell(formatSumAssuredDisplay(p.sumAssured, (p as any).sumAssuredType)),
        sanitizeCsvCell(p.premiumAmount || 0),
        sanitizeCsvCell(p.premiumFrequency || "Yearly"),
        sanitizeCsvCell(p.cashbackEnabled ? "Yes" : "No"),
        sanitizeCsvCell(p.cashbackEnabled ? (p.cashbackAmount || 0) : 0),
        sanitizeCsvCell(p.startDate || ""),
        sanitizeCsvCell(p.expiryDate || ""),
        sanitizeCsvCell(p.nextDueDate || ""),
        sanitizeCsvCell(p.premiumStatus || "Paid"),
        sanitizeCsvCell(p.city || ""),
        sanitizeCsvCell(p.state || ""),
        sanitizeCsvCell(p.address || ""),
        sanitizeCsvCell(p.notes || "")
      ].join(",");
      csv += row + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Filter & Search Logic
  const filteredPolicies = policies.filter(p => {
    const searchLower = search.toLowerCase();
    const policyNumber = p.policyNumber ?? "";
    const customerEmail = p.customerEmail ?? "";
    const sourcePersonName = p.sourcePersonName ?? "";
    const sourcePersonMobile = p.sourcePersonMobile ?? "";
    const productName = p.productName ?? "";
    const previousInsuranceCompany = p.portabilityDetails?.previousInsuranceCompany ?? "";

    const matchesSearch =
      p.customerName.toLowerCase().includes(searchLower) ||
      policyNumber.toLowerCase().includes(searchLower) ||
      customerEmail.toLowerCase().includes(searchLower) ||
      p.companyName.toLowerCase().includes(searchLower) ||
      sourcePersonName.toLowerCase().includes(searchLower) ||
      sourcePersonMobile.includes(search) ||
      productName.toLowerCase().includes(searchLower) ||
      previousInsuranceCompany.toLowerCase().includes(searchLower);

    const pSourceType = p.sourceType || "sales_team";
    const matchesSourceType = !selectedSourceType || pSourceType === selectedSourceType;
    const cls = getPolicyClassification(p);
    const matchesBusinessType = !selectedBusinessType || (
      selectedBusinessType === "NEW_BUSINESS"
        ? (cls === "FRESH" || cls === "PORT")
        : selectedBusinessType === "FRESH"
        ? (cls === "FRESH")
        : selectedBusinessType === "PORT"
        ? (cls === "PORT")
        : selectedBusinessType === "RENEWAL"
        ? (cls === "RENEWAL")
        : true
    );

    let matchesExternal = true;
    if (externalFilter === "active") {
      matchesExternal = p.premiumStatus === "Paid" || p.premiumStatus === "Unpaid" || p.premiumStatus === "Overdue";
    } else if (externalFilter === "renewals") {
      if (!p.nextDueDate) matchesExternal = false;
      else {
        const [year, month] = p.nextDueDate.split("-").map(Number);
        matchesExternal = year === 2026 && month === 7; // July 2026
      }
    } else if (externalFilter === "overdue") {
      matchesExternal = p.premiumStatus === "Overdue";
    }

    const matchesCompany = !selectedCompany || p.companyName === selectedCompany;
    const matchesType = !selectedType || p.policyType === selectedType;

    const st = getPolicyStatusType(p);
    const matchesStatus = !selectedStatus || (
      selectedStatus === "Issued"
        ? st === "ISSUED"
        : selectedStatus === "Pending"
        ? st === "PENDING"
        : selectedStatus === "Cancelled"
        ? st === "CANCELLED"
        : true
    );

   let matchesStartDate = true;
    if (appliedStartDateFrom && appliedStartDateTo) {
      matchesStartDate = !!p.startDate && p.startDate >= appliedStartDateFrom && p.startDate <= appliedStartDateTo;
    } else if (appliedStartDateFrom) {
      matchesStartDate = !!p.startDate && p.startDate >= appliedStartDateFrom;
    } else if (appliedStartDateTo) {
      matchesStartDate = !!p.startDate && p.startDate <= appliedStartDateTo;
    }

    const loginDateForMonth = p.businessLoginDate || p.startDate || "";
    const matchesMonth = !selectedMonth || loginDateForMonth.slice(0, 7) === selectedMonth;

    return matchesSearch && matchesExternal && matchesCompany && matchesType && matchesStatus && matchesStartDate && matchesSourceType && matchesBusinessType && matchesMonth;
  });

 const isSearchPerformed = search.trim() !== "";

  // Pagination Calculations
  const totalRecords = filteredPolicies.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const paginatedPolicies = filteredPolicies.slice(startIndex, endIndex);

  const getPageNumbers = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push("...");
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safeCurrentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-6">

      {/* Search and Filters Segment */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 text-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-600 animate-pulse" />
              Policyholder Ledger & Directory
            </h2>
            <p className="text-slate-500 text-xs">Register policies, query directory, and trigger custom automation dispatches</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {externalFilter && (
              <span className="bg-teal-50 border border-teal-150 text-teal-800 text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shrink-0 shadow-xs">
                Filter: {externalFilter.toUpperCase()}
                <button onClick={onClearExternalFilter} className="hover:text-red-600 font-extrabold cursor-pointer">✕</button>
              </span>
            )}

            {/* Export Statement Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setIsExportMenuOpen(prev => !prev)}
                className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                title="Export Filtered Policy Statement"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Statement</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExportMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 py-2 overflow-hidden">
                  <div className="px-3.5 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Choose Export Format
                  </div>
                  <button
                    onClick={() => { setIsExportMenuOpen(false); handleExportPDF(); }}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2.5 cursor-pointer transition"
                  >
                    <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                    <div>
                      <div>Export as PDF</div>
                      <div className="text-[10px] font-normal text-slate-400">Open print & PDF view</div>
                    </div>
                  </button>
                  <button
                    onClick={() => { setIsExportMenuOpen(false); handleExportExcel(); }}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 cursor-pointer transition"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <div>Export as Excel</div>
                      <div className="text-[10px] font-normal text-slate-400">Download .csv file</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {canCreateNewBusiness && (
                <button
                  onClick={handleOpenNewBusinessModal}
                  className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  + New Business
                </button>
              )}
              {canCreateRenewal && (
                <button
                  onClick={openCreateForRenewal}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                >
                  <RefreshCw className="w-4 h-4" />
                  + Renewal
                </button>
              )}
            </div>
          </div>
        </div>

       {/* Filters Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 pt-1">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, policy #, source..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500/20 transition"
            />
          </div>

          {/* Business Type Filter */}
          <div>
            <select
              value={selectedBusinessType}
              onChange={(e) => setSelectedBusinessType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none transition"
            >
              <option value="">All Business Types</option>
              <option value="NEW_BUSINESS">New Business (Fresh + Port)</option>
              <option value="FRESH">New Business - Fresh</option>
              <option value="PORT">New Business - Port</option>
              <option value="RENEWAL">Renewal</option>
            </select>
          </div>

          {/* Source Type Filter */}
          <div>
            <select
              value={selectedSourceType}
              onChange={(e) => setSelectedSourceType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none transition"
            >
              <option value="">All Sources</option>
              <option value="sales_team">Sales Team</option>
              <option value="direct">Direct</option>
              <option value="referral">Referral</option>
            </select>
          </div>

          {/* Insurance Company */}
          <div>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none transition"
            >
              <option value="">All Insurance Providers</option>
              {availableCompaniesFilter.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>



       {/* Policy Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none transition"
            >
              <option value="">All Policy Statuses</option>
              <option value="Issued">Issued</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Month-wise Filter */}
          <div className="relative">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none transition font-mono"
            />
            {selectedMonth && (
              <button
                type="button"
                onClick={() => setSelectedMonth("")}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-700 text-white rounded-full text-[9px] font-bold flex items-center justify-center hover:bg-rose-600 transition cursor-pointer"
                title="Clear Month Filter"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Policy Start Date Range Filter */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              Policy Start Date:
            </span>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-semibold text-slate-500">From</label>
              <input
                type="date"
                value={startDateFrom}
                onChange={(e) => setStartDateFrom(e.target.value)}
                className="bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none transition font-mono"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-semibold text-slate-500">To</label>
              <input
                type="date"
                value={startDateTo}
                onChange={(e) => setStartDateTo(e.target.value)}
                className="bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none transition font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplyDateFilter}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs cursor-pointer transition shadow-2xs"
              >
                Apply
              </button>
              {(startDateFrom || startDateTo || appliedStartDateFrom || appliedStartDateTo) && (
                <button
                  type="button"
                  onClick={handleClearDateFilter}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {(appliedStartDateFrom || appliedStartDateTo) && (
            <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg shrink-0">
              Active Range: {appliedStartDateFrom ? formatDateDisplay(appliedStartDateFrom) : "Start"} to {appliedStartDateTo ? formatDateDisplay(appliedStartDateTo) : "End"}
            </span>
          )}
        </div>

        {isDateRangeInvalid && (
          <div className="text-xs font-semibold text-rose-600 flex items-center gap-1.5 pt-0.5">
            <AlertCircle className="w-3.5 h-3.5" />
            To Date cannot be earlier than From Date.
          </div>
        )}
      </div>

      {/* Email Triggering Notifications Feed */}
      {emailStatusMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 leading-relaxed shadow-xs ${emailStatusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
        >
          <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-semibold">{emailStatusMessage.text}</div>
        </motion.div>
      )}

      {/* RENDER LIST: Tabular vs Card-wise (If search is performed, display card-wise status) */}
      {filteredPolicies.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-700 font-bold text-sm">
            {selectedStatus === "Issued"
              ? "No Issued Policies Found"
              : selectedStatus === "Pending"
              ? "No Pending Policies Found"
              : selectedStatus === "Cancelled"
              ? "No Cancelled Policies Found"
              : "No insurance policies found matching specifications."}
          </p>
          <p className="text-slate-400 text-xs mt-1">Refine search parameters or create a New Business or Renewal entry above.</p>
        </div>
    
      ) : (
        /* STANDARD TABULAR VIEW (WHEN NO SEARCH IS ENTERED) */
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left border-collapse text-slate-800">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold border-r border-slate-200/50 text-center w-14 shrink-0">S.No.</th>
                  <th className="py-3.5 px-4 font-semibold border-r border-slate-200/50">Customer Name</th>
                  <th className="py-3.5 px-4 font-semibold border-r border-slate-200/50">Type</th>
                  <th className="py-3.5 px-4 font-semibold border-r border-slate-200/50">Product Name</th>
                  <th className="py-3.5 px-4 font-semibold border-r border-slate-200/50">Policy Tenure</th>
                  <th className="py-3.5 px-4 font-semibold border-r border-slate-200/50">Business Login Date</th>
                  <th className="py-3.5 px-4 font-semibold text-right border-r border-slate-200/50">Sum Assured</th>
                  <th className="py-3.5 px-4 font-semibold text-right border-r border-slate-200/50">Premium</th>
                  <th className="py-3.5 px-4 font-semibold text-center border-r border-slate-200/50">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
{paginatedPolicies.map((p, idx) => {
                  const bType = (p.businessType || "").toUpperCase();
                  const bSubtype = (p.businessSubtype || (p as any).businessSubtype || "").toUpperCase();
                  const isPortCase = bType === "PORT" || bSubtype === "PORT" || Boolean(p.portabilityDetails?.previousInsuranceCompany);
                  const typeDisplay = bType === "RENEWAL" ? "Renewal" : isPortCase ? "Port" : "Fresh";

                  const productNameDisplay = (
                    p.productName &&
                    typeof p.productName === "string" &&
                    p.productName.trim() &&
                    p.productName.trim() !== "—" &&
                    p.productName.trim().toLowerCase() !== "undefined" &&
                    p.productName.trim().toLowerCase() !== "null"
                  ) ? p.productName.trim() : "—";

                  const tenure = p.policyTenure || 1;
                  const tenureDisplay = `${tenure} ${tenure === 1 ? "Year" : "Years"}`;
                  const loginDateDisplay = p.businessLoginDate ? formatDateDisplay(p.businessLoginDate) : "—";
                  
                  // Calculate Serial Number based on current page & position
                  const serialNumber = (safeCurrentPage - 1) * pageSize + idx + 1;
                  const serialNumberDisplay = String(serialNumber).padStart(2, "0");

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 border-r border-slate-100 text-center font-mono font-bold text-slate-600 text-xs w-14 shrink-0">
                        {serialNumberDisplay}
                      </td>
                      <td className="py-3.5 px-4 border-r border-slate-100">
                        <button
                          onClick={() => setViewingDetailsPolicy(p)}
                          className="font-bold text-teal-700 hover:text-teal-900 hover:underline text-left cursor-pointer text-xs"
                          title="Click to view complete policyholder details"
                        >
                          {p.customerName}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 border-r border-slate-100 text-xs">
                        {typeDisplay}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 border-r border-slate-100 text-xs">
                        {productNameDisplay}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 border-r border-slate-100 text-xs">
                        {tenureDisplay}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700 border-r border-slate-100 text-xs">
                        {loginDateDisplay}
                      </td>
                      <td className="py-3.5 px-4 text-right border-r border-slate-100">
                        <div className="font-semibold text-teal-900 font-mono text-xs">{formatSumAssuredDisplay(p.sumAssured, (p as any).sumAssuredType)}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right border-r border-slate-100">
                        <div className="font-semibold text-slate-900 font-mono text-xs">₹{p.premiumAmount.toLocaleString("en-IN")}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{p.premiumFrequency || "Yearly"}</div>
                        {p.cashbackEnabled && (
                          <div className="text-[10px] text-teal-700 font-semibold font-mono mt-0.5">
                            CB: ₹{(p.cashbackAmount || 0).toLocaleString("en-IN")}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 border-r border-slate-100 text-xs text-center">
                        {(() => {
                          const st = getPolicyStatusType(p);
                          return st === "PENDING" ? "Pending" : st === "CANCELLED" ? "Cancelled" : "Issued";
                        })()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => startEdit(p)}
                            className="p-1.5 border border-slate-200 hover:border-slate-300 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer transition"
                            title="Edit Policy"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => p.id && handleDeletePolicyClick(p.id)}
                            className="p-1.5 border border-slate-200 hover:border-rose-300 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition"
                            title="Delete Policy"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        {/* Compact Pagination Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-slate-200">
            <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
              <span>
                Showing {totalRecords === 0 ? 0 : startIndex + 1}–{endIndex} of {totalRecords}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500 transition cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
              </button>
<span className="px-2 text-xs font-medium text-slate-700">
                Page {safeCurrentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronDown className="w-4 h-4 -rotate-90" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Policyholder Detailed Dossier Centered Modal */}
      <AnimatePresence>
        {viewingDetailsPolicy && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-slate-800">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-teal-50 text-teal-700 rounded-lg border border-teal-100">
                    <Eye className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-tight">
                      Policyholder Dossier & Record Details
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">Detailed customer insurance profile & business overview</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingDetailsPolicy(null)}
                  className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-800 cursor-pointer transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                {/* Profile Card */}
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col sm:flex-row justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Client Profile</div>
                    <div className="text-base font-extrabold text-slate-950">{viewingDetailsPolicy.customerName}</div>
                    <div className="text-xs text-slate-600 font-medium">📧 {viewingDetailsPolicy.customerEmail}</div>
                    <div className="text-xs text-slate-600 font-medium">📞 {viewingDetailsPolicy.customerPhone}</div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0 self-start sm:self-center">
                    {viewingDetailsPolicy.customerBirthday && (
                      <div className="bg-pink-50 border border-pink-100 p-2.5 rounded-xl flex items-center gap-2">
                        <Cake className="w-4 h-4 text-pink-500" />
                        <div className="text-xs">
                          <span className="block text-[9px] text-pink-600 uppercase font-extrabold">Birthday Logged</span>
                          <span className="font-extrabold text-pink-700 font-mono">{viewingDetailsPolicy.customerBirthday}</span>
                        </div>
                      </div>
                    )}
                    {(viewingDetailsPolicy.healthDetails?.healthIssueDetails || viewingDetailsPolicy.healthDetails?.existingConditions) && (
                      <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl flex items-center gap-2 max-w-[200px]">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                        <div className="text-xs">
                          <span className="block text-[9px] text-rose-600 uppercase font-extrabold">Health Issue Logged</span>
                          <span className="font-extrabold text-rose-800 truncate block">
                            {viewingDetailsPolicy.healthDetails?.healthIssueDetails || viewingDetailsPolicy.healthDetails?.existingConditions}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub Policies List */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Registered Accounts Ledger</h4>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                    {policies
                      .filter(p => p.customerEmail === viewingDetailsPolicy.customerEmail)
                      .map(p => (
                        <div key={p.id} className="bg-slate-50 border border-slate-150 rounded-xl p-3 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-slate-800">#{p.policyNumber}</span>
                            <span className="text-[10px] text-slate-500 block font-medium">{p.companyName} • {p.policyType}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-slate-950 font-mono">₹{p.premiumAmount.toLocaleString("en-IN")}</span>
                            <span className={`block text-[9px] font-extrabold mt-0.5 uppercase ${p.premiumStatus === "Paid" ? "text-emerald-600" : "text-amber-600"
                              }`}>{p.premiumStatus}</span>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>

                {/* Business Information */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">📊 Business Information</h4>
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Business Type</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">
                        {viewingDetailsPolicy.businessType === "RENEWAL" ? "Renewal" : viewingDetailsPolicy.businessType === "PORT" ? "Port" : "New Business"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Policy Tenure</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">
                        {viewingDetailsPolicy.policyTenure ? `${viewingDetailsPolicy.policyTenure} ${viewingDetailsPolicy.policyTenure === 1 ? "Year" : "Years"}` : "1 Year"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Policy Status</span>
                      <span className={`font-semibold mt-0.5 inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full border ${viewingDetailsPolicy.policyStatus === "Issued"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : viewingDetailsPolicy.policyStatus === "Pending"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}>
                        {viewingDetailsPolicy.policyStatus || "Not Set"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Premium Status</span>
                      <span className={`font-semibold mt-0.5 inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full border ${viewingDetailsPolicy.premiumStatus === "Paid"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-sky-50 text-sky-700 border-sky-200"
                        }`}>
                        {viewingDetailsPolicy.premiumStatus}
                      </span>
                    </div>
                    <div className="col-span-2 bg-teal-50/50 p-2.5 rounded-xl border border-teal-100 flex items-center justify-between">
                      <span className="text-[10px] text-teal-700 uppercase font-extrabold block">Business Login Date</span>
                      <span className="font-extrabold text-teal-950 font-mono text-xs block">
                        {viewingDetailsPolicy.businessLoginDate || viewingDetailsPolicy.startDate || (viewingDetailsPolicy.createdAt ? viewingDetailsPolicy.createdAt.split("T")[0] : "—")}
                      </span>
                    </div>
                    <div className="col-span-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="text-[10px] text-slate-700 uppercase font-extrabold block">Cashback</span>
                      <span className={`font-extrabold font-mono text-xs block ${viewingDetailsPolicy.cashbackEnabled ? "text-emerald-700" : "text-slate-500"}`}>
                        {viewingDetailsPolicy.cashbackEnabled ? `Yes (₹${(viewingDetailsPolicy.cashbackAmount || 0).toLocaleString("en-IN")})` : "No"}
                      </span>
                    </div>
                    {viewingDetailsPolicy.productName && (
                      <div className="col-span-2 bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100">
                        <span className="text-[10px] text-indigo-600 uppercase font-extrabold block">Product Name</span>
                        <span className="font-extrabold text-indigo-950 text-xs mt-0.5 block">{viewingDetailsPolicy.productName}</span>
                      </div>
                    )}
                    {(viewingDetailsPolicy.businessType === "PORT" || viewingDetailsPolicy.portabilityDetails) && (
                      <div className="col-span-2 bg-indigo-50/70 p-3 rounded-xl border border-indigo-150">
                        <span className="text-[10px] text-indigo-700 uppercase font-extrabold block mb-1.5 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5" />
                          Portability Ledger (Previous Policy Details)
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase block">Previous Company</span>
                            <span className="font-extrabold text-slate-900 block">{viewingDetailsPolicy.portabilityDetails?.previousInsuranceCompany || (viewingDetailsPolicy as any).previousInsuranceCompany || "—"}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase block">Previous Policy #</span>
                            <span className="font-mono font-bold text-slate-900 block">{viewingDetailsPolicy.portabilityDetails?.previousPolicyNumber || (viewingDetailsPolicy as any).previousPolicyNumber || "—"}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase block">Previous Product</span>
                            <span className="font-semibold text-slate-800 block">{viewingDetailsPolicy.portabilityDetails?.previousProductName || (viewingDetailsPolicy as any).previousProductName || "—"}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase block">Previous Expiry</span>
                            <span className="font-mono text-slate-800 block">{viewingDetailsPolicy.portabilityDetails?.previousPolicyExpiryDate || (viewingDetailsPolicy as any).previousPolicyExpiryDate || "—"}</span>
                          </div>
                          {viewingDetailsPolicy.portabilityDetails?.previousSumInsured && (
                            <div className="col-span-2 pt-1 border-t border-indigo-100">
                              <span className="text-[9px] text-slate-500 font-bold uppercase block">Previous Sum Insured</span>
                              <span className="font-mono font-extrabold text-indigo-900 block">₹{viewingDetailsPolicy.portabilityDetails.previousSumInsured}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="col-span-2 pt-2 border-t border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-extrabold block mb-1.5">Source / Reference</span>
                      {(!viewingDetailsPolicy.sourceType || viewingDetailsPolicy.sourceType === "sales_team") && (
                        <div className="bg-slate-100/70 p-2.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">Source</span>
                            <span className="font-extrabold text-slate-900 text-xs">Sales Team</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">Branch Manager</span>
                            <span className="font-bold text-slate-800 text-xs">{viewingDetailsPolicy.bmName || "—"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">Team Manager</span>
                            <span className="font-bold text-slate-800 text-xs">{viewingDetailsPolicy.teamManagerName || "—"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">Team Leader</span>
                            <span className="font-bold text-slate-800 text-xs">{viewingDetailsPolicy.teamLeaderName || "—"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">TSE</span>
                            <span className="font-bold text-slate-800 text-xs">{viewingDetailsPolicy.tseName || viewingDetailsPolicy.callerName || "—"}</span>
                          </div>
                        </div>
                      )}
                      {viewingDetailsPolicy.sourceType === "direct" && (
                        <div className="bg-slate-100/70 p-2.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">Source</span>
                            <span className="font-extrabold text-teal-700 text-xs">Direct</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">Source Person</span>
                            <span className="font-extrabold text-slate-900 text-xs">{viewingDetailsPolicy.sourcePersonName || "—"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">Mobile Number</span>
                            <span className="font-mono font-bold text-slate-800 text-xs">{viewingDetailsPolicy.sourcePersonMobile || "—"}</span>
                          </div>
                          {viewingDetailsPolicy.sourceRemark && (
                            <div className="sm:col-span-3 pt-1 border-t border-slate-200/60 mt-1">
                              <span className="text-[10px] text-slate-500 font-bold block">Remark / Details</span>
                              <span className="text-slate-700 text-xs font-medium">{viewingDetailsPolicy.sourceRemark}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {viewingDetailsPolicy.sourceType === "referral" && (
                        <div className="bg-slate-100/70 p-2.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">Source</span>
                            <span className="font-extrabold text-purple-700 text-xs">Referral</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">Referred By</span>
                            <span className="font-extrabold text-slate-900 text-xs">{viewingDetailsPolicy.sourcePersonName || "—"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">Reference Type</span>
                            <span className="font-bold text-slate-800 text-xs">{viewingDetailsPolicy.referenceType || "Customer"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">Mobile Number</span>
                            <span className="font-mono font-bold text-slate-800 text-xs">{viewingDetailsPolicy.sourcePersonMobile || "—"}</span>
                          </div>
                          {viewingDetailsPolicy.sourceRemark && (
                            <div className="sm:col-span-4 pt-1 border-t border-slate-200/60 mt-1">
                              <span className="text-[10px] text-slate-500 font-bold block">Remark / Details</span>
                              <span className="text-slate-700 text-xs font-medium">{viewingDetailsPolicy.sourceRemark}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {viewingDetailsPolicy.createdByName && (
                      <div className="col-span-2">
                        <span className="text-[10px] text-slate-400 uppercase font-extrabold block">Entered By (Data Executive)</span>
                        <span className="font-extrabold text-slate-800 mt-0.5 block">{viewingDetailsPolicy.createdByName}</span>
                      </div>
                    )}
                    {/* Revenue & Payout Snapshot */}
                    <div className="col-span-2 pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
                      <div>
                        <span className="text-[10px] text-indigo-700 uppercase font-extrabold block">Applied Rate</span>
                        <span className="font-extrabold text-indigo-900 font-mono text-xs block mt-0.5">
                          {viewingDetailsPolicy.appliedPayoutPercentage !== undefined ? `${viewingDetailsPolicy.appliedPayoutPercentage}%` : "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-700 uppercase font-extrabold block">Expected Commission</span>
                        <span className="font-extrabold text-emerald-900 font-mono text-xs block mt-0.5">
                          {viewingDetailsPolicy.expectedCommission !== undefined ? `₹${viewingDetailsPolicy.expectedCommission.toLocaleString("en-IN")}` : "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-800 uppercase font-extrabold block">Commission Status</span>
                        <span className={`font-black text-xs block mt-0.5 ${viewingDetailsPolicy.commissionStatus === "Paid" ? "text-emerald-700" : "text-amber-700"}`}>
                          {viewingDetailsPolicy.commissionStatus || "Unpaid"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Family details display */}
                {(() => {
                  const familyMembersList = viewingDetailsPolicy.familyMembersList ?? [];
                  const familyMembers = viewingDetailsPolicy.familyMembers ?? [];

                  if (!viewingDetailsPolicy.includeFamily || (familyMembersList.length === 0 && familyMembers.length === 0)) {
                    return null;
                  }

                  return (
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-teal-600" />
                        Family Details Under Coverage
                      </h4>
                      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs text-slate-700 font-medium space-y-2">
                        {familyMembersList.length > 0 ? (
                          <div className="divide-y divide-slate-200/80">
                            {familyMembersList.map((fam: any, idx: number) => {
                              const hasCondition = fam.hasPreExistingCondition === "Yes" || (fam.healthStatus && !["healthy", "good", "normal", "fine", "no", "none"].includes(String(fam.healthStatus).toLowerCase().trim()));
                              const conditionDetails = fam.medicalDetails || (hasCondition ? fam.healthStatus : "");

                              return (
                                <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-slate-900 text-xs">{fam.name}</span>
                                      <span className="px-2 py-0.5 bg-slate-200/70 text-slate-700 font-bold text-[10px] rounded-md uppercase">
                                        {fam.relationship}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5 font-medium">
                                      {fam.dob && <span>DOB: <strong className="font-mono font-bold text-slate-700">{fam.dob}</strong></span>}
                                      {fam.gender && <span>Gender: <strong className="font-bold text-slate-700">{fam.gender}</strong></span>}
                                      <span>Pre-existing Condition: <strong className={`font-bold ${hasCondition ? "text-rose-600" : "text-emerald-600"}`}>{hasCondition ? "Yes" : "No"}</strong></span>
                                    </div>
                                  </div>

                                  {hasCondition && conditionDetails && (
                                    <div className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg text-xs shrink-0">
                                      <span className="text-[10px] font-extrabold text-rose-700 uppercase block">Medical Details</span>
                                      <span className="font-bold text-rose-900">{conditionDetails}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <ul className="list-disc pl-4 text-slate-600 space-y-1">
                            {familyMembers.map((m: string, i: number) => (
                              <li key={i} className="font-semibold">{m}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Attached Documents display */}
                <div className="pt-2 border-t border-slate-200">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-teal-600" />
                    DOCUMENTS & ATTACHMENTS
                  </h4>

                  {(!viewingDetailsPolicy.documents || viewingDetailsPolicy.documents.length === 0) ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                      <p className="text-xs text-slate-500 font-medium italic">No documents attached to this policy.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {viewingDetailsPolicy.documents.map((doc: any, idx: number) => {
                        const badge = getFileTypeBadge(doc.originalName, doc.storedName, doc.mimeType);
                        const downloadUrl = getDocumentDownloadUrl(doc);
                        const sizeStr = formatFileSize(doc.size);

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-2xs transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <div className="p-2 bg-slate-100 text-slate-700 rounded-lg shrink-0">
                                <FileText className="w-4.5 h-4.5 text-teal-600" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 text-xs truncate block" title={doc.originalName || doc.storedName}>
                                  {doc.originalName || doc.storedName || "Policy Document"}
                                </span>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium mt-0.5">
                                  <span className={`px-1.5 py-0.2 rounded border font-mono font-extrabold text-[9px] ${badge.bg}`}>
                                    {badge.label}
                                  </span>
                                  {sizeStr && <span>• {sizeStr}</span>}
                                  {doc.uploadedAt && <span>• {doc.uploadedAt.split("T")[0]}</span>}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={doc.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                                title="View Document"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-600" />
                                <span>View</span>
                              </a>
                              <a
                                href={downloadUrl}
                                download={doc.originalName || "document"}
                                className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                                title="Download Document"
                              >
                                <Download className="w-3.5 h-3.5 text-teal-700" />
                                <span>Download</span>
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Email Dispatch Section */}
                <div className="pt-3 border-t border-slate-100">
                  <button
                    onClick={() => sendRemindersToAllDueForDetails(viewingDetailsPolicy.customerEmail)}
                    disabled={isSendingDetailsBatch || isGeneratingEmail !== null}
                    className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition shadow-2xs"
                  >
                    {isSendingDetailsBatch || isGeneratingEmail !== null ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-teal-100" />
                    )}
                    Alert Mail
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-2 font-normal">
                    Generates customized renewal templates with Gemini AI and dispatches them instantly to {viewingDetailsPolicy.customerEmail}.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end p-4 border-t border-slate-200 bg-slate-50 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewingDetailsPolicy(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Edit Policy Modal Dialog */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-slate-800">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50 shrink-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-tight flex items-center gap-2">
                    {editingPolicy ? <Edit className="w-4.5 h-4.5 text-slate-800" /> : <Plus className="w-4.5 h-4.5 text-slate-800" />}
                    {editingPolicy ? "Modify Insured Policy Record" : "Register New Insurance Policy"}
                  </h3>
                  <div className="relative">
                    <select
                      value={
                        form.businessType === "RENEWAL"
                          ? "RENEWAL"
                          : (form.businessSubtype === "PORT" || form.businessType === "PORT")
                          ? "PORT"
                          : "FRESH"
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "FRESH") {
                          setForm(prev => ({
                            ...prev,
                            businessType: "NEW_BUSINESS",
                            businessSubtype: "FRESH",
                            policyStatus: prev.policyStatus === "Not Set" ? "Pending" : (prev.policyStatus || "Pending"),
                            renewalManagerId: "",
                            renewalManagerName: "",
                            renewalExecutiveId: "",
                            renewalExecutiveName: ""
                          }));
                        } else if (val === "PORT") {
                          setForm(prev => ({
                            ...prev,
                            businessType: "PORT",
                            businessSubtype: "PORT",
                            policyStatus: prev.policyStatus === "Not Set" ? "Pending" : (prev.policyStatus || "Pending"),
                            renewalManagerId: "",
                            renewalManagerName: "",
                            renewalExecutiveId: "",
                            renewalExecutiveName: ""
                          }));
                        } else if (val === "RENEWAL") {
                          setForm(prev => ({
                            ...prev,
                            businessType: "RENEWAL",
                            businessSubtype: null,
                            policyStatus: prev.policyStatus || "Pending",
                            bmId: "",
                            teamManagerId: "",
                            teamLeaderId: "",
                            callerId: ""
                          }));
                        }
                      }}
                      className="bg-slate-100 hover:bg-slate-200/80 border border-slate-300 focus:border-[#660000] focus:ring-1 focus:ring-[#660000] rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-800 cursor-pointer shadow-2xs focus:outline-none transition font-mono"
                    >
                      <option value="FRESH">NEW BUSINESS • FRESH</option>
                      <option value="PORT">NEW BUSINESS • PORT</option>
                      <option value="RENEWAL">RENEWAL</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-800 cursor-pointer transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={editingPolicy ? handleEditPolicy : handleAddPolicy} className="p-6 space-y-5 bg-white overflow-y-auto custom-scrollbar flex-1">
                {/* BUSINESS LOGIN DATE (TOP OF FORM) */}
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-[#660000] text-white rounded-md shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Business Login Date <span className="text-[#660000]">*</span>
                      </label>
                      <p className="text-[11px] text-slate-500 font-medium">Official submission / login date for this insurance proposal</p>
                    </div>
                  </div>
                  <div className="w-full sm:w-56">
                    <input
                      type="date"
                      required
                      name="businessLoginDate"
                      value={form.businessLoginDate}
                      onChange={handleFormChange}
                      className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-3 text-xs text-slate-900 font-mono font-bold focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                    />
                  </div>
                </div>

                {/* 01 — POLICY SOURCE & SALES REFERENCE */}
                <div className="pt-4 border-t border-slate-200/80 space-y-3.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="px-2 py-0.5 bg-[#660000] text-white rounded text-[10px] font-extrabold font-mono">01</span>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Policy Source & Sales Reference</h4>
                    <span className="text-[11px] text-slate-400 font-normal ml-auto hidden sm:inline">Policy sourcing channel & sales reference attribution</span>
                  </div>

                  {/* Source Type Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Source Type <span className="text-[#660000]">*</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-5 p-2.5 bg-white border border-slate-300 rounded-md shadow-2xs">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                        <input
                          type="radio"
                          name="sourceType"
                          value="sales_team"
                          checked={form.sourceType === "sales_team" || !form.sourceType}
                          onChange={(e) => setForm(prev => ({ ...prev, sourceType: e.target.value as any }))}
                          className="accent-[#660000] w-4 h-4 cursor-pointer"
                        />
                        <span>{form.businessType === "RENEWAL" ? "Renewal Team" : "Sales Team"}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                        <input
                          type="radio"
                          name="sourceType"
                          value="direct"
                          checked={form.sourceType === "direct"}
                          onChange={(e) => setForm(prev => ({ ...prev, sourceType: e.target.value as any }))}
                          className="accent-[#660000] w-4 h-4 cursor-pointer"
                        />
                        <span>Direct</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                        <input
                          type="radio"
                          name="sourceType"
                          value="referral"
                          checked={form.sourceType === "referral"}
                          onChange={(e) => setForm(prev => ({ ...prev, sourceType: e.target.value as any }))}
                          className="accent-[#660000] w-4 h-4 cursor-pointer"
                        />
                        <span>Referral</span>
                      </label>
                    </div>
                  </div>

                  {/* Team Assignment Fields */}
                  {(form.sourceType === "sales_team" || !form.sourceType) && (
                    form.businessType === "RENEWAL" ? (
                      /* Renewal Team Fields */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                        {/* Select Renewal Manager */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Select Renewal Manager
                          </label>
                          <select
                            name="renewalManagerId"
                            value={form.renewalManagerId || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              const rmObj = masterRenewalManagers.find(r => r.id === val || (r as any)._id === val);
                              setForm(prev => ({
                                ...prev,
                                renewalManagerId: val,
                                renewalManagerName: rmObj?.name || "",
                                renewalExecutiveId: ""
                              }));
                            }}
                            className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                          >
                            <option value="">-- Select RM --</option>
                            {masterRenewalManagers.map((rm) => (
                              <option key={rm.id || (rm as any)._id} value={rm.id || (rm as any)._id}>
                                {rm.name} {rm.employeeCode ? `(${rm.employeeCode})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Select Renewal Executive */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Select Renewal Executive
                          </label>
                          <select
                            name="renewalExecutiveId"
                            value={form.renewalExecutiveId || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              const reObj = masterRenewalExecutives.find(r => r.id === val || (r as any)._id === val);
                              setForm(prev => ({
                                ...prev,
                                renewalExecutiveId: val,
                                renewalExecutiveName: reObj?.name || "",
                                renewalManagerId: reObj?.renewalManagerId || prev.renewalManagerId
                              }));
                            }}
                            className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                          >
                            <option value="">-- Select RE --</option>
                            {masterRenewalExecutives
                              .filter((re) => !form.renewalManagerId || re.renewalManagerId === form.renewalManagerId)
                              .map((re) => (
                                <option key={re.id || (re as any)._id} value={re.id || (re as any)._id}>
                                  {re.name} {re.employeeCode ? `(${re.employeeCode})` : ""}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      /* New Business Sales Team Fields */
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                        {/* Select BM */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Select BM
                          </label>
                          <select
                            name="bmId"
                            value={form.bmId || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setForm(prev => ({
                                ...prev,
                                bmId: val,
                                teamManagerId: "",
                                teamLeaderId: "",
                                callerId: ""
                              }));
                            }}
                            className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                          >
                            <option value="">-- Select BM --</option>
                            {masterBMs.map((bm) => (
                              <option key={bm.id} value={bm.id}>
                                {bm.name} {bm.employeeCode ? `(${bm.employeeCode})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Select TM */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Select TM
                          </label>
                          <select
                            name="teamManagerId"
                            value={form.teamManagerId || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              const tmObj = masterTMs.find(t => t.id === val);
                              setForm(prev => ({
                                ...prev,
                                teamManagerId: val,
                                bmId: tmObj?.bmId || prev.bmId,
                                teamLeaderId: "",
                                callerId: ""
                              }));
                            }}
                            className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                          >
                            <option value="">-- Select TM --</option>
                            {masterTMs
                              .filter((tm) => !form.bmId || tm.bmId === form.bmId)
                              .map((tm) => (
                                <option key={tm.id} value={tm.id}>
                                  {tm.name} {tm.employeeCode ? `(${tm.employeeCode})` : ""}
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* Select Team Leader */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Select Team Leader
                          </label>
                          <select
                            name="teamLeaderId"
                            value={form.teamLeaderId}
                            onChange={(e) => {
                              const val = e.target.value;
                              const tlObj = masterTeamLeaders.find(t => t.id === val);
                              setForm(prev => ({
                                ...prev,
                                teamLeaderId: val,
                                teamManagerId: tlObj?.teamManagerId || prev.teamManagerId,
                                bmId: tlObj?.bmId || prev.bmId,
                                callerId: ""
                              }));
                            }}
                            className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                          >
                            <option value="">-- Select Team Leader --</option>
                            {masterTeamLeaders
                              .filter((tl) => (!form.teamManagerId || tl.teamManagerId === form.teamManagerId) && (!form.bmId || tl.bmId === form.bmId))
                              .map((tl) => (
                                <option key={tl.id} value={tl.id}>
                                  {tl.name} {tl.employeeCode ? `(${tl.employeeCode})` : ""}
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* Select TSE */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Select TSE
                          </label>
                          <select
                            name="callerId"
                            value={form.callerId}
                            onChange={(e) => {
                              const val = e.target.value;
                              const callerObj = masterCallers.find(c => c.id === val);
                              setForm(prev => ({
                                ...prev,
                                callerId: val,
                                teamLeaderId: callerObj?.teamLeaderId || prev.teamLeaderId,
                                teamManagerId: callerObj?.teamManagerId || prev.teamManagerId,
                                bmId: callerObj?.bmId || prev.bmId
                              }));
                            }}
                            className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] disabled:opacity-50 transition"
                          >
                            <option value="">-- Select TSE --</option>
                            {masterCallers
                              .filter((c) => !form.teamLeaderId || c.teamLeaderId === form.teamLeaderId)
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name} {c.employeeCode ? `(${c.employeeCode})` : ""}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    )
                  )}

                  {/* Direct Fields */}
                  {form.sourceType === "direct" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Source Person Name
                        </label>
                        <input
                          type="text"
                          name="sourcePersonName"
                          value={form.sourcePersonName || ""}
                          onChange={handleFormChange}
                          placeholder="e.g. John Doe"
                          className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-medium transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Mobile Number
                        </label>
                        <input
                          type="tel"
                          name="sourcePersonMobile"
                          value={form.sourcePersonMobile || ""}
                          onChange={handleFormChange}
                          placeholder="e.g. 9876543210"
                          className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-medium font-mono transition"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Source Details / Remark
                        </label>
                        <textarea
                          rows={2}
                          name="sourceRemark"
                          value={form.sourceRemark || ""}
                          onChange={(e: any) => setForm(prev => ({ ...prev, sourceRemark: e.target.value }))}
                          placeholder="Enter direct sourcing details or internal notes..."
                          className="w-full bg-white border border-slate-300 rounded-md p-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-medium resize-none transition"
                        />
                      </div>
                    </div>
                  )}

                  {/* Referral Fields */}
                  {form.sourceType === "referral" && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Referred By
                        </label>
                        <input
                          type="text"
                          name="sourcePersonName"
                          value={form.sourcePersonName || ""}
                          onChange={handleFormChange}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-medium transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Mobile Number
                        </label>
                        <input
                          type="tel"
                          name="sourcePersonMobile"
                          value={form.sourcePersonMobile || ""}
                          onChange={handleFormChange}
                          placeholder="e.g. 9876543210"
                          className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-medium font-mono transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Reference Type
                        </label>
                        <select
                          name="referenceType"
                          value={form.referenceType || "Customer"}
                          onChange={handleFormChange}
                          className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                        >
                          <option value="Customer">Customer</option>
                          <option value="Agent">Agent</option>
                          <option value="Employee">Employee</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Reference Details / Remark
                        </label>
                        <textarea
                          rows={2}
                          name="sourceRemark"
                          value={form.sourceRemark || ""}
                          onChange={(e: any) => setForm(prev => ({ ...prev, sourceRemark: e.target.value }))}
                          placeholder="Enter referral context, agent details, or remarks..."
                          className="w-full bg-white border border-slate-300 rounded-md p-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-medium resize-none transition"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 02 — CUSTOMER BASIC INFORMATION */}
                <div className="pt-4 border-t border-slate-200/80 space-y-3.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="px-2 py-0.5 bg-[#660000] text-white rounded text-[10px] font-extrabold font-mono">02</span>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Customer Basic Information</h4>
                    <span className="text-[11px] text-slate-400 font-normal ml-auto hidden sm:inline">Basic personal details of the customer</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Customer Full Name * */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Customer Full Name <span className="text-[#660000]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        name="customerName"
                        value={form.customerName}
                        onChange={handleFormChange}
                        placeholder="e.g. Vijay Kumar"
                        className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-medium transition"
                      />
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        name="customerBirthday"
                        value={form.customerBirthday}
                        onChange={handleFormChange}
                        className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-mono font-medium transition"
                      />
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Gender</label>
                      <select
                        name="gender"
                        value={form.gender}
                        onChange={handleFormChange}
                        className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Marital Status */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Marital Status</label>
                      <select
                        name="maritalStatus"
                        value={form.maritalStatus}
                        onChange={handleFormChange}
                        className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                      >
                        <option value="">Select Status</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </div>

                    {/* Anniversary Date */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Anniversary Date</label>
                      <input
                        type="date"
                        name="anniversaryDate"
                        value={form.maritalStatus === "Married" ? form.anniversaryDate : ""}
                        onChange={handleFormChange}
                        disabled={form.maritalStatus !== "Married"}
                        className={`w-full h-[34px] border rounded-md px-2.5 text-xs font-mono font-medium focus:outline-hidden transition ${form.maritalStatus === "Married"
                            ? "bg-white border-slate-300 text-slate-900 focus:border-[#660000] focus:ring-1 focus:ring-[#660000]"
                            : "bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed"
                          }`}
                      />
                    </div>

                    {/* Occupation */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Occupation</label>
                      <select
                        name="occupationSelect"
                        value={
                          !form.occupation
                            ? ""
                            : STANDARD_OCCUPATIONS.includes(form.occupation)
                            ? form.occupation
                            : "Others"
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "Others") {
                            const isStandard = STANDARD_OCCUPATIONS.includes(form.occupation);
                            setForm(prev => ({ ...prev, occupation: isStandard ? "Others" : prev.occupation || "Others" }));
                          } else {
                            setForm(prev => ({ ...prev, occupation: val }));
                          }
                        }}
                        className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                      >
                        <option value="">Select Occupation</option>
                        <option value="Salaried / Employee">Salaried / Employee</option>
                        <option value="Self Employed">Self Employed</option>
                        <option value="Business Owner">Business Owner</option>
                        <option value="Government Employee">Government Employee</option>
                        <option value="Retired">Retired</option>
                        <option value="Homemaker / Housewife">Homemaker / Housewife</option>
                        <option value="Student">Student</option>
                        <option value="Farmer / Agriculturist">Farmer / Agriculturist</option>
                        <option value="Others">Others</option>
                      </select>

                      {/* Specify Occupation */}
                      {(form.occupation === "Others" || (form.occupation && !STANDARD_OCCUPATIONS.includes(form.occupation))) && (
                        <div className="mt-1.5">
                          <input
                            type="text"
                            name="specifyOccupation"
                            value={form.occupation === "Others" ? "" : form.occupation}
                            onChange={(e) => {
                              const customVal = e.target.value;
                              setForm(prev => ({ ...prev, occupation: customVal.trim() === "" ? "Others" : customVal }));
                            }}
                            placeholder="Specify occupation"
                            className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-medium transition"
                          />
                        </div>
                      )}
                    </div>

                    {/* Customer Type */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer Type</label>
                      <select
                        name="customerType"
                        value={(form as any).customerType || "Individual"}
                        onChange={handleFormChange}
                        className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                      >
                        <option value="Individual">Individual</option>
                        <option value="Floater">Floater</option>
                      </select>
                    </div>

                    {/* Annual Income */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Annual Income (₹)</label>
                      <input
                        type="text"
                        name="annualIncome"
                        value={(form as any).annualIncome || ""}
                        onChange={handleFormChange}
                        placeholder="e.g. 5,00,000"
                        className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-medium font-mono transition"
                      />
                    </div>

                    {/* Height */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Height</label>
                      <input
                        type="text"
                        name="height"
                        value={(form as any).height || ""}
                        onChange={handleFormChange}
                        placeholder="e.g. 175 cm / 5'9&quot;"
                        className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-medium transition"
                      />
                    </div>

                    {/* Weight */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Weight</label>
                      <input
                        type="text"
                        name="weight"
                        value={(form as any).weight || ""}
                        onChange={handleFormChange}
                        placeholder="e.g. 70 kg"
                        className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-medium transition"
                      />
                    </div>
                  </div>
                </div>

                {/* 03 — CONTACT INFORMATION */}
                <div className="pt-4 border-t border-slate-200/80 space-y-3.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="px-2 py-0.5 bg-[#660000] text-white rounded text-[10px] font-extrabold font-mono">03</span>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Contact Information</h4>
                    <span className="text-[11px] text-slate-400 font-normal ml-auto hidden sm:inline">Customer's phone & digital contact details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Primary Mobile * */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Primary Mobile <span className="text-[#660000]">*</span>
                      </label>
                      <div className="flex h-[34px] rounded-md overflow-hidden border border-slate-300 focus-within:border-[#660000] focus-within:ring-1 focus-within:ring-[#660000] transition">
                        <span className="bg-slate-100 text-slate-600 px-2.5 text-xs font-bold flex items-center border-r border-slate-300">+91</span>
                        <input
                          type="text"
                          required
                          name="customerPhone"
                          value={form.customerPhone}
                          onChange={handleFormChange}
                          placeholder="Enter mobile number"
                          className="w-full bg-white px-2.5 text-xs text-slate-900 focus:outline-hidden font-medium"
                        />
                      </div>
                    </div>

                    {/* Alternate Mobile */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Alternate Mobile</label>
                      <div className="flex h-[34px] rounded-md overflow-hidden border border-slate-300 focus-within:border-[#660000] focus-within:ring-1 focus-within:ring-[#660000] transition">
                        <span className="bg-slate-100 text-slate-600 px-2.5 text-xs font-bold flex items-center border-r border-slate-300">+91</span>
                        <input
                          type="text"
                          name="alternatePhone"
                          value={form.alternatePhone}
                          onChange={handleFormChange}
                          placeholder="Enter alternate number"
                          className="w-full bg-white px-2.5 text-xs text-slate-900 focus:outline-hidden font-medium"
                        />
                      </div>
                    </div>

                    {/* WhatsApp Number */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">WhatsApp Number</label>
                      <div className="flex h-[34px] rounded-md overflow-hidden border border-slate-300 focus-within:border-[#660000] focus-within:ring-1 focus-within:ring-[#660000] transition">
                        <span className="bg-slate-100 text-slate-600 px-2.5 text-xs font-bold flex items-center border-r border-slate-300">+91</span>
                        <input
                          type="text"
                          name="whatsappNumber"
                          value={(form as any).whatsappNumber || ""}
                          onChange={handleFormChange}
                          placeholder="Enter WhatsApp number"
                          className="w-full bg-white px-2.5 text-xs text-slate-900 focus:outline-hidden font-medium"
                        />
                      </div>
                    </div>

                    {/* Email Address */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        name="customerEmail"
                        value={form.customerEmail}
                        onChange={handleFormChange}
                        placeholder="e.g. vijay.kumar@email.com"
                        className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-medium transition"
                      />
                    </div>
                  </div>
                </div>

                {/* 04 — ADDRESS INFORMATION */}
                <div className="pt-4 border-t border-slate-200/80 space-y-3.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="px-2 py-0.5 bg-[#660000] text-white rounded text-[10px] font-extrabold font-mono">04</span>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Address Information</h4>
                    <span className="text-[11px] text-slate-400 font-normal ml-auto hidden sm:inline">Primary location address of the customer</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* House / Flat / Building */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">House / Flat / Building</label>
                      <input
                        type="text"
                        name="houseFlat"
                        value={form.houseFlat}
                        onChange={handleFormChange}
                        placeholder="e.g. Flat 402, Sunshine Heights"
                        className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-medium transition"
                      />
                    </div>

                    {/* Street / Area / Locality */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Street / Area / Locality</label>
                      <input
                        type="text"
                        name="streetArea"
                        value={form.streetArea}
                        onChange={handleFormChange}
                        placeholder="e.g. M.G. Road, Sector 15"
                        className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-medium transition"
                      />
                    </div>

                    {/* Landmark */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Landmark</label>
                      <input
                        type="text"
                        name="landmark"
                        value={form.landmark}
                        onChange={handleFormChange}
                        placeholder="e.g. Near City Mall"
                        className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-medium transition"
                      />
                    </div>

                    {/* PIN Code */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">PIN Code</label>
                      <input
                        type="text"
                        name="pincode"
                        value={form.pincode}
                        onChange={handleFormChange}
                        placeholder="e.g. 110001"
                        className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-mono font-medium transition"
                      />
                    </div>

                    {/* City / Town */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">City / Town</label>
                      <input
                        type="text"
                        name="city"
                        value={form.city}
                        onChange={handleFormChange}
                        placeholder="e.g. New Delhi"
                        className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-medium transition"
                      />
                    </div>

                    {/* District */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">District</label>
                      <input
                        type="text"
                        name="district"
                        value={form.district}
                        onChange={handleFormChange}
                        placeholder="e.g. Central Delhi"
                        className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-medium transition"
                      />
                    </div>

                    {/* State */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">State</label>
                      <select
                        name="state"
                        value={form.state}
                        onChange={handleFormChange}
                        className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                      >
                        <option value="">-- Select State --</option>
                        {INDIAN_STATES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 05 — HEALTH & MEDICAL INFORMATION */}
                <div className="pt-4 border-t border-slate-200/80 space-y-3.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="px-2 py-0.5 bg-[#660000] text-white rounded text-[10px] font-extrabold font-mono">05</span>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Health & Medical Information</h4>
                    <span className="text-[11px] text-slate-400 font-normal ml-auto hidden sm:inline">Customer's health conditions & medical history</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                    {/* Health Status */}
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Do you have any existing health issues?</label>
                      <select
                        name="hasHealthIssue"
                        value={form.hasHealthIssue}
                        onChange={handleFormChange}
                        className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                      >
                        <option value="">Select Health Status</option>
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>

                    {/* Health Issue Text input when Yes */}
                    {form.hasHealthIssue === "Yes" && (
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-[#660000] mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#660000]" />
                          Health Issue / Medical Condition Details <span className="text-[#660000]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          name="healthIssueDetails"
                          value={form.healthIssueDetails}
                          onChange={handleFormChange}
                          placeholder="e.g. Diabetes, BP, Heart Issue, Surgeries, Asthma"
                          className="w-full h-[34px] bg-red-50/50 border border-red-200 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-medium transition"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 06 — FAMILY DETAILS UNDER COVERAGE */}
                <div className="pt-4 border-t border-slate-200/80 space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-[#660000] text-white rounded text-[10px] font-extrabold font-mono">06</span>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Family Details Under Coverage</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(prev => ({
                          ...prev,
                          includeFamily: true,
                          familyMembersList: [
                            ...prev.familyMembersList,
                            { name: "", relationship: "Spouse", dob: "", gender: "Male", height: "", weight: "", hasPreExistingCondition: "No", medicalDetails: "", healthStatus: "Healthy" }
                          ]
                        }));
                      }}
                      className="px-3 py-1 bg-[#660000] hover:bg-[#520000] text-white rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Family Member
                    </button>
                  </div>

                  {form.familyMembersList.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-0.5">No family members added yet. Click "+ Add Family Member" to include family details.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                      {form.familyMembersList.map((fam, idx) => (
                        <div key={idx} className="p-3 bg-slate-50/60 border border-slate-200 rounded-md space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 items-end text-xs">
                            {/* Member Name */}
                            <div className="lg:col-span-3">
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Member Name <span className="text-[#660000]">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="Member Name"
                                value={fam.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setForm(prev => {
                                    const list = [...prev.familyMembersList];
                                    list[idx].name = val;
                                    return { ...prev, familyMembersList: list };
                                  });
                                }}
                                className="w-full h-[32px] px-2 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                              />
                            </div>

                            {/* Relationship */}
                            <div className="lg:col-span-2">
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Relationship <span className="text-[#660000]">*</span>
                              </label>
                              <select
                                required
                                value={fam.relationship}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setForm(prev => {
                                    const list = [...prev.familyMembersList];
                                    list[idx].relationship = val;
                                    return { ...prev, familyMembersList: list };
                                  });
                                }}
                                className="w-full h-[32px] px-2 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                              >
                                <option value="Spouse">Spouse</option>
                                <option value="Son">Son</option>
                                <option value="Daughter">Daughter</option>
                                <option value="Father">Father</option>
                                <option value="Mother">Mother</option>
                                <option value="Brother">Brother</option>
                                <option value="Sister">Sister</option>
                                <option value="Grandfather">Grandfather</option>
                                <option value="Grandmother">Grandmother</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>

                            {/* Date of Birth */}
                            <div className="lg:col-span-2">
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Date of Birth <span className="text-[#660000]">*</span>
                              </label>
                              <input
                                type="date"
                                required
                                value={fam.dob || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setForm(prev => {
                                    const list = [...prev.familyMembersList];
                                    list[idx].dob = val;
                                    return { ...prev, familyMembersList: list };
                                  });
                                }}
                                className="w-full h-[32px] px-2 bg-white border border-slate-300 rounded-md text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                              />
                            </div>

                            {/* Gender */}
                            <div className="lg:col-span-2">
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Gender <span className="text-[#660000]">*</span>
                              </label>
                              <select
                                required
                                value={fam.gender || "Male"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setForm(prev => {
                                    const list = [...prev.familyMembersList];
                                    list[idx].gender = val;
                                    return { ...prev, familyMembersList: list };
                                  });
                                }}
                                className="w-full h-[32px] px-2 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                              >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>

                            {/* Pre-existing Condition */}
                            <div className="lg:col-span-2">
                              <label className="block text-[11px] font-bold text-slate-700 mb-1 truncate" title="Pre-existing Condition">
                                Condition <span className="text-[#660000]">*</span>
                              </label>
                              <select
                                required
                                value={fam.hasPreExistingCondition || "No"}
                                onChange={(e) => {
                                  const val = e.target.value as "No" | "Yes";
                                  setForm(prev => {
                                    const list = [...prev.familyMembersList];
                                    list[idx].hasPreExistingCondition = val;
                                    if (val === "No") {
                                      list[idx].medicalDetails = "";
                                      list[idx].healthStatus = "Healthy";
                                    }
                                    return { ...prev, familyMembersList: list };
                                  });
                                }}
                                className="w-full h-[32px] px-2 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                              >
                                <option value="No">No</option>
                                <option value="Yes">Yes</option>
                              </select>
                            </div>

                            {/* Remove Button */}
                            <div className="lg:col-span-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setForm(prev => ({
                                    ...prev,
                                    familyMembersList: prev.familyMembersList.filter((_, i) => i !== idx)
                                  }));
                                }}
                                className="w-full h-[32px] bg-slate-200/70 text-slate-700 hover:bg-rose-50 hover:text-rose-700 border border-slate-300 rounded-md text-[11px] font-bold cursor-pointer transition flex items-center justify-center"
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          {/* Conditional Medical Details Input */}
                          {fam.hasPreExistingCondition === "Yes" && (
                            <div className="pt-1">
                              <label className="block text-[11px] font-bold text-[#660000] mb-1 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-[#660000]" />
                                Medical Condition / Details <span className="text-[#660000]">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Diabetes, Asthma, High Blood Pressure"
                                value={fam.medicalDetails || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setForm(prev => {
                                    const list = [...prev.familyMembersList];
                                    list[idx].medicalDetails = val;
                                    list[idx].healthStatus = val;
                                    return { ...prev, familyMembersList: list };
                                  });
                                }}
                                className="w-full h-[32px] px-2.5 bg-red-50/50 border border-red-200 rounded-md text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 07 — POLICY DETAILS */}
                <div className="pt-4 border-t border-slate-200/80 space-y-3.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="px-2 py-0.5 bg-[#660000] text-white rounded text-[10px] font-extrabold font-mono">07</span>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Policy Details</h4>
                    <span className="text-[11px] text-slate-400 font-normal ml-auto hidden sm:inline">Policy identification, schedule, tenure & status</span>
                  </div>

                  {/* Subgroup A: Basic Policy Info */}
                  <div className="space-y-2.5">
                    <div className="text-[10px] font-extrabold text-[#660000] uppercase tracking-wider">Basic Policy Info</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      {/* Policy Number */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Policy Number</label>
                        <input
                          type="text"
                          name="policyNumber"
                          value={form.policyNumber}
                          onChange={handleFormChange}
                          placeholder={form.businessType === "RENEWAL" ? "POL-123456" : "POL-99238491 (Optional)"}
                          className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 font-mono font-medium focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                        />
                      </div>

                      {/* Insurance Company * */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Insurance Company <span className="text-[#660000]">*</span>
                        </label>
                        {masterCompanies.length === 0 && !form.companyName ? (
                          <div className="h-[34px] px-2.5 bg-red-100 border border-red-200 rounded-md text-[10px] text-[#660000] font-bold flex items-center leading-tight">
                            No active insurance companies available. Contact Admin.
                          </div>
                        ) : (
                          <select
                            name="companyName"
                            value={form.companyName}
                            onChange={(e) => {
                              const selectedName = e.target.value;
                              const match = masterCompanies.find(c => c.name === selectedName);
                              setForm(prev => ({
                                ...prev,
                                companyName: selectedName,
                                insuranceCompanyId: match?.id || prev.insuranceCompanyId,
                                policyType: "",
                                productId: "",
                                productName: ""
                              }));
                            }}
                            className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                          >
                            <option value="">Select Company</option>
                            {availableCompaniesFilter.map(comp => (
                              <option key={comp} value={comp}>{comp}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Product Name */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Product Name
                        </label>
                        <select
                          name="productName"
                          value={form.productName || ""}
                          onChange={(e) => {
                            const prodName = e.target.value;
                            const compId = form.insuranceCompanyId || masterCompanies.find(c => c.name === form.companyName)?.id;
                            const match = masterProducts.find(p => p.name === prodName && (!compId || p.companyId === compId));
                            setForm(prev => ({
                              ...prev,
                              productName: prodName,
                              productId: match?.id || "",
                              policyType: prodName || prev.policyType || "Health Insurance"
                            }));
                          }}
                          className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                        >
                          <option value="">Select Product Name</option>
                          {masterProducts
                            .filter(p => !form.companyName || p.companyName === form.companyName || (form.insuranceCompanyId && p.companyId === form.insuranceCompanyId))
                            .map(prod => (
                              <option key={prod.id || prod._id} value={prod.name}>{prod.name}</option>
                            ))
                          }
                        </select>
                      </div>

                      {/* Partner Advisor */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Partner Advisor
                        </label>
                        <select
                          name="advisorId"
                          value={form.advisorId || ""}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const adv = masterAdvisors.find(a => a.id === selectedId);
                            setForm(prev => ({
                              ...prev,
                              advisorId: selectedId,
                              advisorName: adv ? adv.name : "",
                              advisorCode: adv ? adv.advisorCode : ""
                            }));
                          }}
                          className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                        >
                          <option value="">No Advisor (Direct / In-House)</option>
                          {masterAdvisors
                            .filter(a => !form.companyName || !form.insuranceCompanyId || a.insuranceCompanyId === form.insuranceCompanyId || (a.insuranceCompanyName && a.insuranceCompanyName.toLowerCase() === form.companyName.toLowerCase()))
                            .map(adv => (
                              <option key={adv.id} value={adv.id}>
                                {adv.name} — {adv.insuranceCompanyName || "Partner"} ({adv.branchName || "Branch"}) [{adv.advisorCode}]
                              </option>
                            ))
                          }
                        </select>
                      </div>

                      {/* Premium Amount (₹) * */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Premium Amount (₹) <span className="text-[#660000]">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          name="premiumAmount"
                          value={form.premiumAmount || ""}
                          onChange={handleFormChange}
                          placeholder="0"
                          className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-mono font-medium transition"
                        />
                      </div>

                      {/* SUM ASSURED * */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          SUM ASSURED <span className="text-[#660000]">*</span>
                        </label>
                        <select
                          required
                          name="sumAssured"
                          value={
                            form.sumAssuredType === "UNLIMITED" || form.sumAssured === "UNLIMITED"
                              ? "UNLIMITED"
                              : (form.sumAssured !== undefined && form.sumAssured !== null && form.sumAssured !== ""
                                  ? String(form.sumAssured)
                                  : "")
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "UNLIMITED") {
                              setForm(prev => ({
                                ...prev,
                                sumAssuredType: "UNLIMITED",
                                sumAssured: "UNLIMITED"
                              }));
                            } else if (val) {
                              setForm(prev => ({
                                ...prev,
                                sumAssuredType: "FIXED",
                                sumAssured: Number(val)
                              }));
                            } else {
                              setForm(prev => ({
                                ...prev,
                                sumAssuredType: "FIXED",
                                sumAssured: ""
                              }));
                            }
                          }}
                          className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition cursor-pointer"
                        >
                          <option value="">Select Sum Assured</option>
                          {SUM_ASSURED_OPTIONS.map(opt => (
                            <option key={String(opt.value)} value={String(opt.value)}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Subgroup B: Schedule, Dates, Tenure & Status */}
                  <div className="space-y-2.5 border-t border-slate-100 pt-3">
                    <div className="text-[10px] font-extrabold text-[#660000] uppercase tracking-wider">Schedule & Tenure</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      {/* Payment Frequency */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Frequency</label>
                        <select
                          name="premiumFrequency"
                          value={form.premiumFrequency}
                          onChange={handleFormChange}
                          className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                        >
                          {PAYMENT_FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>

                      {/* Start Date * */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Start Date <span className="text-[#660000]">*</span></label>
                        <input type="date" required name="startDate" value={form.startDate} onChange={handleFormChange} className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-mono font-medium transition" />
                      </div>

                      {/* Next Premium Due Date */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Next Premium Due Date</label>
                        <input type="date" name="nextDueDate" value={form.nextDueDate} onChange={handleFormChange} className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-mono font-medium transition" />
                      </div>

                      {/* Expiry Date */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Policy Expiry Date</label>
                        <input type="date" name="expiryDate" value={form.expiryDate} onChange={handleFormChange} className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-mono font-medium transition" />
                      </div>

                      {/* Policy Tenure */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Policy Tenure</label>
                        <select
                          name="policyTenure"
                          value={form.policyTenure || 1}
                          onChange={handleFormChange}
                          className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 font-bold focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                        >
                          <option value={1}>1 Year</option>
                          <option value={2}>2 Years</option>
                          <option value={3}>3 Years</option>
                          <option value={4}>4 Years</option>
                          <option value={5}>5 Years</option>
                        </select>
                      </div>

                      {/* Policy Status */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Policy Status</label>
                        <select
                          name="policyStatus"
                          value={form.policyStatus || "Issued"}
                          onChange={handleFormChange}
                          className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 font-bold focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                        >
                          <option value="Issued">Issued</option>
                          <option value="Pending">Pending</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Read-Only Commission Summary Preview Card
                  {(() => {
                    const matchCompany = masterCompanies.find(c => c.name.toLowerCase() === (form.companyName || "").toLowerCase());
                    const applicableRate = matchCompany
                      ? (form.businessType === "RENEWAL" ? matchCompany.renewalPayoutPercentage : matchCompany.newBusinessPayoutPercentage)
                      : undefined;
                    const commAmount = applicableRate !== undefined && form.premiumAmount ? Math.round((Number(form.premiumAmount) * applicableRate) / 100) : 0;
                    if (!form.companyName) return null;
                    return (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs space-y-1.5 mt-2">
                        <div className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center justify-between border-b border-slate-200/60 pb-1">
                          <span>COMMISSION SUMMARY PREVIEW</span>
                          <span className="font-mono">{applicableRate !== undefined ? `${applicableRate}% Rate` : "Not Configured"}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block">Insurance Company</span>
                            <span className="font-extrabold text-slate-900 truncate block">{form.companyName}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block">Business Type</span>
                            <span className="font-extrabold text-slate-900 block">{form.businessType === "RENEWAL" ? "Renewal" : form.businessSubtype === "PORT" ? "New Business - Port" : "New Business - Fresh"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block">Applicable Payout</span>
                            <span className="font-extrabold text-slate-900 block font-mono">{applicableRate !== undefined ? `${applicableRate}%` : "0%"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block">Estimated Commission</span>
                            <span className="font-extrabold text-[#660000] block font-mono">₹{commAmount.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()} */}
                </div>

                {/* CONDITIONAL PORTABILITY DETAILS SECTION */}
                {form.businessType === "PORT" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="pt-4 border-t border-slate-200/80 space-y-3.5"
                  >
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <Shield className="w-4 h-4 text-[#660000]" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Portability Details
                      </h4>
                      <span className="text-[11px] text-slate-400 font-normal ml-auto hidden sm:inline">Previous policy information being ported</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      {/* Previous Insurance Company * */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Previous Insurance Company <span className="text-[#660000]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          list="previousCompaniesList"
                          name="previousInsuranceCompany"
                          value={form.previousInsuranceCompany}
                          onChange={handleFormChange}
                          placeholder="e.g. Star Health"
                          className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                        />
                        <datalist id="previousCompaniesList">
                          {masterCompanies.map(c => <option key={c.id} value={c.name} />)}
                        </datalist>
                      </div>

                      {/* Previous Policy Number */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Previous Policy Number
                        </label>
                        <input
                          type="text"
                          name="previousPolicyNumber"
                          value={form.previousPolicyNumber}
                          onChange={handleFormChange}
                          placeholder="e.g. SH123456"
                          className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 font-mono font-medium focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                        />
                      </div>

                      {/* Previous Product Name */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Previous Product Name
                        </label>
                        <input
                          type="text"
                          name="previousProductName"
                          value={form.previousProductName}
                          onChange={handleFormChange}
                          placeholder="e.g. Family Optima"
                          className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                        />
                      </div>

                      {/* Previous Policy Expiry Date */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Previous Expiry Date
                        </label>
                        <input
                          type="date"
                          name="previousPolicyExpiryDate"
                          value={form.previousPolicyExpiryDate}
                          onChange={handleFormChange}
                          className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 font-mono font-medium focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                        />
                      </div>

                      {/* Previous Sum Insured */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Previous Sum Insured (₹)
                        </label>
                        <input
                          type="text"
                          name="previousSumInsured"
                          value={form.previousSumInsured}
                          onChange={handleFormChange}
                          placeholder="e.g. 5,00,000"
                          className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 font-mono font-medium focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 08 — PREMIUM PAYMENT MODE */}
                <div className="pt-4 border-t border-slate-200/80 space-y-3.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="px-2 py-0.5 bg-[#660000] text-white rounded text-[10px] font-extrabold font-mono">08</span>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Premium Payment Mode</h4>
                    <span className="text-[11px] text-slate-400 font-normal ml-auto hidden sm:inline">Select full payment or custom finance / EMI options</span>
                  </div>

                  {/* Payment Mode Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Payment Mode <span className="text-[#660000]">*</span>
                    </label>
                    <div className="p-1 bg-slate-100 border border-slate-200 rounded-lg inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, paymentMode: "Direct" }))}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                          form.paymentMode === "Direct"
                            ? "bg-[#660000] text-white shadow-2xs"
                            : "text-slate-700 hover:bg-slate-200/60 border border-transparent"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${form.paymentMode === "Direct" ? "bg-white" : "bg-slate-400"}`}></span>
                        Full Payment
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, paymentMode: "Finance/EMI", financeType: prev.financeType || "Company EMI" }))}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                          form.paymentMode === "Finance/EMI"
                            ? "bg-[#660000] text-white shadow-2xs"
                            : "text-slate-700 hover:bg-slate-200/60 border border-transparent"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${form.paymentMode === "Finance/EMI" ? "bg-white" : "bg-slate-400"}`}></span>
                        EMI / Finance
                      </button>
                    </div>
                  </div>

                  {/* Conditional EMI / Finance Options */}
                  {form.paymentMode === "Finance/EMI" && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3.5 p-3.5 bg-slate-50/70 border border-slate-200 rounded-md"
                    >
                      {/* Sub-selector: Finance Type */}
                      <div className="space-y-1.5 border-b border-slate-200/60 pb-2.5">
                        <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                          Finance Type <span className="text-[#660000]">*</span>
                        </label>
                        <div className="p-1 bg-white border border-slate-200 rounded-lg inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, financeType: "Company EMI" }))}
                            className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                              form.financeType === "Company EMI"
                                ? "bg-red-100 text-[#660000] border border-red-300 font-bold"
                                : "text-slate-700 hover:bg-slate-100 border border-transparent"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${form.financeType === "Company EMI" ? "bg-[#660000]" : "bg-slate-400"}`}></span>
                            Company EMI
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, financeType: "Vendor Finance" }))}
                            className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                              form.financeType === "Vendor Finance"
                                ? "bg-red-100 text-[#660000] border border-red-300 font-bold"
                                : "text-slate-700 hover:bg-slate-100 border border-transparent"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${form.financeType === "Vendor Finance" ? "bg-[#660000]" : "bg-slate-400"}`}></span>
                            Vendor Finance
                          </button>
                        </div>
                      </div>

                      {/* Option 1: Company EMI Fields */}
                      {form.financeType === "Company EMI" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                          {/* Payment Frequency */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Payment Frequency
                            </label>
                            <select
                              name="premiumFrequency"
                              value={form.premiumFrequency}
                              onChange={handleFormChange}
                              className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] transition"
                            >
                              <option value="Monthly">Monthly</option>
                              <option value="Quarterly">Quarterly</option>
                              <option value="Half-Yearly">Half Yearly</option>
                              <option value="Yearly">Yearly</option>
                            </select>
                          </div>

                          {/* EMI Start Date */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              EMI Start Date
                            </label>
                            <input
                              type="date"
                              name="emiStartDate"
                              value={form.emiStartDate || form.startDate}
                              onChange={handleFormChange}
                              className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-mono font-medium transition"
                            />
                          </div>

                          {/* EMI Tenure (Months) */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              EMI Tenure (Months)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="240"
                              name="emiTenure"
                              value={form.emiTenure || ""}
                              onChange={handleFormChange}
                              placeholder="e.g. 12"
                              className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-mono font-medium transition"
                            />
                          </div>

                          {/* EMI Amount (if applicable) */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              EMI Amount (₹) <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              name="emiAmount"
                              value={form.emiAmount || ""}
                              onChange={handleFormChange}
                              placeholder="e.g. 2500"
                              className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-mono font-medium transition"
                            />
                          </div>
                        </div>
                      )}

                      {/* Option 2: Vendor Finance Fields */}
                      {form.financeType === "Vendor Finance" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                          {/* Finance Vendor / Company * */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Finance Vendor / Company <span className="text-[#660000]">*</span>
                            </label>
                            <input
                              type="text"
                              required={form.paymentMode === "Finance/EMI" && form.financeType === "Vendor Finance"}
                              name="financeVendor"
                              value={form.financeVendor}
                              onChange={handleFormChange}
                              placeholder="e.g. Bajaj Finance, HDFC Bank"
                              className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-medium transition"
                            />
                          </div>

                          {/* Financed Amount * */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Financed Amount (₹) <span className="text-[#660000]">*</span>
                            </label>
                            <input
                              type="number"
                              required={form.paymentMode === "Finance/EMI" && form.financeType === "Vendor Finance"}
                              min="0"
                              name="financedAmount"
                              value={form.financedAmount || ""}
                              onChange={handleFormChange}
                              placeholder="e.g. 50000"
                              className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-mono font-medium transition"
                            />
                          </div>

                          {/* Down Payment */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Down Payment (₹)</label>
                            <input
                              type="number"
                              min="0"
                              name="downPayment"
                              value={form.downPayment || ""}
                              onChange={handleFormChange}
                              placeholder="e.g. 10000"
                              className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-mono font-medium transition"
                            />
                          </div>

                          {/* EMI Amount per Month * */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              EMI Amount per Month (₹) <span className="text-[#660000]">*</span>
                            </label>
                            <input
                              type="number"
                              required={form.paymentMode === "Finance/EMI" && form.financeType === "Vendor Finance"}
                              min="0"
                              name="emiAmount"
                              value={form.emiAmount || ""}
                              onChange={handleFormChange}
                              placeholder="e.g. 5000"
                              className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-mono font-medium transition"
                            />
                          </div>

                          {/* EMI Tenure (Months) * */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              EMI Tenure (Months) <span className="text-[#660000]">*</span>
                            </label>
                            <input
                              type="number"
                              required={form.paymentMode === "Finance/EMI" && form.financeType === "Vendor Finance"}
                              min="1"
                              max="240"
                              name="emiTenure"
                              value={form.emiTenure || ""}
                              onChange={handleFormChange}
                              placeholder="e.g. 12"
                              className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-mono font-medium transition"
                            />
                          </div>

                          {/* EMI Start Date */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">EMI Start Date</label>
                            <input
                              type="date"
                              name="emiStartDate"
                              value={form.emiStartDate}
                              onChange={handleFormChange}
                              className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-mono font-medium transition"
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* 09 — CASHBACK DETAILS */}
                <div className="pt-4 border-t border-slate-200/80 space-y-3.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="px-2 py-0.5 bg-[#660000] text-white rounded text-[10px] font-extrabold font-mono">09</span>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Cashback Details</h4>
                    <span className="text-[11px] text-slate-400 font-normal ml-auto hidden sm:inline">
                      Specify cashback eligibility and amount for this {form.businessType === "RENEWAL" ? "Renewal" : form.businessSubtype === "PORT" ? "Port" : "Fresh"} policy
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Cashback? Yes / No Selector */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Cashback? <span className="text-[#660000]">*</span>
                      </label>
                      <div className="p-1 bg-slate-100 border border-slate-200 rounded-lg inline-flex items-center gap-1 w-full">
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, cashbackEnabled: false, cashbackAmount: 0 }))}
                          className={`flex-1 py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            !form.cashbackEnabled
                              ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                              : "text-slate-600 hover:bg-slate-200/60 border border-transparent"
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${!form.cashbackEnabled ? "bg-slate-600" : "bg-slate-300"}`}></span>
                          No
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, cashbackEnabled: true }))}
                          className={`flex-1 py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            form.cashbackEnabled
                              ? "bg-[#660000] text-white shadow-2xs"
                              : "text-slate-600 hover:bg-slate-200/60 border border-transparent"
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${form.cashbackEnabled ? "bg-white" : "bg-slate-300"}`}></span>
                          Yes
                        </button>
                      </div>
                    </div>

                    {/* Cashback Amount (Required when Cashback = Yes) */}
                    {form.cashbackEnabled && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="sm:col-span-1"
                      >
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Cashback Amount (₹) <span className="text-[#660000]">*</span>
                        </label>
                        <input
                          type="number"
                          required={form.cashbackEnabled}
                          min="1"
                          name="cashbackAmount"
                          value={form.cashbackAmount || ""}
                          onChange={handleFormChange}
                          placeholder="e.g. 500"
                          className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-mono font-bold transition"
                        />
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* 10 — DOCUMENTS & ATTACHMENTS */}
                <div className="pt-4 border-t border-slate-200/80 space-y-3.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="px-2 py-0.5 bg-[#660000] text-white rounded text-[10px] font-extrabold font-mono">10</span>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Documents & Attachments</h4>
                    <span className="text-[11px] text-slate-400 font-normal ml-auto hidden sm:inline">Attach policy documents, proposals, RC copies, or IDs</span>
                  </div>

                  {/* Drop area & Upload button */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-[#660000] hover:bg-red-50/50 transition bg-white rounded-md p-4 text-center cursor-pointer relative group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <div className="flex items-center justify-center gap-2 text-slate-700">
                      <Upload className="w-5 h-5 group-hover:scale-110 transition-transform text-[#660000]" />
                      <span className="text-xs font-bold text-slate-800">
                        Click to select files or drag & drop here
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">
                      Supports multiple PDF, JPG, JPEG, and PNG files up to 25MB each
                    </p>
                  </div>

                  {/* Selected / Existing Files List */}
                  {(existingDocuments.length > 0 || pendingFiles.length > 0) && (
                    <div className="space-y-2 pt-1">
                      <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Attached Policy Documents ({existingDocuments.length + pendingFiles.length})
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Existing Saved Documents */}
                        {existingDocuments.map((doc, idx) => {
                          const badge = getFileTypeBadge(doc.originalName, doc.storedName, doc.mimeType);
                          const downloadUrl = getDocumentDownloadUrl(doc);
                          const sizeStr = formatFileSize(doc.size);

                          return (
                            <div key={`existing_${idx}`} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-md text-xs shadow-2xs">
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <FileText className="w-4 h-4 text-[#660000] shrink-0" />
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-900 truncate block" title={doc.originalName || doc.storedName}>
                                    {doc.originalName || doc.storedName || "Document"}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-0.5">
                                    <span className="px-1 py-0.2 rounded border bg-red-100 border-red-200 text-[#660000] font-sans font-bold text-[9px]">
                                      {badge.label}
                                    </span>
                                    {sizeStr && <span>• {sizeStr}</span>}
                                    <span>• Saved</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <a
                                  href={doc.path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-[11px] font-bold transition cursor-pointer"
                                  title="View"
                                >
                                  View
                                </a>
                                <a
                                  href={downloadUrl}
                                  download={doc.originalName || "document"}
                                  className="px-2 py-1 bg-red-100 hover:bg-red-200 text-[#660000] border border-red-200 rounded-md text-[11px] font-bold transition cursor-pointer"
                                  title="Download"
                                >
                                  Download
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm("Are you sure you want to remove this document?")) {
                                      setExistingDocuments(prev => prev.filter((_, i) => i !== idx));
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition rounded cursor-pointer"
                                  title="Remove Document"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Pending Upload Files */}
                        {pendingFiles.map((file, idx) => (
                          <div key={`pending_${idx}`} className="flex items-center justify-between p-2.5 bg-red-50 border border-red-200 rounded-md text-xs shadow-2xs">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <FileText className="w-4 h-4 text-[#660000] shrink-0" />
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 truncate block" title={file.name}>
                                  {file.name}
                                </span>
                                <span className="text-[10px] text-slate-600 font-mono block mt-0.5">
                                  {formatFileSize(file.size)} • Ready to upload
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100/50 transition rounded cursor-pointer"
                              title="Remove File"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 11 — ADDITIONAL CUSTOMER / POLICY NOTES */}
                <div className="pt-4 border-t border-slate-200/80 space-y-3.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="px-2 py-0.5 bg-[#660000] text-white rounded text-[10px] font-extrabold font-mono">11</span>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Additional Customer / Policy Notes</h4>
                    <span className="text-[11px] text-slate-400 font-normal ml-auto hidden sm:inline">Internal remarks & custom policyholder notes</span>
                  </div>

                  <textarea
                    rows={3}
                    name="notes"
                    value={form.notes}
                    onChange={(e: any) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Enter any special customer instructions or policy notes..."
                    className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#660000] focus:ring-1 focus:ring-[#660000] font-medium h-20 resize-none transition"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 bg-white -mx-6 -mb-6 px-6 py-3.5 rounded-b-2xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-bold cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#660000] hover:bg-[#520000] text-white rounded-md text-xs font-bold uppercase shadow-2xs cursor-pointer transition flex items-center gap-1.5"
                  >
                    {editingPolicy ? "Update Policy Record" : "SAVE RECORD"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* CHOICE MODAL FOR NEW BUSINESS (FRESH VS PORT) */}
      <AnimatePresence>
        {isNewBusinessChoiceOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-55 flex items-center justify-center p-4 sm:p-6 text-slate-800">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                <h3 className="text-xs font-extrabold text-slate-950 uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#660000]" />
                  NEW BUSINESS TYPE
                </h3>
                <button
                  onClick={() => setIsNewBusinessChoiceOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs font-medium text-slate-700">
                <p className="text-slate-500 leading-relaxed text-xs">
                  Select the business subtype for this new proposal:
                </p>

                <div className="space-y-2.5">
                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    newBusinessSubtypeChoice === "FRESH"
                      ? "bg-red-100 border-red-300 text-slate-900 font-bold shadow-2xs ring-1 ring-red-200"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-800"
                  }`}>
                    <input
                      type="radio"
                      name="businessSubtypeChoice"
                      value="FRESH"
                      checked={newBusinessSubtypeChoice === "FRESH"}
                      onChange={() => setNewBusinessSubtypeChoice("FRESH")}
                      className="accent-[#660000] w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Fresh</div>
                      <div className="text-[11px] text-slate-500 font-normal">Direct new policy for a customer</div>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    newBusinessSubtypeChoice === "PORT"
                      ? "bg-red-100 border-red-300 text-slate-900 font-bold shadow-2xs ring-1 ring-red-200"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-800"
                  }`}>
                    <input
                      type="radio"
                      name="businessSubtypeChoice"
                      value="PORT"
                      checked={newBusinessSubtypeChoice === "PORT"}
                      onChange={() => setNewBusinessSubtypeChoice("PORT")}
                      className="accent-[#660000] w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Port</div>
                      <div className="text-[11px] text-slate-500 font-normal">Porting policy from another insurance company</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewBusinessChoiceOpen(false)}
                  className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-medium cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleContinueNewBusinessChoice}
                  className="px-5 py-1.5 bg-[#660000] hover:bg-[#520000] text-white rounded-md text-xs font-bold shadow-2xs cursor-pointer transition"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmState.isOpen}
        title="Delete Policy Record"
        message="Are you sure you want to delete this insurance policy record? This action cannot be undone."
        confirmText="Delete Record"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmDeletePolicy}
        onCancel={() => setDeleteConfirmState({ isOpen: false, policyId: "" })}
      />
    </div>
  );
}
