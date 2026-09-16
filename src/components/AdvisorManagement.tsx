import React, { useState, useEffect, useRef } from "react";
import { api, UserSession } from "../lib/api";
import { Advisor, InsuranceCompany, AdvisorFormState, AdvisorDocument, AdvisorBusinessReport } from "../types";
import {
  UserCheck, Plus, Search, Filter, RotateCcw, Building2, MapPin, Phone, Mail,
  Shield, CheckCircle2, XCircle, AlertCircle, Edit3, Trash2, Eye, X, ChevronLeft,
  ChevronRight, ChevronsLeft, ChevronsRight, Award, Briefcase, FileText, CreditCard,
  Layers, User, Calendar, ExternalLink, Hash, Landmark, Sparkles, UploadCloud,
  FileCheck, Download, Users, UserPlus, File, EyeOff, FolderOpen, FilePlus2, Check,
  BarChart3, IndianRupee, FileSpreadsheet, TrendingUp, ChevronDown, Clock
} from "lucide-react";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import { hasPermission } from "../lib/permissions";
import ConfirmModal from "./ConfirmModal";

interface AdvisorManagementProps {
  user: UserSession;
}

const DOCUMENT_TYPES = [
  "PAN Card",
  "Aadhaar Card",
  "Advisor License / Registration Certificate",
  "Insurance Company Appointment Letter",
  "Agreement / Contract",
  "GST Certificate",
  "Bank Proof / Cancelled Cheque",
  "Address Proof",
  "Qualification / Education Certificate",
  "Experience Certificate",
  "Other Documents"
];

const INITIAL_FORM_STATE: AdvisorFormState = {
  advisorCode: "",
  fullName: "",
  fatherOrSpouseName: "",
  dateOfBirth: "",
  gender: "Male",
  maritalStatus: "Single",
  profilePhoto: "",

  panNumber: "",
  aadhaarNumber: "",
  advisorLicenseNumber: "",
  licenseExpiryDate: "",

  mobileNumber: "",
  alternateMobileNumber: "",
  email: "",
  whatsappNumber: "",

  insuranceCompanyId: "",
  insuranceCompanyName: "",

  branchName: "",
  branchCode: "",
  branchAddress: "",
  branchArea: "",
  branchCity: "",
  branchState: "",
  branchPincode: "",

  branchManagerName: "",
  branchManagerMobile: "",
  branchManagerEmail: "",
  areaManagerName: "",
  areaManagerMobile: "",
  areaManagerEmail: "",
  zonalManagerName: "",
  zonalManagerMobile: "",
  zonalManagerEmail: "",

  businessType: "Individual",
  advisorType: "Individual Advisor",
  specialization: "General / Health Insurance",
  yearsOfExperience: 0,
  dateOfJoining: "",
  businessName: "",
  gstNumber: "",
  annualBusinessVolume: 0,

  addressLine1: "",
  addressLine2: "",
  area: "",
  landmark: "",
  city: "",
  district: "",
  state: "",
  pincode: "",
  country: "India",

  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  branchNameBank: "",

  virtualManagerId: "",
  virtualManagerName: "",
  recruiterName: "",
  recruiterMobile: "",
  recruitmentDate: "",
  internalDepartment: "Agency Channel",
  internalNotes: "",

  documents: [],
  status: "ACTIVE",
  notes: ""
};

