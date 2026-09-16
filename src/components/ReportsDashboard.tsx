import React, { useState, useEffect, useRef } from "react";
import { api, UserSession, fetchAgencyProfile } from "../lib/api";
import { TeamLeaderMaster, CallerMaster, TeamManagerMaster, AgencyProfile } from "../types";
import {
  BarChart3, TrendingUp, RefreshCw, Award, AlertCircle, Users, PhoneCall,
  Filter, Briefcase, IndianRupee, ArrowUpRight, ArrowDownRight, Download,
  FileText, FileSpreadsheet, ChevronDown, Building2, Layers, DollarSign,
  Shield, CheckCircle, Clock, XCircle, UserCheck, CheckCircle2, Eye, X,
  ChevronLeft, ChevronRight, ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ExcelJS from "exceljs";

interface ReportsDashboardProps {
  user: UserSession;
}

type DatePreset = "all" | "today" | "this_week" | "this_month" | "last_month" | "monthly" | "custom";

function escapeHtml(str: any): string {
  return String(str ?? "").replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m));
}

export default function ReportsDashboard({ user }: ReportsDashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const defaultMonthStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

  // Master data for filter dropdowns
  const [bms, setBms] = useState<any[]>([]);
  const [teamManagers, setTeamManagers] = useState<TeamManagerMaster[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<TeamLeaderMaster[]>([]);
  const [tseList, setTseList] = useState<CallerMaster[]>([]);
  const [companyList, setCompanyList] = useState<any[]>([]);
  const [advisorList, setAdvisorList] = useState<any[]>([]);

  // Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(defaultMonthStr);
  const [appliedMonth, setAppliedMonth] = useState(defaultMonthStr);
  const [businessTypeFilter, setBusinessTypeFilter] = useState("All");
  const [policyStatusFilter, setPolicyStatusFilter] = useState("All");
  const [cashbackFilter, setCashbackFilter] = useState("All");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [advisorFilter, setAdvisorFilter] = useState("All");
  const [bmFilter, setBmFilter] = useState("All");
  const [teamManagerFilter, setTeamManagerFilter] = useState("All");
  const [teamLeaderFilter, setTeamLeaderFilter] = useState("All");
  const [tseFilter, setTseFilter] = useState("All");
  const [operatorFilter, setOperatorFilter] = useState("All");
  const [sourceTypeFilter, setSourceTypeFilter] = useState("All");

  const [activeTab, setActiveTab] = useState<"overview" | "bm" | "tm" | "teamleader" | "tse" | "operator" | "company" | "renewal" | "birthday">("overview");
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"dashboard" | "review">("dashboard");
  const [previewPage, setPreviewPage] = useState(1);
  const PREVIEW_PAGE_SIZE = 25;

  // Close export menu on click outside
  const exportMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Agency Profile for dynamic company branding
  const [agencyProfile, setAgencyProfile] = useState<AgencyProfile | null>(null);

  useEffect(() => {
    const tenantId = user?.tenantId || user?.uid || "tenant-default";
    if (tenantId) {
      fetchAgencyProfile(tenantId)
        .then(p => { if (p) setAgencyProfile(p); })
        .catch(() => {});
    }
  }, [user]);

  const companyDisplayName = agencyProfile?.companyName || agencyProfile?.agencyName || "Policy Master";
  const companyDisplayUpper = (agencyProfile?.companyName || agencyProfile?.agencyName || "POLICY MASTER").toUpperCase();

  useEffect(() => {
    api.getBMsMaster().then(setBms).catch(() => { });
    api.getTMsMaster().then(setTeamManagers).catch(() => { });
    api.getTeamLeadersMaster().then(setTeamLeaders).catch(() => { });
    api.getCallersMaster().then(setTseList).catch(() => { });
    api.getInsuranceCompanies().then(setCompanyList).catch(() => { });
    api.getActiveAdvisors().then(setAdvisorList).catch(() => { });
  }, []);

  const computeDateRange = (preset: DatePreset) => {
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();

    switch (preset) {
      case "today":
        const todayStr = `${y}-${pad(m + 1)}-${pad(d)}`;
        return { from: todayStr, to: todayStr };
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
        const targetMonth = appliedMonth || selectedMonth || `${y}-${pad(m + 1)}`;
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

  const fetchReports = async () => {
    setLoading(true);
    setError("");
    try {
      const { from, to } = computeDateRange(datePreset);
      const filters: Record<string, string> = {};
      if (from) filters.dateFrom = from;
      if (to) filters.dateTo = to;
      if (businessTypeFilter !== "All") filters.businessType = businessTypeFilter;
      if (policyStatusFilter !== "All") filters.policyStatus = policyStatusFilter;
      if (cashbackFilter !== "All") filters.cashback = cashbackFilter;
      if (companyFilter !== "All") filters.companyName = companyFilter;
      if (advisorFilter !== "All") filters.advisorId = advisorFilter;
      if (bmFilter !== "All") filters.bmId = bmFilter;
      if (teamManagerFilter !== "All") filters.teamManagerId = teamManagerFilter;
      if (teamLeaderFilter !== "All") filters.teamLeaderId = teamLeaderFilter;
      if (tseFilter !== "All") filters.callerId = tseFilter;
      if (operatorFilter !== "All") filters.createdBy = operatorFilter;
      if (sourceTypeFilter !== "All") filters.sourceType = sourceTypeFilter;

      const result = await api.getBusinessReports(filters);
      setData(result);
    } catch (err: any) {
      setError(err.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [datePreset, dateFrom, dateTo, appliedMonth, businessTypeFilter, policyStatusFilter, cashbackFilter, companyFilter, advisorFilter, bmFilter, teamManagerFilter, teamLeaderFilter, tseFilter, operatorFilter, sourceTypeFilter]);

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

  const fmt = (n: number) => (n || 0).toLocaleString("en-IN");

  const getClassification = (p: any) => {
    const bType = String(p.businessType || "").trim().toUpperCase();
    const bSub = String(p.businessSubtype || "").trim().toUpperCase();
    if (bType === "RENEWAL" || bSub === "RENEWAL") return "Renewal";
    if (bType === "PORT" || bSub === "PORT" || Boolean(p.portabilityDetails?.previousInsuranceCompany)) return "Port";
    return "Fresh";
  };

  const getLoginDate = (p: any) => {
    if (p.businessLoginDate) {
      const d = String(p.businessLoginDate).trim();
      if (d) return d.split("T")[0];
    }
    if (p.startDate) {
      const s = String(p.startDate).trim();
      if (s) return s.split("T")[0];
    }
    if (p.createdAt) {
      try {
        return new Date(p.createdAt).toISOString().split("T")[0];
      } catch {
        return "—";
      }
    }
    return "—";
  };

  // Cashback Analytics Derived State (from API response or dynamically from filtered policies)
  const isCbPolicy = (p: any) =>
    (p.cashbackEnabled === true || p.cashbackEnabled === "true" || p.cashbackEnabled === "Yes") &&
    (Number(p.cashbackAmount) > 0);

  const freshCashbackTotal = data?.cashbackStats?.freshTotal ?? (
    (data?.policies || [])
      .filter((p: any) => getClassification(p) === "Fresh" && isCbPolicy(p))
      .reduce((sum: number, p: any) => sum + (Number(p.cashbackAmount) || 0), 0)
  );

  const freshCashbackCount = data?.cashbackStats?.freshCount ?? (
    (data?.policies || [])
      .filter((p: any) => getClassification(p) === "Fresh" && isCbPolicy(p))
      .length
  );

  const portCashbackTotal = data?.cashbackStats?.portTotal ?? (
    (data?.policies || [])
      .filter((p: any) => getClassification(p) === "Port" && isCbPolicy(p))
      .reduce((sum: number, p: any) => sum + (Number(p.cashbackAmount) || 0), 0)
  );

  const portCashbackCount = data?.cashbackStats?.portCount ?? (
    (data?.policies || [])
      .filter((p: any) => getClassification(p) === "Port" && isCbPolicy(p))
      .length
  );

  const renewalCashbackTotal = data?.cashbackStats?.renewalTotal ?? (
    (data?.policies || [])
      .filter((p: any) => getClassification(p) === "Renewal" && isCbPolicy(p))
      .reduce((sum: number, p: any) => sum + (Number(p.cashbackAmount) || 0), 0)
  );

  const renewalCashbackCount = data?.cashbackStats?.renewalCount ?? (
    (data?.policies || [])
      .filter((p: any) => getClassification(p) === "Renewal" && isCbPolicy(p))
      .length
  );

  const newBusinessCashbackTotal = freshCashbackTotal + portCashbackTotal;
  const totalCashbackTotal = freshCashbackTotal + portCashbackTotal + renewalCashbackTotal;
  const totalCashbackCount = freshCashbackCount + portCashbackCount + renewalCashbackCount;

  // ─── EXPORT HELPERS ────────────────────────────────────────────────────────
  const getFormattedNow = () =>
    new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  const getTodayISO = () => new Date().toISOString().split("T")[0];

  const getAppliedFiltersSummary = () => {
    const getMonthLabel = () => {
      const targetStr = appliedMonth || selectedMonth;
      if (!targetStr) return "Monthly";
      const parts = targetStr.split("-");
      if (parts.length < 2) return "Monthly";
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return monthNames[monthIdx] ? `${monthNames[monthIdx]} ${year}` : targetStr;
    };

    const dateLabels: Record<string, string> = {
      all: "All Time", today: "Today", this_week: "This Week",
      this_month: "This Month", last_month: "Last Month",
      monthly: getMonthLabel(),
      custom: dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : "Custom Range"
    };
    const businessTypeLabels: Record<string, string> = {
      "All": "All Types",
      "NEW_BUSINESS": "New Business",
      "FRESH": "New Business (Fresh)",
      "PORT": "New Business (Port)",
      "RENEWAL": "Renewal"
    };

    const cashbackLabels: Record<string, string> = {
      "All": "All Cashback",
      "NEW_BUSINESS_CASHBACK": "New Business Cashback",
      "FRESH_CASHBACK": "Fresh Cashback",
      "PORT_CASHBACK": "Port Cashback",
      "RENEWAL_CASHBACK": "Renewal Cashback",
      "Yes": "Cashback: Yes",
      "No": "Cashback: No"
    };

    const selectedBm = bms.find(b => b.id === bmFilter);
    const selectedTm = teamManagers.find(t => t.id === teamManagerFilter);
    const selectedTl = teamLeaders.find(t => t.id === teamLeaderFilter);
    const selectedTse = tseList.find(t => t.id === tseFilter);
    const sourceLabel = sourceTypeFilter === "sales_team" ? "Sales Team" : sourceTypeFilter === "direct" ? "Direct" : sourceTypeFilter === "referral" ? "Referral" : "All Sources";
    return {
      dateRange: dateLabels[datePreset] || datePreset,
      sourceType: sourceLabel,
      businessType: businessTypeLabels[businessTypeFilter] || businessTypeFilter,
      policyStatus: policyStatusFilter,
      cashback: cashbackLabels[cashbackFilter] || cashbackFilter,
      bm: selectedBm ? selectedBm.name : "All BMs",
      teamManager: selectedTm ? selectedTm.name : "All Team Managers",
      teamLeader: selectedTl ? selectedTl.name : "All Team Leaders",
      tse: selectedTse ? selectedTse.name : "All TSEs"
    };
  };

  const getPolicyCashback = (p: any): number => {
    const isCb = (p.cashbackEnabled === true || p.cashbackEnabled === "true" || p.cashbackEnabled === "Yes") && (Number(p.cashbackAmount) > 0);
    return isCb ? Number(p.cashbackAmount) || 0 : 0;
  };

  const TAB_LABELS: Record<string, string> = {
    overview: "Overview", bm: "BM Performance", tm: "Team Manager", teamleader: "Team Leader",
    tse: "TSE", operator: "Data Executive",
    company: "Insurance Company",
    renewal: "Renewals", birthday: "Birthdays"
  };

  // ─── PROFESSIONAL EXCEL (.XLSX) POLICY LIST EXPORT ─────────────────────────
  const handleExportExcel = async () => {
    if (!data) {
      alert("No report data available for the selected filters.");
      return;
    }

    const policiesToExport: any[] = data.policies || [];
    if (policiesToExport.length === 0) {
      alert("No matching policies found for the selected filters to export.");
      return;
    }

    try {
      const filters = getAppliedFiltersSummary();
      const tabLabel = viewMode === "review" ? "Policy_Ledger" : (TAB_LABELS[activeTab] || activeTab);
      const dateStr = getTodayISO();
      const filename = `${companyDisplayUpper.replace(/[^A-Za-z0-9_]/g, "_")}_${tabLabel.replace(/ /g, "_")}_Report_${dateStr}.xlsx`;

      const totalPoliciesCount = policiesToExport.length;
      const totalPremiumSum = policiesToExport.reduce((acc, p) => acc + (Number(p.premiumAmount) || 0), 0);
      const totalCommissionSum = policiesToExport.reduce((acc, p) => acc + (Number(p.expectedCommission) || 0), 0);
      const totalCashbackSum = policiesToExport.reduce((acc, p) => acc + getPolicyCashback(p), 0);

      const workbook = new ExcelJS.Workbook();
      workbook.creator = companyDisplayName;
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Policy Ledger");

      // Page Setup for Printing
      sheet.pageSetup = {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9, // A4
        margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 }
      };

      // Set explicit column widths for 15 columns
      const columnWidths = [
        7,  // A: S.No
        18, // B: Policy Number
        26, // C: Customer Name
        30, // D: Insurance Company
        14, // E: Business Type
        13, // F: Policy Status
        15, // G: Business Login Date
        16, // H: Premium (₹)
        13, // I: Commission %
        16, // J: Commission (₹)
        15, // K: Cashback (₹)
        18, // L: BM
        18, // M: TM
        18, // N: TL
        18  // O: TSE
      ];
      columnWidths.forEach((w, i) => {
        sheet.getColumn(i + 1).width = w;
      });

      // Helper for clean borders
      const borderThin: Partial<ExcelJS.Borders> = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } }
      };

      // ── ROW 1: BRAND HEADER ──
      const row1 = sheet.getRow(1);
      row1.height = 24;
      sheet.mergeCells("A1:G1");
      const brandCell = sheet.getCell("A1");
      brandCell.value = companyDisplayUpper;
      brandCell.font = { name: "Calibri", size: 15, bold: true, color: { argb: "FF660000" } };
      brandCell.alignment = { vertical: "middle", horizontal: "left" };

      // ── ROW 2: SUBTITLE ──
      const row2 = sheet.getRow(2);
      row2.height = 18;
      sheet.mergeCells("A2:G2");
      const subCell = sheet.getCell("A2");
      subCell.value = `${companyDisplayName} — Reports & Analytics Policy Ledger`;
      subCell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FF334155" } };
      subCell.alignment = { vertical: "middle", horizontal: "left" };

      // ── ROWS 3–16: METADATA & FILTERS ──
      const metaItems = [
        { label: "Generated On:", value: getFormattedNow(), isBold: false },
        { label: "Total Matching Policies:", value: `${totalPoliciesCount}`, isBold: true },
        { label: "Total Premium:", value: `₹${fmt(totalPremiumSum)}`, isBold: true },
        { label: "Total Commission:", value: `₹${fmt(totalCommissionSum)}`, isBold: true },
        { label: "Total Cashback:", value: `₹${fmt(totalCashbackSum)}`, isBold: true },
        { label: "Date Range:", value: filters.dateRange, isBold: false },
        { label: "Source Type:", value: filters.sourceType, isBold: false },
        { label: "Business Type:", value: filters.businessType, isBold: false },
        { label: "Policy Status:", value: filters.policyStatus, isBold: false },
        { label: "Cashback Filter:", value: filters.cashback, isBold: false },
        { label: "Branch Manager (BM):", value: filters.bm, isBold: false },
        { label: "Team Manager (TM):", value: filters.teamManager, isBold: false },
        { label: "Team Leader (TL):", value: filters.teamLeader, isBold: false },
        { label: "TSE Caller:", value: filters.tse, isBold: false }
      ];

      metaItems.forEach((item, idx) => {
        const rIndex = 3 + idx;
        const row = sheet.getRow(rIndex);
        row.height = 18;

        sheet.mergeCells(`A${rIndex}:B${rIndex}`);
        const lblCell = sheet.getCell(`A${rIndex}`);
        lblCell.value = item.label;
        lblCell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FF475569" } };
        lblCell.alignment = { vertical: "middle", horizontal: "left" };

        sheet.mergeCells(`C${rIndex}:G${rIndex}`);
        const valCell = sheet.getCell(`C${rIndex}`);
        valCell.value = item.value;
        valCell.font = { name: "Calibri", size: 9.5, bold: item.isBold, color: { argb: item.isBold ? "FF0F172A" : "FF334155" } };
        valCell.alignment = { vertical: "middle", horizontal: "left" };
      });

      // ── SPACER BEFORE POLICY TABLE ──
      const policyTableSpacerRowIdx = 3 + metaItems.length;
      sheet.getRow(policyTableSpacerRowIdx).height = 12;

      // ── POLICY TABLE TITLE ──
      const policyTableTitleRowIdx = policyTableSpacerRowIdx + 1;
      const pTitleRow = sheet.getRow(policyTableTitleRowIdx);
      pTitleRow.height = 20;
      sheet.mergeCells(`A${policyTableTitleRowIdx}:O${policyTableTitleRowIdx}`);
      const pTitleCell = sheet.getCell(`A${policyTableTitleRowIdx}`);
      pTitleCell.value = `Policy-Level Ledger (${totalPoliciesCount} Records)`;
      pTitleCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF660000" } };
      pTitleCell.alignment = { vertical: "middle", horizontal: "left" };

      // ── POLICY TABLE HEADERS ──
      const tableHeaderRowIdx = policyTableTitleRowIdx + 1;
      const tableHeaderRow = sheet.getRow(tableHeaderRowIdx);
      tableHeaderRow.height = 24;
      const columnHeaders = [
        "S.No",
        "Policy Number",
        "Customer Name",
        "Insurance Company",
        "Business Type",
        "Policy Status",
        "Business Login Date",
        "Premium",
        "Commission %",
        "Commission",
        "Cashback",
        "BM",
        "TM",
        "TL",
        "TSE"
      ];

      columnHeaders.forEach((label, idx) => {
        const cell = tableHeaderRow.getCell(idx + 1);
        cell.value = label;
        cell.font = { name: "Calibri", bold: true, size: 9.5, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF660000" } };
        cell.alignment = {
          horizontal: ["Premium", "Commission", "Cashback"].includes(label) ? "right" : ["S.No", "Policy Number", "Business Type", "Policy Status", "Business Login Date", "Commission %"].includes(label) ? "center" : "left",
          vertical: "middle"
        };
        cell.border = {
          top: { style: "medium", color: { argb: "FF660000" } },
          bottom: { style: "medium", color: { argb: "FF660000" } },
          left: { style: "thin", color: { argb: "FF7F1D1D" } },
          right: { style: "thin", color: { argb: "FF7F1D1D" } }
        };
      });

      // ── DATA ROWS ──
      policiesToExport.forEach((p: any, idx: number) => {
        const cls = getClassification(p);
        const status = (p.policyStatus || "Pending").trim();
        const isEven = idx % 2 === 1;
        const cbAmount = getPolicyCashback(p);
        const commAmount = Number(p.expectedCommission || 0);
        const commPercentVal = Number(p.appliedPayoutPercentage || p.payoutPercentage || (p.premiumAmount && p.expectedCommission ? Math.round((Number(p.expectedCommission) / Number(p.premiumAmount)) * 100) : 0));
        const commPercentStr = commPercentVal > 0 ? `${commPercentVal}%` : "—";

        const rowValues = [
          idx + 1,
          String(p.policyNumber || "—").trim(),
          p.customerName || "—",
          p.companyName || "—",
          cls,
          status,
          getLoginDate(p),
          Number(p.premiumAmount || 0),
          commPercentStr,
          commAmount,
          cbAmount,
          p.bmName || "—",
          p.teamManagerName || "—",
          p.teamLeaderName || "—",
          p.callerName || p.tseName || "—"
        ];

        const dataRow = sheet.addRow(rowValues);
        dataRow.height = 19;

        rowValues.forEach((_, cIdx) => {
          const cell = dataRow.getCell(cIdx + 1);
          cell.font = { name: "Calibri", size: 9.5, color: { argb: "FF1E293B" } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: isEven ? "FFF8FAFC" : "FFFFFFFF" }
          };
          cell.border = borderThin;

          if (cIdx === 0) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.font = { name: "Calibri", size: 9, color: { argb: "FF64748B" } };
          } else if (cIdx === 1) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.font = { name: "Calibri", bold: true, size: 9.5, color: { argb: "FF0F172A" } };
          } else if (cIdx === 4 || cIdx === 5 || cIdx === 6 || cIdx === 8) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
            if (cIdx === 8) {
              cell.font = { name: "Calibri", bold: true, size: 9.5, color: { argb: "FF0F172A" } };
            }
          } else if (cIdx === 7 || cIdx === 9 || cIdx === 10) {
            cell.numFmt = "₹#,##0";
            cell.alignment = { horizontal: "right", vertical: "middle" };
            cell.font = { name: "Calibri", bold: true, size: 9.5, color: { argb: "FF0F172A" } };
          } else {
            cell.alignment = { horizontal: "left", vertical: "middle" };
          }
        });
      });

      // ── TOTAL SUMMARY ROW ──
      const totalRowIndex = tableHeaderRowIdx + 1 + policiesToExport.length;
      const totalRow = sheet.getRow(totalRowIndex);
      totalRow.height = 24;

      sheet.mergeCells(`A${totalRowIndex}:G${totalRowIndex}`);
      const totalLabelCell = sheet.getCell(`A${totalRowIndex}`);
      totalLabelCell.value = `TOTAL (${totalPoliciesCount} Policies):`;
      totalLabelCell.font = { name: "Calibri", bold: true, size: 10, color: { argb: "FF0F172A" } };
      totalLabelCell.alignment = { horizontal: "right", vertical: "middle" };

      // H: Premium
      const totalPremCell = sheet.getCell(`H${totalRowIndex}`);
      totalPremCell.value = totalPremiumSum;
      totalPremCell.numFmt = "₹#,##0";
      totalPremCell.font = { name: "Calibri", bold: true, size: 10, color: { argb: "FF0F172A" } };
      totalPremCell.alignment = { horizontal: "right", vertical: "middle" };

      // I: Commission % (Blank in Total row)
      const totalCommPercentCell = sheet.getCell(`I${totalRowIndex}`);
      totalCommPercentCell.value = "";

      // J: Commission
      const totalCommCell = sheet.getCell(`J${totalRowIndex}`);
      totalCommCell.value = totalCommissionSum;
      totalCommCell.numFmt = "₹#,##0";
      totalCommCell.font = { name: "Calibri", bold: true, size: 10, color: { argb: "FF0F172A" } };
      totalCommCell.alignment = { horizontal: "right", vertical: "middle" };

      // K: Cashback
      const totalCbCell = sheet.getCell(`K${totalRowIndex}`);
      totalCbCell.value = totalCashbackSum;
      totalCbCell.numFmt = "₹#,##0";
      totalCbCell.font = { name: "Calibri", bold: true, size: 10, color: { argb: "FF0F172A" } };
      totalCbCell.alignment = { horizontal: "right", vertical: "middle" };

      for (let c = 1; c <= 15; c++) {
        const cell = totalRow.getCell(c);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        cell.border = {
          top: { style: "medium", color: { argb: "FF94A3B8" } },
          bottom: { style: "double", color: { argb: "FF64748B" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } }
        };
      }

      // Enable AutoFilter on policy table headers
      sheet.autoFilter = {
        from: { row: tableHeaderRowIdx, column: 1 },
        to: { row: tableHeaderRowIdx, column: 15 }
      };

      // Generate .xlsx Binary Buffer & Trigger Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Failed to generate Excel file:", err);
      alert("Unable to generate Excel report. Please try again.");
    }
  };

  // ─── PDF PRINT EXPORT ────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!data) {
      alert("No report data available for the selected filters.");
      return;
    }

    const policiesToExport: any[] = data.policies || [];
    const filters = getAppliedFiltersSummary();
    const tabLabel = viewMode === "review" ? "Policy_Ledger" : (TAB_LABELS[activeTab] || activeTab);
    const dateStr = getTodayISO();
    const filename = `${companyDisplayUpper.replace(/[^A-Za-z0-9_]/g, "_")}_${tabLabel.replace(/ /g, "_")}_Report_${dateStr}`;

    const totalPoliciesCount = policiesToExport.length;
    const totalPremiumSum = policiesToExport.reduce((acc, p) => acc + (Number(p.premiumAmount) || 0), 0);
    const totalCommissionSum = policiesToExport.reduce((acc, p) => acc + (Number(p.expectedCommission) || 0), 0);
    const totalCashbackSum = policiesToExport.reduce((acc, p) => acc + getPolicyCashback(p), 0);

    const rowsHtml = policiesToExport.map((p: any, idx: number) => {
      const cls = getClassification(p);
      const status = (p.policyStatus || "Pending").trim();
      const loginDate = getLoginDate(p);
      const comm = Number(p.expectedCommission || 0);
      const cb = getPolicyCashback(p);
      const commPercentVal = Number(p.appliedPayoutPercentage || p.payoutPercentage || (p.premiumAmount && p.expectedCommission ? Math.round((Number(p.expectedCommission) / Number(p.premiumAmount)) * 100) : 0));
      const commPercentStr = commPercentVal > 0 ? `${commPercentVal}%` : "—";

      return `<tr>
        <td class="c">${idx + 1}</td>
        <td class="bold">${escapeHtml(p.policyNumber || "—")}</td>
        <td class="em">${escapeHtml(p.customerName || "—")}</td>
        <td>${escapeHtml(p.companyName || "—")}</td>
        <td class="c">${cls}</td>
        <td class="c">${escapeHtml(status)}</td>
        <td class="c">${loginDate}</td>
        <td class="r bold">₹${fmt(p.premiumAmount)}</td>
        <td class="c bold">${commPercentStr}</td>
        <td class="r bold">₹${fmt(comm)}</td>
        <td class="r bold">₹${fmt(cb)}</td>
        <td>${escapeHtml(p.bmName || "—")}</td>
        <td>${escapeHtml(p.teamManagerName || "—")}</td>
        <td>${escapeHtml(p.teamLeaderName || "—")}</td>
        <td>${escapeHtml(p.callerName || p.tseName || "—")}</td>
      </tr>`;
    }).join("");

    const printWin = window.open("", "_blank");
    if (!printWin) {
      alert("Please allow popups in your browser to export as PDF.");
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html><html><head>
        <title>${escapeHtml(filename)}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; font-size: 11px; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2.5px solid #660000; padding-bottom: 12px; margin-bottom: 16px; }
          .brand { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; color: #660000; }
          .subbrand { font-size: 11.5px; font-weight: 700; color: #475569; margin-top: 2px; }
          .meta { text-align: right; font-size: 10px; color: #64748b; font-weight: 600; line-height: 1.6; }
          
          .filter-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; }
          .filter-title { font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: #475569; margin-bottom: 6px; }
          .filter-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px 12px; font-size: 10px; }
          .filter-grid span { color: #64748b; font-weight: 500; }
          .filter-grid strong { color: #0f172a; font-weight: 700; }
          
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
          .s-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; text-align: center; }
          .s-box .lbl { font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
          .s-box .val { font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 2px; }
          
          .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; margin: 16px 0 8px; border-left: 3.5px solid #660000; padding-left: 8px; }
          
          table { width: 100%; border-collapse: collapse; font-size: 9.5px; page-break-inside: auto; margin-bottom: 16px; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          th { background: #f1f5f9; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 8px; letter-spacing: 0.4px; padding: 6px 6px; border-bottom: 1.5px solid #cbd5e1; border-top: 1px solid #cbd5e1; text-align: left; }
          td { padding: 5px 6px; border-bottom: 1px solid #e2e8f0; color: #1e293b; vertical-align: middle; }
          
          .c { text-align: center; }
          .r { text-align: right; }
          .em { font-weight: 600; color: #0f172a; }
          .bold { font-weight: 700; }
          .total-row { background: #f8fafc; font-weight: 800; border-top: 1.5px solid #94a3b8; border-bottom: 2px solid #64748b; }
          .total-row td { padding: 7px 6px; font-size: 10px; }
          
          .footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center; font-size: 9px; color: #94a3b8; font-weight: 500; }
          
          @media print {
            body { padding: 0; }
            @page { size: landscape; margin: 8mm; }
          }
        </style>
      </head><body>
        <div class="header">
          <div>
            <div class="brand">${escapeHtml(companyDisplayUpper)}</div>
            <div class="subbrand">${escapeHtml(companyDisplayName)} Reports &amp; Analytics &#8212; Filtered Policy Ledger (${totalPoliciesCount} Policies)</div>
          </div>
          <div class="meta">
            <div><strong>Generated On:</strong> ${getFormattedNow()}</div>
            <div><strong>Filename:</strong> ${escapeHtml(filename)}</div>
          </div>
        </div>

        <div class="filter-box">
          <div class="filter-title">&#9664; Applied Report Filters</div>
          <div class="filter-grid">
            <div><span>Date: </span><strong>${escapeHtml(filters.dateRange)}</strong></div>
            <div><span>Source: </span><strong>${escapeHtml(filters.sourceType)}</strong></div>
            <div><span>Business: </span><strong>${escapeHtml(filters.businessType)}</strong></div>
            <div><span>Status: </span><strong>${escapeHtml(filters.policyStatus)}</strong></div>
            <div><span>Cashback: </span><strong>${escapeHtml(filters.cashback)}</strong></div>
            <div><span>BM: </span><strong>${escapeHtml(filters.bm)}</strong></div>
            <div><span>TM: </span><strong>${escapeHtml(filters.teamManager)}</strong></div>
            <div><span>TL: </span><strong>${escapeHtml(filters.teamLeader)}</strong></div>
            <div><span>TSE: </span><strong>${escapeHtml(filters.tse)}</strong></div>
          </div>
        </div>

        <div class="summary-grid">
          <div class="s-box"><div class="lbl">TOTAL POLICIES</div><div class="val">${fmt(totalPoliciesCount)}</div></div>
          <div class="s-box"><div class="lbl">TOTAL PREMIUM</div><div class="val">&#8377;${fmt(totalPremiumSum)}</div></div>
          <div class="s-box"><div class="lbl">TOTAL COMMISSION</div><div class="val">&#8377;${fmt(totalCommissionSum)}</div></div>
          <div class="s-box"><div class="lbl">TOTAL CASHBACK</div><div class="val">&#8377;${fmt(totalCashbackSum)}</div></div>
        </div>

        <div class="section-title">Filtered Policies Ledger (${totalPoliciesCount})</div>
        <table>
          <thead>
            <tr>
              <th class="c" style="width: 30px;">S.No</th>
              <th style="width: 80px;">Policy Number</th>
              <th>Customer Name</th>
              <th>Insurance Company</th>
              <th class="c" style="width: 55px;">Business Type</th>
              <th class="c" style="width: 55px;">Policy Status</th>
              <th class="c" style="width: 70px;">Business Login Date</th>
              <th class="r" style="width: 75px;">Premium</th>
              <th class="c" style="width: 50px;">Comm %</th>
              <th class="r" style="width: 75px;">Commission</th>
              <th class="r" style="width: 70px;">Cashback</th>
              <th>BM</th>
              <th>TM</th>
              <th>TL</th>
              <th>TSE</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="15" class="c" style="padding: 20px;">No policies match the selected report filters.</td></tr>`}
            ${policiesToExport.length > 0 ? `
              <tr class="total-row">
                <td colspan="7" class="r">TOTAL (${totalPoliciesCount} Policies):</td>
                <td class="r bold">&#8377;${fmt(totalPremiumSum)}</td>
                <td></td>
                <td class="r bold">&#8377;${fmt(totalCommissionSum)}</td>
                <td class="r bold">&#8377;${fmt(totalCashbackSum)}</td>
                <td colspan="4"></td>
              </tr>
            ` : ""}
          </tbody>
        </table>

        <div class="footer">Confidential ${escapeHtml(companyDisplayName)} Executive Report &bull; Authorized Personnel Only &bull; Auto-generated ${getFormattedNow()}</div>
        <script>window.onload=function(){window.print()}</script>
      </body></html>
    `);
    printWin.document.close();
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "bm", label: "BM Performance" },
    { id: "tm", label: "Team Manager" },
    { id: "teamleader", label: "Team Leader" },
    { id: "tse", label: "TSE" },
    { id: "operator", label: "Data Executive" },
    { id: "company", label: "Insurance Company" },
    { id: "renewal", label: "Renewals" },
    { id: "birthday", label: "Birthdays" },
  ];

  // Helper StatCard Component matching Overview (Clean White Card UI)
  const StatCard = ({
    title,
    value,
    subtext,
    icon: Icon,
    colorClass,
    delay = 0
  }: {
    title: string;
    value: string | number;
    subtext: string;
    icon: React.ElementType;
    colorClass: { text: string; border: string; iconBg: string };
    delay?: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: delay * 0.05 }}
      className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between transition-all h-full"
    >
      <div className="space-y-1 min-w-0 pr-2">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
          {title}
        </span>
        <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
          {value}
        </span>
        <span className="text-[11px] font-medium text-slate-500 block truncate">
          {subtext}
        </span>
      </div>

      <div className={`w-9 h-9 ${colorClass.iconBg} ${colorClass.text} ${colorClass.border} border rounded-xl flex items-center justify-center shrink-0 shadow-2xs`}>
        <Icon className="w-4.5 h-4.5 stroke-[2]" />
      </div>
    </motion.div>
  );

  const appliedFilters = getAppliedFiltersSummary();
  const allFilteredPolicies: any[] = data?.policies || [];
  const previewTotalPages = Math.max(1, Math.ceil(allFilteredPolicies.length / PREVIEW_PAGE_SIZE));
  const paginatedPreviewPolicies = allFilteredPolicies.slice((previewPage - 1) * PREVIEW_PAGE_SIZE, previewPage * PREVIEW_PAGE_SIZE);

  return (
    <div className="space-y-6">
      {viewMode === "review" ? (
        <div className="space-y-5">
          {/* Full Page Review Header */}
          <div className="bg-white p-4.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <button
                onClick={() => setViewMode("dashboard")}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                title="Back to Reports Dashboard"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
                <span>Back to Reports</span>
              </button>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    {companyDisplayName} — Report Preview &amp; Policy Ledger
                  </h2>
                  <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200/80 rounded-lg text-xs font-semibold">
                    {allFilteredPolicies.length} {allFilteredPolicies.length === 1 ? "matching policy" : "matching policies"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Review all matching policies based on applied filters before exporting.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={handleExportPDF}
                disabled={loading || !data || allFilteredPolicies.length === 0}
                className="px-3.5 py-2 bg-[#660000] hover:bg-[#520000] disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export as PDF</span>
              </button>

              <button
                onClick={handleExportExcel}
                disabled={loading || !data || allFilteredPolicies.length === 0}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export as Excel</span>
              </button>
            </div>
          </div>

          {/* Full Page Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/95 border-b border-slate-200 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="px-3.5 py-3 text-center whitespace-nowrap w-[50px]">S.No</th>
                    <th className="px-4 py-3 whitespace-nowrap">Policy Number</th>
                    <th className="px-4 py-3 whitespace-nowrap">Customer Name</th>
                    <th className="px-4 py-3 whitespace-nowrap">Insurance Company</th>
                    <th className="px-4 py-3 whitespace-nowrap">Business Type</th>
                    <th className="px-4 py-3 whitespace-nowrap">Policy Status</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Business Login Date</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Premium</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Commission %</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Commission</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Cashback</th>
                    <th className="px-4 py-3 whitespace-nowrap">BM</th>
                    <th className="px-4 py-3 whitespace-nowrap">TM</th>
                    <th className="px-4 py-3 whitespace-nowrap">TL</th>
                    <th className="px-4 py-3 whitespace-nowrap">TSE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedPreviewPolicies.map((p: any, idx: number) => {
                    const cls = getClassification(p);
                    const status = (p.policyStatus || "Pending").trim();
                    const cb = getPolicyCashback(p);
                    const comm = Number(p.expectedCommission || 0);
                    const commPercentVal = Number(p.appliedPayoutPercentage || p.payoutPercentage || (p.premiumAmount && p.expectedCommission ? Math.round((Number(p.expectedCommission) / Number(p.premiumAmount)) * 100) : 0));
                    const commPercentStr = commPercentVal > 0 ? `${commPercentVal}%` : "—";

                    return (
                      <tr key={p._id || p.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-3 text-center font-medium text-slate-500 whitespace-nowrap">
                          {(previewPage - 1) * PREVIEW_PAGE_SIZE + idx + 1}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                          {p.policyNumber || "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px] truncate" title={p.customerName || "—"}>
                          {p.customerName || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate" title={p.companyName || "—"}>
                          {p.companyName || "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                          {cls}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                          {status}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-center whitespace-nowrap">
                          {getLoginDate(p)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                          ₹{fmt(p.premiumAmount)}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-800 whitespace-nowrap">
                          {commPercentStr}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                          ₹{fmt(comm)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                          ₹{fmt(cb)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[140px] truncate" title={p.bmName || "—"}>
                          {p.bmName || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[140px] truncate" title={p.teamManagerName || "—"}>
                          {p.teamManagerName || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[140px] truncate" title={p.teamLeaderName || "—"}>
                          {p.teamLeaderName || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[140px] truncate" title={p.callerName || p.tseName || "—"}>
                          {p.callerName || p.tseName || "—"}
                        </td>
                      </tr>
                    );
                  })}

                  {allFilteredPolicies.length === 0 && (
                    <tr>
                      <td colSpan={15} className="px-6 py-24 text-center">
                        <div className="space-y-1.5 max-w-sm mx-auto">
                          <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="font-bold text-slate-800 text-sm">No policies found</div>
                          <p className="text-slate-500 text-xs">No policies match the selected report filters.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Pagination & Records Info */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600 font-normal">
                {allFilteredPolicies.length > 0 ? (
                  <>
                    Showing <span className="font-semibold text-slate-800">{(previewPage - 1) * PREVIEW_PAGE_SIZE + 1}</span>–<span className="font-semibold text-slate-800">{Math.min(previewPage * PREVIEW_PAGE_SIZE, allFilteredPolicies.length)}</span> of <span className="font-semibold text-slate-900">{allFilteredPolicies.length}</span> policies
                  </>
                ) : (
                  <>0 policies</>
                )}
              </div>

              {previewTotalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setPreviewPage(p => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={previewPage === 1}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  <span className="text-xs text-slate-600 px-2 font-medium">
                    Page <strong className="text-slate-900 font-semibold">{previewPage}</strong> of {previewTotalPages}
                  </span>

                  <button
                    onClick={() => {
                      setPreviewPage(p => Math.min(previewTotalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={previewPage === previewTotalPages}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Header Banner — Clean Overview Style */}
          <div className="bg-white p-4.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-rose-50 text-[#660000] border border-rose-200 rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
                <BarChart3 className="w-4.5 h-4.5 stroke-[2]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Reports &amp; Analytics
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Real-time business performance, Team Manager, Team Leader, TSE &amp; Data Executive metrics.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {/* Export Report Dropdown */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setIsExportMenuOpen(prev => !prev)}
                  disabled={loading || !data}
                  className="px-3.5 py-2 bg-[#660000] hover:bg-[#520000] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition shadow-2xs"
                  title="Export Filtered Report"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Report</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isExportMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {isExportMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 py-2 overflow-hidden">
                    <div className="px-3.5 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Export &amp; Review Options
                    </div>

                    {/* 1. Review Report */}
                    <button
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        setPreviewPage(1);
                        setViewMode("review");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-[#660000] flex items-center gap-2.5 cursor-pointer transition"
                    >
                      <Eye className="w-4 h-4 text-[#660000] shrink-0" />
                      <div>
                        <div>Review Report</div>
                        <div className="text-[10px] font-normal text-slate-400">Open full-page filtered policy ledger</div>
                      </div>
                    </button>

                    {/* 2. Export as PDF */}
                    <button
                      onClick={() => { setIsExportMenuOpen(false); handleExportPDF(); }}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-[#660000] flex items-center gap-2.5 cursor-pointer transition border-t border-slate-50"
                    >
                      <FileText className="w-4 h-4 text-[#660000] shrink-0" />
                      <div>
                        <div>Export as PDF</div>
                        <div className="text-[10px] font-normal text-slate-400">Open print &amp; PDF view</div>
                      </div>
                    </button>

                    {/* 3. Export as Excel (.xlsx) */}
                    <button
                      onClick={() => { setIsExportMenuOpen(false); handleExportExcel(); }}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 cursor-pointer transition border-t border-slate-50"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div>Export as Excel</div>
                        <div className="text-[10px] font-normal text-slate-400">Download .xlsx file</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

          {/* Refresh Button */}
          <button
            onClick={fetchReports}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-[#660000] hover:bg-rose-50 border border-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50 shadow-2xs"
            title="Refresh Reports"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#660000]" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Filter Section — Clean Overview Style */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-[#660000]" />
          <span>Report Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-11 gap-2.5">
          {/* Date Preset */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Date Range</label>
            <select
              value={datePreset}
              onChange={e => setDatePreset(e.target.value as DatePreset)}
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition"
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
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition"
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
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition"
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
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition"
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
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition"
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

          {/* Insurance Company */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Insurance Company</label>
            <select
              value={companyFilter}
              onChange={e => setCompanyFilter(e.target.value)}
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition"
            >
              <option value="All">All Companies</option>
              {companyList.map(c => (
                <option key={c.id || c._id || c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Advisor */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Advisor</label>
            <select
              value={advisorFilter}
              onChange={e => setAdvisorFilter(e.target.value)}
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition"
            >
              <option value="All">All Advisors</option>
              {advisorList.map(a => (
                <option key={a.id} value={a.id}>
                  {a.fullName} ({a.advisorCode})
                </option>
              ))}
            </select>
          </div>

          {/* BM */}
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
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition"
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
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition"
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
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition"
            >
              <option value="All">All TLs</option>
              {filteredTlOptions.map(tl => <option key={tl.id} value={tl.id}>{tl.name}</option>)}
            </select>
          </div>

          {/* TSE */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">TSE Caller</label>
            <select
              value={tseFilter}
              onChange={e => setTseFilter(e.target.value)}
              className="w-full bg-white border border-slate-200/90 hover:border-slate-300 focus:border-[#660000] rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#660000]/20 shadow-2xs transition"
            >
              <option value="All">All TSEs</option>
              {filteredTseOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        {/* Custom Date Fields if selected */}
        {datePreset === "custom" && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="bg-white border border-slate-200/90 focus:border-[#660000] rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="bg-white border border-slate-200/90 focus:border-[#660000] rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none"
              />
            </div>
            <button
              onClick={fetchReports}
              className="mt-4 px-4 py-2 bg-[#660000] hover:bg-[#520000] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              Apply Dates
            </button>
          </div>
        )}

        {/* Monthly Calendar / Month Picker if selected */}
        {datePreset === "monthly" && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Select Month &amp; Year</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-white border border-slate-200/90 focus:border-[#660000] rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none"
              />
            </div>
            <button
              onClick={() => {
                setAppliedMonth(selectedMonth);
              }}
              className="mt-4 px-4 py-2 bg-[#660000] hover:bg-[#520000] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              Apply Month
            </button>
          </div>
        )}
      </div>

      {/* Error Message if any */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-[#660000] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Navigation Tabs — Clean & Simple */}
      <div className="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-2xl p-1.5 shadow-2xs overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs transition cursor-pointer whitespace-nowrap ${activeTab === tab.id
                ? "bg-[#660000] text-white shadow-2xs font-bold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs font-bold text-slate-400 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#660000]" />
          Fetching business reports...
        </div>
      ) : data && (
        <>
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Summary KPI Cards Grid (Matching Overview Style) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                <StatCard
                  title="Total Business"
                  value={fmt(data.totalPolicies)}
                  subtext={`₹${fmt(data.totalPremium)} Premium`}
                  icon={Layers}
                  colorClass={{
                    text: "text-indigo-600",
                    border: "border-indigo-200",
                    iconBg: "bg-indigo-50"
                  }}
                  delay={0}
                />
                <StatCard
                  title="New Business"
                  value={fmt(data.newBusinessCount)}
                  subtext={`₹${fmt(data.newBusinessPremium)} Premium`}
                  icon={TrendingUp}
                  colorClass={{
                    text: "text-emerald-600",
                    border: "border-emerald-200",
                    iconBg: "bg-emerald-50"
                  }}
                  delay={1}
                />
                <StatCard
                  title="Renewal Business"
                  value={fmt(data.renewalCount)}
                  subtext={`₹${fmt(data.renewalPremium)} Premium`}
                  icon={RefreshCw}
                  colorClass={{
                    text: "text-amber-600",
                    border: "border-amber-200",
                    iconBg: "bg-amber-50"
                  }}
                  delay={2}
                />
                <StatCard
                  title="Total Premium"
                  value={`₹${fmt(data.totalPremium)}`}
                  subtext={`Across ${fmt(data.totalPolicies)} policies`}
                  icon={DollarSign}
                  colorClass={{
                    text: "text-purple-600",
                    border: "border-purple-200",
                    iconBg: "bg-purple-50"
                  }}
                  delay={3}
                />
                <StatCard
                  title="Expected Revenue"
                  value={`₹${fmt(data.totalExpectedCommission || 0)}`}
                  subtext="Calculated commission"
                  icon={Award}
                  colorClass={{
                    text: "text-rose-600",
                    border: "border-rose-200",
                    iconBg: "bg-rose-50"
                  }}
                  delay={4}
                />
              </div>

              {/* CASHBACK ANALYTICS SECTION */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#660000]" />
                    Cashback Analytics
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <span>
                      Total Cashback: <strong className="text-slate-900 font-bold font-mono">₹{fmt(totalCashbackTotal)}</strong>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="px-2.5 py-0.5 bg-[#660000]/10 text-[#660000] border border-[#660000]/20 rounded-full font-bold text-xs font-mono">
                      {fmt(totalCashbackCount)} {totalCashbackCount === 1 ? "Cashback Policy" : "Cashback Policies"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* CARD 1: FRESH CASHBACK */}
                  <div className="bg-white border border-teal-200/80 rounded-xl p-4 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Fresh Cashback</span>
                      <span className="px-2.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-full font-bold text-xs font-mono">
                        {fmt(freshCashbackCount)}
                      </span>
                    </div>
                    <div className="text-lg font-extrabold text-slate-900 font-mono">
                      ₹{fmt(freshCashbackTotal)}
                    </div>
                    <div className="text-xs font-medium text-slate-500">
                      {fmt(freshCashbackCount)} {freshCashbackCount === 1 ? "Cashback Policy" : "Cashback Policies"}
                    </div>
                  </div>

                  {/* CARD 2: PORT CASHBACK */}
                  <div className="bg-white border border-sky-200/80 rounded-xl p-4 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-sky-800 uppercase tracking-wider">Port Cashback</span>
                      <span className="px-2.5 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 rounded-full font-bold text-xs font-mono">
                        {fmt(portCashbackCount)}
                      </span>
                    </div>
                    <div className="text-lg font-extrabold text-slate-900 font-mono">
                      ₹{fmt(portCashbackTotal)}
                    </div>
                    <div className="text-xs font-medium text-slate-500">
                      {fmt(portCashbackCount)} {portCashbackCount === 1 ? "Cashback Policy" : "Cashback Policies"}
                    </div>
                  </div>

                  {/* CARD 3: RENEWAL CASHBACK */}
                  <div className="bg-white border border-purple-200/80 rounded-xl p-4 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-purple-800 uppercase tracking-wider">Renewal Cashback</span>
                      <span className="px-2.5 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded-full font-bold text-xs font-mono">
                        {fmt(renewalCashbackCount)}
                      </span>
                    </div>
                    <div className="text-lg font-extrabold text-slate-900 font-mono">
                      ₹{fmt(renewalCashbackTotal)}
                    </div>
                    <div className="text-xs font-medium text-slate-500">
                      {fmt(renewalCashbackCount)} {renewalCashbackCount === 1 ? "Cashback Policy" : "Cashback Policies"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Policy Sourcing & Channel Breakdown Section */}
              {data.sourceStats && (
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#660000]" />
                      Policy Sourcing &amp; Channel Breakdown
                    </h3>
                    <span className="text-[11px] font-medium text-slate-500">
                      Real MongoDB Sourcing Statistics
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Sales Team */}
                    <div className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl p-4 shadow-2xs space-y-2 transition">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Sales Team Policies</span>
                        <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-bold text-xs font-mono">
                          {fmt(data.sourceStats.salesTeamCount)}
                        </span>
                      </div>
                      <div className="text-lg font-extrabold text-slate-900 font-mono">
                        ₹{fmt(data.sourceStats.salesTeamPremium)} <span className="text-xs font-medium text-slate-400">Premium</span>
                      </div>
                      <div className="text-xs font-medium text-slate-600">
                        Expected Commission: <strong className="font-bold text-slate-900 font-mono">₹{fmt(data.sourceStats.salesTeamCommission)}</strong>
                      </div>
                    </div>

                    {/* Direct */}
                    <div className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl p-4 shadow-2xs space-y-2 transition">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Direct Policies</span>
                        <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-full font-bold text-xs font-mono">
                          {fmt(data.sourceStats.directCount)}
                        </span>
                      </div>
                      <div className="text-lg font-extrabold text-slate-900 font-mono">
                        ₹{fmt(data.sourceStats.directPremium)} <span className="text-xs font-medium text-slate-400">Premium</span>
                      </div>
                      <div className="text-xs font-medium text-slate-600">
                        Expected Commission: <strong className="font-bold text-slate-900 font-mono">₹{fmt(data.sourceStats.directCommission)}</strong>
                      </div>
                    </div>

                    {/* Referral */}
                    <div className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl p-4 shadow-2xs space-y-2 transition">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Referral Policies</span>
                        <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full font-bold text-xs font-mono">
                          {fmt(data.sourceStats.referralCount)}
                        </span>
                      </div>
                      <div className="text-lg font-extrabold text-slate-900 font-mono">
                        ₹{fmt(data.sourceStats.referralPremium)} <span className="text-xs font-medium text-slate-400">Premium</span>
                      </div>
                      <div className="text-xs font-medium text-slate-600">
                        Expected Commission: <strong className="font-bold text-slate-900 font-mono">₹{fmt(data.sourceStats.referralCommission)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* New Business Tracking: Pending vs Issued */}
              {data.newBusinessStats && (
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#660000]" />
                      New Business Tracking (Pending vs Issued)
                    </h3>
                    <span className="text-[11px] font-medium text-slate-500">
                      Total New Business: <strong className="text-slate-900 font-bold font-mono">{fmt(data.newBusinessStats.total)} Policies</strong> (₹{fmt(data.newBusinessStats.totalPremium)})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white border border-amber-200/80 rounded-xl p-4 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">Pending Policies</span>
                        <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full font-bold text-xs font-mono">
                          {fmt(data.newBusinessStats.pendingCount)}
                        </span>
                      </div>
                      <div className="text-lg font-extrabold text-slate-900 font-mono">
                        ₹{fmt(data.newBusinessStats.pendingPremium)} <span className="text-xs font-medium text-slate-400">Premium</span>
                      </div>
                      <div className="text-xs font-medium text-slate-600">
                        Expected Commission: <strong className="font-bold text-slate-900 font-mono">₹{fmt(data.newBusinessStats.pendingCommission)}</strong>
                      </div>
                    </div>

                    <div className="bg-white border border-emerald-200/80 rounded-xl p-4 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">Issued Policies</span>
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold text-xs font-mono">
                          {fmt(data.newBusinessStats.issuedCount)}
                        </span>
                      </div>
                      <div className="text-lg font-extrabold text-slate-900 font-mono">
                        ₹{fmt(data.newBusinessStats.issuedPremium)} <span className="text-xs font-medium text-slate-400">Premium</span>
                      </div>
                      <div className="text-xs font-medium text-slate-600">
                        Expected Commission: <strong className="font-bold text-slate-900 font-mono">₹{fmt(data.newBusinessStats.issuedCommission)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* New vs Renewal Comparison Table */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#660000]" />
                  New Business vs Renewal Comparison
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3 border-r border-slate-100">Business Type</th>
                        <th className="px-4 py-3 text-right border-r border-slate-100">Policies</th>
                        <th className="px-4 py-3 text-right border-r border-slate-100">Premium</th>
                        <th className="px-4 py-3 text-right border-r border-slate-100">Cashback</th>
                        <th className="px-4 py-3 text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 border-r border-slate-100">New Business (Fresh + Port)</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800 font-mono border-r border-slate-100">{fmt(data.newBusinessCount)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800 font-mono border-r border-slate-100">₹{fmt(data.newBusinessPremium)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800 font-mono border-r border-slate-100">₹{fmt(newBusinessCashbackTotal)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800 font-mono">{data.totalPolicies > 0 ? ((data.newBusinessCount / data.totalPolicies) * 100).toFixed(1) : "0.0"}%</td>
                      </tr>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 border-r border-slate-100">Renewal</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800 font-mono border-r border-slate-100">{fmt(data.renewalCount)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800 font-mono border-r border-slate-100">₹{fmt(data.renewalPremium)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800 font-mono border-r border-slate-100">₹{fmt(renewalCashbackTotal)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800 font-mono">{data.totalPolicies > 0 ? ((data.renewalCount / data.totalPolicies) * 100).toFixed(1) : "0.0"}%</td>
                      </tr>
                      <tr className="bg-slate-50/80 font-extrabold text-slate-900">
                        <td className="px-4 py-3 border-r border-slate-200">Total</td>
                        <td className="px-4 py-3 text-right font-mono border-r border-slate-200">{fmt(data.totalPolicies)}</td>
                        <td className="px-4 py-3 text-right font-mono border-r border-slate-200">₹{fmt(data.totalPremium)}</td>
                        <td className="px-4 py-3 text-right font-mono border-r border-slate-200">₹{fmt(totalCashbackTotal)}</td>
                        <td className="px-4 py-3 text-right font-mono">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Clean Progress bar */}
                {data.totalPolicies > 0 && (
                  <div className="pt-2 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200/80">
                      <div className="bg-[#660000] h-full transition-all" style={{ width: `${(data.newBusinessCount / data.totalPolicies) * 100}%` }} />
                      <div className="bg-amber-400 h-full transition-all" style={{ width: `${(data.renewalCount / data.totalPolicies) * 100}%` }} />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-semibold shrink-0">
                      <span className="flex items-center gap-1.5 text-slate-700"><span className="w-2 h-2 rounded-full bg-[#660000]" /> New</span>
                      <span className="flex items-center gap-1.5 text-slate-700"><span className="w-2 h-2 rounded-full bg-amber-400" /> Renewal</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BM TAB */}
          {activeTab === "bm" && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#660000]" />
                BM Performance Report ({data.bmReport?.length || 0})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 border-r border-slate-100">BM Name</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">New Business</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">Renewal</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">Port</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">Total Policies</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">Total Premium</th>
                      <th className="px-4 py-3 text-right">Expected Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(data.bmReport || []).map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 border-r border-slate-100">{row.name}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 font-mono border-r border-slate-100">{fmt(row.newBusiness)}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 font-mono border-r border-slate-100">{fmt(row.renewal)}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 font-mono border-r border-slate-100">{fmt(row.port || 0)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono border-r border-slate-100">{fmt(row.total)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono border-r border-slate-100">₹{fmt(row.premium)}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700 font-mono">₹{fmt(row.expectedCommission || 0)}</td>
                      </tr>
                    ))}
                    {(!data.bmReport || data.bmReport.length === 0) && (
                      <tr><td colSpan={7} className="px-6 py-12 text-center text-xs text-slate-400 font-medium">No BM data available for selected filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TEAM MANAGER TAB */}
          {activeTab === "tm" && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-[#660000]" />
                Team Manager Performance Report ({data.tmReport?.length || 0})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 border-r border-slate-100">Team Manager</th>
                      <th className="px-4 py-3 border-r border-slate-100">Assigned BM</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">New Business</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">Renewal</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">Port</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">Total Policies</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">Total Premium</th>
                      <th className="px-4 py-3 text-right">Expected Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(data.tmReport || []).map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 border-r border-slate-100">{row.name}</td>
                        <td className="px-4 py-3 font-medium text-slate-600 border-r border-slate-100">{row.bmName || "—"}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 font-mono border-r border-slate-100">{fmt(row.newBusiness || 0)}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 font-mono border-r border-slate-100">{fmt(row.renewal || 0)}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 font-mono border-r border-slate-100">{fmt(row.port || 0)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono border-r border-slate-100">{fmt(row.total || 0)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono border-r border-slate-100">₹{fmt(row.premium || 0)}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700 font-mono">₹{fmt(row.expectedCommission || 0)}</td>
                      </tr>
                    ))}
                    {(!data.tmReport || data.tmReport.length === 0) && (
                      <tr><td colSpan={8} className="px-6 py-12 text-center text-xs text-slate-400 font-medium">No Team Manager data available for selected filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TEAM LEADER TAB */}
          {activeTab === "teamleader" && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-[#660000]" />
                Team Leader Performance Report ({data.teamLeaderReport?.length || 0})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 border-r border-slate-100">Team Leader</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">New Business</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">Renewal</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">Port</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">Total Policies</th>
                      <th className="px-4 py-3 text-right">Total Premium</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(data.teamLeaderReport || []).map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 border-r border-slate-100">{row.name}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 font-mono border-r border-slate-100">{fmt(row.newBusiness)}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 font-mono border-r border-slate-100">{fmt(row.renewal)}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 font-mono border-r border-slate-100">{fmt(row.port || 0)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono border-r border-slate-100">{fmt(row.total)}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700 font-mono">₹{fmt(row.premium)}</td>
                      </tr>
                    ))}
                    {(!data.teamLeaderReport || data.teamLeaderReport.length === 0) && (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-xs text-slate-400 font-medium">No Team Leader data available for selected filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TSE TAB */}
          {activeTab === "tse" && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-[#660000]" />
                TSE Performance Report ({data.tseReport?.length || 0})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 border-r border-slate-100">TSE Name</th>
                      <th className="px-4 py-3 border-r border-slate-100">Team Leader</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">New Business</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">Renewal</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">Port</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">Total Policies</th>
                      <th className="px-4 py-3 text-right">Total Premium</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(data.tseReport || []).map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 border-r border-slate-100">{row.name}</td>
                        <td className="px-4 py-3 text-slate-600 border-r border-slate-100">{row.teamLeaderName}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 font-mono border-r border-slate-100">{fmt(row.newBusiness)}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 font-mono border-r border-slate-100">{fmt(row.renewal)}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 font-mono border-r border-slate-100">{fmt(row.port || 0)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono border-r border-slate-100">{fmt(row.total)}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700 font-mono">₹{fmt(row.premium)}</td>
                      </tr>
                    ))}
                    {(!data.tseReport || data.tseReport.length === 0) && (
                      <tr><td colSpan={7} className="px-6 py-12 text-center text-xs text-slate-400 font-medium">No TSE data available for selected filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* OPERATOR / DATA EXECUTIVE TAB */}
          {activeTab === "operator" && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#660000]" />
                Data Executive Report ({data.operatorReport?.length || 0})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 border-r border-slate-100">Data Executive</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">Records Entered</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">New Business</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">Renewal</th>
                      <th className="px-4 py-3 text-right">Port</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(data.operatorReport || []).map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 border-r border-slate-100">{row.name}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono border-r border-slate-100">{fmt(row.recordsEntered)}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 font-mono border-r border-slate-100">{fmt(row.newBusiness)}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 font-mono border-r border-slate-100">{fmt(row.renewal)}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 font-mono">{fmt(row.port || 0)}</td>
                      </tr>
                    ))}
                    {(!data.operatorReport || data.operatorReport.length === 0) && (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-xs text-slate-400 font-medium">No Data Executive records available for selected filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INSURANCE COMPANY TAB */}
          {activeTab === "company" && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#660000]" />
                Insurance Company Performance ({data.companyReport?.length || 0})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 border-r border-slate-100">Insurance Company</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">New Business</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">Renewal</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">Port</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">Total Policies</th>
                      <th className="px-4 py-3 text-right border-r border-slate-100">Total Premium</th>
                      <th className="px-4 py-3 text-right">Expected Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(data.companyReport || []).map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 border-r border-slate-100">{row.name}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 font-mono border-r border-slate-100">
                          {fmt(row.newBusinessCount)} <span className="text-[10px] text-slate-400 font-normal">(₹{fmt(row.newBusinessPremium)})</span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 font-mono border-r border-slate-100">
                          {fmt(row.renewalCount)} <span className="text-[10px] text-slate-400 font-normal">(₹{fmt(row.renewalPremium)})</span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 font-mono border-r border-slate-100">
                          {fmt(row.portCount || 0)} <span className="text-[10px] text-slate-400 font-normal">(₹{fmt(row.portPremium || 0)})</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono border-r border-slate-100">{fmt(row.totalPolicies)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono border-r border-slate-100">₹{fmt(row.totalPremium)}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700 font-mono">₹{fmt(row.expectedCommission)}</td>
                      </tr>
                    ))}
                    {(!data.companyReport || data.companyReport.length === 0) && (
                      <tr><td colSpan={7} className="px-6 py-12 text-center text-xs text-slate-400 font-medium">No company performance data available for selected filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RENEWAL TAB */}
          {activeTab === "renewal" && data.renewalStats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                <StatCard
                  title="Renewals Due Today"
                  value={data.renewalStats.renewalsDueToday}
                  subtext="Action required today"
                  icon={Clock}
                  colorClass={{ text: "text-amber-600", border: "border-amber-200", iconBg: "bg-amber-50" }}
                  delay={0}
                />
                <StatCard
                  title="Upcoming Renewals"
                  value={data.renewalStats.upcomingRenewals}
                  subtext="Due in coming days"
                  icon={Clock}
                  colorClass={{ text: "text-blue-600", border: "border-blue-200", iconBg: "bg-blue-50" }}
                  delay={1}
                />
                <StatCard
                  title="Overdue Renewals"
                  value={data.renewalStats.overdueRenewals}
                  subtext="Grace period exceeded"
                  icon={XCircle}
                  colorClass={{ text: "text-rose-600", border: "border-rose-200", iconBg: "bg-rose-50" }}
                  delay={2}
                />
                <StatCard
                  title="Paid Policies"
                  value={data.renewalStats.paidPolicies}
                  subtext="Renewed &amp; premium collected"
                  icon={CheckCircle}
                  colorClass={{ text: "text-emerald-600", border: "border-emerald-200", iconBg: "bg-emerald-50" }}
                  delay={3}
                />
                <StatCard
                  title="Lapsed Policies"
                  value={data.renewalStats.lapsedPolicies}
                  subtext="Coverage lapsed"
                  icon={AlertCircle}
                  colorClass={{ text: "text-slate-600", border: "border-slate-200", iconBg: "bg-slate-50" }}
                  delay={4}
                />
              </div>
            </div>
          )}

          {/* BIRTHDAY TAB */}
          {activeTab === "birthday" && data.birthdayStats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <StatCard
                  title="Birthdays Today"
                  value={data.birthdayStats.birthdaysToday}
                  subtext="Customers celebrating today"
                  icon={Award}
                  colorClass={{ text: "text-pink-600", border: "border-pink-200", iconBg: "bg-pink-50" }}
                  delay={0}
                />
                <StatCard
                  title="Birthdays This Month"
                  value={data.birthdayStats.birthdaysThisMonth}
                  subtext="Total this calendar month"
                  icon={Award}
                  colorClass={{ text: "text-purple-600", border: "border-purple-200", iconBg: "bg-purple-50" }}
                  delay={1}
                />
                <StatCard
                  title="Wishes Completed"
                  value={data.birthdayStats.wishedCount}
                  subtext="Greetings sent"
                  icon={CheckCircle2}
                  colorClass={{ text: "text-emerald-600", border: "border-emerald-200", iconBg: "bg-emerald-50" }}
                  delay={2}
                />
                <StatCard
                  title="Wishes Pending"
                  value={data.birthdayStats.pendingWishes}
                  subtext="Awaiting greeting message"
                  icon={Clock}
                  colorClass={{ text: "text-amber-600", border: "border-amber-200", iconBg: "bg-amber-50" }}
                  delay={3}
                />
              </div>
            </div>
          )}
        </>
      )}
        </>
      )}
    </div>
  );
}
