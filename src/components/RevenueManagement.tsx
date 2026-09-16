import React, { useState, useEffect } from "react";
import { api, UserSession } from "../lib/api";
import { InsuranceCompany, Policy, TeamLeaderMaster, CallerMaster, TeamManagerMaster } from "../types";
import { 
  Plus, DollarSign, TrendingUp, Award, IndianRupee, AlertCircle, RefreshCw, 
  Filter, CheckCircle2, XCircle, FileSpreadsheet, Building2, User, Layers, ArrowUpRight, Trophy,
  Edit3, Percent, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Shield, FileText, Calendar, MapPin, Phone, Mail, Tag, Briefcase, Search, RotateCcw, Sparkles
} from "lucide-react";
import ConfirmModal from "./ConfirmModal";
import { hasPermission } from "../lib/permissions";

interface RevenueManagementProps {
  user: UserSession;
}

type DatePreset = "all" | "today" | "this_week" | "this_month" | "last_month" | "monthly" | "custom";

export default function RevenueManagement({ user }: RevenueManagementProps) {
  const [data, setData] = useState<any>(null);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"commission" | "contest">("commission");

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination for Commission Revenue Ledger
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const defaultMonthStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

  // Master data for hierarchy filters
  const [bms, setBms] = useState<any[]>([]);
  const [teamManagers, setTeamManagers] = useState<TeamManagerMaster[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<TeamLeaderMaster[]>([]);
  const [tseList, setTseList] = useState<CallerMaster[]>([]);

  // Comprehensive Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(defaultMonthStr);
  const [sourceTypeFilter, setSourceTypeFilter] = useState("All");
  const [businessTypeFilter, setBusinessTypeFilter] = useState("All");
  const [policyStatusFilter, setPolicyStatusFilter] = useState("All");
  const [cashbackFilter, setCashbackFilter] = useState("All");
  const [bmFilter, setBmFilter] = useState("All");
  const [teamManagerFilter, setTeamManagerFilter] = useState("All");
  const [teamLeaderFilter, setTeamLeaderFilter] = useState("All");
  const [tseFilter, setTseFilter] = useState("All");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [commissionStatusFilter, setCommissionStatusFilter] = useState("All");
  const [selectedContestPaymentStatus, setSelectedContestPaymentStatus] = useState("All");

  // Historical Revenue Modal State
  const [isHistoricalModalOpen, setIsHistoricalModalOpen] = useState(false);
  const [historicalSaving, setHistoricalSaving] = useState(false);
  const [historicalError, setHistoricalError] = useState<string | null>(null);
  const [historicalForm, setHistoricalForm] = useState({
    policyNumber: "",
    customerName: "",
    customerPhone: "",
    insuranceCompanyId: "",
    companyName: "",
    businessType: "NEW_BUSINESS",
    businessSubtype: "FRESH",
    premiumAmount: "",
    appliedPayoutPercentage: "",
    revenueAmount: "",
    revenueDate: "",
    commissionStatus: "Paid" as "Paid" | "Unpaid",
    advisorId: "",
    advisorName: "",
    notes: ""
  });

  // Edit Policy Commission Modal State
  const [editCommissionModalState, setEditCommissionModalState] = useState<{
    isOpen: boolean;
    policy: Policy | null;
    percentageInput: string;
    commissionStatus: "Paid" | "Unpaid";
    saving: boolean;
    error: string | null;
  }>({
    isOpen: false,
    policy: null,
    percentageInput: "",
    commissionStatus: "Unpaid",
    saving: false,
    error: null
  });

  // Confirmation modal state
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    type: "commission" | "contest";
    id: string;
    label: string;
    amount: number;
    newStatus: "Paid" | "Unpaid";
  }>({
    isOpen: false,
    type: "commission",
    id: "",
    label: "",
    amount: 0,
    newStatus: "Paid"
  });

  const canEditCommission = 
    hasPermission(user, ["policies.edit", "revenue.view"]) || 
    ["SUPER_ADMIN", "ADMIN", "TENANT_ADMIN"].includes((user.role || "").toUpperCase());

  useEffect(() => {
    api.getBMsMaster().then(setBms).catch(() => {});
    api.getTMsMaster().then(setTeamManagers).catch(() => {});
    api.getTeamLeadersMaster().then(setTeamLeaders).catch(() => {});
    api.getCallersMaster().then(setTseList).catch(() => {});
  }, []);

  const computeDateRange = (preset: DatePreset) => {
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();

    switch (preset) {
      case "today": {
        const todayStr = `${y}-${pad(m + 1)}-${pad(d)}`;
        return { from: todayStr, to: todayStr };
      }
      case "this_week": {
        const dayOfWeek = now.getDay();
        const start = new Date(now);
        start.setDate(d - dayOfWeek);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return {
          from: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
          to: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`
        };
      }
      case "this_month":
        return {
          from: `${y}-${pad(m + 1)}-01`,
          to: `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`
        };
      case "last_month": {
        const lm = m === 0 ? 11 : m - 1;
        const ly = m === 0 ? y - 1 : y;
        return {
          from: `${ly}-${pad(lm + 1)}-01`,
          to: `${ly}-${pad(lm + 1)}-${pad(new Date(ly, lm + 1, 0).getDate())}`
        };
      }
      case "monthly": {
        const targetMonth = selectedMonth || `${y}-${pad(m + 1)}`;
        const parts = targetMonth.split("-");
        if (parts.length < 2) return { from: "", to: "" };
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        if (isNaN(year) || isNaN(month)) return { from: "", to: "" };
        const lastDay = new Date(year, month, 0).getDate();
        return {
          from: `${year}-${pad(month)}-01`,
          to: `${year}-${pad(month)}-${pad(lastDay)}`
        };
      }
      case "custom":
        return { from: dateFrom, to: dateTo };
      case "all":
      default:
        return { from: "", to: "" };
    }
  };

  const getStandardPercentage = (p: Policy | { insuranceCompanyId?: string; companyName?: string; businessType?: string }): number => {
    const comp = companies.find(
      c => c.id === p.insuranceCompanyId || (c.name && p.companyName && c.name.toLowerCase() === p.companyName.toLowerCase())
    );
    if (!comp) return 0;
    const isRenewal = p.businessType === "RENEWAL";
    return isRenewal ? comp.renewalPayoutPercentage : comp.newBusinessPayoutPercentage;
  };

  const handleOpenCommissionModal = (p: Policy) => {
    const stdPct = getStandardPercentage(p);
    const initialPct = p.appliedPayoutPercentage !== undefined && p.appliedPayoutPercentage !== null
      ? String(p.appliedPayoutPercentage)
      : String(stdPct);

    setEditCommissionModalState({
      isOpen: true,
      policy: p,
      percentageInput: initialPct,
      commissionStatus: (p.commissionStatus as "Paid" | "Unpaid") || "Unpaid",
      saving: false,
      error: null
    });
  };

  const handleSaveCommissionModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCommissionModalState.policy?.id) return;

    const rawInput = editCommissionModalState.percentageInput.trim();
    if (rawInput === "" || isNaN(Number(rawInput))) {
      setEditCommissionModalState(prev => ({ ...prev, error: "Please enter a valid numeric percentage." }));
      return;
    }

    const numPct = parseFloat(rawInput);
    if (numPct < 0) {
      setEditCommissionModalState(prev => ({ ...prev, error: "Commission percentage cannot be negative." }));
      return;
    }

    const numPremium = Number(editCommissionModalState.policy.premiumAmount || 0);
    const calculatedCommission = Math.round(((numPremium * numPct) / 100) * 100) / 100;

    setEditCommissionModalState(prev => ({ ...prev, saving: true, error: null }));
    try {
      await api.updatePolicy(editCommissionModalState.policy.id, {
        appliedPayoutPercentage: numPct,
        expectedCommission: calculatedCommission,
        commissionStatus: editCommissionModalState.commissionStatus
      });

      setEditCommissionModalState({
        isOpen: false,
        policy: null,
        percentageInput: "",
        commissionStatus: "Unpaid",
        saving: false,
        error: null
      });
      await fetchRevenue();
    } catch (err: any) {
      console.error("Failed to update policy commission:", err);
      setEditCommissionModalState(prev => ({
        ...prev,
        saving: false,
        error: err.message || "Failed to update commission in database."
      }));
    }
  };

  const fetchRevenue = async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = computeDateRange(datePreset);
      const filters: Record<string, string> = {};
      if (from) filters.dateFrom = from;
      if (to) filters.dateTo = to;
      if (companyFilter !== "All") filters.insuranceCompanyId = companyFilter;
      if (businessTypeFilter !== "All") filters.businessType = businessTypeFilter;
      if (policyStatusFilter !== "All") filters.policyStatus = policyStatusFilter;
      if (cashbackFilter !== "All") filters.cashback = cashbackFilter;
      if (bmFilter !== "All") filters.bmId = bmFilter;
      if (teamManagerFilter !== "All") filters.teamManagerId = teamManagerFilter;
      if (teamLeaderFilter !== "All") filters.teamLeaderId = teamLeaderFilter;
      if (tseFilter !== "All") filters.callerId = tseFilter;
      if (sourceTypeFilter !== "All") filters.sourceType = sourceTypeFilter;
      if (commissionStatusFilter !== "All") filters.commissionStatus = commissionStatusFilter;
      if (selectedContestPaymentStatus !== "All") filters.contestPaymentStatus = selectedContestPaymentStatus;

      const [revData, compRes] = await Promise.all([
        api.getRevenueSummary(filters),
        api.getActiveInsuranceCompanies()
      ]);
      setData(revData);
      setCompanies(compRes);
    } catch (err: any) {
      console.error("Error fetching revenue management data:", err);
      setError(err.message || "Failed to load revenue summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, [
    datePreset,
    dateFrom,
    dateTo,
    selectedMonth,
    companyFilter,
    businessTypeFilter,
    policyStatusFilter,
    cashbackFilter,
    bmFilter,
    teamManagerFilter,
    teamLeaderFilter,
    tseFilter,
    sourceTypeFilter,
    commissionStatusFilter,
    selectedContestPaymentStatus
  ]);

  // Filtered dropdown options based on hierarchy BM -> TM -> TL -> TSE
  const filteredTmOptions = bmFilter !== "All"
    ? teamManagers.filter(tm => tm.bmId === bmFilter)
    : teamManagers;

  const filteredTlOptions = teamLeaders.filter(tl =>
    (teamManagerFilter === "All" || tl.teamManagerId === teamManagerFilter) &&
    (bmFilter === "All" || tl.bmId === bmFilter)
  );

  const filteredTseOptions = tseList.filter(t =>
    (teamLeaderFilter === "All" || t.teamLeaderId === teamLeaderFilter) &&
    (teamManagerFilter === "All" || t.teamManagerId === teamManagerFilter) &&
    (bmFilter === "All" || t.bmId === bmFilter)
  );

  const handleResetFilters = () => {
    setDatePreset("all");
    setDateFrom("");
    setDateTo("");
    setSelectedMonth(defaultMonthStr);
    setSourceTypeFilter("All");
    setBusinessTypeFilter("All");
    setPolicyStatusFilter("All");
    setCashbackFilter("All");
    setBmFilter("All");
    setTeamManagerFilter("All");
    setTeamLeaderFilter("All");
    setTseFilter("All");
    setCompanyFilter("All");
    setCommissionStatusFilter("All");
    setSelectedContestPaymentStatus("All");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const handleSaveHistoricalRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setHistoricalError(null);

    if (!historicalForm.companyName && !historicalForm.insuranceCompanyId) {
      setHistoricalError("Please select an Insurance Company");
      return;
    }

    const prem = Number(historicalForm.premiumAmount || 0);
    const rev = Number(historicalForm.revenueAmount || 0);
    const pct = Number(historicalForm.appliedPayoutPercentage || 0);

    if (prem <= 0 && rev <= 0) {
      setHistoricalError("Please enter a valid Premium or Revenue / Commission Amount");
      return;
    }

    const calculatedRev = rev > 0 ? rev : (prem * pct) / 100;

    try {
      setHistoricalSaving(true);
      await api.addHistoricalRevenue({
        policyNumber: historicalForm.policyNumber.trim() || undefined,
        customerName: historicalForm.customerName.trim() || undefined,
        customerPhone: historicalForm.customerPhone.trim() || undefined,
        insuranceCompanyId: historicalForm.insuranceCompanyId,
        companyName: historicalForm.companyName,
        businessType: historicalForm.businessType,
        businessSubtype: historicalForm.businessSubtype,
        premiumAmount: prem,
        appliedPayoutPercentage: pct,
        revenueAmount: Math.round(calculatedRev * 100) / 100,
        revenueDate: historicalForm.revenueDate || new Date().toISOString().split("T")[0],
        commissionStatus: historicalForm.commissionStatus,
        advisorId: historicalForm.advisorId || undefined,
        advisorName: historicalForm.advisorName || undefined,
        notes: historicalForm.notes
      });

      setIsHistoricalModalOpen(false);
      setHistoricalForm({
        policyNumber: "",
        customerName: "",
        customerPhone: "",
        insuranceCompanyId: "",
        companyName: "",
        businessType: "NEW_BUSINESS",
        businessSubtype: "FRESH",
        premiumAmount: "",
        appliedPayoutPercentage: "",
        revenueAmount: "",
        revenueDate: "",
        commissionStatus: "Paid",
        advisorId: "",
        advisorName: "",
        notes: ""
      });

      await fetchRevenue();
    } catch (err: any) {
      console.error("Historical revenue save error:", err);
      setHistoricalError(err.message || "Failed to save historical revenue");
    } finally {
      setHistoricalSaving(false);
    }
  };

  const isFilterActive = 
    datePreset !== "all" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    sourceTypeFilter !== "All" ||
    businessTypeFilter !== "All" ||
    policyStatusFilter !== "All" ||
    cashbackFilter !== "All" ||
    bmFilter !== "All" ||
    teamManagerFilter !== "All" ||
    teamLeaderFilter !== "All" ||
    tseFilter !== "All" ||
    companyFilter !== "All" ||
    commissionStatusFilter !== "All" ||
    selectedContestPaymentStatus !== "All" ||
    searchTerm.trim() !== "";

  const handleConfirmTogglePayment = async () => {
    try {
      if (confirmModalState.type === "commission") {
        await api.updatePolicyCommissionStatus(confirmModalState.id, confirmModalState.newStatus);
      } else {
        await api.updateContestPaymentStatus(confirmModalState.id, confirmModalState.newStatus);
      }
      setConfirmModalState({ isOpen: false, type: "commission", id: "", label: "", amount: 0, newStatus: "Paid" });
      fetchRevenue();
    } catch (err: any) {
      console.error("Error updating payment status:", err);
      alert(err.message || "Failed to update payment status");
    }
  };

  const fmt = (val: number) => (val || 0).toLocaleString("en-IN");

  const summary = data?.summary || {
    totalEarnedRevenue: 0,
    receivedRevenue: 0,
    pendingRevenue: 0,
    pendingCommission: 0,
    pendingContestReward: 0,
    totalExpectedCommission: 0,
    paidCommission: 0,
    unpaidCommission: 0,
    totalQualifiedContestRewards: 0,
    paidQualifiedContestRewards: 0,
    unpaidQualifiedContestRewards: 0
  };

  // Commission Policies Search & Pagination
  const rawCommissionPolicies: Policy[] = data?.commissionPolicies || [];
  const commissionPolicies: Policy[] = rawCommissionPolicies.filter((p: Policy) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return (
      (p.policyNumber && p.policyNumber.toLowerCase().includes(q)) ||
      (p.customerName && p.customerName.toLowerCase().includes(q)) ||
      (p.customerPhone && p.customerPhone.toLowerCase().includes(q)) ||
      (p.companyName && p.companyName.toLowerCase().includes(q)) ||
      (p.productName && p.productName.toLowerCase().includes(q)) ||
      (p.callerName && p.callerName.toLowerCase().includes(q)) ||
      (p.tseName && p.tseName.toLowerCase().includes(q)) ||
      (p.teamLeaderName && p.teamLeaderName.toLowerCase().includes(q)) ||
      (p.bmName && p.bmName.toLowerCase().includes(q))
    );
  });
  const totalCommissionRecords = commissionPolicies.length;
  const totalCommissionPages = Math.max(1, Math.ceil(totalCommissionRecords / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalCommissionPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCommissionRecords);
  const paginatedCommissionPolicies = commissionPolicies.slice(startIndex, endIndex);

  const getPageNumbers = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    if (totalCommissionPages <= 7) {
      for (let i = 1; i <= totalCommissionPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push("...");
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalCommissionPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safeCurrentPage < totalCommissionPages - 2) pages.push("...");
      pages.push(totalCommissionPages);
    }
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#660000]" />
            Revenue Management & Financial Tracking
          </h2>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Unified revenue tracking combining Insurance Policy Commissions & Qualified Contest Rewards
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRevenue}
            disabled={loading}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl transition cursor-pointer shadow-2xs"
            title="Refresh Revenue Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#660000]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Top Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Earned */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">Total Earned Revenue</span>
          <div className="text-lg font-bold text-slate-900 font-mono">₹{fmt(summary.totalEarnedRevenue)}</div>
          <span className="text-[10px] font-medium text-slate-400 block">Commissions + Rewards</span>
        </div>

        {/* Received Revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">Received Revenue</span>
          <div className="text-lg font-bold text-slate-900 font-mono">₹{fmt(summary.receivedRevenue)}</div>
          <span className="text-[10px] font-medium text-slate-400 block">Paid Commissions + Rewards</span>
        </div>

        {/* Pending Revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">Pending Revenue</span>
          <div className="text-lg font-bold text-slate-900 font-mono">₹{fmt(summary.pendingRevenue)}</div>
          <span className="text-[10px] font-medium text-slate-400 block">Unpaid Revenue Receivable</span>
        </div>

        {/* Total Commission Revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">Commission Revenue</span>
          <div className="text-lg font-bold text-slate-900 font-mono">₹{fmt(summary.totalExpectedCommission)}</div>
          <span className="text-[10px] font-medium text-slate-400 block">Across {summary.policyCount || 0} policies</span>
        </div>

        {/* Contest Reward Revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">Contest Reward Revenue</span>
          <div className="text-lg font-bold text-slate-900 font-mono">₹{fmt(summary.totalQualifiedContestRewards)}</div>
          <span className="text-[10px] font-medium text-slate-400 block">From {summary.qualifiedContestCount || 0} contests</span>
        </div>
      </div>

      {/* PENDING REVENUE BREAKDOWN CARD */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-slate-700">
            <AlertCircle className="w-4 h-4 text-slate-400" />
            Pending Revenue Summary
          </h3>
          <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-xs text-slate-800">
            Total Pending: ₹{fmt(summary.pendingRevenue)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/70 border border-slate-200/70 p-4 rounded-xl">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Pending Commission</span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">₹{fmt(summary.pendingCommission)}</div>
            <span className="text-[10px] font-normal text-slate-500">Unpaid Policy Commission</span>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Pending Contest Rewards</span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">₹{fmt(summary.pendingContestReward)}</div>
            <span className="text-[10px] font-normal text-slate-500">Unpaid Contest Rewards</span>
          </div>

          <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Total Pending Receivable</span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">₹{fmt(summary.pendingRevenue)}</div>
            <span className="text-[10px] font-normal text-slate-500">Combined Pending Revenue</span>
          </div>
        </div>
      </div>

      {/* 6 DEDICATED REVENUE BREAKDOWN CARDS (FRESH, PORT, RENEWAL & TOTALS) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-600" />
              <span>Business & Revenue Type Breakdown</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200/80 font-semibold rounded-md">
              {datePreset === "last_month" ? "Previous Month Performance" : datePreset === "this_month" ? "Current Month Performance" : "Active Date Range"}
            </span>
          </div>
          <div className="text-xs font-mono font-bold text-slate-900">
            Total Net Revenue: ₹{fmt(summary.totalRevenue || summary.totalExpectedCommission || 0)}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* 1. Fresh Revenue */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Fresh Revenue</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200/80 font-mono">
                {summary.freshCount || 0} Pol
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-900">₹{fmt(summary.freshRevenue || 0)}</div>
            <span className="text-[11px] font-medium text-slate-500 block truncate">
              Prem: ₹{fmt(summary.freshPremium || 0)}
            </span>
          </div>

          {/* 2. Port Revenue */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Port Revenue</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200/80 font-mono">
                {summary.portCount || 0} Pol
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-900">₹{fmt(summary.portRevenue || 0)}</div>
            <span className="text-[11px] font-medium text-slate-500 block truncate">
              Prem: ₹{fmt(summary.portPremium || 0)}
            </span>
          </div>

          {/* 3. Total New Business Revenue */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Total New Business</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200/80 font-mono">
                {summary.totalNewBusinessCount || (summary.freshCount || 0) + (summary.portCount || 0)} Pol
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-900">₹{fmt(summary.totalNewBusinessRevenue || 0)}</div>
            <span className="text-[11px] font-medium text-slate-500 block truncate">
              Fresh + Port Revenue
            </span>
          </div>

          {/* 4. Renewal Revenue */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Renewal Revenue</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200/80 font-mono">
                {summary.renewalCount || 0} Pol
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-900">₹{fmt(summary.renewalRevenue || 0)}</div>
            <span className="text-[11px] font-medium text-slate-500 block truncate">
              Prem: ₹{fmt(summary.renewalPremium || 0)}
            </span>
          </div>

          {/* 5. Total Renewal Revenue */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Total Renewal Rev</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200/80 font-mono">
                Renewal
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-900">₹{fmt(summary.totalRenewalRevenue || summary.renewalRevenue || 0)}</div>
            <span className="text-[11px] font-medium text-slate-500 block truncate">
              Prem: ₹{fmt(summary.totalRenewalPremium || summary.renewalPremium || 0)}
            </span>
          </div>

          {/* 6. Combined Total Net Revenue */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Total Net Revenue</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200/80 font-mono">
                All Types
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-900">₹{fmt(summary.totalRevenue || summary.totalExpectedCommission || 0)}</div>
            <span className="text-[11px] font-medium text-slate-500 block truncate">
              Total Prem: ₹{fmt(summary.totalPremium || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Comprehensive Revenue Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Filter className="w-4 h-4 text-[#660000]" />
              <span>Revenue Filters</span>
            </div>

            {/* Reset Filters Button */}
            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1 bg-[#DFBFBA]/25 hover:bg-[#DFBFBA]/45 text-[#660000] border border-[#DFBFBA]/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Reset all filters to default"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Search Input Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search Policy No, Customer, Phone, Company..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#660000] rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                title="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
          {/* Date Preset */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Date Range</label>
            <select
              value={datePreset}
              onChange={e => setDatePreset(e.target.value as DatePreset)}
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Source Type */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Source Type</label>
            <select
              value={sourceTypeFilter}
              onChange={e => setSourceTypeFilter(e.target.value)}
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition cursor-pointer"
            >
              <option value="All">All Sources</option>
              <option value="sales_team">Sales Team</option>
              <option value="direct">Direct</option>
              <option value="referral">Referral</option>
            </select>
          </div>

          {/* Business Type */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Business Type</label>
            <select
              value={businessTypeFilter}
              onChange={e => setBusinessTypeFilter(e.target.value)}
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="NEW_BUSINESS">New Business</option>
              <option value="FRESH">New Business (Fresh)</option>
              <option value="PORT">New Business (Port)</option>
              <option value="RENEWAL">Renewal</option>
            </select>
          </div>

          {/* Policy Status */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Policy Status</label>
            <select
              value={policyStatusFilter}
              onChange={e => setPolicyStatusFilter(e.target.value)}
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Issued">Issued</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Cashback */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Cashback</label>
            <select
              value={cashbackFilter}
              onChange={e => setCashbackFilter(e.target.value)}
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition cursor-pointer"
            >
              <option value="All">All Cashback</option>
              <option value="NEW_BUSINESS_CASHBACK">New Business Cashback</option>
              <option value="FRESH_CASHBACK">Fresh Cashback</option>
              <option value="PORT_CASHBACK">Port Cashback</option>
              <option value="RENEWAL_CASHBACK">Renewal Cashback</option>
              <option value="Yes">Cashback: Yes</option>
              <option value="No">Cashback: No</option>
            </select>
          </div>

          {/* BM Manager */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">BM Manager</label>
            <select
              value={bmFilter}
              onChange={e => {
                setBmFilter(e.target.value);
                setTeamManagerFilter("All");
                setTeamLeaderFilter("All");
                setTseFilter("All");
              }}
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition cursor-pointer"
            >
              <option value="All">All BMs</option>
              {bms.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Team Manager */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Team Manager</label>
            <select
              value={teamManagerFilter}
              onChange={e => {
                setTeamManagerFilter(e.target.value);
                setTeamLeaderFilter("All");
                setTseFilter("All");
              }}
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition cursor-pointer"
            >
              <option value="All">All TMs</option>
              {filteredTmOptions.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
            </select>
          </div>

          {/* Team Leader */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Team Leader</label>
            <select
              value={teamLeaderFilter}
              onChange={e => {
                setTeamLeaderFilter(e.target.value);
                setTseFilter("All");
              }}
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition cursor-pointer"
            >
              <option value="All">All TLs</option>
              {filteredTlOptions.map(tl => <option key={tl.id} value={tl.id}>{tl.name}</option>)}
            </select>
          </div>

          {/* TSE Caller */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">TSE Caller</label>
            <select
              value={tseFilter}
              onChange={e => setTseFilter(e.target.value)}
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition cursor-pointer"
            >
              <option value="All">All TSEs</option>
              {filteredTseOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Insurance Company */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Insurance Company</label>
            <select
              value={companyFilter}
              onChange={e => setCompanyFilter(e.target.value)}
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition cursor-pointer"
            >
              <option value="All">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Commission Status */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Commission Status</label>
            <select
              value={commissionStatusFilter}
              onChange={e => setCommissionStatusFilter(e.target.value)}
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Unpaid">Unpaid Only</option>
              <option value="Paid">Paid Only</option>
            </select>
          </div>
        </div>

        {/* Dynamic Month or Custom Date Range Inputs */}
        {datePreset === "monthly" && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Select Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-white border border-slate-200/90 focus:border-[#660000] rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none"
              />
            </div>
          </div>
        )}

        {datePreset === "custom" && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="bg-white border border-slate-200/90 focus:border-[#660000] rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="bg-white border border-slate-200/90 focus:border-[#660000] rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}



      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("commission")}
          className={`px-4 py-2.5 text-xs font-semibold cursor-pointer border-b-2 transition flex items-center gap-2 ${
            activeTab === "commission"
              ? "border-[#660000] text-[#660000] font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <IndianRupee className="w-4 h-4" />
          <span>Commission Revenue Ledger ({data?.commissionPolicies?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("contest")}
          className={`px-4 py-2.5 text-xs font-semibold cursor-pointer border-b-2 transition flex items-center gap-2 ${
            activeTab === "contest"
              ? "border-[#660000] text-[#660000] font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>Contest Revenue Ledger ({data?.contestItems?.length || 0})</span>
        </button>
      </div>

      {/* Tab 1: Commission Revenue Table */}
      {activeTab === "commission" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              Revenue Ledger Records ({totalCommissionRecords})
            </h3>
            {totalCommissionRecords > 0 && (
              <span className="text-[11px] text-slate-500 font-medium">
                Showing {startIndex + 1}–{endIndex} of {totalCommissionRecords}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3 text-center border-r border-slate-200/50 w-14">S.No.</th>
                  <th className="py-3 px-4 border-r border-slate-200/50">Policy No.</th>
                  <th className="py-3 px-4 border-r border-slate-200/50">Customer</th>
                  <th className="py-3 px-4 border-r border-slate-200/50">Company</th>
                  <th className="py-3 px-4 border-r border-slate-200/50">Business Type</th>
                  <th className="py-3 px-4 text-right border-r border-slate-200/50">Premium</th>
                  <th className="py-3 px-4 text-right border-r border-slate-200/50">Payout %</th>
                  <th className="py-3 px-4 text-right border-r border-slate-200/50">Expected Commission</th>
                  <th className="py-3 px-4 text-center border-r border-slate-200/50">Commission Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {paginatedCommissionPolicies.map((p: Policy, idx: number) => {
                  const serialNumber = (safeCurrentPage - 1) * pageSize + idx + 1;
                  const isPaid = p.commissionStatus === "Paid";
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-3 text-center font-mono font-medium text-slate-500 border-r border-slate-100">{serialNumber}</td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700 border-r border-slate-100">{p.policyNumber}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 border-r border-slate-100">{p.customerName}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 border-r border-slate-100">{p.companyName}</td>
                      <td className="py-3.5 px-4 border-r border-slate-100 font-medium text-xs text-slate-700">
                        {p.businessType === "RENEWAL" ? "Renewal" : (p.businessType === "PORT" || (p.businessSubtype || "").toUpperCase() === "PORT" || Boolean(p.portabilityDetails?.previousInsuranceCompany)) ? "New Business (Port)" : "New Business (Fresh)"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 border-r border-slate-100">₹{fmt(p.premiumAmount)}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-800 border-r border-slate-100">
                        {p.appliedPayoutPercentage !== undefined && p.appliedPayoutPercentage !== null ? p.appliedPayoutPercentage : getStandardPercentage(p)}%
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-700 border-r border-slate-100">₹{fmt(p.expectedCommission || 0)}</td>
                      <td className="py-3.5 px-4 text-center border-r border-slate-100">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-sky-50 text-sky-700 border-sky-200"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? "bg-emerald-500" : "bg-sky-500"}`}></span>
                          {p.commissionStatus || "Unpaid"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {canEditCommission && (
                            <button
                              onClick={() => handleOpenCommissionModal(p)}
                              className="p-1.5 bg-[#DFBFBA]/20 hover:bg-[#DFBFBA]/40 text-[#660000] hover:text-[#500000] border border-[#DFBFBA]/60 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center justify-center shadow-2xs"
                              title="Edit Policy Commission"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setConfirmModalState({
                                isOpen: true,
                                type: "commission",
                                id: p.id || "",
                                label: `Policy #${p.policyNumber}`,
                                amount: p.expectedCommission || 0,
                                newStatus: isPaid ? "Unpaid" : "Paid"
                              })
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition min-w-[58px] ${
                              isPaid
                                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                                : "bg-[#660000] hover:bg-[#500000] text-white shadow-2xs"
                            }`}
                            title={isPaid ? "Click to Mark Unpaid" : "Click to Mark Paid"}
                          >
                            {isPaid ? "Unpaid" : "Paid"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(!data?.commissionPolicies || data.commissionPolicies.length === 0) && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500 font-medium">
                      No commission policies found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalCommissionRecords > 0 && (
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span>
                  Showing <span className="font-bold text-slate-900">{startIndex + 1}</span> to{" "}
                  <span className="font-bold text-slate-900">{endIndex}</span> of{" "}
                  <span className="font-bold text-slate-900">{totalCommissionRecords}</span> records
                </span>
                <div className="flex items-center gap-1.5 ml-1 sm:ml-3 sm:border-l border-slate-200 sm:pl-3">
                  <span className="text-slate-500 font-medium">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500 transition cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1">
                  {getPageNumbers().map((pageNum, i) =>
                    pageNum === "..." ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-xs text-slate-400">...</span>
                    ) : (
                      <button
                        key={`page-${pageNum}`}
                        type="button"
                        onClick={() => setCurrentPage(Number(pageNum))}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                          safeCurrentPage === pageNum
                            ? "bg-[#660000] text-white shadow-xs"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalCommissionPages, p + 1))}
                  disabled={safeCurrentPage === totalCommissionPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalCommissionPages)}
                  disabled={safeCurrentPage === totalCommissionPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Contest Revenue Table */}
      {activeTab === "contest" && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-slate-800">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-3 font-semibold text-center border-r border-slate-200/50 w-14">S.No.</th>
                  <th className="py-3.5 px-4 font-semibold border-r border-slate-200/50">Contest Name</th>
                  <th className="py-3.5 px-4 font-semibold border-r border-slate-200/50">Insurance Company</th>
                  <th className="py-3.5 px-4 font-semibold border-r border-slate-200/50">Type</th>
                  <th className="py-3.5 px-4 font-semibold text-right border-r border-slate-200/50">Target (₹)</th>
                  <th className="py-3.5 px-4 font-semibold text-right border-r border-slate-200/50">Achieved (₹)</th>
                  <th className="py-3.5 px-4 font-semibold text-right border-r border-slate-200/50">Achievement</th>
                  <th className="py-3.5 px-4 font-semibold text-center border-r border-slate-200/50">Qualification</th>
                  <th className="py-3.5 px-4 font-semibold text-right border-r border-slate-200/50">Reward Amount</th>
                  <th className="py-3.5 px-4 font-semibold text-center border-r border-slate-200/50">Payment Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-normal">
                {(data?.contestItems || []).map((c: any, idx: number) => {
                  const isQualified = c.qualificationStatus === "QUALIFIED";
                  const isPaid = c.paymentStatus === "Paid";
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-3 text-center font-mono font-medium text-slate-500 border-r border-slate-100">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 border-r border-slate-100">{c.name}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 border-r border-slate-100">{c.companyName}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 border-r border-slate-100">{c.type}</td>
                      <td className="py-3.5 px-4 text-right font-mono border-r border-slate-100">₹{fmt(c.targetAmount)}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 border-r border-slate-100">₹{fmt(c.actualBusiness || 0)}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 border-r border-slate-100">{(c.achievementPercentage || 0).toFixed(1)}%</td>
                      <td className="py-3.5 px-4 text-center border-r border-slate-100">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                          isQualified ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}>
                          {isQualified ? "QUALIFIED ✓" : "NOT QUALIFIED"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-purple-700 border-r border-slate-100">₹{fmt(c.rewardAmount)}</td>
                      <td className="py-3.5 px-4 text-center border-r border-slate-100">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-sky-50 text-sky-700 border-sky-200"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? "bg-emerald-500" : "bg-sky-500"}`}></span>
                          {c.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isQualified ? (
                          <button
                            onClick={() =>
                              setConfirmModalState({
                                isOpen: true,
                                type: "contest",
                                id: c.id,
                                label: `Contest '${c.name}'`,
                                amount: c.rewardAmount,
                                newStatus: isPaid ? "Unpaid" : "Paid"
                              })
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition min-w-[58px] ${
                              isPaid
                                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                                : "bg-[#660000] hover:bg-[#500000] text-white shadow-2xs"
                            }`}
                            title={isPaid ? "Click to Mark Unpaid" : "Click to Mark Paid"}
                          >
                            {isPaid ? "Unpaid" : "Paid"}
                          </button>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400 italic">Not Met</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {(!data?.contestItems || data.contestItems.length === 0) && (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-slate-500 font-medium">
                      No contest revenue items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={`Mark ${confirmModalState.type === "commission" ? "Commission" : "Contest Reward"} as ${confirmModalState.newStatus}`}
        message={`Are you sure you want to mark ₹${fmt(confirmModalState.amount)} for ${confirmModalState.label} as ${confirmModalState.newStatus}?`}
        confirmText={`Mark as ${confirmModalState.newStatus}`}
        cancelText="Cancel"
        type={confirmModalState.newStatus === "Paid" ? "info" : "danger"}
        onConfirm={handleConfirmTogglePayment}
        onCancel={() => setConfirmModalState({ isOpen: false, type: "commission", id: "", label: "", amount: 0, newStatus: "Paid" })}
      />

      {/* Dedicated Policy Commission Edit Modal (Simple & Formal) */}
      {editCommissionModalState.isOpen && editCommissionModalState.policy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 text-slate-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Policy Commission</h3>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Policy: <span className="font-mono font-semibold text-slate-700">{editCommissionModalState.policy.policyNumber || "—"}</span> • {editCommissionModalState.policy.customerName || "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditCommissionModalState({ isOpen: false, policy: null, percentageInput: "", commissionStatus: "Unpaid", saving: false, error: null })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCommissionModal} className="p-6 space-y-4">
              {editCommissionModalState.error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{editCommissionModalState.error}</span>
                </div>
              )}

              {/* Policy Quick Information Summary */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Company</span>
                  <span className="font-medium text-slate-800 truncate block mt-0.5">{editCommissionModalState.policy.companyName || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Policy Premium</span>
                  <span className="font-mono font-bold text-slate-900 block mt-0.5">₹{fmt(editCommissionModalState.policy.premiumAmount)}</span>
                </div>
              </div>

              {/* Commission Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Company Standard Rate
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${getStandardPercentage(editCommissionModalState.policy)}%`}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-600 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                    Policy Commission (%) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    autoFocus
                    value={editCommissionModalState.percentageInput}
                    onChange={(e) => setEditCommissionModalState(prev => ({ ...prev, percentageInput: e.target.value, error: null }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    placeholder="e.g. 12.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Expected Commission (₹)
                  </label>
                  {(() => {
                    const numPrem = Number(editCommissionModalState.policy.premiumAmount || 0);
                    const numPct = parseFloat(editCommissionModalState.percentageInput) || 0;
                    const calcAmt = Math.round(((numPrem * numPct) / 100) * 100) / 100;
                    return (
                      <input
                        type="text"
                        disabled
                        value={`₹${fmt(calcAmt)}`}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 cursor-not-allowed"
                      />
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Commission Status
                  </label>
                  <select
                    value={editCommissionModalState.commissionStatus}
                    onChange={(e) => setEditCommissionModalState(prev => ({ ...prev, commissionStatus: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 cursor-pointer"
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={editCommissionModalState.saving}
                  onClick={() => setEditCommissionModalState({ isOpen: false, policy: null, percentageInput: "", commissionStatus: "Unpaid", saving: false, error: null })}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editCommissionModalState.saving}
                  className="px-5 py-2 bg-[#660000] hover:bg-[#500000] text-white rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 disabled:opacity-50 shadow-2xs"
                >
                  {editCommissionModalState.saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Historical Revenue Modal */}
      {isHistoricalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-900 text-white rounded-lg">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Historical Revenue Record</h3>
                  <p className="text-xs text-slate-500 font-normal mt-0.5">
                    Enter missing previous-month business data & commission records for real MongoDB persistence
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoricalModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveHistoricalRevenue} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {historicalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{historicalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Insurance Company */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Insurance Company <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={historicalForm.insuranceCompanyId}
                    onChange={(e) => {
                      const comp = companies.find(c => c.id === e.target.value);
                      setHistoricalForm(prev => ({
                        ...prev,
                        insuranceCompanyId: e.target.value,
                        companyName: comp ? comp.name : ""
                      }));
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-800"
                  >
                    <option value="">Select Insurance Company</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Business Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Business Type</label>
                  <select
                    value={historicalForm.businessType}
                    onChange={(e) => setHistoricalForm(prev => ({ ...prev, businessType: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-800"
                  >
                    <option value="NEW_BUSINESS">New Business</option>
                    <option value="RENEWAL">Renewal</option>
                  </select>
                </div>

                {/* Business Subtype */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Business Subtype</label>
                  <select
                    value={historicalForm.businessSubtype}
                    onChange={(e) => setHistoricalForm(prev => ({ ...prev, businessSubtype: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-800"
                  >
                    <option value="FRESH">Fresh</option>
                    <option value="PORT">Port</option>
                    <option value="RENEWAL">Renewal</option>
                  </select>
                </div>

                {/* Policy Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Policy Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. POL-2024-998"
                    value={historicalForm.policyNumber}
                    onChange={(e) => setHistoricalForm(prev => ({ ...prev, policyNumber: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                {/* Customer Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Suresh Kumar"
                    value={historicalForm.customerName}
                    onChange={(e) => setHistoricalForm(prev => ({ ...prev, customerName: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                {/* Premium Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Premium Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="e.g. 25000"
                    value={historicalForm.premiumAmount}
                    onChange={(e) => {
                      const prem = Number(e.target.value || 0);
                      const pct = Number(historicalForm.appliedPayoutPercentage || 0);
                      setHistoricalForm(prev => ({
                        ...prev,
                        premiumAmount: e.target.value,
                        revenueAmount: pct > 0 ? String(Math.round((prem * pct) / 100)) : prev.revenueAmount
                      }));
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                {/* Commission / Payout Percentage */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="e.g. 15"
                    value={historicalForm.appliedPayoutPercentage}
                    onChange={(e) => {
                      const pct = Number(e.target.value || 0);
                      const prem = Number(historicalForm.premiumAmount || 0);
                      setHistoricalForm(prev => ({
                        ...prev,
                        appliedPayoutPercentage: e.target.value,
                        revenueAmount: prem > 0 ? String(Math.round((prem * pct) / 100)) : prev.revenueAmount
                      }));
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>

                {/* Revenue / Commission Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Revenue / Commission Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="e.g. 3750"
                    value={historicalForm.revenueAmount}
                    onChange={(e) => setHistoricalForm(prev => ({ ...prev, revenueAmount: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:border-slate-800"
                  />
                </div>

                {/* Business / Revenue Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Revenue / Business Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={historicalForm.revenueDate}
                    onChange={(e) => setHistoricalForm(prev => ({ ...prev, revenueDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-800 font-mono"
                  />
                </div>

                {/* Commission Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Commission Status</label>
                  <select
                    value={historicalForm.commissionStatus}
                    onChange={(e) => setHistoricalForm(prev => ({ ...prev, commissionStatus: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-800"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Historical Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. Added from offline ledger for August 2026 reconciliation"
                    value={historicalForm.notes}
                    onChange={(e) => setHistoricalForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={historicalSaving}
                  onClick={() => setIsHistoricalModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={historicalSaving}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 disabled:opacity-50 shadow-2xs"
                >
                  {historicalSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Atlas...</span>
                    </>
                  ) : (
                    <span>Save Historical Revenue</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