export default function AdvisorManagement({ user }: AdvisorManagementProps) {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // KPI Counters
  const [kpis, setKpis] = useState({
    totalAdvisors: 0,
    activeAdvisors: 0,
    inactiveAdvisors: 0,
    companiesCovered: 0
  });

  // Dynamic filter options from backend
  const [filterOptions, setFilterOptions] = useState<{
    virtualManagers: string[];
    recruiters: string[];
  }>({
    virtualManagers: [],
    recruiters: []
  });

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("All");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedAdvisorType, setSelectedAdvisorType] = useState("All");
  const [selectedVirtualManager, setSelectedVirtualManager] = useState("All");
  const [selectedRecruiter, setSelectedRecruiter] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<AdvisorFormState>(INITIAL_FORM_STATE);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Document Upload State
  const [selectedDocType, setSelectedDocType] = useState<string>("PAN Card");
  const [customDocTitle, setCustomDocTitle] = useState<string>("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);

  // ── Dedicated Standalone Document Hub Modal State ──
  const [isDocHubOpen, setIsDocHubOpen] = useState(false);
  const [docHubAdvisor, setDocHubAdvisor] = useState<Advisor | null>(null);
  const [docHubSelectedType, setDocHubSelectedType] = useState<string>("PAN Card");
  const [docHubCustomTitle, setDocHubCustomTitle] = useState<string>("");
  const [docHubUploading, setDocHubUploading] = useState(false);
  const [docHubError, setDocHubError] = useState<string | null>(null);
  const [docHubSuccess, setDocHubSuccess] = useState<string | null>(null);

  // View Profile Modal & Sub-Tabs
  const [viewingAdvisor, setViewingAdvisor] = useState<Advisor | null>(null);
  const [showSensitiveDetails, setShowSensitiveDetails] = useState(false);
  const [profileActiveTab, setProfileActiveTab] = useState<"profile" | "business" | "policies" | "revenue">("profile");

  // Advisor Business Analytics Report State
  const [advReportData, setAdvReportData] = useState<AdvisorBusinessReport | null>(null);
  const [advReportLoading, setAdvReportLoading] = useState(false);
  const [advReportError, setAdvReportError] = useState<string | null>(null);

  // Advisor Business Filters
  const [advDatePreset, setAdvDatePreset] = useState<string>("all");
  const [advDateFrom, setAdvDateFrom] = useState<string>("");
  const [advDateTo, setAdvDateTo] = useState<string>("");
  const [advCompanyFilter, setAdvCompanyFilter] = useState<string>("All");
  const [advBusinessTypeFilter, setAdvBusinessTypeFilter] = useState<string>("All");
  const [advCommissionStatusFilter, setAdvCommissionStatusFilter] = useState<string>("All");
  const [isAdvExportMenuOpen, setIsAdvExportMenuOpen] = useState(false);

  // Close advisor export menu on click outside
  const advExportMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (advExportMenuRef.current && !advExportMenuRef.current.contains(e.target as Node)) {
        setIsAdvExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    type?: "danger" | "warning" | "info";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  // Permissions Check
  const canCreate =
    hasPermission(user, ["advisors.create", "advisors.manage"]) ||
    ["SUPER_ADMIN", "ADMIN", "TENANT_ADMIN"].includes((user.role || "").toUpperCase());
  const canEdit =
    hasPermission(user, ["advisors.edit", "advisors.manage"]) ||
    ["SUPER_ADMIN", "ADMIN", "TENANT_ADMIN"].includes((user.role || "").toUpperCase());
  const canDelete =
    hasPermission(user, ["advisors.delete", "advisors.manage"]) ||
    ["SUPER_ADMIN", "ADMIN", "TENANT_ADMIN"].includes((user.role || "").toUpperCase());

  // Load Companies
  useEffect(() => {
    api.getInsuranceCompanies()
      .then(res => setCompanies(res || []))
      .catch(() => {});
  }, []);

  // Fetch Advisors List
  const fetchAdvisors = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string | number> = {
        page,
        limit
      };

      if (search.trim()) params.search = search.trim();
      if (selectedCompany !== "All") params.insuranceCompanyId = selectedCompany;
      if (selectedBranch !== "All") params.branch = selectedBranch;
      if (selectedCity.trim()) params.city = selectedCity.trim();
      if (selectedAdvisorType !== "All") params.advisorType = selectedAdvisorType;
      if (selectedVirtualManager !== "All") params.virtualManager = selectedVirtualManager;
      if (selectedRecruiter !== "All") params.recruiter = selectedRecruiter;
      if (selectedStatus !== "All") params.status = selectedStatus;

      const res = await api.getAdvisors(params);

      setAdvisors(res.advisors || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalCount(res.pagination?.total || 0);
      setKpis({
        totalAdvisors: res.kpis?.totalAdvisors || 0,
        activeAdvisors: res.kpis?.activeAdvisors || 0,
        inactiveAdvisors: res.kpis?.inactiveAdvisors || 0,
        companiesCovered: res.kpis?.companiesCovered || 0
      });
      if (res.filterOptions) {
        setFilterOptions({
          virtualManagers: res.filterOptions.virtualManagers || [],
          recruiters: res.filterOptions.recruiters || []
        });
      }
    } catch (err: any) {
      console.error("Failed to fetch advisors:", err);
      setError(err.message || "Failed to load advisor directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvisors();
  }, [page, limit, selectedCompany, selectedBranch, selectedAdvisorType, selectedVirtualManager, selectedRecruiter, selectedStatus]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchAdvisors();
    }, 350);
    return () => clearTimeout(timer);
  }, [search, selectedCity]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearch("");
    setSelectedCompany("All");
    setSelectedBranch("All");
    setSelectedCity("");
    setSelectedAdvisorType("All");
    setSelectedVirtualManager("All");
    setSelectedRecruiter("All");
    setSelectedStatus("All");
    setPage(1);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setFormState({
      ...INITIAL_FORM_STATE,
      insuranceCompanyId: companies.length > 0 ? companies[0].id : "",
      insuranceCompanyName: companies.length > 0 ? companies[0].name : ""
    });
    setFormError(null);
    setSelectedDocType("PAN Card");
    setCustomDocTitle("");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = async (adv: Advisor) => {
    try {
      setLoading(true);
      const full = await api.getAdvisorById(adv.id);
      setModalMode("edit");
      setEditingId(full.id);
      setFormState({
        advisorCode: full.advisorCode || "",
        fullName: full.personalDetails?.fullName || "",
        fatherOrSpouseName: full.personalDetails?.fatherOrSpouseName || "",
        dateOfBirth: full.personalDetails?.dateOfBirth || "",
        gender: full.personalDetails?.gender || "Male",
        maritalStatus: full.personalDetails?.maritalStatus || "Single",
        profilePhoto: full.personalDetails?.profilePhoto || "",

        panNumber: full.identityDetails?.panNumber || "",
        aadhaarNumber: full.identityDetails?.aadhaarNumber || "",
        advisorLicenseNumber: full.identityDetails?.advisorLicenseNumber || "",
        licenseExpiryDate: full.identityDetails?.licenseExpiryDate || "",

        mobileNumber: full.contactDetails?.mobileNumber || "",
        alternateMobileNumber: full.contactDetails?.alternateMobileNumber || "",
        email: full.contactDetails?.email || "",
        whatsappNumber: full.contactDetails?.whatsappNumber || "",

        insuranceCompanyId: full.insuranceDetails?.insuranceCompanyId || "",
        insuranceCompanyName: full.insuranceDetails?.insuranceCompanyName || "",

        branchName: full.branchDetails?.branchName || "",
        branchCode: full.branchDetails?.branchCode || "",
        branchAddress: full.branchDetails?.branchAddress || "",
        branchArea: full.branchDetails?.branchArea || "",
        branchCity: full.branchDetails?.branchCity || "",
        branchState: full.branchDetails?.branchState || "",
        branchPincode: full.branchDetails?.branchPincode || "",

        branchManagerName: full.insuranceCompanyManagement?.branchManagerName || "",
        branchManagerMobile: full.insuranceCompanyManagement?.branchManagerMobile || "",
        branchManagerEmail: full.insuranceCompanyManagement?.branchManagerEmail || "",
        areaManagerName: full.insuranceCompanyManagement?.areaManagerName || "",
        areaManagerMobile: full.insuranceCompanyManagement?.areaManagerMobile || "",
        areaManagerEmail: full.insuranceCompanyManagement?.areaManagerEmail || "",
        zonalManagerName: full.insuranceCompanyManagement?.zonalManagerName || "",
        zonalManagerMobile: full.insuranceCompanyManagement?.zonalManagerMobile || "",
        zonalManagerEmail: full.insuranceCompanyManagement?.zonalManagerEmail || "",

        businessType: full.businessDetails?.businessType || "Individual",
        advisorType: full.businessDetails?.advisorType || "Individual Advisor",
        specialization: full.businessDetails?.specialization || "General / Health Insurance",
        yearsOfExperience: full.businessDetails?.yearsOfExperience || 0,
        dateOfJoining: full.businessDetails?.dateOfJoining || "",
        businessName: full.businessDetails?.businessName || "",
        gstNumber: full.businessDetails?.gstNumber || "",
        annualBusinessVolume: full.businessDetails?.annualBusinessVolume || 0,

        addressLine1: full.locationDetails?.addressLine1 || "",
        addressLine2: full.locationDetails?.addressLine2 || "",
        area: full.locationDetails?.area || "",
        landmark: full.locationDetails?.landmark || "",
        city: full.locationDetails?.city || "",
        district: full.locationDetails?.district || "",
        state: full.locationDetails?.state || "",
        pincode: full.locationDetails?.pincode || "",
        country: full.locationDetails?.country || "India",

        accountHolderName: full.bankDetails?.accountHolderName || "",
        bankName: full.bankDetails?.bankName || "",
        accountNumber: full.bankDetails?.accountNumber || "",
        ifscCode: full.bankDetails?.ifscCode || "",
        branchNameBank: full.bankDetails?.branchName || "",

        virtualManagerId: full.internalMapping?.virtualManagerId || "",
        virtualManagerName: full.internalMapping?.virtualManagerName || "",
        recruiterName: full.internalMapping?.recruiterName || "",
        recruiterMobile: full.internalMapping?.recruiterMobile || "",
        recruitmentDate: full.internalMapping?.recruitmentDate || "",
        internalDepartment: full.internalMapping?.internalDepartment || "Agency Channel",
        internalNotes: full.internalMapping?.internalNotes || "",

        documents: full.documents || [],
        status: full.status || "ACTIVE",
        notes: full.notes || ""
      });
      setFormError(null);
      setIsModalOpen(true);
    } catch (err: any) {
      alert("Failed to load advisor record: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-suggest BM / AM / ZM details when branch is entered
  const handleLookupBranchPersonnel = async (compId: string, branchName: string) => {
    if (!compId || !branchName.trim()) return;
    try {
      const res = await api.lookupBranchPersonnel(compId, branchName.trim());
      if (res && res.personnel) {
        setFormState(prev => ({
          ...prev,
          branchManagerName: res.personnel?.branchManagerName || prev.branchManagerName,
          branchManagerMobile: res.personnel?.branchManagerMobile || prev.branchManagerMobile,
          branchManagerEmail: res.personnel?.branchManagerEmail || prev.branchManagerEmail,
          areaManagerName: res.personnel?.areaManagerName || prev.areaManagerName,
          areaManagerMobile: res.personnel?.areaManagerMobile || prev.areaManagerMobile,
          areaManagerEmail: res.personnel?.areaManagerEmail || prev.areaManagerEmail,
          zonalManagerName: res.personnel?.zonalManagerName || prev.zonalManagerName,
          zonalManagerMobile: res.personnel?.zonalManagerMobile || prev.zonalManagerMobile,
          zonalManagerEmail: res.personnel?.zonalManagerEmail || prev.zonalManagerEmail,
          branchCity: res.branchDetails?.branchCity || prev.branchCity,
          branchState: res.branchDetails?.branchState || prev.branchState
        }));
      }
    } catch {
      // Non-blocking auto-lookup
    }
  };

  // Handle Document Upload in Create / Edit Form
  const handleDocumentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      setUploadingDoc(true);
      setDocUploadError(null);
      const res = await api.uploadAdvisorDocuments(Array.from(files), selectedDocType);
      if (res && res.documents) {
        const mapped = res.documents.map(d => ({
          ...d,
          documentName: customDocTitle.trim() || d.documentName
        }));
        setFormState(prev => ({
          ...prev,
          documents: [...prev.documents, ...mapped]
        }));
        setCustomDocTitle("");
      }
    } catch (err: any) {
      setDocUploadError(err.message || "Failed to upload document");
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  };

  // Remove Document from Form
  const handleRemoveDocument = async (docId: string) => {
    if (modalMode === "edit" && editingId) {
      try {
        await api.deleteAdvisorDocument(editingId, docId);
      } catch (err) {
        console.error("Failed to delete document from server:", err);
      }
    }
    setFormState(prev => ({
      ...prev,
      documents: prev.documents.filter(d => d.documentId !== docId)
    }));
  };

  // ── Open Dedicated Document Management Hub Modal ──
  const handleOpenDocHub = async (adv?: Advisor) => {
    setDocHubError(null);
    setDocHubSuccess(null);
    setDocHubCustomTitle("");
    setDocHubSelectedType("PAN Card");

    if (adv) {
      try {
        const full = await api.getAdvisorById(adv.id);
        setDocHubAdvisor(full);
      } catch {
        setDocHubAdvisor(adv);
      }
    } else if (advisors.length > 0) {
      try {
        const full = await api.getAdvisorById(advisors[0].id);
        setDocHubAdvisor(full);
      } catch {
        setDocHubAdvisor(advisors[0]);
      }
    } else {
      setDocHubAdvisor(null);
    }
    setIsDocHubOpen(true);
  };

  // Upload to Standalone Document Hub
  const handleDocHubFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !docHubAdvisor) return;
    try {
      setDocHubUploading(true);
      setDocHubError(null);
      setDocHubSuccess(null);

      const res = await api.uploadAdvisorDocumentsDirect(
        docHubAdvisor.id,
        Array.from(files),
        docHubSelectedType,
        docHubCustomTitle.trim() || undefined
      );

      if (res && res.documents) {
        setDocHubAdvisor(prev => prev ? { ...prev, documents: res.documents } : null);
        setDocHubSuccess(`Successfully uploaded ${files.length} document(s) for ${docHubAdvisor.personalDetails.fullName}!`);
        setDocHubCustomTitle("");
        fetchAdvisors();
      }
    } catch (err: any) {
      setDocHubError(err.message || "Failed to upload document");
    } finally {
      setDocHubUploading(false);
      e.target.value = "";
    }
  };

  // Delete Document from Standalone Document Hub
  const handleDocHubDeleteDoc = async (docId: string) => {
    if (!docHubAdvisor) return;
    try {
      const res = await api.deleteAdvisorDocument(docHubAdvisor.id, docId);
      if (res && res.documents) {
        setDocHubAdvisor(prev => prev ? { ...prev, documents: res.documents } : null);
        setDocHubSuccess("Document deleted successfully");
        fetchAdvisors();
      }
    } catch (err: any) {
      setDocHubError(err.message || "Failed to delete document");
    }
  };

  // Save Form Handler
  const handleSaveAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formState.fullName.trim()) {
      setFormError("Advisor Full Name is required");
      return;
    }
    if (!formState.mobileNumber.trim()) {
      setFormError("Primary Mobile Number is required");
      return;
    }
    if (formState.mobileNumber.trim().replace(/\D/g, "").length < 10) {
      setFormError("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!formState.insuranceCompanyId) {
      setFormError("Please select an Insurance Company");
      return;
    }
    if (!formState.branchName.trim()) {
      setFormError("Branch Name is required");
      return;
    }

    // Validate PAN format if provided
    if (formState.panNumber.trim()) {
      const panUpper = formState.panNumber.trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panUpper)) {
        setFormError("Invalid PAN Format (e.g. ABCDE1234F)");
        return;
      }
    }

    try {
      setSaving(true);
      const payload: Partial<Advisor> = {
        advisorCode: formState.advisorCode.trim().toUpperCase(),
        personalDetails: {
          fullName: formState.fullName.trim(),
          fatherOrSpouseName: formState.fatherOrSpouseName.trim(),
          dateOfBirth: formState.dateOfBirth,
          gender: formState.gender,
          maritalStatus: formState.maritalStatus,
          profilePhoto: formState.profilePhoto
        },
        identityDetails: {
          panNumber: formState.panNumber.trim().toUpperCase(),
          aadhaarNumber: formState.aadhaarNumber.trim(),
          advisorLicenseNumber: formState.advisorLicenseNumber.trim(),
          licenseExpiryDate: formState.licenseExpiryDate
        },
        contactDetails: {
          mobileNumber: formState.mobileNumber.trim(),
          alternateMobileNumber: formState.alternateMobileNumber.trim(),
          email: formState.email.trim().toLowerCase(),
          whatsappNumber: formState.whatsappNumber.trim()
        },
        insuranceDetails: {
          insuranceCompanyId: formState.insuranceCompanyId,
          insuranceCompanyName: formState.insuranceCompanyName
        },
        branchDetails: {
          branchName: formState.branchName.trim(),
          branchCode: formState.branchCode.trim(),
          branchAddress: formState.branchAddress.trim(),
          branchArea: formState.branchArea.trim(),
          branchCity: formState.branchCity.trim(),
          branchState: formState.branchState.trim(),
          branchPincode: formState.branchPincode.trim()
        },
        insuranceCompanyManagement: {
          branchManagerName: formState.branchManagerName.trim(),
          branchManagerMobile: formState.branchManagerMobile.trim(),
          branchManagerEmail: formState.branchManagerEmail.trim(),
          areaManagerName: formState.areaManagerName.trim(),
          areaManagerMobile: formState.areaManagerMobile.trim(),
          areaManagerEmail: formState.areaManagerEmail.trim(),
          zonalManagerName: formState.zonalManagerName.trim(),
          zonalManagerMobile: formState.zonalManagerMobile.trim(),
          zonalManagerEmail: formState.zonalManagerEmail.trim()
        },
        businessDetails: {
          businessType: formState.businessType,
          advisorType: formState.advisorType,
          specialization: formState.specialization,
          yearsOfExperience: Number(formState.yearsOfExperience || 0),
          dateOfJoining: formState.dateOfJoining,
          businessName: formState.businessName,
          gstNumber: formState.gstNumber.trim().toUpperCase(),
          annualBusinessVolume: Number(formState.annualBusinessVolume || 0)
        },
        locationDetails: {
          addressLine1: formState.addressLine1,
          addressLine2: formState.addressLine2,
          area: formState.area,
          landmark: formState.landmark,
          city: formState.city,
          district: formState.district,
          state: formState.state,
          pincode: formState.pincode,
          country: formState.country || "India"
        },
        bankDetails: {
          accountHolderName: formState.accountHolderName,
          bankName: formState.bankName,
          accountNumber: formState.accountNumber.trim(),
          ifscCode: formState.ifscCode.trim().toUpperCase(),
          branchName: formState.branchNameBank
        },
        internalMapping: {
          virtualManagerId: formState.virtualManagerId,
          virtualManagerName: formState.virtualManagerName.trim(),
          recruiterName: formState.recruiterName.trim(),
          recruiterMobile: formState.recruiterMobile.trim(),
          recruitmentDate: formState.recruitmentDate,
          internalDepartment: formState.internalDepartment,
          internalNotes: formState.internalNotes
        },
        documents: formState.documents,
        status: formState.status,
        notes: formState.notes
      };

      if (modalMode === "create") {
        await api.createAdvisor(payload);
      } else if (editingId) {
        await api.updateAdvisor(editingId, payload);
      }

      setIsModalOpen(false);
      fetchAdvisors();
    } catch (err: any) {
      console.error("Failed to save advisor:", err);
      setFormError(err.message || "Failed to save advisor profile");
    } finally {
      setSaving(false);
    }
  };

  // Toggle Status Handler
  const handleToggleStatus = (adv: Advisor) => {
    const nextStatus = adv.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setConfirmModal({
      isOpen: true,
      title: `${nextStatus === "ACTIVE" ? "Activate" : "Deactivate"} Advisor`,
      message: `Are you sure you want to ${nextStatus === "ACTIVE" ? "activate" : "deactivate"} advisor "${adv.personalDetails.fullName}" (${adv.advisorCode})?`,
      confirmText: nextStatus === "ACTIVE" ? "Activate" : "Deactivate",
      type: nextStatus === "ACTIVE" ? "info" : "warning",
      onConfirm: async () => {
        try {
          await api.updateAdvisorStatus(adv.id, nextStatus);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          fetchAdvisors();
        } catch (err: any) {
          alert("Status change failed: " + err.message);
        }
      }
    });
  };

  // Delete Handler
  const handleDeleteAdvisor = (adv: Advisor) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Advisor",
      message: `Are you sure you want to permanently delete advisor "${adv.personalDetails.fullName}" (${adv.advisorCode})? This action cannot be undone.`,
      confirmText: "Delete Advisor",
      type: "danger",
      onConfirm: async () => {
        try {
          await api.deleteAdvisor(adv.id);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          fetchAdvisors();
        } catch (err: any) {
          alert(err.message || "Advisor deletion failed");
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // ── Fetch Advisor Business Report from MongoDB Atlas ──
  const fetchAdvisorBusinessReport = async (advisorId: string) => {
    if (!advisorId) return;
    try {
      setAdvReportLoading(true);
      setAdvReportError(null);
      const params: Record<string, string> = {
        datePreset: advDatePreset,
        businessType: advBusinessTypeFilter,
        companyName: advCompanyFilter,
        commissionStatus: advCommissionStatusFilter
      };
      if (advDatePreset === "custom") {
        if (advDateFrom) params.dateFrom = advDateFrom;
        if (advDateTo) params.dateTo = advDateTo;
      }
      const data = await api.getAdvisorBusinessReport(advisorId, params);
      setAdvReportData(data);
    } catch (err: any) {
      console.error("Advisor Report Fetch Error:", err);
      setAdvReportError(err.message || "Failed to load advisor business data");
    } finally {
      setAdvReportLoading(false);
    }
  };

  // Re-fetch report whenever filters change while viewing advisor
  useEffect(() => {
    if (viewingAdvisor && (profileActiveTab === "business" || profileActiveTab === "policies" || profileActiveTab === "revenue")) {
      fetchAdvisorBusinessReport(viewingAdvisor.id);
    }
  }, [viewingAdvisor?.id, profileActiveTab, advDatePreset, advDateFrom, advDateTo, advCompanyFilter, advBusinessTypeFilter, advCommissionStatusFilter]);

  // Open Full Profile View Modal (with customizable active tab)
  const handleOpenViewProfile = async (adv: Advisor, defaultTab: "profile" | "business" | "policies" | "revenue" = "profile") => {
    try {
      setLoading(true);
      const full = await api.getAdvisorById(adv.id);
      setViewingAdvisor(full);
      setProfileActiveTab(defaultTab);
      setShowSensitiveDetails(false);
      setAdvDatePreset("all");
      setAdvDateFrom("");
      setAdvDateTo("");
      setAdvCompanyFilter("All");
      setAdvBusinessTypeFilter("All");
      setAdvCommissionStatusFilter("All");
      fetchAdvisorBusinessReport(full.id);
    } catch (err: any) {
      alert("Failed to load profile details: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── EXPORT TO EXCEL ──
  const handleExportAdvisorExcel = async () => {
    if (!viewingAdvisor || !advReportData) return;
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = "Policy Master";
      wb.created = new Date();

      const sheet = wb.addWorksheet("Advisor Business Report", {
        views: [{ showGridLines: true }],
        pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
      });

      sheet.columns = [
        { key: "A", width: 8 },
        { key: "B", width: 22 },
        { key: "C", width: 26 },
        { key: "D", width: 26 },
        { key: "E", width: 18 },
        { key: "F", width: 18 },
        { key: "G", width: 16 },
        { key: "H", width: 16 },
        { key: "I", width: 14 },
        { key: "J", width: 18 },
        { key: "K", width: 16 }
      ];

      // Row 1: Title Header
      sheet.mergeCells("A1:K1");
      const titleCell = sheet.getCell("A1");
      titleCell.value = "POLICY MASTER — ADVISOR BUSINESS & PERFORMANCE REPORT";
      titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF660000" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(1).height = 32;

      // Row 2: Subtitle / Timestamp
      sheet.mergeCells("A2:K2");
      const subCell = sheet.getCell("A2");
      subCell.value = `Generated on: ${new Date().toLocaleString("en-IN")} | Period: ${advDatePreset.toUpperCase()}${advDateFrom ? ` (${advDateFrom} to ${advDateTo})` : ""}`;
      subCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF475569" } };
      subCell.alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(2).height = 20;

      // Section 1: ADVISOR DETAILS
      sheet.mergeCells("A4:K4");
      const advHeaderCell = sheet.getCell("A4");
      advHeaderCell.value = "1. ADVISOR PROFILE & HIERARCHY DETAILS";
      advHeaderCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      advHeaderCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      advHeaderCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      sheet.getRow(4).height = 24;

      const advRows = [
        ["Advisor Name", advReportData.advisor.fullName, "Advisor Code", advReportData.advisor.advisorCode, "Insurance Company", advReportData.advisor.insuranceCompanyName || "—"],
        ["Branch", advReportData.advisor.branchName || "—", "Branch City", advReportData.advisor.branchCity || "—", "Mobile", advReportData.advisor.mobileNumber || "—"],
        ["Branch Manager (BM)", advReportData.advisor.branchManagerName || "Unassigned", "Area Manager (AM)", advReportData.advisor.areaManagerName || "Unassigned", "Zonal Manager (ZM)", advReportData.advisor.zonalManagerName || "Unassigned"],
        ["Virtual Manager", advReportData.advisor.virtualManagerName || "Unassigned", "Recruiter", advReportData.advisor.recruiterName || "—", "Status", advReportData.advisor.status]
      ];

      advRows.forEach((r, idx) => {
        const row = sheet.getRow(5 + idx);
        row.height = 20;
        row.getCell(1).value = r[0];
        row.getCell(1).font = { bold: true, size: 9.5, color: { argb: "FF64748B" } };
        row.getCell(2).value = r[1];
        row.getCell(2).font = { bold: true, size: 9.5, color: { argb: "FF0F172A" } };

        row.getCell(4).value = r[2];
        row.getCell(4).font = { bold: true, size: 9.5, color: { argb: "FF64748B" } };
        row.getCell(5).value = r[3];
        row.getCell(5).font = { bold: true, size: 9.5, color: { argb: "FF0F172A" } };

        row.getCell(7).value = r[4];
        row.getCell(7).font = { bold: true, size: 9.5, color: { argb: "FF64748B" } };
        row.getCell(8).value = r[5];
        row.getCell(8).font = { bold: true, size: 9.5, color: { argb: "FF0F172A" } };
      });

      // Section 2: BUSINESS SUMMARY TABLE
      const sumRowIdx = 10;
      sheet.mergeCells(`A${sumRowIdx}:K${sumRowIdx}`);
      const sumHeaderCell = sheet.getCell(`A${sumRowIdx}`);
      sumHeaderCell.value = "2. BUSINESS & REVENUE PERFORMANCE SUMMARY";
      sumHeaderCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      sumHeaderCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF660000" } };
      sumHeaderCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      sheet.getRow(sumRowIdx).height = 24;

      const sumTableHeaders = ["Business Type", "Policy Count", "Total Premium", "Commission / Revenue", "Paid Revenue", "Pending Revenue"];
      const sumThRow = sheet.getRow(sumRowIdx + 1);
      sumThRow.height = 22;
      sumTableHeaders.forEach((h, i) => {
        const cell = sumThRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, size: 9.5, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
        cell.alignment = { horizontal: i === 0 ? "left" : "right", vertical: "middle" };
      });

      const sumDataRows = [
        ["Fresh Business", advReportData.summary.freshPolicies, advReportData.summary.freshPremium, advReportData.summary.freshRevenue, "—", "—"],
        ["Port Business", advReportData.summary.portPolicies, advReportData.summary.portPremium, advReportData.summary.portRevenue, "—", "—"],
        ["Total New Business (Fresh + Port)", advReportData.summary.totalNewBusinessPolicies, advReportData.summary.totalNewBusinessPremium, advReportData.summary.totalNewBusinessRevenue, "—", "—"],
        ["Renewal Business", advReportData.summary.renewalPolicies, advReportData.summary.renewalPremium, advReportData.summary.renewalRevenue, "—", "—"],
        ["OVERALL TOTAL", advReportData.summary.totalPolicies, advReportData.summary.totalPremium, advReportData.summary.totalRevenue, advReportData.summary.paidRevenue, advReportData.summary.pendingRevenue]
      ];

      sumDataRows.forEach((r, idx) => {
        const row = sheet.getRow(sumRowIdx + 2 + idx);
        row.height = 20;
        const isTotal = idx === sumDataRows.length - 1;
        r.forEach((val, cIdx) => {
          const cell = row.getCell(cIdx + 1);
          cell.value = val;
          cell.font = { bold: isTotal || cIdx === 0, size: 9.5, color: { argb: isTotal ? "FF660000" : "FF0F172A" } };
          if (typeof val === "number" && cIdx >= 2) {
            cell.numFmt = "₹#,##0";
          }
          cell.alignment = { horizontal: cIdx === 0 ? "left" : "right", vertical: "middle" };
          if (isTotal) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDFBFBA" } };
          }
        });
      });

      // Section 3: POLICY-WISE DETAILS TABLE
      const polHeaderIdx = sumRowIdx + 9;
      sheet.mergeCells(`A${polHeaderIdx}:K${polHeaderIdx}`);
      const polHeaderCell = sheet.getCell(`A${polHeaderIdx}`);
      polHeaderCell.value = `3. POLICY-WISE DETAILS (${advReportData.policies.length} Policies)`;
      polHeaderCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      polHeaderCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      polHeaderCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      sheet.getRow(polHeaderIdx).height = 24;

      const polTableHeaders = [
        "S.No", "Policy Number", "Customer Name", "Insurance Company", "Business Type",
        "Subtype", "Policy Date", "Premium", "Commission %", "Commission / Revenue", "Status"
      ];

      const polThRow = sheet.getRow(polHeaderIdx + 1);
      polThRow.height = 24;
      polTableHeaders.forEach((h, i) => {
        const cell = polThRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, size: 9.5, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF660000" } };
        cell.alignment = { horizontal: ["Premium", "Commission %", "Commission / Revenue"].includes(h) ? "right" : "left", vertical: "middle" };
      });

      advReportData.policies.forEach((p: any, idx) => {
        const row = sheet.getRow(polHeaderIdx + 2 + idx);
        row.height = 20;
        const comm = Number(p.expectedCommission || 0) || Math.round((Number(p.premiumAmount || 0) * Number(p.appliedPayoutPercentage || 0)) / 100);

        row.getCell(1).value = idx + 1;
        row.getCell(2).value = p.policyNumber || "—";
        row.getCell(3).value = p.customerName || "—";
        row.getCell(4).value = p.companyName || "—";
        row.getCell(5).value = p.businessType || "New Business";
        row.getCell(6).value = p.businessSubtype || (p.portabilityDetails?.previousInsuranceCompany ? "Port" : "Fresh");
        row.getCell(7).value = p.businessLoginDate || p.startDate || (p.createdAt ? p.createdAt.split("T")[0] : "—");
        row.getCell(8).value = Number(p.premiumAmount || 0);
        row.getCell(8).numFmt = "₹#,##0";
        row.getCell(9).value = `${Number(p.appliedPayoutPercentage || 0)}%`;
        row.getCell(10).value = comm;
        row.getCell(10).numFmt = "₹#,##0";
        row.getCell(11).value = p.commissionStatus || "Pending";

        row.eachCell((cell, cNum) => {
          cell.font = { size: 9, color: { argb: "FF1E293B" } };
          if ([1, 2, 7, 11].includes(cNum)) cell.alignment = { horizontal: "center", vertical: "middle" };
          else if ([8, 9, 10].includes(cNum)) cell.alignment = { horizontal: "right", vertical: "middle" };
          else cell.alignment = { horizontal: "left", vertical: "middle" };
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${advReportData.advisor.advisorCode}_Business_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Excel export failed: " + err.message);
    }
  };

  // ── EXPORT TO CSV ──
  const handleExportAdvisorCSV = () => {
    if (!viewingAdvisor || !advReportData) return;
    try {
      const escape = (val: any) => `"${String(val ?? "").replace(/"/g, '""')}"`;
      const lines: string[] = [];

      lines.push(["POLICY MASTER — ADVISOR BUSINESS REPORT"].join(","));
      lines.push([`Advisor: ${advReportData.advisor.fullName} (${advReportData.advisor.advisorCode})`, `Company: ${advReportData.advisor.insuranceCompanyName || "—"}`, `Branch: ${advReportData.advisor.branchName || "—"}`].map(escape).join(","));
      lines.push([`BM: ${advReportData.advisor.branchManagerName || "Unassigned"}`, `AM: ${advReportData.advisor.areaManagerName || "Unassigned"}`, `ZM: ${advReportData.advisor.zonalManagerName || "Unassigned"}`].map(escape).join(","));
      lines.push([`Virtual Manager: ${advReportData.advisor.virtualManagerName || "Unassigned"}`, `Recruiter: ${advReportData.advisor.recruiterName || "—"}`, `Status: ${advReportData.advisor.status}`].map(escape).join(","));
      lines.push("");

      lines.push(["BUSINESS SUMMARY"].join(","));
      lines.push(["Business Type", "Policy Count", "Total Premium", "Commission / Revenue", "Paid Revenue", "Pending Revenue"].map(escape).join(","));
      lines.push(["Fresh Business", advReportData.summary.freshPolicies, advReportData.summary.freshPremium, advReportData.summary.freshRevenue, "", ""].map(escape).join(","));
      lines.push(["Port Business", advReportData.summary.portPolicies, advReportData.summary.portPremium, advReportData.summary.portRevenue, "", ""].map(escape).join(","));
      lines.push(["Total New Business (Fresh + Port)", advReportData.summary.totalNewBusinessPolicies, advReportData.summary.totalNewBusinessPremium, advReportData.summary.totalNewBusinessRevenue, "", ""].map(escape).join(","));
      lines.push(["Renewal Business", advReportData.summary.renewalPolicies, advReportData.summary.renewalPremium, advReportData.summary.renewalRevenue, "", ""].map(escape).join(","));
      lines.push(["OVERALL TOTAL", advReportData.summary.totalPolicies, advReportData.summary.totalPremium, advReportData.summary.totalRevenue, advReportData.summary.paidRevenue, advReportData.summary.pendingRevenue].map(escape).join(","));
      lines.push("");

      lines.push(["POLICY DETAILS"].join(","));
      lines.push([
        "S.No", "Policy Number", "Customer Name", "Insurance Company", "Business Type",
        "Subtype", "Policy Date", "Premium", "Commission %", "Commission / Revenue", "Commission Status"
      ].map(escape).join(","));

      advReportData.policies.forEach((p: any, idx) => {
        const comm = Number(p.expectedCommission || 0) || Math.round((Number(p.premiumAmount || 0) * Number(p.appliedPayoutPercentage || 0)) / 100);
        lines.push([
          idx + 1,
          p.policyNumber || "—",
          p.customerName || "—",
          p.companyName || "—",
          p.businessType || "New Business",
          p.businessSubtype || (p.portabilityDetails?.previousInsuranceCompany ? "Port" : "Fresh"),
          p.businessLoginDate || p.startDate || (p.createdAt ? p.createdAt.split("T")[0] : "—"),
          p.premiumAmount || 0,
          `${p.appliedPayoutPercentage || 0}%`,
          comm,
          p.commissionStatus || "Pending"
        ].map(escape).join(","));
      });

      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${advReportData.advisor.advisorCode}_Business_Report_${new Date().toISOString().split("T")[0]}.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("CSV export failed: " + err.message);
    }
  };

  // ── EXPORT TO PDF ──
  const handleExportAdvisorPDF = () => {
    if (!viewingAdvisor || !advReportData) return;
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const adv = advReportData.advisor;
      const sum = advReportData.summary;

      // Header Banner
      doc.setFillColor(102, 0, 0); // #660000
      doc.rect(0, 0, 210, 24, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("POLICY MASTER", 14, 11);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Advisor Business & Performance Report", 14, 18);

      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 155, 14);

      // Advisor Profile Box
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("1. ADVISOR DETAILS", 14, 32);

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 35, 182, 34, 2, 2, "FD");

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text(`Advisor Name:`, 18, 41);
      doc.setFont("helvetica", "normal");
      doc.text(`${adv.fullName} (${adv.advisorCode})`, 48, 41);

      doc.setFont("helvetica", "bold");
      doc.text(`Insurance Co:`, 110, 41);
      doc.setFont("helvetica", "normal");
      doc.text(`${adv.insuranceCompanyName || "—"}`, 136, 41);

      doc.setFont("helvetica", "bold");
      doc.text(`Branch & City:`, 18, 47);
      doc.setFont("helvetica", "normal");
      doc.text(`${adv.branchName || "—"} (${adv.branchCity || "—"})`, 48, 47);

      doc.setFont("helvetica", "bold");
      doc.text(`Mobile:`, 110, 47);
      doc.setFont("helvetica", "normal");
      doc.text(`${adv.mobileNumber || "—"}`, 136, 47);

      doc.setFont("helvetica", "bold");
      doc.text(`BM / AM / ZM:`, 18, 53);
      doc.setFont("helvetica", "normal");
      doc.text(`${adv.branchManagerName || "—"} / ${adv.areaManagerName || "—"} / ${adv.zonalManagerName || "—"}`, 48, 53);

      doc.setFont("helvetica", "bold");
      doc.text(`Virtual Mgr:`, 18, 59);
      doc.setFont("helvetica", "normal");
      doc.text(`${adv.virtualManagerName || "Unassigned"} | Recruiter: ${adv.recruiterName || "—"}`, 48, 59);

      // Business Summary Box
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("2. BUSINESS SUMMARY", 14, 76);

      doc.setFillColor(102, 0, 0);
      doc.rect(14, 79, 182, 6, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text("Business Type", 18, 83.5);
      doc.text("Policies", 75, 83.5);
      doc.text("Total Premium", 105, 83.5);
      doc.text("Revenue / Comm", 140, 83.5);
      doc.text("Status", 175, 83.5);

      const summaryLines = [
        { label: "Fresh Business", count: sum.freshPolicies, prem: sum.freshPremium, comm: sum.freshRevenue, stat: "—" },
        { label: "Port Business", count: sum.portPolicies, prem: sum.portPremium, comm: sum.portRevenue, stat: "—" },
        { label: "Total New Business", count: sum.totalNewBusinessPolicies, prem: sum.totalNewBusinessPremium, comm: sum.totalNewBusinessRevenue, stat: "—" },
        { label: "Renewal Business", count: sum.renewalPolicies, prem: sum.renewalPremium, comm: sum.renewalRevenue, stat: "—" },
        { label: "OVERALL TOTAL", count: sum.totalPolicies, prem: sum.totalPremium, comm: sum.totalRevenue, stat: `Paid: ₹${sum.paidRevenue.toLocaleString("en-IN")}` }
      ];

      let yPos = 85;
      summaryLines.forEach((sl, idx) => {
        const isTotal = idx === summaryLines.length - 1;
        if (isTotal) {
          doc.setFillColor(223, 191, 186); // #DFBFBA
          doc.rect(14, yPos, 182, 6, "F");
          doc.setTextColor(102, 0, 0);
          doc.setFont("helvetica", "bold");
        } else {
          doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
          doc.rect(14, yPos, 182, 5.5, "F");
          doc.setTextColor(30, 41, 59);
          doc.setFont("helvetica", "normal");
        }

        doc.setFontSize(7.5);
        doc.text(sl.label, 18, yPos + 4);
        doc.text(String(sl.count), 78, yPos + 4);
        doc.text(`₹${sl.prem.toLocaleString("en-IN")}`, 105, yPos + 4);
        doc.text(`₹${sl.comm.toLocaleString("en-IN")}`, 140, yPos + 4);
        doc.text(sl.stat, 175, yPos + 4);

        yPos += isTotal ? 7 : 5.5;
      });

      // Policy Ledger Section Header
      yPos += 4;
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`3. POLICY LEDGER (${advReportData.policies.length} Policies)`, 14, yPos);

      yPos += 3;
      doc.setFillColor(30, 41, 59);
      doc.rect(14, yPos, 182, 6, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("#", 16, yPos + 4);
      doc.text("Policy No", 24, yPos + 4);
      doc.text("Customer", 58, yPos + 4);
      doc.text("Company", 95, yPos + 4);
      doc.text("Type", 130, yPos + 4);
      doc.text("Premium", 155, yPos + 4);
      doc.text("Comm", 175, yPos + 4);

      yPos += 6;
      advReportData.policies.slice(0, 25).forEach((p: any, idx) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 15;
        }

        doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
        doc.rect(14, yPos, 182, 5, "F");

        const comm = Number(p.expectedCommission || 0) || Math.round((Number(p.premiumAmount || 0) * Number(p.appliedPayoutPercentage || 0)) / 100);

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.text(String(idx + 1), 16, yPos + 3.5);
        doc.text(String(p.policyNumber || "—").substring(0, 15), 24, yPos + 3.5);
        doc.text(String(p.customerName || "—").substring(0, 18), 58, yPos + 3.5);
        doc.text(String(p.companyName || "—").substring(0, 16), 95, yPos + 3.5);
        doc.text(String(p.businessSubtype || p.businessType || "Fresh"), 130, yPos + 3.5);
        doc.text(`₹${Number(p.premiumAmount || 0).toLocaleString("en-IN")}`, 155, yPos + 3.5);
        doc.text(`₹${comm.toLocaleString("en-IN")}`, 175, yPos + 3.5);

        yPos += 5;
      });

      doc.save(`${adv.advisorCode}_Business_Report_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err: any) {
      alert("PDF export failed: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#DFBFBA]/25 text-[#660000] rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Advisor Master & Partner Management</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage partner advisor network, branch mappings, manager hierarchies, recruiter tracking & KYC documents
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAdvisors}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Refresh Advisor Directory"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin text-[#660000]" : ""}`} />
          </button>

          {canCreate && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#660000] hover:bg-[#500000] text-white rounded-lg text-sm font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register Advisor</span>
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Advisors</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{kpis.totalAdvisors}</div>
          <div className="text-xs text-slate-400 mt-1">Registered Partner Network</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Active Advisors</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{kpis.activeAdvisors}</div>
          <div className="text-xs text-slate-400 mt-1">Available for Policy Booking</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">Inactive Advisors</span>
            <XCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{kpis.inactiveAdvisors}</div>
          <div className="text-xs text-slate-400 mt-1">Paused / Suspended</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#660000]">Insurance Companies</span>
            <Building2 className="w-4 h-4 text-[#660000]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{kpis.companiesCovered}</div>
          <div className="text-xs text-slate-400 mt-1">Companies with Advisor Network</div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Multi-Field Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Name, Code, Phone, PAN, Company, Branch, Virtual Manager, Recruiter..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#660000] focus:ring-1 focus:ring-[#660000]/20 focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Reset Filters Button */}
          {(search || selectedCompany !== "All" || selectedCity || selectedAdvisorType !== "All" || selectedVirtualManager !== "All" || selectedRecruiter !== "All" || selectedStatus !== "All") && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs font-semibold text-[#660000] bg-[#DFBFBA]/25 hover:bg-[#DFBFBA]/45 border border-[#DFBFBA]/80 rounded-lg flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-1">
          {/* Insurance Company */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Insurance Company</label>
            <select
              value={selectedCompany}
              onChange={e => { setSelectedCompany(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#660000] focus:bg-white cursor-pointer"
            >
              <option value="All">All Companies</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Advisor Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Advisor Type</label>
            <select
              value={selectedAdvisorType}
              onChange={e => { setSelectedAdvisorType(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#660000] focus:bg-white cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="Individual Advisor">Individual Advisor</option>
              <option value="Corporate Advisor">Corporate Advisor</option>
              <option value="Agency">Agency</option>
              <option value="Broker">Broker</option>
            </select>
          </div>

          {/* Virtual Manager Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Virtual Manager</label>
            <select
              value={selectedVirtualManager}
              onChange={e => { setSelectedVirtualManager(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#660000] focus:bg-white cursor-pointer"
            >
              <option value="All">All Virtual Managers</option>
              {filterOptions.virtualManagers.map((vm, idx) => (
                <option key={idx} value={vm}>{vm}</option>
              ))}
            </select>
          </div>

          {/* Recruiter Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Recruiter</label>
            <select
              value={selectedRecruiter}
              onChange={e => { setSelectedRecruiter(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#660000] focus:bg-white cursor-pointer"
            >
              <option value="All">All Recruiters</option>
              {filterOptions.recruiters.map((rec, idx) => (
                <option key={idx} value={rec}>{rec}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={e => { setSelectedStatus(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#660000] focus:bg-white cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Branch City</label>
            <input
              type="text"
              placeholder="e.g. Mumbai, Delhi"
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#660000] focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* ── Advisor Table Directory ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Registered Advisors</h2>
            <span className="text-xs px-2 py-0.5 bg-[#DFBFBA]/25 text-[#660000] font-semibold rounded-full border border-[#DFBFBA]/60">
              {totalCount} Total
            </span>
          </div>

          {/* Page size dropdown */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Show</span>
            <select
              value={limit}
              onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>per page</span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <RotateCcw className="w-7 h-7 animate-spin mb-2 text-[#660000]" />
            <p className="text-xs">Loading advisor directory...</p>
          </div>
        ) : error ? (
          <div className="py-16 flex flex-col items-center justify-center text-rose-500">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p className="text-sm font-medium">{error}</p>
            <button
              onClick={fetchAdvisors}
              className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : advisors.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Users className="w-10 h-10 stroke-1 mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-700">No advisors found</p>
            <p className="text-xs text-slate-400 mt-0.5">Try adjusting your filters or search criteria</p>
            {canCreate && (
              <button
                onClick={handleOpenCreate}
                className="mt-4 px-3.5 py-1.5 bg-[#660000] hover:bg-[#500000] text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                + Register First Advisor
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3.5 w-12 text-center">#</th>
                  <th className="py-3 px-3.5">Advisor Code</th>
                  <th className="py-3 px-3.5">Advisor Name</th>
                  <th className="py-3 px-3.5">Insurance Company</th>
                  <th className="py-3 px-3.5">Branch & City</th>
                  <th className="py-3 px-3.5">Virtual Manager</th>
                  <th className="py-3 px-3.5">Recruiter</th>
                  <th className="py-3 px-3.5">Type</th>
                  <th className="py-3 px-3.5">Mobile</th>
                  <th className="py-3 px-3.5 text-center">Docs</th>
                  <th className="py-3 px-3.5 text-center">Policies</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {advisors.map((adv, idx) => {
                  const sNo = (page - 1) * limit + idx + 1;
                  return (
                    <tr key={adv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">{sNo}</td>

                      {/* Code */}
                      <td className="py-3 px-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          {adv.advisorCode || "N/A"}
                        </span>
                      </td>

                      {/* Name & Avatar */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#DFBFBA]/30 border border-[#DFBFBA] text-[#660000] flex items-center justify-center font-bold text-xs shrink-0">
                            {adv.personalDetails?.fullName?.charAt(0)?.toUpperCase() || "A"}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-xs hover:text-[#660000] transition-colors cursor-pointer" onClick={() => handleOpenViewProfile(adv)}>
                              {adv.personalDetails?.fullName || "Unnamed Advisor"}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {adv.businessDetails?.specialization || "General / Health"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Insurance Company */}
                      <td className="py-3 px-3.5 font-medium text-slate-800">
                        {adv.insuranceDetails?.insuranceCompanyName || "—"}
                      </td>

                      {/* Branch & City */}
                      <td className="py-3 px-3.5 text-slate-600">
                        <div>{adv.branchDetails?.branchName || "—"}</div>
                        {adv.branchDetails?.branchCity && (
                          <div className="text-[10px] text-slate-400">{adv.branchDetails?.branchCity}</div>
                        )}
                      </td>

                      {/* Virtual Manager */}
                      <td className="py-3 px-3.5 text-slate-700">
                        {adv.internalMapping?.virtualManagerName ? (
                          <span className="font-medium text-slate-800">{adv.internalMapping.virtualManagerName}</span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Recruiter */}
                      <td className="py-3 px-3.5 text-slate-700">
                        {adv.internalMapping?.recruiterName ? (
                          <span>{adv.internalMapping.recruiterName}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Type */}
                      <td className="py-3 px-3.5 text-slate-600">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                          {adv.businessDetails?.advisorType || "Individual"}
                        </span>
                      </td>

                      {/* Mobile */}
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-700">
                        {adv.contactDetails?.mobileNumber || "—"}
                      </td>

                      {/* Dedicated Document Count / Quick Manager Button */}
                      <td className="py-3 px-3.5 text-center">
                        <button
                          onClick={() => handleOpenDocHub(adv)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                          title="Open Dedicated Document Manager"
                        >
                          <FileText className="w-3 h-3 text-indigo-600" />
                          <span>{adv.documents?.length || 0} Docs</span>
                        </button>
                      </td>

                      {/* Linked Policies Count */}
                      <td className="py-3 px-3.5 text-center">
                        <button
                          onClick={() => handleOpenViewProfile(adv, "policies")}
                          className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#DFBFBA]/25 text-[#660000] border border-[#DFBFBA]/80 hover:bg-[#DFBFBA]/50 transition-colors cursor-pointer"
                          title="View Advisor Policies"
                        >
                          {adv.linkedPoliciesCount || 0}
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 text-center">
                        <button
                          onClick={() => canEdit && handleToggleStatus(adv)}
                          disabled={!canEdit}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
                            adv.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                          } ${!canEdit ? "cursor-default opacity-80" : "cursor-pointer"}`}
                          title={canEdit ? "Click to toggle status" : undefined}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${adv.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400"}`} />
                          <span>{adv.status === "ACTIVE" ? "Active" : "Inactive"}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right pr-4 space-x-1 whitespace-nowrap">
                        {/* Business Analytics Quick Button */}
                        <button
                          onClick={() => handleOpenViewProfile(adv, "business")}
                          className="p-1 text-[#660000] hover:bg-[#DFBFBA]/30 rounded transition-colors cursor-pointer"
                          title="Advisor Business Overview & Reports"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Quick Document Hub Button */}
                        <button
                          onClick={() => handleOpenDocHub(adv)}
                          className="p-1 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                          title="Manage Advisor Documents"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenViewProfile(adv, "profile")}
                          className="p-1 text-slate-500 hover:text-[#660000] hover:bg-[#DFBFBA]/20 rounded transition-colors cursor-pointer"
                          title="View Complete Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {canEdit && (
                          <button
                            onClick={() => handleOpenEdit(adv)}
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Edit Advisor"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => handleDeleteAdvisor(adv)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Delete Advisor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Footer ── */}
        {!loading && totalPages > 1 && (
          <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing {Math.min((page - 1) * limit + 1, totalCount)} to {Math.min(page * limit, totalCount)} of {totalCount} advisors
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-1 rounded border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-medium text-slate-800">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="p-1 rounded border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          ── DEDICATED STANDALONE DOCUMENT UPLOAD & MANAGEMENT HUB MODAL ──
      ════════════════════════════════════════════════════════════════════ */}
      {isDocHubOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#660000] text-white rounded-xl shadow-2xs">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Advisor Documents & KYC Management Hub
                  </h3>
                  <p className="text-xs text-slate-500">
                    Upload, view, download and verify PAN, Aadhaar, License, Agreements & other documents
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDocHubOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Select Advisor Dropdown */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="w-full sm:w-1/2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Select Target Advisor
                  </label>
                  <select
                    value={docHubAdvisor?.id || ""}
                    onChange={async (e) => {
                      const found = advisors.find(a => a.id === e.target.value);
                      if (found) {
                        try {
                          const full = await api.getAdvisorById(found.id);
                          setDocHubAdvisor(full);
                        } catch {
                          setDocHubAdvisor(found);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#660000]"
                  >
                    {advisors.map(adv => (
                      <option key={adv.id} value={adv.id}>
                        {adv.personalDetails?.fullName} ({adv.advisorCode}) • {adv.insuranceDetails?.insuranceCompanyName}
                      </option>
                    ))}
                  </select>
                </div>

                {docHubAdvisor && (
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-md font-bold text-slate-800">
                      Code: {docHubAdvisor.advisorCode}
                    </span>
                    <span className="px-2.5 py-1 bg-[#DFBFBA]/30 border border-[#DFBFBA] text-[#660000] rounded-md font-bold">
                      {docHubAdvisor.documents?.length || 0} Attached Docs
                    </span>
                  </div>
                )}
              </div>

              {docHubError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{docHubError}</span>
                </div>
              )}

              {docHubSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{docHubSuccess}</span>
                </div>
              )}

              {/* Dedicated Upload Area */}
              <div className="bg-white border-2 border-dashed border-[#DFBFBA] rounded-2xl p-5 space-y-4">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FilePlus2 className="w-4 h-4 text-[#660000]" />
                  <span>Upload Any New Document</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Document Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Document Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={docHubSelectedType}
                      onChange={e => setDocHubSelectedType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-[#660000] cursor-pointer"
                    >
                      {DOCUMENT_TYPES.map((t, idx) => (
                        <option key={idx} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Document Title */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Document Custom Title <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2026 Direct Contract / Agreement"
                      value={docHubCustomTitle}
                      onChange={e => setDocHubCustomTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#660000]"
                    />
                  </div>
                </div>

                {/* Upload Action Button */}
                <div>
                  <label className="cursor-pointer w-full bg-[#DFBFBA]/25 hover:bg-[#DFBFBA]/40 border border-[#DFBFBA] text-[#660000] rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-2xs">
                    <UploadCloud className="w-6 h-6 text-[#660000]" />
                    <span>{docHubUploading ? "Uploading to Server & Atlas..." : `Choose Files to Upload (${docHubSelectedType})`}</span>
                    <span className="text-[10px] text-slate-500 font-normal">Supports PDF, JPG, PNG, DOCX, XLSX (Multiple files allowed)</span>
                    <input
                      type="file"
                      multiple
                      onChange={handleDocHubFileUpload}
                      disabled={docHubUploading || !docHubAdvisor}
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xlsx"
                    />
                  </label>
                </div>
              </div>

              {/* Uploaded Documents List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#660000]" />
                    <span>Stored & Verified Documents ({docHubAdvisor?.documents?.length || 0})</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">MongoDB Atlas Persistent Files</span>
                </div>

                {(!docHubAdvisor?.documents || docHubAdvisor.documents.length === 0) ? (
                  <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    No documents uploaded for this advisor yet. Use the upload box above to attach documents.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {docHubAdvisor.documents.map((doc, idx) => (
                      <div
                        key={doc.documentId || idx}
                        className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-2xs hover:border-[#DFBFBA] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 bg-[#DFBFBA]/30 text-[#660000] rounded-xl shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate" title={doc.documentName}>
                              {doc.documentName}
                            </div>
                            <div className="text-[10px] font-semibold text-[#660000] mt-0.5">
                              {doc.documentType}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              {doc.size ? <span>{Math.round(doc.size / 1024)} KB</span> : null}
                              {doc.uploadedAt ? <span>• {new Date(doc.uploadedAt).toLocaleDateString()}</span> : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {doc.path && (
                            <>
                              <a
                                href={doc.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 text-xs font-semibold text-[#660000] bg-[#DFBFBA]/25 hover:bg-[#DFBFBA]/45 rounded-lg flex items-center gap-1 transition-colors"
                                title="Open & View Document in New Tab"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>View</span>
                              </a>
                              <a
                                href={doc.path}
                                download
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Download Document"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDocHubDeleteDoc(doc.documentId)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsDocHubOpen(false)}
                className="px-5 py-2 bg-[#660000] hover:bg-[#500000] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Single Unified Add / Edit Advisor Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#660000] text-white rounded-xl shadow-2xs">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {modalMode === "create" ? "Register New Advisor" : "Edit Advisor Profile"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {modalMode === "create"
                      ? "Complete registration form: Personal, Identity, Insurance, Management, Bank, Mapping & Documents"
                      : `Updating ${formState.fullName} (${formState.advisorCode})`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Single Continuous Scrollable Form */}
            <form onSubmit={handleSaveAdvisor} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* ── SECTION 01: Personal Information ── */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4.5 space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-200/70 pb-2">
                  <span className="px-2 py-0.5 rounded bg-[#DFBFBA]/30 text-[#660000] border border-[#DFBFBA]/80 text-[10px] font-bold uppercase tracking-wider">
                    01
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Personal Information</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Patel"
                      value={formState.fullName}
                      onChange={e => setFormState(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000] focus:ring-1 focus:ring-[#660000]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Advisor Code <span className="text-[10px] text-slate-400 font-normal">(Auto if blank)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ADV-0012"
                      value={formState.advisorCode}
                      onChange={e => setFormState(prev => ({ ...prev, advisorCode: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 uppercase focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Father / Spouse Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Kishore Patel"
                      value={formState.fatherOrSpouseName}
                      onChange={e => setFormState(prev => ({ ...prev, fatherOrSpouseName: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formState.dateOfBirth}
                      onChange={e => setFormState(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                    <select
                      value={formState.gender}
                      onChange={e => setFormState(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000] cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Marital Status</label>
                    <select
                      value={formState.maritalStatus}
                      onChange={e => setFormState(prev => ({ ...prev, maritalStatus: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000] cursor-pointer"
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ── SECTION 02: Identity & Regulatory License ── */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4.5 space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-200/70 pb-2">
                  <span className="px-2 py-0.5 rounded bg-[#DFBFBA]/30 text-[#660000] border border-[#DFBFBA]/80 text-[10px] font-bold uppercase tracking-wider">
                    02
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Identity & Regulatory License</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Card Number</label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. ABCDE1234F"
                      value={formState.panNumber}
                      onChange={e => setFormState(prev => ({ ...prev, panNumber: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono uppercase font-bold text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Aadhaar Card Number</label>
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="e.g. 123456789012"
                      value={formState.aadhaarNumber}
                      onChange={e => setFormState(prev => ({ ...prev, aadhaarNumber: e.target.value.replace(/\D/g, "") }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">License / Registration Number</label>
                    <input
                      type="text"
                      placeholder="e.g. LIC-ADV-2024-889"
                      value={formState.advisorLicenseNumber}
                      onChange={e => setFormState(prev => ({ ...prev, advisorLicenseNumber: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">License Expiry Date</label>
                    <input
                      type="date"
                      value={formState.licenseExpiryDate}
                      onChange={e => setFormState(prev => ({ ...prev, licenseExpiryDate: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>
                </div>
              </div>

              {/* ── SECTION 03: Contact Information ── */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4.5 space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-200/70 pb-2">
                  <span className="px-2 py-0.5 rounded bg-[#DFBFBA]/30 text-[#660000] border border-[#DFBFBA]/80 text-[10px] font-bold uppercase tracking-wider">
                    03
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Contact Details</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Primary Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      value={formState.mobileNumber}
                      onChange={e => setFormState(prev => ({ ...prev, mobileNumber: e.target.value.replace(/\D/g, "") }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Alternate Mobile Number</label>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="e.g. 9876500000"
                      value={formState.alternateMobileNumber}
                      onChange={e => setFormState(prev => ({ ...prev, alternateMobileNumber: e.target.value.replace(/\D/g, "") }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. ramesh.patel@example.com"
                      value={formState.email}
                      onChange={e => setFormState(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Number</label>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      value={formState.whatsappNumber}
                      onChange={e => setFormState(prev => ({ ...prev, whatsappNumber: e.target.value.replace(/\D/g, "") }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>
                </div>
              </div>

              {/* ── SECTION 04: Insurance Company & Branch ── */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4.5 space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-200/70 pb-2">
                  <span className="px-2 py-0.5 rounded bg-[#DFBFBA]/30 text-[#660000] border border-[#DFBFBA]/80 text-[10px] font-bold uppercase tracking-wider">
                    04
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Insurance Company & Associated Branch</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Insurance Company <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={formState.insuranceCompanyId}
                      onChange={e => {
                        const selected = companies.find(c => c.id === e.target.value);
                        setFormState(prev => ({
                          ...prev,
                          insuranceCompanyId: e.target.value,
                          insuranceCompanyName: selected ? selected.name : ""
                        }));
                        if (selected && formState.branchName) {
                          handleLookupBranchPersonnel(selected.id, formState.branchName);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-[#660000] cursor-pointer"
                    >
                      <option value="">Select Insurance Company</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Branch Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mumbai Central Branch"
                      value={formState.branchName}
                      onChange={e => setFormState(prev => ({ ...prev, branchName: e.target.value }))}
                      onBlur={e => {
                        if (formState.insuranceCompanyId && e.target.value) {
                          handleLookupBranchPersonnel(formState.insuranceCompanyId, e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Code</label>
                    <input
                      type="text"
                      placeholder="e.g. BOM-041"
                      value={formState.branchCode}
                      onChange={e => setFormState(prev => ({ ...prev, branchCode: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Branch City</label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai"
                      value={formState.branchCity}
                      onChange={e => setFormState(prev => ({ ...prev, branchCity: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Branch State</label>
                    <input
                      type="text"
                      placeholder="e.g. Maharashtra"
                      value={formState.branchState}
                      onChange={e => setFormState(prev => ({ ...prev, branchState: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Pincode</label>
                    <input
                      type="text"
                      placeholder="e.g. 400001"
                      value={formState.branchPincode}
                      onChange={e => setFormState(prev => ({ ...prev, branchPincode: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>
                </div>
              </div>

              {/* ── SECTION 05: Insurance Company Management (BM, AM, ZM) ── */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4.5 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#DFBFBA]/30 text-[#660000] border border-[#DFBFBA]/80 text-[10px] font-bold uppercase tracking-wider">
                      05
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Insurance Company Management (BM, AM, ZM)
                    </h4>
                  </div>
                  {formState.insuranceCompanyId && formState.branchName && (
                    <button
                      type="button"
                      onClick={() => handleLookupBranchPersonnel(formState.insuranceCompanyId, formState.branchName)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#660000] bg-[#DFBFBA]/30 hover:bg-[#DFBFBA]/50 rounded-lg border border-[#DFBFBA] transition-colors cursor-pointer"
                    >
                      Auto-Fill Existing Branch Managers
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Branch Manager */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                    <div className="text-xs font-bold text-[#660000] flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>Branch Manager (BM)</span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Manager Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Anand Sharma"
                        value={formState.branchManagerName}
                        onChange={e => setFormState(prev => ({ ...prev, branchManagerName: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#660000]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Mobile Number</label>
                      <input
                        type="tel"
                        placeholder="e.g. 9811002233"
                        value={formState.branchManagerMobile}
                        onChange={e => setFormState(prev => ({ ...prev, branchManagerMobile: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-[#660000]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Email Address</label>
                      <input
                        type="email"
                        placeholder="e.g. anand.sharma@company.com"
                        value={formState.branchManagerEmail}
                        onChange={e => setFormState(prev => ({ ...prev, branchManagerEmail: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#660000]"
                      />
                    </div>
                  </div>

                  {/* Area Manager */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                    <div className="text-xs font-bold text-[#660000] flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>Area Manager (AM)</span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Manager Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Vikram Verma"
                        value={formState.areaManagerName}
                        onChange={e => setFormState(prev => ({ ...prev, areaManagerName: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#660000]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Mobile Number</label>
                      <input
                        type="tel"
                        placeholder="e.g. 9822003344"
                        value={formState.areaManagerMobile}
                        onChange={e => setFormState(prev => ({ ...prev, areaManagerMobile: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-[#660000]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Email Address</label>
                      <input
                        type="email"
                        placeholder="e.g. vikram.verma@company.com"
                        value={formState.areaManagerEmail}
                        onChange={e => setFormState(prev => ({ ...prev, areaManagerEmail: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#660000]"
                      />
                    </div>
                  </div>

                  {/* Zonal Manager */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                    <div className="text-xs font-bold text-[#660000] flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>Zonal Manager (ZM)</span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Manager Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Rajesh Singhania"
                        value={formState.zonalManagerName}
                        onChange={e => setFormState(prev => ({ ...prev, zonalManagerName: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#660000]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Mobile Number</label>
                      <input
                        type="tel"
                        placeholder="e.g. 9833004455"
                        value={formState.zonalManagerMobile}
                        onChange={e => setFormState(prev => ({ ...prev, zonalManagerMobile: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-[#660000]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Email Address</label>
                      <input
                        type="email"
                        placeholder="e.g. rajesh.singhania@company.com"
                        value={formState.zonalManagerEmail}
                        onChange={e => setFormState(prev => ({ ...prev, zonalManagerEmail: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#660000]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SECTION 06: Business Profile ── */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4.5 space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-200/70 pb-2">
                  <span className="px-2 py-0.5 rounded bg-[#DFBFBA]/30 text-[#660000] border border-[#DFBFBA]/80 text-[10px] font-bold uppercase tracking-wider">
                    06
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Business Profile & Experience</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Advisor Type</label>
                    <select
                      value={formState.advisorType}
                      onChange={e => setFormState(prev => ({ ...prev, advisorType: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000] cursor-pointer"
                    >
                      <option value="Individual Advisor">Individual Advisor</option>
                      <option value="Corporate Advisor">Corporate Advisor</option>
                      <option value="Agency">Agency</option>
                      <option value="Broker">Broker</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Specialization</label>
                    <input
                      type="text"
                      placeholder="e.g. Health / Motor / Life"
                      value={formState.specialization}
                      onChange={e => setFormState(prev => ({ ...prev, specialization: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Years of Experience</label>
                    <input
                      type="number"
                      min={0}
                      value={formState.yearsOfExperience}
                      onChange={e => setFormState(prev => ({ ...prev, yearsOfExperience: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Joining</label>
                    <input
                      type="date"
                      value={formState.dateOfJoining}
                      onChange={e => setFormState(prev => ({ ...prev, dateOfJoining: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>
                </div>
              </div>

              {/* ── SECTION 07: Location & Address ── */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4.5 space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-200/70 pb-2">
                  <span className="px-2 py-0.5 rounded bg-[#DFBFBA]/30 text-[#660000] border border-[#DFBFBA]/80 text-[10px] font-bold uppercase tracking-wider">
                    07
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Location & Address</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Address Line 1</label>
                    <input
                      type="text"
                      placeholder="Flat / Building / Street Address"
                      value={formState.addressLine1}
                      onChange={e => setFormState(prev => ({ ...prev, addressLine1: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai"
                      value={formState.city}
                      onChange={e => setFormState(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      placeholder="e.g. Maharashtra"
                      value={formState.state}
                      onChange={e => setFormState(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>
                </div>
              </div>

              {/* ── SECTION 08: Bank Details for Payouts ── */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4.5 space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-200/70 pb-2">
                  <span className="px-2 py-0.5 rounded bg-[#DFBFBA]/30 text-[#660000] border border-[#DFBFBA]/80 text-[10px] font-bold uppercase tracking-wider">
                    08
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Bank Details for Commission Payouts</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      placeholder="As per bank records"
                      value={formState.accountHolderName}
                      onChange={e => setFormState(prev => ({ ...prev, accountHolderName: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank"
                      value={formState.bankName}
                      onChange={e => setFormState(prev => ({ ...prev, bankName: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 50100293849102"
                      value={formState.accountNumber}
                      onChange={e => setFormState(prev => ({ ...prev, accountNumber: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0000001"
                      value={formState.ifscCode}
                      onChange={e => setFormState(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono uppercase font-bold text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>
                </div>
              </div>

              {/* ── SECTION 09: Internal Agency Mapping ── */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4.5 space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-200/70 pb-2">
                  <span className="px-2 py-0.5 rounded bg-[#DFBFBA]/30 text-[#660000] border border-[#DFBFBA]/80 text-[10px] font-bold uppercase tracking-wider">
                    09
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Internal Agency Mapping (Virtual Manager & Recruiter)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Virtual Manager (VM)</label>
                    <input
                      type="text"
                      placeholder="e.g. Neha Gupta (VM)"
                      value={formState.virtualManagerName}
                      onChange={e => setFormState(prev => ({ ...prev, virtualManagerName: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Recruiter Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={formState.recruiterName}
                      onChange={e => setFormState(prev => ({ ...prev, recruiterName: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Recruiter Contact Number</label>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="e.g. 9811223344"
                      value={formState.recruiterMobile}
                      onChange={e => setFormState(prev => ({ ...prev, recruiterMobile: e.target.value.replace(/\D/g, "") }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Recruitment Date</label>
                    <input
                      type="date"
                      value={formState.recruitmentDate}
                      onChange={e => setFormState(prev => ({ ...prev, recruitmentDate: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                    <select
                      value={formState.internalDepartment}
                      onChange={e => setFormState(prev => ({ ...prev, internalDepartment: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000] cursor-pointer"
                    >
                      <option value="Agency Channel">Agency Channel</option>
                      <option value="Direct Sales">Direct Sales</option>
                      <option value="Brokerage">Brokerage</option>
                      <option value="Digital Partner Network">Digital Partner Network</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Verified license, experienced in motor & health"
                      value={formState.internalNotes}
                      onChange={e => setFormState(prev => ({ ...prev, internalNotes: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                    />
                  </div>
                </div>
              </div>

              {/* ── SECTION 10: Advisor Documents & KYC ── */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4.5 space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-200/70 pb-2">
                  <span className="px-2 py-0.5 rounded bg-[#DFBFBA]/30 text-[#660000] border border-[#DFBFBA]/80 text-[10px] font-bold uppercase tracking-wider">
                    10
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Advisor Documents & KYC ({formState.documents.length})
                  </h4>
                </div>

                {/* Upload Action Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Document Type</label>
                      <select
                        value={selectedDocType}
                        onChange={e => setSelectedDocType(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000] cursor-pointer"
                      >
                        {DOCUMENT_TYPES.map((dt, i) => (
                          <option key={i} value={dt}>{dt}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Custom Document Title (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. 2026 Direct Contract"
                        value={customDocTitle}
                        onChange={e => setCustomDocTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="cursor-pointer bg-[#DFBFBA]/20 hover:bg-[#DFBFBA]/35 border border-[#DFBFBA]/80 text-[#660000] rounded-xl p-3.5 flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-2xs">
                      <UploadCloud className="w-4 h-4 text-[#660000]" />
                      <span>{uploadingDoc ? "Uploading..." : `Upload Document (${selectedDocType})`}</span>
                      <input
                        type="file"
                        multiple
                        onChange={handleDocumentFileUpload}
                        disabled={uploadingDoc}
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xlsx"
                      />
                    </label>
                  </div>
                </div>

                {docUploadError && (
                  <div className="text-xs text-rose-600 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{docUploadError}</span>
                  </div>
                )}

                {/* Attached Documents Grid */}
                {formState.documents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {formState.documents.map((doc, idx) => (
                      <div
                        key={doc.documentId || idx}
                        className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 bg-[#DFBFBA]/30 text-[#660000] rounded-lg shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 truncate">{doc.documentName}</div>
                            <div className="text-[10px] text-slate-500 font-medium text-[#660000]">{doc.documentType}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {doc.path && (
                            <a
                              href={doc.path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-slate-500 hover:text-[#660000] hover:bg-[#DFBFBA]/20 rounded transition-colors"
                              title="View"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(doc.documentId)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-400 bg-white rounded-xl border border-slate-200 text-xs">
                    No documents attached yet. Select document type and click Upload above.
                  </div>
                )}
              </div>

              {/* Status and Notes */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4.5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Advisor Status</label>
                  <select
                    value={formState.status}
                    onChange={e => setFormState(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-[#660000] cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE (Available for Policy Booking)</option>
                    <option value="INACTIVE">INACTIVE (Suspended / On-Hold)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">General Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Certified corporate advisor"
                    value={formState.notes}
                    onChange={e => setFormState(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#660000]"
                  />
                </div>
              </div>

              {/* Modal Sticky Footer Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white py-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#660000] hover:bg-[#500000] text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Atlas...</span>
                    </>
                  ) : modalMode === "create" ? (
                    <span>Save & Register Advisor</span>
                  ) : (
                    <span>Update Advisor Profile</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Advisor Profile & Business Analytics Modal Drawer ── */}
      {viewingAdvisor && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Drawer Header */}
            <div className="px-5 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#660000] text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                  {viewingAdvisor.personalDetails?.fullName?.charAt(0)?.toUpperCase() || "A"}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900">
                      {viewingAdvisor.personalDetails?.fullName}
                    </h3>
                    <span className="font-mono text-[11px] px-2 py-0.5 bg-slate-200 text-slate-800 font-semibold rounded">
                      {viewingAdvisor.advisorCode}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      viewingAdvisor.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                    }`}>
                      {viewingAdvisor.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {viewingAdvisor.insuranceDetails?.insuranceCompanyName} • {viewingAdvisor.branchDetails?.branchName} ({viewingAdvisor.branchDetails?.branchCity || "—"})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {/* Identity Toggle (Only in Profile Tab) */}
                {profileActiveTab === "profile" && (
                  <button
                    type="button"
                    onClick={() => setShowSensitiveDetails(!showSensitiveDetails)}
                    className="px-2.5 py-1 text-xs text-[#660000] hover:bg-[#DFBFBA]/30 bg-[#DFBFBA]/20 border border-[#DFBFBA]/80 rounded-lg flex items-center gap-1.5 font-semibold cursor-pointer"
                    title="Toggle Identity Masking"
                  >
                    {showSensitiveDetails ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showSensitiveDetails ? "Mask Identity" : "Reveal Identity"}</span>
                  </button>
                )}

                {/* Export Dropdown in Business & Policies & Revenue Tabs */}
                {(profileActiveTab === "business" || profileActiveTab === "policies" || profileActiveTab === "revenue") && (
                  <div className="relative" ref={advExportMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsAdvExportMenuOpen(prev => !prev)}
                      disabled={advReportLoading || !advReportData}
                      className="px-3 py-1.5 bg-[#660000] hover:bg-[#500000] disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Report</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${isAdvExportMenuOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isAdvExportMenuOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden">
                        <button
                          onClick={() => { setIsAdvExportMenuOpen(false); handleExportAdvisorExcel(); }}
                          className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 transition cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Export as Excel (.xlsx)</span>
                        </button>
                        <button
                          onClick={() => { setIsAdvExportMenuOpen(false); handleExportAdvisorCSV(); }}
                          className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-800 flex items-center gap-2 transition cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span>Export as CSV (.csv)</span>
                        </button>
                        <button
                          onClick={() => { setIsAdvExportMenuOpen(false); handleExportAdvisorPDF(); }}
                          className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-800 flex items-center gap-2 transition cursor-pointer"
                        >
                          <File className="w-3.5 h-3.5 text-rose-600" />
                          <span>Export as PDF (.pdf)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setViewingAdvisor(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-2 sm:gap-6 overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setProfileActiveTab("profile")}
                className={`py-3 px-1 border-b-2 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  profileActiveTab === "profile"
                    ? "border-[#660000] text-[#660000]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Profile & KYC Details</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileActiveTab("business")}
                className={`py-3 px-1 border-b-2 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  profileActiveTab === "business"
                    ? "border-[#660000] text-[#660000]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Business Overview & Analytics</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileActiveTab("policies")}
                className={`py-3 px-1 border-b-2 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  profileActiveTab === "policies"
                    ? "border-[#660000] text-[#660000]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Linked Policies ({advReportData?.summary?.totalPolicies ?? viewingAdvisor.linkedPoliciesCount ?? 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileActiveTab("revenue")}
                className={`py-3 px-1 border-b-2 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  profileActiveTab === "revenue"
                    ? "border-[#660000] text-[#660000]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Revenue & Company Breakdown</span>
              </button>
            </div>

            {/* Filter Bar for Business / Policies / Revenue tabs */}
            {(profileActiveTab === "business" || profileActiveTab === "policies" || profileActiveTab === "revenue") && (
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {/* Date Preset */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Date Range</label>
                    <select
                      value={advDatePreset}
                      onChange={e => setAdvDatePreset(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#660000] cursor-pointer"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="this_week">This Week</option>
                      <option value="this_month">This Month</option>
                      <option value="last_month">Previous Month</option>
                      <option value="custom">Custom Date Range</option>
                    </select>
                  </div>

                  {/* Insurance Company */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Insurance Company</label>
                    <select
                      value={advCompanyFilter}
                      onChange={e => setAdvCompanyFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#660000] cursor-pointer"
                    >
                      <option value="All">All Companies</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Business Type */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Business Type</label>
                    <select
                      value={advBusinessTypeFilter}
                      onChange={e => setAdvBusinessTypeFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#660000] cursor-pointer"
                    >
                      <option value="All">All Types (Fresh + Port + Renewal)</option>
                      <option value="NEW_BUSINESS">New Business (Fresh + Port)</option>
                      <option value="FRESH">Fresh Business Only</option>
                      <option value="PORT">Port Business Only</option>
                      <option value="RENEWAL">Renewal Business Only</option>
                    </select>
                  </div>

                  {/* Commission Status */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Commission Status</label>
                    <select
                      value={advCommissionStatusFilter}
                      onChange={e => setAdvCommissionStatusFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#660000] cursor-pointer"
                    >
                      <option value="All">All Status</option>
                      <option value="Paid">Paid Only</option>
                      <option value="Unpaid">Pending / Unpaid</option>
                    </select>
                  </div>
                </div>

                {/* Custom Date Inputs */}
                {advDatePreset === "custom" && (
                  <div className="flex items-center gap-3 pt-2.5 mt-2.5 border-t border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase mr-1.5">From:</span>
                      <input
                        type="date"
                        value={advDateFrom}
                        onChange={e => setAdvDateFrom(e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase mr-1.5">To:</span>
                      <input
                        type="date"
                        value={advDateTo}
                        onChange={e => setAdvDateTo(e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Body Tabs Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
              {/* ──────────────────────────────────────────────────────── */}
              {/* TAB 1: PROFILE & KYC DETAILS                             */}
              {/* ──────────────────────────────────────────────────────── */}
              {profileActiveTab === "profile" && (
                <div className="space-y-6 divide-y divide-slate-100">
                  {/* 1. PERSONAL DETAILS */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-[#660000] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>1. Personal Details</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Full Name:</span>
                        <span className="font-semibold text-slate-800">{viewingAdvisor.personalDetails?.fullName || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Father/Spouse:</span>
                        <span>{viewingAdvisor.personalDetails?.fatherOrSpouseName || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Date of Birth:</span>
                        <span>{viewingAdvisor.personalDetails?.dateOfBirth || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Gender:</span>
                        <span>{viewingAdvisor.personalDetails?.gender || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Marital Status:</span>
                        <span>{viewingAdvisor.personalDetails?.maritalStatus || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. IDENTITY & LICENSE */}
                  <div className="space-y-2 pt-4">
                    <h4 className="font-bold text-[#660000] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      <span>2. Identity & Regulatory License</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-sans">PAN Number:</span>
                        <span className="font-bold text-slate-800">
                          {showSensitiveDetails
                            ? viewingAdvisor.identityDetails?.panNumber || "—"
                            : (viewingAdvisor.identityDetails?.panNumber ? `${viewingAdvisor.identityDetails.panNumber.substring(0, 5)}****${viewingAdvisor.identityDetails.panNumber.substring(9)}` : "—")}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-sans">Aadhaar Number:</span>
                        <span>
                          {showSensitiveDetails
                            ? viewingAdvisor.identityDetails?.aadhaarNumber || "—"
                            : (viewingAdvisor.identityDetails?.aadhaarNumber ? `XXXX XXXX ${viewingAdvisor.identityDetails.aadhaarNumber.slice(-4)}` : "—")}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-sans">License Number:</span>
                        <span>{viewingAdvisor.identityDetails?.advisorLicenseNumber || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-sans">Expiry Date:</span>
                        <span>{viewingAdvisor.identityDetails?.licenseExpiryDate || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. CONTACT DETAILS */}
                  <div className="space-y-2 pt-4">
                    <h4 className="font-bold text-[#660000] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span>3. Contact Information</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Mobile Number:</span>
                        <span className="font-semibold text-slate-800 font-mono">{viewingAdvisor.contactDetails?.mobileNumber || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Alternate Mobile:</span>
                        <span className="font-mono">{viewingAdvisor.contactDetails?.alternateMobileNumber || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Email Address:</span>
                        <span className="truncate block">{viewingAdvisor.contactDetails?.email || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">WhatsApp:</span>
                        <span className="font-mono">{viewingAdvisor.contactDetails?.whatsappNumber || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. INSURANCE COMPANY & BRANCH */}
                  <div className="space-y-2 pt-4">
                    <h4 className="font-bold text-[#660000] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>4. Insurance Company & Branch</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Company Name:</span>
                        <span className="font-bold text-slate-800">{viewingAdvisor.insuranceDetails?.insuranceCompanyName || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Branch:</span>
                        <span className="font-medium text-slate-800">{viewingAdvisor.branchDetails?.branchName || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Branch Code:</span>
                        <span>{viewingAdvisor.branchDetails?.branchCode || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Branch Location:</span>
                        <span>{viewingAdvisor.branchDetails?.branchCity || "—"}, {viewingAdvisor.branchDetails?.branchState || ""}</span>
                      </div>
                    </div>
                  </div>

                  {/* 5. INSURANCE COMPANY MANAGEMENT (BM, AM, ZM) */}
                  <div className="space-y-2 pt-4">
                    <h4 className="font-bold text-[#660000] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>5. Insurance Company Management</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#DFBFBA]/15 p-3.5 rounded-xl border border-[#DFBFBA]/50">
                      {/* BM */}
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <span className="text-[10px] font-bold text-[#660000] uppercase block mb-1">Branch Manager (BM)</span>
                        <div className="font-semibold text-slate-900">{viewingAdvisor.insuranceCompanyManagement?.branchManagerName || "Unassigned"}</div>
                        <div className="text-[11px] text-slate-600 font-mono mt-0.5">{viewingAdvisor.insuranceCompanyManagement?.branchManagerMobile || "—"}</div>
                        <div className="text-[10px] text-slate-400 truncate">{viewingAdvisor.insuranceCompanyManagement?.branchManagerEmail || ""}</div>
                      </div>

                      {/* AM */}
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <span className="text-[10px] font-bold text-[#660000] uppercase block mb-1">Area Manager (AM)</span>
                        <div className="font-semibold text-slate-900">{viewingAdvisor.insuranceCompanyManagement?.areaManagerName || "Unassigned"}</div>
                        <div className="text-[11px] text-slate-600 font-mono mt-0.5">{viewingAdvisor.insuranceCompanyManagement?.areaManagerMobile || "—"}</div>
                        <div className="text-[10px] text-slate-400 truncate">{viewingAdvisor.insuranceCompanyManagement?.areaManagerEmail || ""}</div>
                      </div>

                      {/* ZM */}
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <span className="text-[10px] font-bold text-[#660000] uppercase block mb-1">Zonal Manager (ZM)</span>
                        <div className="font-semibold text-slate-900">{viewingAdvisor.insuranceCompanyManagement?.zonalManagerName || "Unassigned"}</div>
                        <div className="text-[11px] text-slate-600 font-mono mt-0.5">{viewingAdvisor.insuranceCompanyManagement?.zonalManagerMobile || "—"}</div>
                        <div className="text-[10px] text-slate-400 truncate">{viewingAdvisor.insuranceCompanyManagement?.zonalManagerEmail || ""}</div>
                      </div>
                    </div>
                  </div>

                  {/* 6. BUSINESS PROFILE */}
                  <div className="space-y-2 pt-4">
                    <h4 className="font-bold text-[#660000] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>6. Business Profile</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Advisor Type:</span>
                        <span className="font-semibold">{viewingAdvisor.businessDetails?.advisorType || "Individual Advisor"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Specialization:</span>
                        <span>{viewingAdvisor.businessDetails?.specialization || "General / Health"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Experience:</span>
                        <span>{viewingAdvisor.businessDetails?.yearsOfExperience || 0} Years</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Joined Date:</span>
                        <span>{viewingAdvisor.businessDetails?.dateOfJoining || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* 7. LOCATION & ADDRESS */}
                  <div className="space-y-2 pt-4">
                    <h4 className="font-bold text-[#660000] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>7. Location & Address</span>
                    </h4>
                    <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                      <div className="text-slate-800">{viewingAdvisor.locationDetails?.addressLine1 || "—"}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        {[
                          viewingAdvisor.locationDetails?.city,
                          viewingAdvisor.locationDetails?.district,
                          viewingAdvisor.locationDetails?.state,
                          viewingAdvisor.locationDetails?.pincode,
                          viewingAdvisor.locationDetails?.country
                        ].filter(Boolean).join(", ")}
                      </div>
                    </div>
                  </div>

                  {/* 8. BANK DETAILS */}
                  <div className="space-y-2 pt-4">
                    <h4 className="font-bold text-[#660000] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>8. Bank Details</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Account Holder:</span>
                        <span className="font-medium text-slate-800">{viewingAdvisor.bankDetails?.accountHolderName || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Bank:</span>
                        <span>{viewingAdvisor.bankDetails?.bankName || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Account Number:</span>
                        <span className="font-mono">
                          {showSensitiveDetails
                            ? viewingAdvisor.bankDetails?.accountNumber || "—"
                            : (viewingAdvisor.bankDetails?.accountNumber ? `XXXX XXXX ${viewingAdvisor.bankDetails.accountNumber.slice(-4)}` : "—")}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">IFSC Code:</span>
                        <span className="font-mono uppercase font-semibold">{viewingAdvisor.bankDetails?.ifscCode || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* 9. INTERNAL MAPPING */}
                  <div className="space-y-2 pt-4">
                    <h4 className="font-bold text-[#660000] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" />
                      <span>9. Internal Mapping & Recruiter</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Virtual Manager:</span>
                        <span className="font-bold text-slate-900">{viewingAdvisor.internalMapping?.virtualManagerName || "Unassigned"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Recruiter:</span>
                        <span className="font-medium text-slate-800">{viewingAdvisor.internalMapping?.recruiterName || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Recruiter Mobile:</span>
                        <span className="font-mono">{viewingAdvisor.internalMapping?.recruiterMobile || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Department:</span>
                        <span>{viewingAdvisor.internalMapping?.internalDepartment || "Agency Channel"}</span>
                      </div>
                    </div>
                  </div>

                  {/* 10. DOCUMENTS */}
                  <div className="space-y-2 pt-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-[#660000] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>10. KYC & Verification Documents ({viewingAdvisor.documents?.length || 0})</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const toDoc = viewingAdvisor;
                          setViewingAdvisor(null);
                          handleOpenDocHub(toDoc);
                        }}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <FolderOpen className="w-3 h-3 text-[#DFBFBA]" />
                        <span>Manage in Document Hub</span>
                      </button>
                    </div>

                    {(!viewingAdvisor.documents || viewingAdvisor.documents.length === 0) ? (
                      <div className="p-3 text-slate-400 bg-slate-50 rounded-xl text-center text-xs">
                        No documents attached for this advisor. Click "Manage in Document Hub" above to upload documents.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {viewingAdvisor.documents.map((doc, idx) => (
                          <div
                            key={doc.documentId || idx}
                            className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-2xs"
                          >
                            <div className="min-w-0 flex items-center gap-2.5">
                              <div className="p-2 bg-[#DFBFBA]/30 text-[#660000] rounded-lg shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-900 truncate">{doc.documentName}</div>
                                <div className="text-[10px] text-[#660000] font-medium">{doc.documentType}</div>
                              </div>
                            </div>

                            {doc.path && (
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <a
                                  href={doc.path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 text-[11px] font-semibold text-[#660000] hover:bg-[#DFBFBA]/40 bg-[#DFBFBA]/25 rounded-md flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>View</span>
                                </a>
                                <a
                                  href={doc.path}
                                  download
                                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                                  title="Download"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 11. STATUS & NOTES */}
                  <div className="space-y-2 pt-4">
                    <h4 className="font-bold text-[#660000] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>11. Status & Audit Ledger</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Linked Policies:</span>
                        <span className="font-bold text-[#660000]">{viewingAdvisor.linkedPoliciesCount || 0} Policies</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Created Date:</span>
                        <span>{viewingAdvisor.createdAt ? new Date(viewingAdvisor.createdAt).toLocaleString() : "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Created By:</span>
                        <span>{viewingAdvisor.createdByName || "System Admin"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ──────────────────────────────────────────────────────── */}
              {/* TAB 2: BUSINESS OVERVIEW & ANALYTICS                     */}
              {/* ──────────────────────────────────────────────────────── */}
              {profileActiveTab === "business" && (
                <div className="space-y-5">
                  {advReportLoading ? (
                    <div className="py-16 text-center text-slate-400 space-y-2">
                      <RotateCcw className="w-6 h-6 animate-spin mx-auto text-[#660000]" />
                      <p className="text-xs font-semibold text-slate-600">Calculating real-time business metrics from MongoDB Atlas...</p>
                    </div>
                  ) : advReportData ? (
                    <>
                      {/* 8 Dedicated Dynamic KPI Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* 1. Total Policies */}
                        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Policies</span>
                          <div className="text-xl font-bold text-slate-900">{advReportData.summary.totalPolicies}</div>
                          <span className="text-[10px] text-slate-500 font-medium">All Linked Policies</span>
                        </div>

                        {/* 2. Fresh Policies */}
                        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 shadow-2xs">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">Fresh Policies</span>
                          <div className="text-xl font-bold text-emerald-950">{advReportData.summary.freshPolicies}</div>
                          <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                            ₹{advReportData.summary.freshPremium.toLocaleString("en-IN")} Prem
                          </div>
                        </div>

                        {/* 3. Port Policies */}
                        <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-3.5 shadow-2xs">
                          <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block mb-1">Port Policies</span>
                          <div className="text-xl font-bold text-indigo-950">{advReportData.summary.portPolicies}</div>
                          <div className="text-[10px] text-indigo-700 font-semibold mt-0.5">
                            ₹{advReportData.summary.portPremium.toLocaleString("en-IN")} Prem
                          </div>
                        </div>

                        {/* 4. Renewal Policies */}
                        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 shadow-2xs">
                          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">Renewal Policies</span>
                          <div className="text-xl font-bold text-amber-950">{advReportData.summary.renewalPolicies}</div>
                          <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                            ₹{advReportData.summary.renewalPremium.toLocaleString("en-IN")} Prem
                          </div>
                        </div>

                        {/* 5. Total New Business Total */}
                        <div className="bg-[#DFBFBA]/20 border border-[#DFBFBA] rounded-xl p-3.5 shadow-2xs">
                          <span className="text-[10px] font-bold text-[#660000] uppercase tracking-wider block mb-1">Total New Business</span>
                          <div className="text-xl font-bold text-[#660000]">{advReportData.summary.totalNewBusinessPolicies}</div>
                          <div className="text-[10px] text-[#660000] font-semibold mt-0.5">
                            ₹{advReportData.summary.totalNewBusinessPremium.toLocaleString("en-IN")} Prem
                          </div>
                        </div>

                        {/* 6. Total Premium */}
                        <div className="bg-slate-900 text-white rounded-xl p-3.5 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">Total Premium</span>
                          <div className="text-xl font-bold text-white">₹{advReportData.summary.totalPremium.toLocaleString("en-IN")}</div>
                          <span className="text-[10px] text-slate-400">Total Booked Premium</span>
                        </div>

                        {/* 7. Total Commission / Revenue */}
                        <div className="bg-[#660000] text-white rounded-xl p-3.5 shadow-2xs">
                          <span className="text-[10px] font-bold text-[#DFBFBA] uppercase tracking-wider block mb-1">Total Revenue</span>
                          <div className="text-xl font-bold text-white">₹{advReportData.summary.totalRevenue.toLocaleString("en-IN")}</div>
                          <span className="text-[10px] text-[#DFBFBA]">Total Commission Earned</span>
                        </div>

                        {/* 8. Paid vs Pending Revenue */}
                        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Paid vs Pending</span>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-emerald-700 font-semibold">Paid:</span>
                              <span className="font-bold text-emerald-800">₹{advReportData.summary.paidRevenue.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-rose-700 font-semibold">Pending:</span>
                              <span className="font-bold text-rose-800">₹{advReportData.summary.pendingRevenue.toLocaleString("en-IN")}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Business Performance Breakdown Table */}
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
                          <span>Business Type Performance Summary</span>
                          <span className="text-[11px] font-normal text-slate-500">Live Real-Time Calculations</span>
                        </div>
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100/80 text-slate-600 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-200">
                              <th className="py-2.5 px-3.5">Business Classification</th>
                              <th className="py-2.5 px-3.5 text-center">Policies</th>
                              <th className="py-2.5 px-3.5 text-right">Total Premium</th>
                              <th className="py-2.5 px-3.5 text-right">Commission / Revenue</th>
                              <th className="py-2.5 px-3.5 text-center">Share %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            <tr>
                              <td className="py-2.5 px-3.5 font-medium flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span>Fresh Business</span>
                              </td>
                              <td className="py-2.5 px-3.5 text-center font-bold">{advReportData.summary.freshPolicies}</td>
                              <td className="py-2.5 px-3.5 text-right font-mono font-semibold">₹{advReportData.summary.freshPremium.toLocaleString("en-IN")}</td>
                              <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-800">₹{advReportData.summary.freshRevenue.toLocaleString("en-IN")}</td>
                              <td className="py-2.5 px-3.5 text-center text-slate-500">
                                {advReportData.summary.totalPolicies > 0 ? `${Math.round((advReportData.summary.freshPolicies / advReportData.summary.totalPolicies) * 100)}%` : "0%"}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-2.5 px-3.5 font-medium flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                <span>Port Business</span>
                              </td>
                              <td className="py-2.5 px-3.5 text-center font-bold">{advReportData.summary.portPolicies}</td>
                              <td className="py-2.5 px-3.5 text-right font-mono font-semibold">₹{advReportData.summary.portPremium.toLocaleString("en-IN")}</td>
                              <td className="py-2.5 px-3.5 text-right font-mono font-bold text-indigo-800">₹{advReportData.summary.portRevenue.toLocaleString("en-IN")}</td>
                              <td className="py-2.5 px-3.5 text-center text-slate-500">
                                {advReportData.summary.totalPolicies > 0 ? `${Math.round((advReportData.summary.portPolicies / advReportData.summary.totalPolicies) * 100)}%` : "0%"}
                              </td>
                            </tr>
                            <tr className="bg-slate-50/50 font-semibold text-slate-900">
                              <td className="py-2.5 px-3.5 text-[#660000]">Total New Business (Fresh + Port)</td>
                              <td className="py-2.5 px-3.5 text-center text-[#660000]">{advReportData.summary.totalNewBusinessPolicies}</td>
                              <td className="py-2.5 px-3.5 text-right font-mono text-[#660000]">₹{advReportData.summary.totalNewBusinessPremium.toLocaleString("en-IN")}</td>
                              <td className="py-2.5 px-3.5 text-right font-mono text-[#660000]">₹{advReportData.summary.totalNewBusinessRevenue.toLocaleString("en-IN")}</td>
                              <td className="py-2.5 px-3.5 text-center text-[#660000]">
                                {advReportData.summary.totalPolicies > 0 ? `${Math.round((advReportData.summary.totalNewBusinessPolicies / advReportData.summary.totalPolicies) * 100)}%` : "0%"}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-2.5 px-3.5 font-medium flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                <span>Renewal Business</span>
                              </td>
                              <td className="py-2.5 px-3.5 text-center font-bold">{advReportData.summary.renewalPolicies}</td>
                              <td className="py-2.5 px-3.5 text-right font-mono font-semibold">₹{advReportData.summary.renewalPremium.toLocaleString("en-IN")}</td>
                              <td className="py-2.5 px-3.5 text-right font-mono font-bold text-amber-800">₹{advReportData.summary.renewalRevenue.toLocaleString("en-IN")}</td>
                              <td className="py-2.5 px-3.5 text-center text-slate-500">
                                {advReportData.summary.totalPolicies > 0 ? `${Math.round((advReportData.summary.renewalPolicies / advReportData.summary.totalPolicies) * 100)}%` : "0%"}
                              </td>
                            </tr>
                            <tr className="bg-[#DFBFBA]/20 font-bold text-slate-900 border-t-2 border-slate-300">
                              <td className="py-3 px-3.5 text-[#660000]">OVERALL TOTAL</td>
                              <td className="py-3 px-3.5 text-center text-[#660000]">{advReportData.summary.totalPolicies}</td>
                              <td className="py-3 px-3.5 text-right font-mono text-[#660000]">₹{advReportData.summary.totalPremium.toLocaleString("en-IN")}</td>
                              <td className="py-3 px-3.5 text-right font-mono text-[#660000]">₹{advReportData.summary.totalRevenue.toLocaleString("en-IN")}</td>
                              <td className="py-3 px-3.5 text-center text-[#660000]">100%</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              {/* ──────────────────────────────────────────────────────── */}
              {/* TAB 3: LINKED POLICIES LEDGER                            */}
              {/* ──────────────────────────────────────────────────────── */}
              {profileActiveTab === "policies" && (
                <div className="space-y-4">
                  {advReportLoading ? (
                    <div className="py-16 text-center text-slate-400 space-y-2">
                      <RotateCcw className="w-6 h-6 animate-spin mx-auto text-[#660000]" />
                      <p className="text-xs font-semibold text-slate-600">Loading linked policies from MongoDB Atlas...</p>
                    </div>
                  ) : !advReportData || advReportData.policies.length === 0 ? (
                    <div className="py-12 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-400 space-y-1.5">
                      <FileText className="w-6 h-6 mx-auto text-slate-300" />
                      <div className="font-semibold text-slate-700 text-xs">No Linked Policies Found</div>
                      <p className="text-[11px] text-slate-500">No policies match the currently applied filters for this advisor.</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100/90 text-slate-600 text-[10.5px] font-semibold uppercase tracking-wider border-b border-slate-200">
                              <th className="py-2.5 px-3 text-center w-10">#</th>
                              <th className="py-2.5 px-3">Policy Number</th>
                              <th className="py-2.5 px-3">Customer Name</th>
                              <th className="py-2.5 px-3">Insurance Company</th>
                              <th className="py-2.5 px-3">Business Type</th>
                              <th className="py-2.5 px-3 text-center">Policy Date</th>
                              <th className="py-2.5 px-3 text-right">Premium</th>
                              <th className="py-2.5 px-3 text-right">Comm %</th>
                              <th className="py-2.5 px-3 text-right">Commission</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {advReportData.policies.map((p: any, idx) => {
                              const btUpper = (p.businessType || "").toUpperCase();
                              const bstUpper = (p.businessSubtype || "").toUpperCase();
                              const isRenewal = btUpper === "RENEWAL" || bstUpper === "RENEWAL";
                              const isPort = !isRenewal && (btUpper === "PORT" || bstUpper === "PORT" || !!p.portabilityDetails?.previousInsuranceCompany);
                              const classification = isRenewal ? "Renewal" : isPort ? "Port" : "Fresh";

                              const comm = Number(p.expectedCommission || 0) || Math.round((Number(p.premiumAmount || 0) * Number(p.appliedPayoutPercentage || 0)) / 100);

                              return (
                                <tr key={p._id || p.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                  <td className="py-2.5 px-3 font-semibold font-mono text-slate-900">{p.policyNumber || "—"}</td>
                                  <td className="py-2.5 px-3 font-medium text-slate-800">{p.customerName || "—"}</td>
                                  <td className="py-2.5 px-3 text-slate-600">{p.companyName || "—"}</td>
                                  <td className="py-2.5 px-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      isRenewal ? "bg-amber-100 text-amber-800" : isPort ? "bg-indigo-100 text-indigo-800" : "bg-emerald-100 text-emerald-800"
                                    }`}>
                                      {classification}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-center text-slate-500 whitespace-nowrap">
                                    {p.businessLoginDate || p.startDate || (p.createdAt ? p.createdAt.split("T")[0] : "—")}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                                    ₹{Number(p.premiumAmount || 0).toLocaleString("en-IN")}
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                                    {p.appliedPayoutPercentage ? `${p.appliedPayoutPercentage}%` : "—"}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                                    ₹{comm.toLocaleString("en-IN")}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      p.commissionStatus === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                    }`}>
                                      {p.commissionStatus || "Pending"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ──────────────────────────────────────────────────────── */}
              {/* TAB 4: REVENUE & COMPANY BREAKDOWN                       */}
              {/* ──────────────────────────────────────────────────────── */}
              {profileActiveTab === "revenue" && (
                <div className="space-y-4">
                  {advReportLoading ? (
                    <div className="py-16 text-center text-slate-400 space-y-2">
                      <RotateCcw className="w-6 h-6 animate-spin mx-auto text-[#660000]" />
                      <p className="text-xs font-semibold text-slate-600">Aggregating company-wise revenue...</p>
                    </div>
                  ) : !advReportData || advReportData.companyBreakdown.length === 0 ? (
                    <div className="py-12 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-400 space-y-1.5">
                      <Building2 className="w-6 h-6 mx-auto text-slate-300" />
                      <div className="font-semibold text-slate-700 text-xs">No Company Breakdown Available</div>
                      <p className="text-[11px] text-slate-500">No policy revenue records match the filters.</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100/90 text-slate-600 text-[10.5px] font-semibold uppercase tracking-wider border-b border-slate-200">
                              <th className="py-2.5 px-3.5">Insurance Partner</th>
                              <th className="py-2.5 px-3 text-center">Policies</th>
                              <th className="py-2.5 px-3 text-right">Fresh Prem</th>
                              <th className="py-2.5 px-3 text-right">Port Prem</th>
                              <th className="py-2.5 px-3 text-right">Renewal Prem</th>
                              <th className="py-2.5 px-3 text-right">Total Premium</th>
                              <th className="py-2.5 px-3 text-right">Total Revenue</th>
                              <th className="py-2.5 px-3 text-right">Paid Revenue</th>
                              <th className="py-2.5 px-3 text-right">Pending Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {advReportData.companyBreakdown.map((c, idx) => (
                              <tr key={c.companyId || idx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2.5 px-3.5 font-semibold text-slate-900">{c.companyName}</td>
                                <td className="py-2.5 px-3 text-center font-bold">{c.totalCount}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-emerald-700">₹{c.freshPremium.toLocaleString("en-IN")}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-indigo-700">₹{c.portPremium.toLocaleString("en-IN")}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-amber-700">₹{c.renewalPremium.toLocaleString("en-IN")}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹{c.totalPremium.toLocaleString("en-IN")}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#660000]">₹{c.totalRevenue.toLocaleString("en-IN")}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-800">₹{(c.paidRevenue || 0).toLocaleString("en-IN")}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-700">₹{(c.pendingRevenue || 0).toLocaleString("en-IN")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2 shrink-0">
              <div className="text-[11px] text-slate-500">
                Advisor: <strong className="text-slate-800">{viewingAdvisor.personalDetails?.fullName}</strong> ({viewingAdvisor.advisorCode})
              </div>

              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      const toEdit = viewingAdvisor;
                      setViewingAdvisor(null);
                      handleOpenEdit(toEdit);
                    }}
                    className="px-4 py-2 bg-[#660000] hover:bg-[#500000] text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                  >
                    Edit Advisor
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewingAdvisor(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        confirmText={confirmModal.confirmText || "Confirm"}
        type={confirmModal.type || "danger"}
      />
    </div>
  );
}
