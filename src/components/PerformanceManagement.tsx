import React, { useState, useEffect, useMemo, useRef } from "react";
import { UserSession, api, fetchAgencyProfile } from "../lib/api";
import {
  PerformanceDashboardData,
  EmployeePerformanceItem,
  TeamPerformanceItem,
  CompanyProductionItem,
  PerformanceTargetRecord,
  InsuranceCompany,
  MonthlyBreakdownItem,
  ProductBreakdownItem,
  PolicyDetailItem,
  AgencyProfile
} from "../types";
import ConfirmModal from "./ConfirmModal";
import {
  TrendingUp, Target, Users, Building2, FileText, Download, Plus, Search,
  Edit, Trash2, Eye, RefreshCw, Filter, AlertCircle, Award, Calendar, CheckCircle2, Layers, DollarSign, Clock, ShieldCheck, Star,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TopPerformersCard, TeamPerformanceDistributionCard, fmtCurr, fmtLakhs } from "./PerformanceWidgets";
import ExcelJS from "exceljs";


interface PerformanceManagementProps {
  user: UserSession;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function PerformanceManagement({ user }: PerformanceManagementProps) {
  // Date & Filter states
  const today = new Date();
  const [monthYearFilter, setMonthYearFilter] = useState<string>(() => {
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`; // Format: "2026-08"
  });

  const selectedMonth = parseInt(monthYearFilter.split("-")[1], 10);
  const selectedYear = parseInt(monthYearFilter.split("-")[0], 10);
  const [selectedTeam, setSelectedTeam] = useState<string>("All");
  const [selectedRole, setSelectedRole] = useState<string>("All");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("All");

  // Performance Scope Selector: MTD vs YTD
  const [performanceScope, setPerformanceScope] = useState<"MTD" | "YTD">("MTD");

  // View Sub-tab
  const [activeSubTab, setActiveSubTab] = useState<
    "dashboard" | "targets" | "employees" | "teams" | "report"
  >("dashboard");


  // Dashboard Data State
  const [data, setData] = useState<PerformanceDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Master Data lists for Assign Target Modal
  const [activeCompanies, setActiveCompanies] = useState<InsuranceCompany[]>([]);
  const [allEmployeesList, setAllEmployeesList] = useState<any[]>([]);
  const [agencyProfile, setAgencyProfile] = useState<AgencyProfile | null>(null);

  useEffect(() => {
    const tid = user?.tenantId || user?.uid || "tenant-default";
    if (tid) {
      fetchAgencyProfile(tid)
        .then(p => { if (p && (p.companyName || p.agencyName)) setAgencyProfile(p); })
        .catch(() => {});
    }
  }, [user]);

  const companyDisplayName = agencyProfile?.companyName || agencyProfile?.agencyName || "Policy Master";
  const companyDisplayUpper = (agencyProfile?.companyName || agencyProfile?.agencyName || "POLICY MASTER").toUpperCase();

  // Memoized Management Performances List for Team Performance Distribution (TL + TM + BM)

  const managementPerformancesList = useMemo(() => {
    if (!data) return [];
    if (data.managementPerformances && data.managementPerformances.length > 0) {
      return data.managementPerformances;
    }
    return data.employeePerformances
      .filter((e) => ["Branch Manager", "Team Manager", "Team Leader"].includes(e.role))
      .map((e) => ({
        id: e.employeeId,
        name: e.employeeName,
        role: e.role,
        tseCount: 0,
        actualPolicies: e.actualPolicies || e.mtd?.actualPolicies || 0,
        policyStats: e.policyStats,
        mtd: e.mtd,
        ytd: e.ytd
      }));
  }, [data]);

  const sortedMgmtList = useMemo(() => {
    let list = [...managementPerformancesList];
    const isYtd = performanceScope === "YTD";
    list.sort((a, b) => {
      const pctA = isYtd ? (a.ytd?.achievementPercentage ?? 0) : (a.mtd?.achievementPercentage ?? 0);
      const pctB = isYtd ? (b.ytd?.achievementPercentage ?? 0) : (b.mtd?.achievementPercentage ?? 0);
      return pctB - pctA;
    });
    return list;
  }, [managementPerformancesList, performanceScope]);



  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [selectedEmpDetail, setSelectedEmpDetail] = useState<EmployeePerformanceItem | null>(null);
  const [deletingTargetId, setDeletingTargetId] = useState<string | null>(null);
  const monthInputRef = useRef<HTMLInputElement>(null);

  // Form State for Simplified Assign Target Modal
  const [targetForm, setTargetForm] = useState<{
    employeeId: string;
    employeeName: string;
    role: string;
    bmId: string;
    bmName: string;
    teamManagerId: string;
    teamManagerName: string;
    teamLeaderId: string;
    teamLeaderName: string;
    month: number;
    year: number;
    assignedPremiumTarget: number | string;
    notes: string;
  }>({
    employeeId: "",
    employeeName: "",
    role: "TSE",
    bmId: "",
    bmName: "",
    teamManagerId: "",
    teamManagerName: "",
    teamLeaderId: "",
    teamLeaderName: "",
    month: selectedMonth,
    year: selectedYear,
    assignedPremiumTarget: "",
    notes: ""
  });

  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");

  // Pagination for Employee Performance Table
  const [empPage, setEmpPage] = useState<number>(1);
  const empPerPage = 10;
  const [empSearch, setEmpSearch] = useState<string>("");

  // Search for Target Management Table
  const [targetSearch, setTargetSearch] = useState<string>("");

  // Search for Team Performance Table
  const [teamSearch, setTeamSearch] = useState<string>("");

  // Load Performance Dashboard & Master Data
  const loadPerformanceData = async () => {
    setLoading(true);
    setError("");
    try {
      const [dashRes, compsRes, bmsRes, tmsRes, tlsRes, callersRes, rmsRes, rexsRes] = await Promise.all([
        api.getPerformanceDashboard(selectedMonth, selectedYear, {
          teamId: selectedTeam !== "All" ? selectedTeam : undefined,
          role: selectedRole !== "All" ? selectedRole : undefined,
          employeeId: selectedEmployee !== "All" ? selectedEmployee : undefined
        }),
        api.getActiveInsuranceCompanies().catch(() => []),
        api.getBMsMaster().catch(() => []),
        api.getTMsMaster().catch(() => []),
        api.getTeamLeadersMaster().catch(() => []),
        api.getCallersMaster().catch(() => []),
        api.getRenewalManagersMaster().catch(() => []),
        api.getRenewalExecutivesMaster().catch(() => [])
      ]);

      setData(dashRes);
      setActiveCompanies(compsRes);

      const empList: any[] = [];

      callersRes.forEach((c: any) => {
        empList.push({
          id: c.id,
          name: c.name,
          role: "TSE",
          bmId: c.bmId || "",
          bmName: c.bmName || "",
          teamManagerId: c.teamManagerId || "",
          teamManagerName: c.teamManagerName || "",
          teamLeaderId: c.teamLeaderId || "",
          teamLeaderName: c.teamLeaderName || ""
        });
      });

      tlsRes.forEach((tl: any) => {
        if (!empList.some(e => e.id === tl.id)) {
          empList.push({
            id: tl.id,
            name: tl.name,
            role: "Team Leader",
            bmId: tl.bmId || "",
            bmName: tl.bmName || "",
            teamManagerId: tl.teamManagerId || "",
            teamManagerName: tl.teamManagerName || "",
            teamLeaderId: tl.id,
            teamLeaderName: tl.name
          });
        }
      });

      tmsRes.forEach((tm: any) => {
        if (!empList.some(e => e.id === tm.id)) {
          empList.push({
            id: tm.id,
            name: tm.name,
            role: "Team Manager",
            bmId: tm.bmId || "",
            bmName: tm.bmName || "",
            teamManagerId: tm.id,
            teamManagerName: tm.name
          });
        }
      });

      bmsRes.forEach((bm: any) => {
        if (!empList.some(e => e.id === bm.id)) {
          empList.push({
            id: bm.id,
            name: bm.name,
            role: "Branch Manager",
            bmId: bm.id,
            bmName: bm.name
          });
        }
      });

      rexsRes.forEach((rex: any) => {
        if (!empList.some(e => e.id === rex.id)) {
          empList.push({
            id: rex.id,
            name: rex.name,
            role: "Renewal Executive",
            renewalManagerId: rex.renewalManagerId || "",
            renewalManagerName: rex.renewalManagerName || ""
          });
        }
      });

      rmsRes.forEach((rm: any) => {
        if (!empList.some(e => e.id === rm.id)) {
          empList.push({
            id: rm.id,
            name: rm.name,
            role: "Renewal Manager",
            renewalManagerId: rm.id,
            renewalManagerName: rm.name
          });
        }
      });

      setAllEmployeesList(empList);
    } catch (err: any) {
      console.error("Load Performance Error:", err);
      setError(err.message || "Failed to load performance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerformanceData();
  }, [selectedMonth, selectedYear, selectedTeam, selectedRole, selectedEmployee]);

  // Open Assign Target Modal for New Target
  const handleOpenAssignModal = () => {
    setEditingTargetId(null);
    setFormError("");

    const tseList = allEmployeesList.filter(e => !["Team Leader", "Team Manager", "Branch Manager"].includes(e.role));
    const initialEmp = tseList.length > 0 ? tseList[0] : (allEmployeesList.length > 0 ? allEmployeesList[0] : null);

    setTargetForm({
      employeeId: initialEmp ? initialEmp.id : "",
      employeeName: initialEmp ? initialEmp.name : "",
      role: initialEmp ? initialEmp.role : "TSE",
      bmId: initialEmp ? (initialEmp.bmId || "") : "",
      bmName: initialEmp ? (initialEmp.bmName || "") : "",
      teamManagerId: initialEmp ? (initialEmp.teamManagerId || "") : "",
      teamManagerName: initialEmp ? (initialEmp.teamManagerName || "") : "",
      teamLeaderId: initialEmp ? (initialEmp.teamLeaderId || "") : "",
      teamLeaderName: initialEmp ? (initialEmp.teamLeaderName || "") : "",
      month: selectedMonth,
      year: selectedYear,
      assignedPremiumTarget: "",
      notes: ""
    });

    setIsAssignModalOpen(true);
  };

  // Open Assign Target Modal for Edit Target
  const handleEditTarget = (empPerf: EmployeePerformanceItem) => {
    setEditingTargetId(empPerf.targetId);
    setFormError("");

    const matchingEmp = allEmployeesList.find(e => e.id === empPerf.employeeId) || {
      id: empPerf.employeeId,
      name: empPerf.employeeName,
      role: empPerf.role
    };

    const targetMonthVal = empPerf.month || selectedMonth;
    const targetYearVal = empPerf.year || selectedYear;

    setTargetForm({
      employeeId: empPerf.employeeId,
      employeeName: empPerf.employeeName,
      role: empPerf.role,
      bmId: matchingEmp.bmId || "",
      bmName: matchingEmp.bmName || "",
      teamManagerId: matchingEmp.teamManagerId || "",
      teamManagerName: matchingEmp.teamManagerName || "",
      teamLeaderId: matchingEmp.teamLeaderId || "",
      teamLeaderName: matchingEmp.teamLeaderName || "",
      month: targetMonthVal,
      year: targetYearVal,
      assignedPremiumTarget: empPerf.mtd?.assignedTarget || empPerf.premiumTarget || "",
      notes: empPerf.notes || ""
    });

    setIsAssignModalOpen(true);
  };

  const handleEmployeeChange = (empId: string) => {
    const emp = allEmployeesList.find(e => e.id === empId);
    if (emp) {
      setTargetForm(prev => ({
        ...prev,
        employeeId: emp.id,
        employeeName: emp.name,
        role: emp.role || "TSE",
        bmId: emp.bmId || "",
        bmName: emp.bmName || "",
        teamManagerId: emp.teamManagerId || "",
        teamManagerName: emp.teamManagerName || "",
        teamLeaderId: emp.teamLeaderId || "",
        teamLeaderName: emp.teamLeaderName || ""
      }));
    }
  };

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!targetForm.employeeId || !targetForm.employeeName) {
      setFormError("Please select a valid employee");
      return;
    }

    if (targetForm.assignedPremiumTarget === "" || Number(targetForm.assignedPremiumTarget) <= 0) {
      setFormError("Target Amount is required and must be greater than 0");
      return;
    }

    setFormSubmitting(true);
    try {
      const payload: Partial<PerformanceTargetRecord> = {
        id: editingTargetId || undefined,
        employeeId: targetForm.employeeId,
        employeeName: targetForm.employeeName,
        role: targetForm.role,
        bmId: targetForm.bmId,
        bmName: targetForm.bmName,
        teamManagerId: targetForm.teamManagerId,
        teamManagerName: targetForm.teamManagerName,
        teamLeaderId: targetForm.teamLeaderId,
        teamLeaderName: targetForm.teamLeaderName,
        month: targetForm.month,
        year: targetForm.year,
        targetMonth: `${targetForm.year}-${String(targetForm.month).padStart(2, '0')}`,
        assignedPremiumTarget: Number(targetForm.assignedPremiumTarget) || 0,
        totalPremiumTarget: Number(targetForm.assignedPremiumTarget) || 0,
        freshPremiumTarget: Number(targetForm.assignedPremiumTarget) || 0,
        notes: targetForm.notes
      };

      if (editingTargetId) {
        await api.updatePerformanceTarget(editingTargetId, payload);
      } else {
        await api.savePerformanceTarget(payload);
      }
      setIsAssignModalOpen(false);
      await loadPerformanceData();
    } catch (err: any) {
      setFormError(err.message || "Failed to save performance target");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteTarget = async () => {
    if (!deletingTargetId) return;
    try {
      await api.deletePerformanceTarget(deletingTargetId);
      setDeletingTargetId(null);
      await loadPerformanceData();
    } catch (err: any) {
      alert(err.message || "Failed to delete target");
    }
  };

  // Compute active scope summary (MTD vs YTD)
  const activeSummary = useMemo(() => {
    if (performanceScope === "YTD") {
      const tgt = data?.ytdSummary?.assignedTarget ?? 0;
      const ach = data?.ytdSummary?.achievement ?? 0;
      const pct = data?.ytdSummary?.achievementPercentage ?? (tgt > 0 ? Math.round((ach / tgt) * 100) : 0);
      const rem = data?.ytdSummary?.remainingTarget ?? Math.max(0, tgt - ach);
      return {
        assignedTarget: tgt,
        achievement: ach,
        achievementPercentage: pct,
        remainingTarget: rem,
        labelPrefix: "YTD"
      };
    }
    const tgt = data?.mtdSummary?.assignedTarget ?? data?.summary?.totalPremiumTarget ?? 0;
    const ach = data?.mtdSummary?.achievement ?? data?.summary?.totalActualPremium ?? 0;
    const pct = data?.mtdSummary?.achievementPercentage ?? data?.summary?.overallPremiumAchievement ?? (tgt > 0 ? Math.round((ach / tgt) * 100) : 0);
    const rem = data?.mtdSummary?.remainingTarget ?? data?.summary?.remainingPremium ?? Math.max(0, tgt - ach);
    return {
      assignedTarget: tgt,
      achievement: ach,
      achievementPercentage: pct,
      remainingTarget: rem,
      labelPrefix: "MTD"
    };
  }, [performanceScope, data]);

  // Dynamic Header Title based on scope and selected month
  const activeSectionTitle = useMemo(() => {
    const monthName = MONTH_NAMES[selectedMonth - 1]?.toUpperCase() || "";
    if (performanceScope === "MTD") {
      return `MTD PERFORMANCE — ${monthName} ${selectedYear}`;
    }
    if (selectedMonth === 4) {
      return `YTD PERFORMANCE — APRIL ${selectedYear}`;
    } else if (selectedMonth > 4) {
      return `YTD PERFORMANCE — APRIL TO ${monthName} ${selectedYear}`;
    } else {
      return `YTD PERFORMANCE — APRIL ${selectedYear - 1} TO ${monthName} ${selectedYear}`;
    }
  }, [performanceScope, selectedMonth, selectedYear]);

  // Employee sorting by actual Achievement % based on active scope
  const sortedEmployeePerformances = useMemo(() => {
    if (!data?.employeePerformances) return [];
    const list = [...data.employeePerformances];
    return list.sort((a, b) => {
      const isYtd = performanceScope === "YTD";
      const pctA = isYtd ? (a.ytd?.achievementPercentage ?? a.mtd?.achievementPercentage ?? 0) : (a.mtd?.achievementPercentage ?? a.premiumAchievement ?? 0);
      const pctB = isYtd ? (b.ytd?.achievementPercentage ?? b.mtd?.achievementPercentage ?? 0) : (b.mtd?.achievementPercentage ?? b.premiumAchievement ?? 0);
      if (pctB !== pctA) return pctB - pctA;
      const achA = isYtd ? (a.ytd?.achievement ?? a.mtd?.achievement ?? 0) : (a.mtd?.achievement ?? a.actualPremium ?? 0);
      const achB = isYtd ? (b.ytd?.achievement ?? b.mtd?.achievement ?? 0) : (b.mtd?.achievement ?? b.actualPremium ?? 0);
      return achB - achA;
    });
  }, [data?.employeePerformances, performanceScope]);

  // Filter employee list for Target Management table by search query
  const filteredTargetEmployees = useMemo(() => {
    if (!data?.employeePerformances) return [];
    if (!targetSearch.trim()) return data.employeePerformances;
    const q = targetSearch.toLowerCase().trim();
    return data.employeePerformances.filter(
      e =>
        e.employeeName.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        e.teamName.toLowerCase().includes(q) ||
        (e.employeeCode && e.employeeCode.toLowerCase().includes(q))
    );
  }, [data?.employeePerformances, targetSearch]);

  // Filter employee list by search query
  const filteredEmpList = useMemo(() => {
    if (!sortedEmployeePerformances) return [];
    if (!empSearch.trim()) return sortedEmployeePerformances;
    const q = empSearch.toLowerCase().trim();
    return sortedEmployeePerformances.filter(
      e =>
        e.employeeName.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        e.teamName.toLowerCase().includes(q)
    );
  }, [sortedEmployeePerformances, empSearch]);

  const totalEmpPages = Math.ceil(filteredEmpList.length / empPerPage) || 1;
  const paginatedEmpList = useMemo(() => {
    const start = (empPage - 1) * empPerPage;
    return filteredEmpList.slice(start, start + empPerPage);
  }, [filteredEmpList, empPage]);

  // Check if any actual achievement exists across employees
  const hasAnyEmployeeAchievement = useMemo(() => {
    return sortedEmployeePerformances.some(
      e => {
        const ach = performanceScope === "YTD" ? (e.ytd?.achievement ?? e.mtd?.achievement ?? 0) : (e.mtd?.achievement ?? e.actualPremium ?? 0);
        return ach > 0;
      }
    );
  }, [sortedEmployeePerformances, performanceScope]);

  // Company Production total premium calculation for Contribution %
  const totalCompanyLedgerPremium = useMemo(() => {
    if (!data?.companyProductionList) return 0;
    return data.companyProductionList.reduce((sum, c) => sum + (c.actualPremium || 0), 0);
  }, [data?.companyProductionList]);

  // Filter company list to show only those with actual data
  const validCompanyProductionList = useMemo(() => {
    if (!data?.companyProductionList) return [];
    return data.companyProductionList.filter(
      c => (c.actualPremium || 0) > 0 || (c.actualPolicies || 0) > 0
    );
  }, [data?.companyProductionList]);

  // Export Monthly Performance Report as professional Excel (.xlsx)
  // Uses the SAME `data` state that drives the dashboard — no duplicate calculations.
  const handleExportReport = async () => {
    if (!data || !data.employeePerformances || data.employeePerformances.length === 0) {
      alert("No performance data available for the selected month/filters. Please adjust filters and try again.");
      return;
    }

    const monthName = MONTH_NAMES[selectedMonth - 1];

    // Build export rows straight from dashboard data (respects Month/Team/Role/Employee filters already applied via API)
    const exportRows = data.employeePerformances.map((emp: any) => {
      const target = emp.mtd?.assignedTarget ?? emp.premiumTarget ?? 0;
      const achieved = emp.mtd?.achievement ?? emp.actualPremium ?? 0;
      const remaining = emp.mtd?.remainingTarget ?? Math.max(0, target - achieved);
      const achievementPct = target > 0 ? achieved / target : 0;
      const stats = emp.policyStats || { total: emp.actualPolicies || 0, issued: 0, pending: 0, cancelled: 0 };

      let targetStatus = "No Target";
      if (target > 0) {
        if (achievementPct >= 1) targetStatus = "Achieved / Completed";
        else if (achievementPct >= 0.75) targetStatus = "On Track";
        else targetStatus = "Needs Attention";
      }

      return {
        employeeName: emp.employeeName,
        employeeCode: emp.employeeCode || "—",
        role: emp.role,
        team: emp.teamName,
        reportingManager: emp.reportingManagerName || "—",
        assignedTarget: target,
        achievedPremium: achieved,
        remainingTarget: remaining,
        achievementPct,
        totalPolicies: stats.total,
        issuedPolicies: stats.issued,
        pendingPolicies: stats.pending,
        cancelledPolicies: stats.cancelled,
        targetStatus
      };
    });

    // Summary totals — computed from the SAME filtered rows shown in the export (matches dashboard exactly)
    const totalEmployees = exportRows.length;
    const totalAssignedTarget = exportRows.reduce((s, r) => s + r.assignedTarget, 0);
    const totalAchievedPremium = exportRows.reduce((s, r) => s + r.achievedPremium, 0);
    const totalRemainingTarget = Math.max(0, totalAssignedTarget - totalAchievedPremium);
    const overallAchievementPct = totalAssignedTarget > 0 ? totalAchievedPremium / totalAssignedTarget : 0;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = companyDisplayName;
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Performance Report");

    const columnDefs = [
      { key: "employeeName", width: 24 },
      { key: "employeeCode", width: 16 },
      { key: "role", width: 16 },
      { key: "team", width: 20 },
      { key: "reportingManager", width: 20 },
      { key: "assignedTarget", width: 16 },
      { key: "achievedPremium", width: 16 },
      { key: "remainingTarget", width: 16 },
      { key: "achievementPct", width: 14 },
      { key: "totalPolicies", width: 12 },
      { key: "issuedPolicies", width: 12 },
      { key: "pendingPolicies", width: 12 },
      { key: "cancelledPolicies", width: 14 },
      { key: "targetStatus", width: 18 }
    ];
    const columnHeaders = [
      "Employee Name", "Employee Code", "Role", "Team", "Reporting Manager",
      "Assigned Target", "Achieved Premium", "Remaining Target", "Achievement %",
      "Total Policies", "Issued Policies", "Pending Policies", "Cancelled Policies", "Target Status"
    ];
    const currencyKeys = ["assignedTarget", "achievedPremium", "remainingTarget"];
    const numericKeys = [...currencyKeys, "achievementPct", "totalPolicies", "issuedPolicies", "pendingPolicies", "cancelledPolicies"];

    sheet.columns = columnDefs as any;

    // ── Title (Row 1) ──
    sheet.mergeCells(1, 1, 1, columnDefs.length);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = `${companyDisplayUpper} — PERFORMANCE REPORT`;
    titleCell.font = { bold: true, size: 14, color: { argb: "FF660000" } };

    // ── Report Month (Row 2) ──
    sheet.mergeCells(2, 1, 2, columnDefs.length);
    sheet.getCell(2, 1).value = `Report Month: ${monthName} ${selectedYear}`;
    sheet.getCell(2, 1).font = { bold: true, size: 11 };

    // ── Summary Block (Rows 4–8) ──
    const summaryPairs: [string, number, string | undefined][] = [
      ["Total Employees", totalEmployees, undefined],
      ["Total Assigned Target", totalAssignedTarget, "₹#,##0"],
      ["Total Achieved Premium", totalAchievedPremium, "₹#,##0"],
      ["Total Remaining Target", totalRemainingTarget, "₹#,##0"],
      ["Overall Achievement %", overallAchievementPct, "0.00%"]
    ];

    let r = 4;
    summaryPairs.forEach(([label, value, fmt]) => {
      const labelCell = sheet.getCell(r, 1);
      labelCell.value = label;
      labelCell.font = { bold: true, color: { argb: "FF660000" } };
      const valueCell = sheet.getCell(r, 2);
      valueCell.value = value;
      if (fmt) valueCell.numFmt = fmt;
      valueCell.font = { bold: true };
      r++;
    });

    // ── Table Header ──
    const headerRowNum = r + 1;
    const headerRow = sheet.getRow(headerRowNum);
    columnHeaders.forEach((label, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = label;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF660000" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" }, bottom: { style: "thin" },
        left: { style: "thin" }, right: { style: "thin" }
      };
    });
    headerRow.commit();

    // ── Data Rows ──
    exportRows.forEach((row) => {
      const dataRow = sheet.addRow(row);
      columnDefs.forEach((col, idx) => {
        const cell = dataRow.getCell(idx + 1);
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } }
        };
        cell.alignment = { horizontal: numericKeys.includes(col.key) ? "right" : "left" };
        if (currencyKeys.includes(col.key)) cell.numFmt = "₹#,##0";
        if (col.key === "achievementPct") cell.numFmt = "0.00%";
      });
    });

    // Freeze header (and everything above it) so it stays visible while scrolling
    sheet.views = [{ state: "frozen", ySplit: headerRowNum }];

    // Auto filter on the header row
    sheet.autoFilter = {
      from: { row: headerRowNum, column: 1 },
      to: { row: headerRowNum, column: columnDefs.length }
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${companyDisplayUpper.replace(/[^A-Za-z0-9_]/g, "_")}_Performance_Report_${monthName}_${selectedYear}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-6 pb-12">

      {/* 1. TOP HEADER & MONTH SELECTOR TOOLBAR */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#DFBFBA]/30 border border-[#DFBFBA]/60 rounded-xl text-[#660000]">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#660000] tracking-tight">
                  Monthly Performance & Targets
                </h2>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Assigned Targets vs Actual Premium Achievement
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* MONTH CALENDAR PICKER */}
            <div className="flex items-center bg-[#DFBFBA]/20 border border-[#DFBFBA]/60 rounded-xl px-3.5 py-2 shadow-2xs gap-2">
              <span className="text-xs font-semibold text-[#660000] uppercase tracking-wider">MONTH:</span>
              <input
                type="month"
                value={monthYearFilter}
                onChange={(e) => setMonthYearFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={handleExportReport}
              disabled={loading || !data}
              className="px-4 py-2 bg-white hover:bg-[#DFBFBA]/20 text-[#660000] border border-[#DFBFBA]/80 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <Download className="w-4 h-4 text-[#660000]" />
              <span>Export Report</span>
            </button>

            <button
              onClick={handleOpenAssignModal}
              className="px-4.5 py-2 bg-[#660000] hover:bg-[#520000] text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Assign Target</span>
            </button>
          </div>
        </div>

        {/* 2. COMPACT FILTER BAR */}
        <div className="pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Filter className="w-3.5 h-3.5 text-[#660000]" />
              <span>Filters:</span>
            </div>

            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#660000]"
            >
              <option value="All">All Teams</option>
              {data?.teamPerformanceList.map(t => (
                <option key={t.teamName} value={t.teamName}>{t.teamName}</option>
              ))}
            </select>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#660000]"
            >
              <option value="All">All Roles</option>
              <option value="TSE">TSE / Caller</option>
              <option value="Team Leader">Team Leader</option>
              <option value="Team Manager">Team Manager</option>
              <option value="Branch Manager">Branch Manager</option>
              <option value="Renewal Executive">Renewal Executive</option>
              <option value="Renewal Manager">Renewal Manager</option>
            </select>

            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#660000] max-w-[200px]"
            >
              <option value="All">All Employees ({data?.employeePerformances.length || 0})</option>
              {data?.employeePerformances.map(e => (
                <option key={e.employeeId} value={e.employeeId}>{e.employeeName} ({e.role})</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadPerformanceData()}
            className="text-[#660000] hover:text-[#520000] font-semibold flex items-center gap-1.5 text-xs transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Reload Policy Ledger</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB NAVIGATION */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto no-scrollbar pb-px">
        {[
          { id: "dashboard", label: "Performance Overview", icon: TrendingUp },
          { id: "targets", label: "Target Assignment", icon: Target },
          { id: "employees", label: "Employee Performance", icon: Users },
          { id: "teams", label: "Team Performance", icon: Layers },
          { id: "report", label: "Monthly Report", icon: FileText }
        ].map((tab) => {

          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer shrink-0 ${
                isActive
                  ? "border-[#660000] text-[#660000] bg-[#DFBFBA]/30 rounded-t-xl"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-[#DFBFBA]/15 rounded-t-xl"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#660000]" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !data && (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="w-8 h-8 border-3 border-[#660000] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold">Calculating MTD & YTD Ledger Achievements...</span>
        </div>
      )}

      {data && !loading && (
        <>
          {/* ========================================================================= */}
          {/* VIEW 1: PERFORMANCE OVERVIEW (DYNAMIC MTD/YTD SCOPE KPI CARDS + ANALYTICS) */}
          {/* ========================================================================= */}
          {activeSubTab === "dashboard" && (
            <div className="space-y-6">

              {/* 3. PERFORMANCE SCOPE SECTION (MTD / YTD TOGGLE + 4 DYNAMIC CARDS) */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#660000] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#660000] shrink-0" />
                    <span>{activeSectionTitle}</span>
                  </h3>

                  {/* PERFORMANCE SCOPE SELECTOR TOGGLE */}
                  <div className="inline-flex items-center bg-slate-100/80 border border-slate-200 p-1 rounded-xl shrink-0 shadow-2xs">
                    <button
                      onClick={() => setPerformanceScope("MTD")}
                      className={`px-4 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        performanceScope === "MTD"
                          ? "bg-[#660000] text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                      }`}
                    >
                      MTD
                    </button>
                    <button
                      onClick={() => setPerformanceScope("YTD")}
                      className={`px-4 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        performanceScope === "YTD"
                          ? "bg-[#660000] text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                      }`}
                    >
                      YTD
                    </button>
                  </div>
                </div>

                {/* SINGLE ROW OF FOUR DYNAMIC KPI CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* CARD 1: ASSIGNED TARGET */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between min-h-[105px] h-full transition-all">
                    <div className="space-y-1 min-w-0 pr-2 flex-1">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
                        ASSIGNED TARGET
                      </span>
                      {activeSummary.assignedTarget > 0 ? (
                        <>
                          <span className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight block font-mono whitespace-nowrap">
                            {fmtLakhs(activeSummary.assignedTarget)}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500 block truncate font-mono">
                            {fmtCurr(activeSummary.assignedTarget)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-base font-bold text-slate-400 tracking-tight block whitespace-nowrap">
                            Target not assigned
                          </span>
                          <span className="text-[11px] font-medium text-slate-400 block truncate">
                            Target not assigned
                          </span>
                        </>
                      )}
                    </div>
                    <div className="w-10 h-10 bg-[#DFBFBA]/30 text-[#660000] border border-[#DFBFBA]/60 rounded-xl flex items-center justify-center shrink-0 shadow-2xs my-auto">
                      <Target className="w-5 h-5 stroke-[2]" />
                    </div>
                  </div>

                  {/* CARD 2: ACHIEVED PREMIUM */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between min-h-[105px] h-full transition-all">
                    <div className="space-y-1 min-w-0 pr-2 flex-1">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
                        ACHIEVED PREMIUM
                      </span>
                      <span className="text-lg sm:text-xl font-bold text-[#660000] tracking-tight block font-mono whitespace-nowrap">
                        {activeSummary.achievement > 0
                          ? fmtLakhs(activeSummary.achievement)
                          : "₹0"}
                      </span>
                      <span className="text-[11px] font-semibold text-[#660000]/80 block truncate font-mono">
                        {fmtCurr(activeSummary.achievement)}
                      </span>
                    </div>
                    <div className="w-10 h-10 bg-[#DFBFBA]/30 text-[#660000] border border-[#DFBFBA]/60 rounded-xl flex items-center justify-center shrink-0 shadow-2xs my-auto">
                      <TrendingUp className="w-5 h-5 stroke-[2]" />
                    </div>
                  </div>

                  {/* CARD 3: ACHIEVEMENT % */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between min-h-[105px] h-full transition-all">
                    <div className="space-y-1 min-w-0 pr-2 flex-1">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
                        ACHIEVEMENT %
                      </span>
                      <span className="text-lg sm:text-xl font-bold text-[#660000] tracking-tight block font-mono whitespace-nowrap">
                        {activeSummary.achievementPercentage}%
                      </span>
                      <div className="w-full bg-[#DFBFBA]/30 h-1.5 rounded-full overflow-hidden mt-1.5">
                        <div
                          className="bg-[#660000] h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, activeSummary.achievementPercentage)}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-[#DFBFBA]/30 text-[#660000] border border-[#DFBFBA]/60 rounded-xl flex items-center justify-center shrink-0 shadow-2xs my-auto">
                      <Award className="w-5 h-5 stroke-[2]" />
                    </div>
                  </div>

                  {/* CARD 4: REMAINING TARGET */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between min-h-[105px] h-full transition-all">
                    <div className="space-y-1 min-w-0 pr-2 flex-1">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
                        REMAINING TARGET
                      </span>
                      <span className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight block font-mono whitespace-nowrap">
                        {activeSummary.remainingTarget > 0
                          ? fmtLakhs(activeSummary.remainingTarget)
                          : "₹0"}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 block truncate font-mono">
                        {fmtCurr(activeSummary.remainingTarget)}
                      </span>
                    </div>
                    <div className="w-10 h-10 bg-[#DFBFBA]/30 text-[#660000] border border-[#DFBFBA]/60 rounded-xl flex items-center justify-center shrink-0 shadow-2xs my-auto">
                      <Clock className="w-5 h-5 stroke-[2]" />
                    </div>
                  </div>
                </div>

                {/* 4. ANALYTICS SECTION: TOP PERFORMERS & TEAM PERFORMANCE DISTRIBUTION DUAL GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                  <TopPerformersCard
                    sortedEmployeePerformances={sortedEmployeePerformances}
                    performanceScope={performanceScope}
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                  />
                  <TeamPerformanceDistributionCard
                    data={data}
                    performanceScope={performanceScope}
                  />
                </div>
              </div>
            </div>
          )}


          {/* ========================================================================= */}
          {/* VIEW 2: TARGET MANAGEMENT */}
          {/* ========================================================================= */}
          {activeSubTab === "targets" && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="shrink-0">
                  <h3 className="text-sm font-semibold text-[#660000]">Monthly Target Assignments</h3>
                  <p className="text-xs text-slate-500 font-normal">Manually assigned premium targets for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}</p>
                </div>

                {/* Center Search Bar */}
                <div className="relative w-full max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search employee / role / team..."
                    value={targetSearch}
                    onChange={(e) => setTargetSearch(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-1.5 text-xs focus:outline-none focus:border-[#660000] focus:ring-1 focus:ring-[#660000]/10 shadow-2xs"
                  />
                  {targetSearch && (
                    <button
                      type="button"
                      onClick={() => setTargetSearch("")}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                      title="Clear Search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  onClick={handleOpenAssignModal}
                  className="px-4 py-2 bg-[#660000] hover:bg-[#520000] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Assign New Target</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-3">S.NO.</th>
                      <th className="px-3.5 py-3">EMPLOYEE</th>
                      <th className="px-3.5 py-3">ROLE</th>
                      <th className="px-3.5 py-3">TEAM</th>
                      <th className="px-3.5 py-3 text-right">ASSIGNED PREMIUM TARGET</th>
                      <th className="px-3.5 py-3 text-center">TARGET STATUS</th>
                      <th className="px-3.5 py-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {filteredTargetEmployees.map((emp) => {
                      const mtdTgt = emp.mtd?.assignedTarget ?? emp.premiumTarget ?? 0;
                      return (
                        <tr key={emp.employeeId} className="hover:bg-slate-50/60 transition">
                          <td className="px-3.5 py-3 font-mono font-medium text-slate-400">{emp.sNo < 10 ? `0${emp.sNo}` : emp.sNo}</td>
                          <td className="px-3.5 py-3 font-semibold text-slate-900">{emp.employeeName}</td>
                          <td className="px-3.5 py-3 text-slate-600 font-normal">{emp.role}</td>
                          <td className="px-3.5 py-3 text-slate-600 font-normal">{emp.teamName}</td>

                          <td className="px-3.5 py-3 text-right font-semibold text-[#660000] font-mono">
                            {mtdTgt > 0 ? fmtCurr(mtdTgt) : "Target not assigned"}
                          </td>

                          <td className="px-3.5 py-3 text-center">
                            {emp.hasTargetAssigned && mtdTgt > 0 ? (
                              <span className="px-2.5 py-0.5 bg-[#DFBFBA]/30 text-[#660000] border border-[#DFBFBA]/80 rounded-md text-[10px] font-semibold">
                                Assigned
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[10px] font-medium">
                                Target not assigned
                              </span>
                            )}
                          </td>

                          <td className="px-3.5 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleEditTarget(emp)}
                                className="px-3 py-1 bg-white hover:bg-[#DFBFBA]/20 text-[#660000] border border-[#DFBFBA]/80 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                                title="Edit Target"
                              >
                                <Edit className="w-3 h-3" />
                                <span>{emp.hasTargetAssigned ? "Edit" : "Assign"}</span>
                              </button>
                              {emp.targetId && (
                                <button
                                  onClick={() => setDeletingTargetId(emp.targetId)}
                                  className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                  title="Delete Target"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredTargetEmployees.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-normal">
                          {targetSearch ? `No targets found matching "${targetSearch}".` : "No employees found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 3: EMPLOYEE PERFORMANCE TABLE */}
          {/* ========================================================================= */}
          {activeSubTab === "employees" && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#660000]">Individual Employee MTD & YTD Performance</h3>
                  <p className="text-xs text-slate-500 font-normal">Sorted by actual Achievement %. Achievements automatically calculated from Policy Ledger</p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={empSearch}
                    onChange={(e) => { setEmpSearch(e.target.value); setEmpPage(1); }}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#660000]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-3">S.NO.</th>
                      <th className="px-3.5 py-3">EMPLOYEE</th>
                      <th className="px-3.5 py-3">ROLE / TEAM</th>
                      <th className="px-3.5 py-3 text-right">MTD TARGET</th>
                      <th className="px-3.5 py-3 text-right">MTD ACHIEVED PREMIUM</th>
                      <th className="px-3.5 py-3 text-center">MTD %</th>
                      <th className="px-3.5 py-3 text-right">MTD REMAINING</th>
                      <th className="px-3.5 py-3 text-right">YTD TARGET</th>
                      <th className="px-3.5 py-3 text-right">YTD ACHIEVED PREMIUM</th>
                      <th className="px-3.5 py-3 text-center">YTD %</th>
                      <th className="px-3.5 py-3 text-center">STATUS</th>
                      <th className="px-3.5 py-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {paginatedEmpList.map((emp) => {
                      const mtdTgt = emp.mtd?.assignedTarget ?? emp.premiumTarget ?? 0;
                      const mtdAch = emp.mtd?.achievement ?? emp.actualPremium ?? 0;
                      const hasMtdTgt = mtdTgt > 0;
                      const mtdPct = hasMtdTgt ? (emp.mtd?.achievementPercentage ?? emp.premiumAchievement ?? 0) : 0;
                      const mtdRem = hasMtdTgt ? (emp.mtd?.remainingTarget ?? emp.remainingPremium ?? 0) : 0;

                      const ytdTgt = emp.ytd?.assignedTarget ?? mtdTgt;
                      const ytdAch = emp.ytd?.achievement ?? mtdAch;
                      const hasYtdTgt = ytdTgt > 0;
                      const ytdPct = hasYtdTgt ? (emp.ytd?.achievementPercentage ?? mtdPct) : 0;

                      const isTopPerformer = sortedEmployeePerformances[0]?.employeeId === emp.employeeId && mtdAch > 0 && hasMtdTgt;

                      return (
                        <tr
                          key={emp.employeeId}
                          onClick={() => setSelectedEmpDetail(emp)}
                          className="hover:bg-slate-50/80 transition cursor-pointer"
                        >
                          <td className="px-3.5 py-3 font-mono font-medium text-slate-400">
                            {emp.sNo < 10 ? `0${emp.sNo}` : emp.sNo}
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">{emp.employeeName}</span>
                              {isTopPerformer && (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-extrabold rounded-md flex items-center gap-1 shrink-0">
                                  <Star className="w-3 h-3 fill-amber-500 stroke-none" /> Champion
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3.5 py-3 text-slate-600 font-normal">{emp.role} • {emp.teamName}</td>

                          <td className="px-3.5 py-3 text-right font-medium text-slate-700 font-mono">
                            {hasMtdTgt ? fmtLakhs(mtdTgt) : <span className="text-slate-400 italic">No Target</span>}
                          </td>
                          <td className="px-3.5 py-3 text-right font-semibold text-[#660000] font-mono">
                            {mtdAch > 0 ? fmtLakhs(mtdAch) : "₹0"}
                          </td>
                          <td className="px-3.5 py-3 text-center font-semibold text-[#660000]">
                            {hasMtdTgt ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <span>{mtdPct}%</span>
                                <div className="w-12 bg-[#DFBFBA]/30 h-1.5 rounded-full overflow-hidden shrink-0">
                                  <div className="bg-[#660000] h-full rounded-full" style={{ width: `${Math.min(100, mtdPct)}%` }} />
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic font-normal">N/A</span>
                            )}
                          </td>
                          <td className="px-3.5 py-3 text-right font-medium text-slate-700 font-mono">
                            {hasMtdTgt ? (mtdRem > 0 ? fmtLakhs(mtdRem) : "₹0") : <span className="text-slate-400 italic">N/A</span>}
                          </td>

                          <td className="px-3.5 py-3 text-right font-medium text-slate-700 font-mono">
                            {hasYtdTgt ? fmtLakhs(ytdTgt) : <span className="text-slate-400 italic">No Target</span>}
                          </td>
                          <td className="px-3.5 py-3 text-right font-semibold text-[#660000] font-mono">
                            {ytdAch > 0 ? fmtLakhs(ytdAch) : "₹0"}
                          </td>
                          <td className="px-3.5 py-3 text-center font-semibold text-[#660000]">
                            {hasYtdTgt ? `${ytdPct}%` : <span className="text-slate-400 italic font-normal">N/A</span>}
                          </td>

                          <td className="px-3.5 py-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold ${
                              !hasMtdTgt ? "bg-slate-100 text-slate-600 border border-slate-200" :
                              emp.status === "Excellent" || emp.status === "On Track" ? "bg-[#DFBFBA]/30 text-[#660000] border border-[#DFBFBA]/80" :
                              emp.status === "Needs Attention" ? "bg-amber-50 text-amber-800 border border-amber-200/80" :
                              "bg-red-50 text-red-800 border border-red-200"
                            }`}>
                              {!hasMtdTgt ? "No Target" : emp.status}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedEmpDetail(emp)}
                              className="px-2.5 py-1 bg-white hover:bg-[#DFBFBA]/20 text-[#660000] border border-[#DFBFBA]/80 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer ml-auto"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {!hasAnyEmployeeAchievement && paginatedEmpList.length === 0 && (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-slate-400 font-medium">
                          No performance data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              {totalEmpPages > 1 && (
                <div className="flex items-center justify-between text-xs pt-2">
                  <span className="text-slate-500 font-medium">
                    Showing {(empPage - 1) * empPerPage + 1} to {Math.min(empPage * empPerPage, filteredEmpList.length)} of {filteredEmpList.length} employees
                  </span>
                  <div className="flex items-center gap-2 font-semibold">
                    <button
                      onClick={() => setEmpPage(p => Math.max(1, p - 1))}
                      disabled={empPage === 1}
                      className="px-3 py-1 bg-white hover:bg-[#DFBFBA]/20 text-[#660000] border border-[#DFBFBA]/80 rounded-lg disabled:opacity-40 cursor-pointer"
                    >
                      Prev
                    </button>
                    <span className="px-2 py-1 text-slate-700">Page {empPage} of {totalEmpPages}</span>
                    <button
                      onClick={() => setEmpPage(p => Math.min(totalEmpPages, p + 1))}
                      disabled={empPage === totalEmpPages}
                      className="px-3 py-1 bg-white hover:bg-[#DFBFBA]/20 text-[#660000] border border-[#DFBFBA]/80 rounded-lg disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 4: TEAM PERFORMANCE */}
          {/* ========================================================================= */}
          {activeSubTab === "teams" && (
            <div className="space-y-6">
              {data.teamPerformanceList.map((team) => {
                const tMtdTgt = team.mtd?.assignedTarget ?? team.premiumTarget ?? 0;
                const tMtdAch = team.mtd?.achievement ?? team.actualPremium ?? 0;
                const tMtdPct = team.mtd?.achievementPercentage ?? team.premiumAchievement ?? 0;
                const tMtdRem = team.mtd?.remainingTarget ?? 0;
                const tYtdTgt = team.ytd?.assignedTarget ?? tMtdTgt;
                const tYtdAch = team.ytd?.achievement ?? tMtdAch;
                const tYtdPct = team.ytd?.achievementPercentage ?? tMtdPct;

                const q = teamSearch.toLowerCase().trim();
                const filteredMembers = q
                  ? team.members.filter(m =>
                      m.employeeName.toLowerCase().includes(q) ||
                      m.role.toLowerCase().includes(q) ||
                      (m.employeeCode && m.employeeCode.toLowerCase().includes(q))
                    )
                  : team.members;

                return (
                  <div key={team.teamName} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="shrink-0">
                        <h3 className="text-base font-bold text-[#660000] uppercase tracking-tight">{team.teamName}</h3>
                        <p className="text-xs text-slate-500 font-normal">
                          {filteredMembers.length} Members {teamSearch ? "Found" : "Assigned"}
                        </p>
                      </div>

                      {/* Center Search Bar for Team */}
                      <div className="relative w-full max-w-sm">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder={`Search members in ${team.teamName}...`}
                          value={teamSearch}
                          onChange={(e) => setTeamSearch(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-1.5 text-xs focus:outline-none focus:border-[#660000] focus:ring-1 focus:ring-[#660000]/10 shadow-2xs"
                        />
                        {teamSearch && (
                          <button
                            type="button"
                            onClick={() => setTeamSearch("")}
                            className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                            title="Clear Search"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-6 text-xs font-semibold shrink-0">
                        <div>
                          <span className="text-slate-400 uppercase text-[10px] block font-medium">MTD TEAM PERFORMANCE</span>
                          <span className="text-[#660000] font-semibold">{tMtdAch > 0 ? fmtLakhs(tMtdAch) : "₹0"} / {tMtdTgt > 0 ? fmtLakhs(tMtdTgt) : "Target not assigned"} ({tMtdPct}%)</span>
                        </div>

                        <div>
                          <span className="text-slate-400 uppercase text-[10px] block font-medium">YTD TEAM PERFORMANCE</span>
                          <span className="text-[#660000] font-semibold">{tYtdAch > 0 ? fmtLakhs(tYtdAch) : "₹0"} / {tYtdTgt > 0 ? fmtLakhs(tYtdTgt) : "Target not assigned"} ({tYtdPct}%)</span>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                          <tr>
                            <th className="px-3.5 py-2.5">EMPLOYEE</th>
                            <th className="px-3.5 py-2.5">ROLE</th>
                            <th className="px-3.5 py-2.5 text-right">MTD TARGET</th>
                            <th className="px-3.5 py-2.5 text-right">MTD ACHIEVED PREMIUM</th>
                            <th className="px-3.5 py-2.5 text-center">MTD %</th>
                            <th className="px-3.5 py-2.5 text-right">MTD REMAINING</th>
                            <th className="px-3.5 py-2.5 text-right">YTD TARGET</th>
                            <th className="px-3.5 py-2.5 text-right">YTD ACHIEVED PREMIUM</th>
                            <th className="px-3.5 py-2.5 text-center">YTD %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {filteredMembers.map((m) => {
                            const mMtdTgt = m.mtd?.assignedTarget ?? m.premiumTarget ?? 0;
                            const mMtdAch = m.mtd?.achievement ?? m.actualPremium ?? 0;
                            const mMtdPct = m.mtd?.achievementPercentage ?? m.premiumAchievement ?? 0;
                            const mMtdRem = m.mtd?.remainingTarget ?? 0;
                            const mYtdTgt = m.ytd?.assignedTarget ?? mMtdTgt;
                            const mYtdAch = m.ytd?.achievement ?? mMtdAch;
                            const mYtdPct = m.ytd?.achievementPercentage ?? mMtdPct;

                            return (
                              <tr key={m.employeeId} className="hover:bg-slate-50/60">
                                <td className="px-3.5 py-2.5 font-semibold text-slate-900">{m.employeeName}</td>
                                <td className="px-3.5 py-2.5 text-slate-600 font-normal">{m.role}</td>
                                <td className="px-3.5 py-2.5 text-right text-slate-700 font-mono">{mMtdTgt > 0 ? fmtLakhs(mMtdTgt) : "Target not assigned"}</td>
                                <td className="px-3.5 py-2.5 text-right text-[#660000] font-semibold font-mono">{mMtdAch > 0 ? fmtLakhs(mMtdAch) : "₹0"}</td>
                                <td className="px-3.5 py-2.5 text-center font-semibold text-[#660000]">{mMtdPct}%</td>
                                <td className="px-3.5 py-2.5 text-right text-slate-700 font-mono">{mMtdRem > 0 ? fmtLakhs(mMtdRem) : "₹0"}</td>
                                <td className="px-3.5 py-2.5 text-right text-slate-700 font-mono">{mYtdTgt > 0 ? fmtLakhs(mYtdTgt) : "Target not assigned"}</td>
                                <td className="px-3.5 py-2.5 text-right text-[#660000] font-semibold font-mono">{mYtdAch > 0 ? fmtLakhs(mYtdAch) : "₹0"}</td>
                                <td className="px-3.5 py-2.5 text-center font-semibold text-[#660000]">{mYtdPct}%</td>
                              </tr>
                            );
                          })}

                          {filteredMembers.length === 0 && (
                            <tr>
                              <td colSpan={9} className="py-6 text-center text-slate-400 font-normal">
                                {teamSearch ? `No team members found matching "${teamSearch}".` : "No members assigned."}
                              </td>
                            </tr>
                          )}

                          <tr className="bg-[#DFBFBA]/20 font-semibold text-slate-900 border-t border-[#DFBFBA]">
                            <td colSpan={2} className="px-3.5 py-2.5 text-[#660000] font-semibold">TOTAL {team.teamName.toUpperCase()}</td>
                            <td className="px-3.5 py-2.5 text-right">{tMtdTgt > 0 ? fmtLakhs(tMtdTgt) : "Target not assigned"}</td>
                            <td className="px-3.5 py-2.5 text-right text-[#660000] font-semibold">{tMtdAch > 0 ? fmtLakhs(tMtdAch) : "₹0"}</td>
                            <td className="px-3.5 py-2.5 text-center text-[#660000] font-semibold">{tMtdPct}%</td>
                            <td className="px-3.5 py-2.5 text-right text-slate-700">{tMtdRem > 0 ? fmtLakhs(tMtdRem) : "₹0"}</td>
                            <td className="px-3.5 py-2.5 text-right">{tYtdTgt > 0 ? fmtLakhs(tYtdTgt) : "Target not assigned"}</td>
                            <td className="px-3.5 py-2.5 text-right text-[#660000] font-semibold">{tYtdAch > 0 ? fmtLakhs(tYtdAch) : "₹0"}</td>
                            <td className="px-3.5 py-2.5 text-center text-[#660000] font-semibold">{tYtdPct}%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {data.teamPerformanceList.length === 0 && (
                <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-slate-400 text-xs font-normal">
                  No data available
                </div>
              )}
            </div>
          )}


          {/* ========================================================================= */}
          {/* VIEW 6: MANAGEMENT-LEVEL MONTHLY PERFORMANCE REPORT */}
          {/* ========================================================================= */}
          {activeSubTab === "report" && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-8 max-w-6xl mx-auto">
              
              {/* PRINT STYLES BLOCK */}
              <style>{`
                @media print {
                  body {
                    background: #ffffff !important;
                    color: #000000 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                  @page {
                    size: A4 landscape;
                    margin: 10mm 12mm;
                  }
                  table {
                    width: 100% !important;
                    page-break-inside: auto;
                  }
                  tr {
                    page-break-inside: avoid !important;
                    page-break-after: auto !important;
                  }
                  thead {
                    display: table-header-group !important;
                  }
                }
              `}</style>

              {/* TOP TOOLBAR ACTIONS (NO-PRINT) */}
              <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-semibold text-[#660000] flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#660000]" />
                    <span>Management Performance Report</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-normal mt-0.5">
                    A4 Print & Executive PDF ready format for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-white hover:bg-[#DFBFBA]/20 text-[#660000] border border-[#DFBFBA]/80 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-2xs"
                  >
                    <FileText className="w-4 h-4 text-[#660000]" />
                    <span>Print / Save PDF</span>
                  </button>

                  <button
                    onClick={handleExportReport}
                    className="px-4.5 py-2 bg-[#660000] hover:bg-[#520000] text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Excel</span>
                  </button>
                </div>
              </div>

              {/* 1. REPORT HEADER */}
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-[#660000] pb-5 gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#660000] block">POLICY MASTER</span>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                    MONTHLY PERFORMANCE REPORT
                  </h1>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    Insurance Sales & Business Production Executive Assessment
                  </p>
                </div>

                <div className="text-right text-xs space-y-1 bg-[#DFBFBA]/20 border border-[#DFBFBA]/60 rounded-xl p-3.5 min-w-[220px]">
                  <div className="flex justify-between gap-4">
                    <span className="font-semibold text-slate-500 uppercase text-[10px]">Report Period:</span>
                    <span className="font-bold text-[#660000]">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="font-semibold text-slate-500 uppercase text-[10px]">Financial Year:</span>
                    <span className="font-bold text-slate-800">
                      {selectedMonth >= 4
                        ? `April ${selectedYear} – March ${selectedYear + 1}`
                        : `April ${selectedYear - 1} – March ${selectedYear}`}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 pt-1 border-t border-[#DFBFBA]/40">
                    <span className="font-medium text-slate-400 uppercase text-[9px]">Generated On:</span>
                    <span className="font-mono text-[10px] text-slate-600">{new Date().toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* 2. EXECUTIVE SUMMARY (MTD & YTD CARDS) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#660000] flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#660000]" />
                    <span>Executive Summary & Overview</span>
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Scope: MTD & Financial Year YTD</span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* MTD ASSIGNED */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">MTD ASSIGNED TARGET</span>
                    <div className="text-xl font-bold text-slate-900">{fmtCurr(data?.mtdSummary?.assignedTarget ?? data?.summary?.totalPremiumTarget ?? 0)}</div>
                    <span className="text-[10px] text-slate-500 font-normal">Selected Month Allocation</span>
                  </div>

                  {/* MTD ACHIEVEMENT */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">MTD ACHIEVED PREMIUM</span>
                    <div className="text-xl font-bold text-[#660000]">{fmtCurr(data?.mtdSummary?.achievement ?? data?.summary?.totalActualPremium ?? 0)}</div>
                    <span className="text-[10px] text-slate-500 font-normal">Verified Active Premiums</span>
                  </div>

                  {/* MTD % */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">MTD ACHIEVEMENT %</span>
                    <div className="text-xl font-bold text-[#660000]">{data?.mtdSummary?.achievementPercentage ?? data?.summary?.overallPremiumAchievement ?? 0}%</div>
                    <div className="w-full bg-[#DFBFBA]/30 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className="bg-[#660000] h-full rounded-full"
                        style={{ width: `${Math.min(100, data?.mtdSummary?.achievementPercentage ?? data?.summary?.overallPremiumAchievement ?? 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* MTD REMAINING */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">MTD REMAINING TARGET</span>
                    <div className="text-xl font-bold text-slate-800">{fmtCurr(data?.mtdSummary?.remainingTarget ?? data?.summary?.remainingPremium ?? 0)}</div>
                    <span className="text-[10px] text-slate-500 font-normal">Gap To Target</span>
                  </div>

                  {/* YTD ASSIGNED */}
                  <div className="bg-[#DFBFBA]/15 border border-[#DFBFBA]/60 rounded-xl p-4 space-y-1 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">YTD ASSIGNED TARGET</span>
                    <div className="text-xl font-bold text-slate-900">{fmtCurr(data?.ytdSummary?.assignedTarget ?? data?.mtdSummary?.assignedTarget ?? 0)}</div>
                    <span className="text-[10px] text-slate-500 font-normal">April to Selected Month Target</span>
                  </div>

                  {/* YTD ACHIEVEMENT */}
                  <div className="bg-[#DFBFBA]/15 border border-[#DFBFBA]/60 rounded-xl p-4 space-y-1 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">YTD ACHIEVED PREMIUM</span>
                    <div className="text-xl font-bold text-[#660000]">{fmtCurr(data?.ytdSummary?.achievement ?? data?.mtdSummary?.achievement ?? 0)}</div>
                    <span className="text-[10px] text-slate-500 font-normal">April Start Cumulative Ledger</span>
                  </div>

                  {/* YTD % */}
                  <div className="bg-[#DFBFBA]/15 border border-[#DFBFBA]/60 rounded-xl p-4 space-y-1 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">YTD ACHIEVEMENT %</span>
                    <div className="text-xl font-bold text-[#660000]">{data?.ytdSummary?.achievementPercentage ?? data?.mtdSummary?.achievementPercentage ?? 0}%</div>
                    <div className="w-full bg-[#DFBFBA]/40 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className="bg-[#660000] h-full rounded-full"
                        style={{ width: `${Math.min(100, data?.ytdSummary?.achievementPercentage ?? data?.mtdSummary?.achievementPercentage ?? 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* YTD REMAINING */}
                  <div className="bg-[#DFBFBA]/15 border border-[#DFBFBA]/60 rounded-xl p-4 space-y-1 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">YTD REMAINING TARGET</span>
                    <div className="text-xl font-bold text-slate-800">{fmtCurr(data?.ytdSummary?.remainingTarget ?? data?.mtdSummary?.remainingTarget ?? 0)}</div>
                    <span className="text-[10px] text-slate-500 font-normal">Cumulative Target Gap</span>
                  </div>
                </div>
              </div>

              {/* 3. MAIN EMPLOYEE PERFORMANCE TABLE */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#660000] flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#660000]" />
                    <span>Individual Employee Performance Breakdown ({data.employeePerformances.length} Employees)</span>
                  </h3>
                </div>

                <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#660000] text-white font-semibold border-b border-[#660000]">
                        <th className="px-3 py-2.5 text-center w-12 border-r border-[#660000]/30">S.NO.</th>
                        <th className="px-3 py-2.5 border-r border-[#660000]/30">EMPLOYEE NAME</th>
                        <th className="px-3 py-2.5 border-r border-[#660000]/30">ROLE</th>
                        <th className="px-3 py-2.5 border-r border-[#660000]/30">TEAM</th>
                        <th className="px-3 py-2.5 text-right border-r border-[#660000]/30">MTD TARGET</th>
                        <th className="px-3 py-2.5 text-right border-r border-[#660000]/30">MTD ACHIEVED PREMIUM</th>
                        <th className="px-3 py-2.5 text-center border-r border-[#660000]/30">MTD %</th>
                        <th className="px-3 py-2.5 text-right border-r border-[#660000]/30">MTD REMAINING</th>
                        <th className="px-3 py-2.5 text-center">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                      {sortedEmployeePerformances.map((emp, idx) => {
                        const mtdTgt = emp.mtd?.assignedTarget ?? emp.premiumTarget ?? 0;
                        const mtdAch = emp.mtd?.achievement ?? emp.actualPremium ?? 0;
                        const mtdPct = emp.mtd?.achievementPercentage ?? emp.premiumAchievement ?? 0;
                        const mtdRem = emp.mtd?.remainingTarget ?? emp.remainingPremium ?? 0;

                        return (
                          <tr key={emp.employeeId} className={idx % 2 === 1 ? "bg-[#DFBFBA]/10" : "bg-white"}>
                            <td className="px-3 py-2 text-center font-mono font-medium text-slate-400 border-r border-slate-200">
                              {emp.sNo < 10 ? `0${emp.sNo}` : emp.sNo}
                            </td>
                            <td className="px-3 py-2 font-semibold text-slate-900 border-r border-slate-200">{emp.employeeName}</td>
                            <td className="px-3 py-2 text-slate-600 font-normal border-r border-slate-200">{emp.role}</td>
                            <td className="px-3 py-2 text-slate-600 font-normal border-r border-slate-200">{emp.teamName}</td>

                            <td className="px-3 py-2 text-right font-mono text-slate-700 border-r border-slate-200">{mtdTgt > 0 ? fmtCurr(mtdTgt) : "Target not assigned"}</td>
                            <td className="px-3 py-2 text-right font-semibold text-[#660000] font-mono border-r border-slate-200">{mtdAch > 0 ? fmtCurr(mtdAch) : "₹0"}</td>
                            
                            <td className="px-3 py-2 text-center border-r border-slate-200 font-semibold">
                              <span className="text-[#660000] font-semibold">{mtdPct}%</span>
                              <div className="w-16 bg-[#DFBFBA]/30 h-1 rounded-full overflow-hidden mx-auto mt-0.5">
                                <div className="bg-[#660000] h-full rounded-full" style={{ width: `${Math.min(100, mtdPct)}%` }} />
                              </div>
                            </td>

                            <td className="px-3 py-2 text-right font-mono text-slate-700 border-r border-slate-200">{mtdRem > 0 ? fmtCurr(mtdRem) : "₹0"}</td>
                            
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                emp.status === "Excellent" || emp.status === "On Track" ? "bg-[#DFBFBA]/30 text-[#660000] border border-[#DFBFBA]/80" :
                                emp.status === "Needs Attention" ? "bg-amber-50 text-amber-800 border border-amber-200" :
                                emp.status === "Target Not Assigned" ? "bg-slate-100 text-slate-600 border border-slate-200" : "bg-red-50 text-red-800 border border-red-200"
                              }`}>
                                {emp.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. TEAM-WISE PERFORMANCE REPORT */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#660000] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#660000]" />
                    <span>Team-Wise Performance Summary</span>
                  </h3>
                </div>

                <div className="space-y-4">
                  {data.teamPerformanceList.map((team) => {
                    const tMtdTgt = team.mtd?.assignedTarget ?? team.premiumTarget ?? 0;
                    const tMtdAch = team.mtd?.achievement ?? team.actualPremium ?? 0;
                    const tMtdPct = team.mtd?.achievementPercentage ?? team.premiumAchievement ?? 0;

                    return (
                      <div key={team.teamName} className="border border-slate-200 rounded-xl p-4 bg-white space-y-3 shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-[#DFBFBA]/30 text-[#660000] border border-[#DFBFBA]/80 rounded-md font-semibold text-[10px]">
                              TEAM
                            </span>
                            <h4 className="font-semibold text-slate-900 text-sm">{team.teamName.toUpperCase()}</h4>
                            <span className="text-xs text-slate-500 font-normal">({team.memberCount} Members)</span>
                          </div>

                          <div className="flex items-center gap-4 text-xs font-mono font-semibold">
                            <span>Target: <strong className="text-slate-900 font-semibold">{tMtdTgt > 0 ? fmtCurr(tMtdTgt) : "Target not assigned"}</strong></span>
                            <span>Achieved: <strong className="text-[#660000] font-semibold">{tMtdAch > 0 ? fmtCurr(tMtdAch) : "₹0"}</strong></span>
                            <span>Ach %: <strong className="text-[#660000] font-semibold">{tMtdPct}%</strong></span>
                          </div>
                        </div>

                        <div className="overflow-x-auto text-xs">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-[#DFBFBA]/20 text-[#660000] font-semibold border-b border-[#DFBFBA]/50">
                              <tr>
                                <th className="px-3 py-2">MEMBER</th>
                                <th className="px-3 py-2">ROLE</th>
                                <th className="px-3 py-2 text-right">TARGET</th>
                                <th className="px-3 py-2 text-right">ACHIEVED PREMIUM</th>
                                <th className="px-3 py-2 text-center">ACH %</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {team.members.map((m) => {
                                const mMtdTgt = m.mtd?.assignedTarget ?? m.premiumTarget ?? 0;
                                const mMtdAch = m.mtd?.achievement ?? m.actualPremium ?? 0;
                                const mMtdPct = m.mtd?.achievementPercentage ?? m.premiumAchievement ?? 0;

                                return (
                                  <tr key={m.employeeId} className="hover:bg-[#DFBFBA]/10">
                                    <td className="px-3 py-1.5 font-semibold text-slate-900">{m.employeeName}</td>
                                    <td className="px-3 py-1.5 text-slate-600 font-normal">{m.role}</td>
                                    <td className="px-3 py-1.5 text-right font-mono text-slate-700">{mMtdTgt > 0 ? fmtCurr(mMtdTgt) : "Target not assigned"}</td>
                                    <td className="px-3 py-1.5 text-right font-mono text-[#660000] font-semibold">{mMtdAch > 0 ? fmtCurr(mMtdAch) : "₹0"}</td>
                                    <td className="px-3 py-1.5 text-center font-semibold text-[#660000]">{mMtdPct}%</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 5. COMPANY-WISE & TOP PERFORMERS DUAL GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* COMPANY PRODUCTION */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#660000] flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#660000]" />
                    <span>Insurance Company Production</span>
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-[#DFBFBA]/20 text-[#660000] font-semibold border-b border-[#DFBFBA]/60">
                        <tr>
                          <th className="px-3 py-2">INSURANCE COMPANY</th>
                          <th className="px-3 py-2 text-center">POLICIES</th>
                          <th className="px-3 py-2 text-right">PREMIUM</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        {validCompanyProductionList.map((cp) => (
                          <tr key={cp.companyName} className="hover:bg-[#DFBFBA]/10">
                            <td className="px-3 py-2 font-semibold text-slate-900">{cp.companyName}</td>
                            <td className="px-3 py-2 text-center font-medium text-slate-900">{cp.actualPolicies}</td>
                            <td className="px-3 py-2 text-right font-semibold text-[#660000] font-mono">{fmtCurr(cp.actualPremium)}</td>
                          </tr>
                        ))}
                        {validCompanyProductionList.length === 0 && (
                          <tr>
                            <td colSpan={3} className="py-6 text-center text-slate-400 font-normal">
                              No data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TOP PERFORMERS */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#660000] flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#660000]" />
                    <span>Top Performers Ranking</span>
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-[#DFBFBA]/20 text-[#660000] font-semibold border-b border-[#DFBFBA]/60">
                        <tr>
                          <th className="px-3 py-2 text-center">RANK</th>
                          <th className="px-3 py-2">EMPLOYEE</th>
                          <th className="px-3 py-2 text-right">ACHIEVED PREMIUM</th>
                          <th className="px-3 py-2 text-center">ACH %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        {data.topPerformers
                          .filter(e => (e.mtd?.achievement ?? e.actualPremium ?? 0) > 0)
                          .slice(0, 5)
                          .map((emp, idx) => (
                            <tr key={emp.employeeId} className="hover:bg-[#DFBFBA]/10">
                              <td className="px-3 py-2 text-center font-semibold text-[#660000]">#{idx + 1}</td>
                              <td className="px-3 py-2 font-semibold text-slate-900">{emp.employeeName}</td>
                              <td className="px-3 py-2 text-right font-mono text-[#660000] font-semibold">{fmtCurr(emp.mtd?.achievement ?? emp.actualPremium ?? 0)}</td>
                              <td className="px-3 py-2 text-center font-semibold text-[#660000]">{emp.mtd?.achievementPercentage ?? emp.premiumAchievement ?? 0}%</td>
                            </tr>
                          ))}
                        {!hasAnyEmployeeAchievement && (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400 font-normal">
                              No performance data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* 6. MONTHLY EXECUTIVE SUMMARY SUMMARY TABLE */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#660000] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#660000]" />
                    <span>Monthly Executive Totals & Performance Summary</span>
                  </h3>
                </div>

                <div className="bg-[#DFBFBA]/15 border border-[#DFBFBA]/60 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">TOTAL EMPLOYEES</span>
                    <span className="text-base font-bold text-slate-900">{data.summary.employeeCount}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">WITH ACHIEVED PREMIUM</span>
                    <span className="text-base font-bold text-[#660000]">
                      {data.employeePerformances.filter(e => (e.mtd?.achievement ?? e.actualPremium ?? 0) > 0).length}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">TOTAL TARGET</span>
                    <span className="text-base font-bold text-slate-900 font-mono">{fmtCurr(data?.mtdSummary?.assignedTarget ?? 0)}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">TOTAL ACHIEVED PREMIUM</span>
                    <span className="text-base font-bold text-[#660000] font-mono">{fmtCurr(data?.mtdSummary?.achievement ?? 0)}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">OVERALL ACH %</span>
                    <span className="text-base font-bold text-[#660000]">{data?.mtdSummary?.achievementPercentage ?? 0}%</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">REMAINING GAP</span>
                    <span className="text-base font-bold text-slate-800 font-mono">{fmtCurr(data?.mtdSummary?.remainingTarget ?? 0)}</span>
                  </div>
                </div>
              </div>

              {/* 7. REPORT FOOTER */}
              <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 font-normal">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#660000]">POLICY MASTER</span>
                  <span>•</span>
                  <span>Monthly Performance Assessment System</span>
                </div>
                <div>
                  Generated on {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} • Management Copy
                </div>
              </div>

            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ASSIGN / EDIT MONTHLY TARGET MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-[#660000] flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#660000]" />
                  <span>{editingTargetId ? "Edit Monthly Target" : "Assign Monthly Target"}</span>
                </h3>
                <button
                  onClick={() => setIsAssignModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 rounded-lg p-1 font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="p-2.5 bg-[#DFBFBA]/20 border border-[#DFBFBA]/70 text-[#660000] rounded-xl text-[11px] font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#660000]" />
                <span>Targets are manually assigned at TSE level only. TL, TM, and BM targets automatically roll up from underlying TSE targets.</span>
              </div>

              <form onSubmit={handleSaveTarget} className="space-y-4 text-xs">

                {/* EMPLOYEE SELECTION */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">TSE / Executive Employee *</label>
                  <select
                    value={targetForm.employeeId}
                    onChange={(e) => handleEmployeeChange(e.target.value)}
                    disabled={Boolean(editingTargetId)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-900 focus:outline-none focus:border-[#660000]"
                  >
                    {allEmployeesList
                      .filter(e => !["Team Leader", "Team Manager", "Branch Manager"].includes(e.role))
                      .map(e => (
                        <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                      ))}
                  </select>
                </div>


                {/* TARGET MONTH FIELD WITH NATIVE CHROMIUM MONTH PICKER */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Target Month *</label>
                  <div 
                    onClick={() => {
                      try {
                        monthInputRef.current?.showPicker?.();
                      } catch (err) {
                        monthInputRef.current?.focus();
                      }
                    }}
                    className="w-full bg-white border border-slate-300 hover:border-[#660000] focus-within:border-[#660000] focus-within:ring-2 focus-within:ring-[#660000]/10 rounded-xl px-3 py-2 flex items-center gap-2.5 cursor-pointer transition shadow-2xs group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#DFBFBA]/30 text-[#660000] flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-[#660000]" />
                    </div>
                    <input
                      ref={monthInputRef}
                      type="month"
                      value={`${targetForm.year}-${String(targetForm.month).padStart(2, '0')}`}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const [y, m] = e.target.value.split("-").map(Number);
                        if (y && m) {
                          setTargetForm(prev => ({ ...prev, year: y, month: m }));
                        }
                      }}
                      className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* ASSIGNED PREMIUM TARGET */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Assigned Premium Target (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-semibold text-[#660000] text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="5000"
                      placeholder="e.g. 200000"
                      value={targetForm.assignedPremiumTarget}
                      onChange={(e) => setTargetForm({ ...targetForm, assignedPremiumTarget: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-2 font-semibold text-[#660000] text-sm focus:outline-none focus:border-[#660000]"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block pt-0.5 font-normal">
                    Achievement will be dynamically calculated from Policy Ledger records.
                  </span>
                </div>

                {/* NOTES */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Notes (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Add target notes..."
                    value={targetForm.notes}
                    onChange={(e) => setTargetForm({ ...targetForm, notes: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 font-normal text-slate-800 focus:outline-none focus:border-[#660000]"
                  />
                </div>

                {/* BUTTONS */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="px-4 py-2 bg-white hover:bg-[#DFBFBA]/20 text-[#660000] border border-[#DFBFBA]/80 rounded-xl font-semibold cursor-pointer transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-5 py-2 bg-[#660000] hover:bg-[#520000] text-white rounded-xl font-semibold cursor-pointer shadow-xs transition disabled:opacity-50"
                  >
                    {formSubmitting ? "Saving Target..." : "Save Target"}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: PARTICULAR EMPLOYEE DETAIL VIEW MODAL */}
      <AnimatePresence>
        {selectedEmpDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#660000] flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#660000]" />
                    <span>{selectedEmpDetail.employeeName.toUpperCase()}</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-normal">
                    Role: <span className="font-semibold text-slate-700">{selectedEmpDetail.role}</span> • Team: <span className="font-semibold text-slate-700">{selectedEmpDetail.teamName}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEmpDetail(null)}
                  className="text-slate-400 hover:text-slate-600 rounded-lg p-1 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* MTD & YTD SUMMARY CARDS */}
              {(() => {
                const mtdTgt = selectedEmpDetail.mtd?.assignedTarget ?? 0;
                const mtdAch = selectedEmpDetail.mtd?.achievement ?? 0;
                const hasMtd = mtdTgt > 0;
                const mtdPct = hasMtd ? (selectedEmpDetail.mtd?.achievementPercentage ?? 0) : 0;
                const mtdRem = hasMtd ? (selectedEmpDetail.mtd?.remainingTarget ?? 0) : 0;

                const ytdTgt = selectedEmpDetail.ytd?.assignedTarget ?? mtdTgt;
                const ytdAch = selectedEmpDetail.ytd?.achievement ?? mtdAch;
                const hasYtd = ytdTgt > 0;
                const ytdPct = hasYtd ? (selectedEmpDetail.ytd?.achievementPercentage ?? mtdPct) : 0;
                const ytdRem = hasYtd ? (selectedEmpDetail.ytd?.remainingTarget ?? mtdRem) : 0;

                const policiesList = selectedEmpDetail.policyDetails || [];
                const totCount = policiesList.length;
                const freshCount = policiesList.filter(p => {
                  const t = (p.businessType || '').toUpperCase();
                  return t === 'FRESH' || (t !== 'RENEWAL' && t !== 'PORT');
                }).length;
                const portCount = policiesList.filter(p => (p.businessType || '').toUpperCase() === 'PORT').length;
                const renewalCount = policiesList.filter(p => (p.businessType || '').toUpperCase() === 'RENEWAL').length;

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* MTD CARD */}
                      <div className="bg-[#DFBFBA]/15 border border-[#DFBFBA]/60 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-[#DFBFBA]/40 pb-2">
                          <span className="font-semibold text-[#660000] text-xs uppercase tracking-wider">
                            MTD — {MONTH_NAMES[selectedMonth - 1].toUpperCase()} {selectedYear}
                          </span>
                          <span className="font-semibold text-[#660000] text-xs">
                            {hasMtd ? `${mtdPct}%` : "N/A"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px] font-semibold block uppercase">Assigned Target</span>
                            <span className="font-semibold text-slate-900 font-mono text-sm">
                              {hasMtd ? fmtCurr(mtdTgt) : <span className="text-slate-400 italic font-normal">No Target</span>}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 text-[10px] font-semibold block uppercase">Achieved Premium</span>
                            <span className="font-semibold text-[#660000] font-mono text-sm">
                              {mtdAch > 0 ? fmtCurr(mtdAch) : "₹0"}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 text-[10px] font-semibold block uppercase">Achievement %</span>
                            <span className="font-semibold text-[#660000] font-mono text-sm">
                              {hasMtd ? `${mtdPct}%` : <span className="text-slate-400 italic font-normal">N/A</span>}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 text-[10px] font-semibold block uppercase">Remaining</span>
                            <span className="font-semibold text-slate-700 font-mono text-sm">
                              {hasMtd ? (mtdRem > 0 ? fmtCurr(mtdRem) : "₹0") : <span className="text-slate-400 italic font-normal">N/A</span>}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* YTD CARD */}
                      <div className="bg-[#DFBFBA]/25 border border-[#DFBFBA]/80 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-[#DFBFBA]/60 pb-2">
                          <span className="font-semibold text-[#660000] text-xs uppercase tracking-wider">
                            YTD — APRIL TO {MONTH_NAMES[selectedMonth - 1].toUpperCase()} {selectedYear}
                          </span>
                          <span className="font-semibold text-[#660000] text-xs">
                            {hasYtd ? `${ytdPct}%` : "N/A"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px] font-semibold block uppercase">YTD Target</span>
                            <span className="font-semibold text-slate-900 font-mono text-sm">
                              {hasYtd ? fmtCurr(ytdTgt) : <span className="text-slate-400 italic font-normal">No Target</span>}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 text-[10px] font-semibold block uppercase">YTD Achieved Premium</span>
                            <span className="font-semibold text-[#660000] font-mono text-sm">
                              {ytdAch > 0 ? fmtCurr(ytdAch) : "₹0"}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 text-[10px] font-semibold block uppercase">YTD Achievement %</span>
                            <span className="font-semibold text-[#660000] font-mono text-sm">
                              {hasYtd ? `${ytdPct}%` : <span className="text-slate-400 italic font-normal">N/A</span>}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 text-[10px] font-semibold block uppercase">YTD Remaining</span>
                            <span className="font-semibold text-slate-700 font-mono text-sm">
                              {hasYtd ? (ytdRem > 0 ? fmtCurr(ytdRem) : "₹0") : <span className="text-slate-400 italic font-normal">N/A</span>}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* POLICY PERFORMANCE BREAKDOWN (TOTAL, FRESH, PORT, RENEWAL) */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-[#660000] uppercase tracking-wider block">
                        POLICY PERFORMANCE (SELECTED MONTH)
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Policies</span>
                          <span className="text-lg font-black text-slate-900 font-mono">{totCount}</span>
                        </div>
                        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-center">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase block">Fresh Policies</span>
                          <span className="text-lg font-black text-emerald-900 font-mono">{freshCount}</span>
                        </div>
                        <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 text-center">
                          <span className="text-[10px] font-bold text-blue-800 uppercase block">Port Policies</span>
                          <span className="text-lg font-black text-blue-900 font-mono">{portCount}</span>
                        </div>
                        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-center">
                          <span className="text-[10px] font-bold text-amber-800 uppercase block">Renewal Policies</span>
                          <span className="text-lg font-black text-amber-900 font-mono">{renewalCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* MONTH-WISE BREAKDOWN TABLE (APRIL TO SELECTED MONTH) */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[#660000] uppercase tracking-wider flex items-center justify-between">
                  <span>MONTH-WISE PERFORMANCE BREAKDOWN (APRIL → {MONTH_NAMES[selectedMonth - 1].toUpperCase()})</span>
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-[#DFBFBA]/20 text-[#660000] font-semibold border-b border-[#DFBFBA]/60">
                      <tr>
                        <th className="px-3 py-2">MONTH</th>
                        <th className="px-3 py-2 text-right">ASSIGNED TARGET</th>
                        <th className="px-3 py-2 text-right">ACHIEVED PREMIUM</th>
                        <th className="px-3 py-2 text-center">ACHIEVEMENT %</th>
                        <th className="px-3 py-2 text-right">REMAINING</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {selectedEmpDetail.monthlyBreakdown?.map((mb) => (
                        <tr key={`${mb.year}-${mb.month}`} className="hover:bg-[#DFBFBA]/10">
                          <td className="px-3 py-2 font-semibold text-slate-900">{mb.monthName} {mb.year}</td>
                          <td className="px-3 py-2 text-right font-mono">{mb.assignedTarget > 0 ? fmtCurr(mb.assignedTarget) : "Target not assigned"}</td>
                          <td className="px-3 py-2 text-right font-semibold text-[#660000] font-mono">{mb.achievement > 0 ? fmtCurr(mb.achievement) : "₹0"}</td>
                          <td className="px-3 py-2 text-center font-semibold text-[#660000]">{mb.achievementPercentage}%</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-700">{mb.remainingTarget > 0 ? fmtCurr(mb.remainingTarget) : "₹0"}</td>
                        </tr>
                      ))}

                      <tr className="bg-[#DFBFBA]/30 font-semibold text-slate-900 border-t border-[#DFBFBA]">
                        <td className="px-3 py-2 text-[#660000] font-semibold">TOTAL YTD</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {(selectedEmpDetail.ytd?.assignedTarget ?? 0) > 0 ? fmtCurr(selectedEmpDetail.ytd?.assignedTarget ?? 0) : "Target not assigned"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-[#660000] font-semibold">
                          {(selectedEmpDetail.ytd?.achievement ?? 0) > 0 ? fmtCurr(selectedEmpDetail.ytd?.achievement ?? 0) : "₹0"}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold text-[#660000]">
                          {selectedEmpDetail.ytd?.achievementPercentage ?? selectedEmpDetail.mtd?.achievementPercentage ?? 0}%
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">
                          {(selectedEmpDetail.ytd?.remainingTarget ?? 0) > 0 ? fmtCurr(selectedEmpDetail.ytd?.remainingTarget ?? 0) : "₹0"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DYNAMIC COMPANY-WISE & PRODUCT-WISE BREAKDOWNS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* COMPANY BREAKDOWN */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-[#660000] uppercase tracking-wider">
                    INSURANCE COMPANY BREAKDOWN
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-[#DFBFBA]/20 text-[#660000] font-semibold border-b border-[#DFBFBA]/60">
                        <tr>
                          <th className="px-3 py-2">INSURANCE COMPANY</th>
                          <th className="px-3 py-2 text-center">POLICIES</th>
                          <th className="px-3 py-2 text-right">PREMIUM</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        {selectedEmpDetail.companyBreakdown.map((cb) => (
                          <tr key={cb.companyName} className="hover:bg-[#DFBFBA]/10">
                            <td className="px-3 py-2 font-semibold text-slate-900">{cb.companyName}</td>
                            <td className="px-3 py-2 text-center font-medium text-slate-900">{cb.actualPolicies}</td>
                            <td className="px-3 py-2 text-right font-semibold text-[#660000] font-mono">{fmtCurr(cb.actualPremium)}</td>
                          </tr>
                        ))}

                        {selectedEmpDetail.companyBreakdown.length === 0 && (
                          <tr>
                            <td colSpan={3} className="py-4 text-center text-slate-400 font-normal">
                              No data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PRODUCT BREAKDOWN */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-[#660000] uppercase tracking-wider">
                    PRODUCT-WISE BREAKDOWN
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-[#DFBFBA]/20 text-[#660000] font-semibold border-b border-[#DFBFBA]/60">
                        <tr>
                          <th className="px-3 py-2">PRODUCT NAME</th>
                          <th className="px-3 py-2 text-center">POLICIES</th>
                          <th className="px-3 py-2 text-right">PREMIUM</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        {selectedEmpDetail.productBreakdown?.map((pb) => (
                          <tr key={pb.productName} className="hover:bg-[#DFBFBA]/10">
                            <td className="px-3 py-2 font-semibold text-slate-900">{pb.productName}</td>
                            <td className="px-3 py-2 text-center font-medium text-slate-900">{pb.policies}</td>
                            <td className="px-3 py-2 text-right font-semibold text-[#660000] font-mono">{fmtCurr(pb.premium)}</td>
                          </tr>
                        ))}

                        {(!selectedEmpDetail.productBreakdown || selectedEmpDetail.productBreakdown.length === 0) && (
                          <tr>
                            <td colSpan={3} className="py-4 text-center text-slate-400 font-normal">
                              No data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* POLICY-LEVEL DRILLDOWN DETAILS */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[#660000] uppercase tracking-wider">
                  CONTRIBUTING POLICY LEDGER RECORDS ({selectedEmpDetail.policyDetails?.length || 0} POLICIES)
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-x-auto text-xs whitespace-nowrap">
                  <table className="w-full text-left">
                    <thead className="bg-[#DFBFBA]/20 text-[#660000] font-semibold border-b border-[#DFBFBA]/60">
                      <tr>
                        <th className="px-3 py-2">CUSTOMER NAME</th>
                        <th className="px-3 py-2">POLICY NUMBER</th>
                        <th className="px-3 py-2">COMPANY</th>
                        <th className="px-3 py-2">PRODUCT</th>
                        <th className="px-3 py-2">BUSINESS TYPE</th>
                        <th className="px-3 py-2 text-right">PREMIUM AMOUNT</th>
                        <th className="px-3 py-2 text-center">STATUS</th>
                        <th className="px-3 py-2">LOGIN DATE</th>
                        <th className="px-3 py-2">TSE / SOURCE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {selectedEmpDetail.policyDetails?.map((pol) => (
                        <tr key={pol.id} className="hover:bg-[#DFBFBA]/10">
                          <td className="px-3 py-2 font-semibold text-slate-900">{pol.customerName}</td>
                          <td className="px-3 py-2 font-mono text-slate-600 font-normal">{pol.policyNumber}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{pol.companyName}</td>
                          <td className="px-3 py-2 text-slate-600 font-normal">{pol.productName}</td>
                          <td className="px-3 py-2 text-slate-600 font-normal">{pol.businessType}</td>
                          <td className="px-3 py-2 text-right font-semibold text-[#660000] font-mono">{fmtCurr(pol.premiumAmount)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className="px-2.5 py-0.5 bg-[#DFBFBA]/30 text-[#660000] border border-[#DFBFBA]/80 rounded-md text-[10px] font-semibold">
                              {pol.policyStatus}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600 font-normal">{pol.businessLoginDate}</td>
                          <td className="px-3 py-2 text-slate-600 font-normal">{pol.sourcePersonName}</td>
                        </tr>
                      ))}

                      {(!selectedEmpDetail.policyDetails || selectedEmpDetail.policyDetails.length === 0) && (
                        <tr>
                          <td colSpan={9} className="py-6 text-center text-slate-400 font-normal">
                            No data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  onClick={() => setSelectedEmpDetail(null)}
                  className="px-4 py-2 bg-white hover:bg-[#DFBFBA]/20 text-[#660000] border border-[#DFBFBA]/80 font-semibold text-xs rounded-xl cursor-pointer transition"
                >
                  Close Detail View
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE TARGET MODAL */}
      {deletingTargetId && (
        <ConfirmModal
          isOpen={Boolean(deletingTargetId)}
          title="Delete Performance Target"
          message="Are you sure you want to delete this target? This action cannot be undone."
          confirmText="Yes, Delete Target"
          onConfirm={handleDeleteTarget}
          onCancel={() => setDeletingTargetId(null)}
        />
      )}

    </div>
  );
}