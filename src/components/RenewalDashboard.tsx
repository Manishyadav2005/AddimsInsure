import React, { useState, useRef, useEffect } from "react";
import { Policy, EmailLog, WhatsAppSettings, AgencyProfile, formatSumAssuredDisplay } from "../types";
import { fetchAgencyProfile } from "../lib/api";
import { 
  Calendar, CheckCircle2, AlertCircle, FileText, TrendingUp, Users, Clock, Info, ArrowRight, Mail, Send, Sparkles, Loader2, X, Eye, Check, ChevronDown, FileSpreadsheet, Download, ChevronLeft, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RenewalDashboardProps {
  policies: Policy[];
  whatsAppSettings: WhatsAppSettings;
  onAddEmailLog: (log: EmailLog) => void;
  userId: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

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

function escapeHtml(str: string) {
  return String(str || "").replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m));
}

export default function RenewalDashboard({ policies, whatsAppSettings, onAddEmailLog, userId }: RenewalDashboardProps) {
  // Helper for date string (YYYY-MM-DD) without timezone shifts
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const addDaysStr = (startDateStr: string, days: number) => {
    const d = new Date(startDateStr + "T00:00:00");
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // viewMode can be "month" or "date" (labeled "By Date Range")
  const [viewMode, setViewMode] = useState<"month" | "date">("month");
  
  // Date range parameters (YYYY-MM-DD)
  const [fromDate, setFromDate] = useState<string>(() => getTodayStr());
  const [toDate, setToDate] = useState<string>(() => getTodayStr());

  // Dynamic Current System Date
  const now = new Date();
  const currentSystemMonth = now.getMonth() + 1; // 1-12
  const currentSystemYear = now.getFullYear();   // e.g. 2026

  // Selected Month (1-12) & Selected Year
  const [selectedMonth, setSelectedMonth] = useState<number>(currentSystemMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentSystemYear);

  // Month-Year Picker Popover State & Nav Year
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(currentSystemYear);
  const monthPickerRef = useRef<HTMLDivElement>(null);

  const [batchSending, setBatchSending] = useState(false);
  const [batchStatus, setBatchStatus] = useState<string | null>(null);

  // Selection state for rows
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [agencyProfile, setAgencyProfile] = useState<AgencyProfile | null>(null);

  useEffect(() => {
    if (userId) {
      fetchAgencyProfile(userId)
        .then(p => { if (p && (p.companyName || p.agencyName)) setAgencyProfile(p); })
        .catch(() => {});
    }
  }, [userId]);

  const companyDisplayName = agencyProfile?.companyName || agencyProfile?.agencyName || "Policy Master";
  const companyDisplayUpper = (agencyProfile?.companyName || agencyProfile?.agencyName || "POLICY MASTER").toUpperCase();

  // Export Menu state & Ref
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
        setIsMonthPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenMonthPicker = () => {
    setPickerYear(selectedYear);
    setIsMonthPickerOpen(prev => !prev);
  };

  // View Modal state for single policy inspection
  const [viewingPolicy, setViewingPolicy] = useState<Policy | null>(null);

  const handleQuickRange = (days: number) => {
    const today = getTodayStr();
    setFromDate(today);
    setToDate(addDaysStr(today, days));
  };

  const isDateRangeInvalid = viewMode === "date" && !!fromDate && !!toDate && toDate < fromDate;

  // Filter policies based on selected view mode
  const displayedRenewals = policies.filter(p => {
    if (!p.nextDueDate) return false;
    
    if (viewMode === "date") {
      if (!fromDate || !toDate || toDate < fromDate) return false;
      return p.nextDueDate >= fromDate && p.nextDueDate <= toDate;
    } else {
      const [year, month] = p.nextDueDate.split("-").map(Number);
      return year === selectedYear && month === selectedMonth;
    }
  });

  // Selection handlers
  const visibleIds = displayedRenewals.map(p => p.id || "").filter(Boolean);
  const isAllSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const selectedCount = visibleIds.filter(id => selectedIds.has(id)).length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Calculate stats
  const totalDueAmount = displayedRenewals.reduce((sum, p) => sum + p.premiumAmount, 0);
  const paidRenewals = displayedRenewals.filter(p => p.premiumStatus === "Paid");
  const paidAmount = paidRenewals.reduce((sum, p) => sum + p.premiumAmount, 0);
  
  const pendingRenewals = displayedRenewals.filter(p => p.premiumStatus === "Unpaid" || p.premiumStatus === "Overdue");
  const pendingAmount = pendingRenewals.reduce((sum, p) => sum + p.premiumAmount, 0);

  const renewalCollectionRate = totalDueAmount > 0 ? Math.round((paidAmount / totalDueAmount) * 100) : 0;

  // CSV Cell Sanitizer for Excel export
  const sanitizeCsvCell = (val: string | number | undefined | null): string => {
    if (val == null) return '""';
    let str = String(val).trim();
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  // 1-Click Send reminder email (and whatsapp) to selected or all due policies in the displayed list
  const sendRemindersToAllDue = async () => {
    const targetPool = selectedCount > 0
      ? displayedRenewals.filter(p => p.id && selectedIds.has(p.id))
      : displayedRenewals;

    const duePolicies = targetPool.filter(p => p.premiumStatus === "Unpaid" || p.premiumStatus === "Overdue");

    if (duePolicies.length === 0) {
      alert("No pending or overdue policies in the selection to send reminders.");
      return;
    }

    const scopeText = selectedCount > 0 ? `${duePolicies.length} selected due policyholders` : `all ${duePolicies.length} due policyholders in this list`;

    if (!window.confirm(`Are you sure you want to send automated reminders to ${scopeText}?`)) {
      return;
    }

    setBatchSending(true);
    setBatchStatus(`Dispatching reminders to ${duePolicies.length} customers...`);

    try {
      for (const policy of duePolicies) {
        const template = whatsAppSettings.templates.renewals;
        const formattedBody = template
          .replace(/\{\{customerName\}\}/g, policy.customerName)
          .replace(/\{\{policyNumber\}\}/g, policy.policyNumber || "")
          .replace(/\{\{premiumAmount\}\}/g, `₹${policy.premiumAmount.toLocaleString("en-IN")}`)
          .replace(/\{\{nextDueDate\}\}/g, policy.nextDueDate || "N/A")
          .replace(/\{\{companyName\}\}/g, policy.companyName)
          .replace(/\{\{senderName\}\}/g, "Policy Master Management");

        const subject = `Premium Renewal Reminder: Policy #${policy.policyNumber}`;

        const newLog: EmailLog = {
          policyId: policy.id || "unknown",
          policyNumber: policy.policyNumber || "",
          recipientEmail: policy.customerEmail || "",
          recipientName: policy.customerName,
          subject,
          body: formattedBody,
          sentAt: new Date().toISOString(),
          status: "Sent",
          type: "RenewalReminder",
          channel: whatsAppSettings.enabled ? "Both" : "Email"
        };

        if (userId === "local-agent-session" || userId.startsWith("local")) {
          const localEmailsStr = localStorage.getItem(`emails_${userId}`);
          const localEmails: EmailLog[] = localEmailsStr ? JSON.parse(localEmailsStr) : [];
          const logWithId: EmailLog = {
            ...newLog,
            id: `local_email_rem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
          };
          localEmails.unshift(logWithId);
          localStorage.setItem(`emails_${userId}`, JSON.stringify(localEmails));
          onAddEmailLog(logWithId);
        } else {
          const localEmailsStr = localStorage.getItem(`emails_${userId}`);
          const localEmails = localEmailsStr ? JSON.parse(localEmailsStr) : [];
          localEmails.unshift(newLog);
          localStorage.setItem(`emails_${userId}`, JSON.stringify(localEmails));
          onAddEmailLog(newLog);
        }
      }

      setBatchStatus(`Success! Dispatched reminders to ${duePolicies.length} due policies!`);
      setTimeout(() => setBatchStatus(null), 6000);
    } catch (err: any) {
      console.error("Batch send error:", err);
      setBatchStatus(`Error occurred during batch sending: ${err.message || String(err)}`);
    } finally {
      setBatchSending(false);
    }
  };

  // Export as PDF / Print
  const exportMonthlyRenewalReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const exportTargets = selectedCount > 0 
      ? displayedRenewals.filter(p => p.id && selectedIds.has(p.id))
      : displayedRenewals;

    const selectedLabel = viewMode === "month" 
      ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
      : `${formatDateDisplay(fromDate)} to ${formatDateDisplay(toDate)}`;

    const rows = exportTargets.map(p => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
        <td style="padding: 10px 8px;"><strong>${p.customerName}</strong><br/><span style="color:#64748b; font-size:11px;">${p.customerEmail} • ${p.customerPhone || 'N/A'}</span></td>
        <td style="padding: 10px 8px; font-mono">${p.policyNumber}</td>
        <td style="padding: 10px 8px;">${p.companyName} (${p.policyType})</td>
        <td style="padding: 10px 8px; text-align:right; font-weight:bold;">INR ${p.premiumAmount.toLocaleString("en-IN")}</td>
        <td style="padding: 10px 8px; text-align:center;">${formatDateDisplay(p.nextDueDate)}</td>
        <td style="padding: 10px 8px; text-align:center;">
          <span style="padding: 3px 8px; border-radius: 9999px; font-size:11px; font-weight:bold;
            background-color: ${p.premiumStatus === "Paid" ? "#d1fae5" : p.premiumStatus === "Unpaid" ? "#dbeafe" : p.premiumStatus === "Overdue" ? "#fee2e2" : "#f1f5f9"};
            color: ${p.premiumStatus === "Paid" ? "#065f46" : p.premiumStatus === "Unpaid" ? "#1e40af" : p.premiumStatus === "Overdue" ? "#991b1b" : "#334155"};">
            ${p.premiumStatus}
          </span>
        </td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Renewal Audit Statement - ${selectedLabel}</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; color: #1e293b; padding: 40px; }
            h1 { font-size: 22px; color: #0f172a; margin-bottom: 5px; }
            p { margin: 0 0 25px 0; font-size: 13px; color: #64748b; }
            .grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: center; }
            .card h3 { font-size: 11px; color: #64748b; text-transform: uppercase; margin: 0 0 5px 0; }
            .card p { font-size: 18px; font-weight: bold; color: #0f172a; margin: 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background-color: #f1f5f9; color: #475569; text-align: left; padding: 12px 8px; border-bottom: 2px solid #e2e8f0; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="color: #660000; margin-bottom: 2px;">${escapeHtml(companyDisplayUpper)}</h1>
            <h2 style="font-size: 14px; margin-top: 0; color: #334155;">Renewal Ledger Report: ${selectedLabel}</h2>
          </div>
          <p>Strictly confidential auditing record - ${escapeHtml(companyDisplayName)} Portal ${selectedCount > 0 ? `(${selectedCount} Selected Records Exported)` : ''}</p>
          
          <div class="grid">
            <div class="card">
              <h3>Total Selection Dues</h3>
              <p>INR ${totalDueAmount.toLocaleString("en-IN")}</p>
            </div>
            <div class="card">
              <h3>Collected Premium</h3>
              <p>INR ${paidAmount.toLocaleString("en-IN")}</p>
            </div>
            <div class="card">
              <h3>Pending Renewals</h3>
              <p>INR ${pendingAmount.toLocaleString("en-IN")}</p>
            </div>
            <div class="card">
              <h3>Collection Rate</h3>
              <p>${renewalCollectionRate}%</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Policy Number</th>
                <th>Insurance Provider & Type</th>
                <th style="text-align:right;">Premium Due</th>
                <th style="text-align:center;">Due Date</th>
                <th style="text-align:center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows : '<tr><td colspan="6" style="text-align:center; padding: 20px; color: #64748b;">No policies scheduled for renewal during this timeframe.</td></tr>'}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Export as Excel (.csv file)
  const exportExcelRenewalReport = () => {
    const exportTargets = selectedCount > 0
      ? displayedRenewals.filter(p => p.id && selectedIds.has(p.id))
      : displayedRenewals;

    if (exportTargets.length === 0) {
      alert("No renewal policy data available for export.");
      return;
    }

    const selectedLabel = viewMode === "month"
      ? `${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}`
      : `${fromDate}_to_${toDate}`;

    const getTodayISO = () => new Date().toISOString().split("T")[0];
    const filename = `${companyDisplayUpper.replace(/[^A-Za-z0-9_]/g, "_")}_Renewals_Export_${selectedLabel}_${getTodayISO()}.csv`;

    let csv = "\uFEFF"; // UTF-8 BOM for Excel unicode rendering
    csv += `${companyDisplayUpper} — RENEWAL & PREMIUM DUE SCHEDULE STATEMENT\n`;
    csv += `Period: ${selectedLabel.replace(/_/g, " ")}\n`;
    csv += `Generated On: ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}\n`;
    csv += `Total Records Exported: ${exportTargets.length}\n\n`;

    // CSV Headers
    csv += "Customer Name,Customer Email,Customer Phone,Policy Number,Insurance Provider,Policy Category,Business Type,Policy Status,Sum Assured (INR),Premium Due (INR),Payment Frequency,Start Date,Expiry Date,Next Due Date,Payment Status,City,State,Address,Notes\n";

    // CSV Data Rows
    exportTargets.forEach(p => {
      const row = [
        sanitizeCsvCell(p.customerName),
        sanitizeCsvCell(p.customerEmail),
        sanitizeCsvCell(p.customerPhone),
        sanitizeCsvCell(p.policyNumber),
        sanitizeCsvCell(p.companyName),
        sanitizeCsvCell(p.policyType),
        sanitizeCsvCell(p.businessType || "NEW BUSINESS"),
        sanitizeCsvCell(p.policyStatus || "Pending"),
        sanitizeCsvCell(formatSumAssuredDisplay(p.sumAssured, (p as any).sumAssuredType)),
        sanitizeCsvCell(p.premiumAmount || 0),
        sanitizeCsvCell(p.premiumFrequency || "Yearly"),
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

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs text-slate-800 space-y-6">
      
      {/* View Selector & Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-rose-700" />
            Renewal & Premium Due Schedule
          </h2>
          <p className="text-slate-500 text-xs font-normal">Track upcoming policy renewals, premium due dates and customer reminders</p>
        </div>

        {/* Mode Toggle Switch */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode("month")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "month" ? "bg-white text-rose-800 shadow-2xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            By Month
          </button>
          <button
            onClick={() => setViewMode("date")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "date" ? "bg-white text-rose-800 shadow-2xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            By Date Range
          </button>
        </div>
      </div>

      {/* Selector Parameters & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {viewMode === "month" ? (
            <div className="relative" ref={monthPickerRef}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Select Month:</span>
                <button
                  type="button"
                  onClick={handleOpenMonthPicker}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500 flex items-center gap-2 cursor-pointer shadow-2xs transition"
                >
                  <span>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</span>
                  <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                </button>
              </div>

              {isMonthPickerOpen && (
                <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3 text-slate-800 animate-in fade-in zoom-in-95 duration-100">
                  {/* Year Navigation Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => setPickerYear(y => y - 1)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer transition"
                      title="Previous Year"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-slate-800 font-mono tracking-wide">
                      {pickerYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPickerYear(y => y + 1)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer transition"
                      title="Next Year"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 3x4 Month Grid */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {SHORT_MONTH_NAMES.map((m, idx) => {
                      const monthNum = idx + 1;
                      const isSelected = selectedMonth === monthNum && selectedYear === pickerYear;
                      const isCurrentSystemMonth = currentSystemMonth === monthNum && currentSystemYear === pickerYear;

                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setSelectedMonth(monthNum);
                            setSelectedYear(pickerYear);
                            setIsMonthPickerOpen(false);
                          }}
                          className={`py-2 px-1 text-xs rounded-xl font-bold transition cursor-pointer relative ${
                            isSelected
                              ? "bg-rose-700 text-white shadow-xs"
                              : isCurrentSystemMonth
                              ? "bg-rose-50 text-rose-800 border border-rose-200 font-extrabold"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {m}
                          {isCurrentSystemMonth && !isSelected && (
                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-rose-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    From <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    To <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                  />
                </div>
              </div>

              {/* Quick Range Shortcuts */}
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Quick Range:</span>
                <button
                  type="button"
                  onClick={() => handleQuickRange(0)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-[11px] font-bold text-slate-700 cursor-pointer transition shadow-2xs"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRange(7)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-[11px] font-bold text-slate-700 cursor-pointer transition shadow-2xs"
                >
                  Next 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRange(15)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-[11px] font-bold text-slate-700 cursor-pointer transition shadow-2xs"
                >
                  Next 15 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRange(30)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-[11px] font-bold text-slate-700 cursor-pointer transition shadow-2xs"
                >
                  Next 30 Days
                </button>
              </div>

              {/* Validation Error */}
              {isDateRangeInvalid && (
                <div className="text-xs font-semibold text-rose-600 flex items-center gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  To Date cannot be earlier than From Date.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={sendRemindersToAllDue}
            disabled={batchSending || displayedRenewals.filter(p => p.premiumStatus === "Unpaid" || p.premiumStatus === "Overdue").length === 0}
            className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-40 transition shadow-2xs"
          >
            {batchSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send Batch Reminders {selectedCount > 0 && `(${selectedCount})`}
          </button>

          {/* Export Renewal List Dropdown Menu */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setIsExportMenuOpen(prev => !prev)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition shadow-2xs"
              title="Export Renewal List"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Export Renewal List</span>
              {selectedCount > 0 && <span className="text-teal-700 font-bold">({selectedCount})</span>}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExportMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 py-2 overflow-hidden">
                <div className="px-3.5 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Choose Export Format
                </div>
                <button
                  type="button"
                  onClick={() => { setIsExportMenuOpen(false); exportMonthlyRenewalReport(); }}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2.5 cursor-pointer transition"
                >
                  <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                  <div>
                    <div>Export as PDF</div>
                    <div className="text-[10px] font-normal text-slate-400">Open print & PDF view</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setIsExportMenuOpen(false); exportExcelRenewalReport(); }}
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
        </div>
      </div>

      {batchStatus && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-rose-600" />
          <span className="font-medium">{batchStatus}</span>
        </div>
      )}

      {/* Grid Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block mb-1">Total Due Volume</span>
          <span className="text-lg font-bold text-slate-900 block">₹{totalDueAmount.toLocaleString("en-IN")}</span>
          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-medium">
            <Users className="w-3 h-3 text-teal-600" />
            {displayedRenewals.length} accounts scheduled
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block mb-1">Average Sum Assured</span>
          <span className="text-lg font-bold text-blue-700 block">
            ₹{(displayedRenewals.length > 0 ? Math.round(displayedRenewals.reduce((sum, p) => sum + (Number(p.sumAssured) || 0), 0) / displayedRenewals.length) : 0).toLocaleString("en-IN")}
          </span>
          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-medium truncate">
            Average insurance coverage per policy
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block mb-1">Collected Premium</span>
          <span className="text-lg font-bold text-emerald-700 block">₹{paidAmount.toLocaleString("en-IN")}</span>
          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-medium">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {paidRenewals.length} paid accounts
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block mb-1">Pending Amount</span>
          <span className="text-lg font-bold text-sky-700 block">₹{pendingAmount.toLocaleString("en-IN")}</span>
          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-medium">
            <Clock className="w-3 h-3 text-sky-600" />
            {pendingRenewals.length} accounts remaining
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block mb-1">Collection Progress</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-teal-700">{renewalCollectionRate}%</span>
            <span className="text-[10px] text-slate-500">Target: 100%</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-teal-500 h-full rounded-full" 
              style={{ width: `${renewalCollectionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Schedules for Selection Section Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            RENEWALS FOR SELECTED PERIOD ({displayedRenewals.length})
          </h3>
          {selectedCount > 0 && (
            <span className="text-xs text-teal-700 font-semibold bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
              {selectedCount} selected
            </span>
          )}
        </div>

        {displayedRenewals.length > 0 && (
          <button
            onClick={toggleSelectAll}
            className="text-xs text-teal-600 hover:text-teal-800 font-medium cursor-pointer"
          >
            {isAllSelected ? "Deselect All" : "Select All"}
          </button>
        )}
      </div>

      {/* RENEWALS CONTENT: DESKTOP TABLE VS MOBILE CARDS */}
      {displayedRenewals.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
          <Info className="w-6 h-6 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-500 text-xs font-semibold">No renewals or premium dues found for the selected period.</p>
          <p className="text-slate-400 text-[11px] mt-1">Try selecting a different month or date range.</p>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE LAYOUT */}
          <div className="hidden sm:block bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-slate-800">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-10 text-center border-r border-slate-200/50">
                      <input 
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-4 font-semibold border-r border-slate-200/50">Customer</th>
                    <th className="py-3.5 px-4 font-semibold border-r border-slate-200/50">Policy / Company</th>
                    <th className="py-3.5 px-4 font-semibold border-r border-slate-200/50">Contact</th>
                    <th className="py-3.5 px-4 font-semibold border-r border-slate-200/50">Due Date</th>
                    <th className="py-3.5 px-4 font-semibold text-right border-r border-slate-200/50">Sum Assured</th>
                    <th className="py-3.5 px-4 font-semibold text-right border-r border-slate-200/50">Premium</th>
                    <th className="py-3.5 px-4 font-semibold text-center border-r border-slate-200/50">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {displayedRenewals.map((p) => {
                    const isSelected = p.id ? selectedIds.has(p.id) : false;
                    const isOverdue = p.premiumStatus === "Overdue";
                    const isPaid = p.premiumStatus === "Paid";

                    return (
                      <tr 
                        key={p.id || p.policyNumber} 
                        className={`hover:bg-slate-50/70 transition-colors ${isSelected ? "bg-teal-50/30" : ""}`}
                      >
                        <td className="py-3.5 px-4 text-center border-r border-slate-100">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => p.id && toggleSelectRow(p.id)}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4 border-r border-slate-100">
                          <button 
                            onClick={() => setViewingPolicy(p)}
                            className="font-semibold text-slate-900 hover:text-teal-700 hover:underline text-left cursor-pointer text-xs block"
                          >
                            {p.customerName}
                          </button>
                          {p.customerEmail && (
                            <span className="text-[11px] text-slate-500 font-normal block mt-0.5 truncate">
                              {p.customerEmail}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 border-r border-slate-100">
                          <div className="font-medium text-slate-800 text-xs">{p.companyName}</div>
                          <div className="text-[11px] text-slate-500 font-normal flex items-center gap-1 mt-0.5">
                            <span>{p.policyType}</span>
                            {p.policyNumber && (
                              <span className="font-mono text-slate-400">· #{p.policyNumber}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 border-r border-slate-100 font-mono text-xs text-slate-700">
                          {p.customerPhone || "N/A"}
                        </td>
                        <td className="py-3.5 px-4 border-r border-slate-100">
                          <div className={`font-mono text-xs font-medium ${isOverdue ? "text-rose-600 font-semibold" : "text-slate-700"}`}>
                            {formatDateDisplay(p.nextDueDate)}
                          </div>
                          {isOverdue && (
                            <span className="text-[10px] text-rose-600 font-medium uppercase block mt-0.5">Overdue</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right border-r border-slate-100 font-mono font-semibold text-teal-900 text-xs">
                          {formatSumAssuredDisplay(p.sumAssured, (p as any).sumAssuredType)}
                        </td>
                        <td className="py-3.5 px-4 text-right border-r border-slate-100 font-mono font-semibold text-slate-900 text-xs">
                          ₹{p.premiumAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 text-center border-r border-slate-100">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                            isPaid 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : p.premiumStatus === "Unpaid"
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                              : isOverdue
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isPaid ? "bg-emerald-500" : p.premiumStatus === "Unpaid" ? "bg-sky-500" : isOverdue ? "bg-rose-500" : "bg-slate-400"
                            }`}></span>
                            {p.premiumStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setViewingPolicy(p)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer transition shadow-2xs"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE COMPACT CARDS LAYOUT */}
          <div className="sm:hidden space-y-3">
            {displayedRenewals.map((p) => {
              const isSelected = p.id ? selectedIds.has(p.id) : false;
              const isOverdue = p.premiumStatus === "Overdue";
              const isPaid = p.premiumStatus === "Paid";

              return (
                <div 
                  key={p.id || p.policyNumber}
                  className={`bg-white border rounded-xl p-3.5 space-y-3 transition-all ${
                    isSelected ? "border-teal-400 bg-teal-50/20" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => p.id && toggleSelectRow(p.id)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 text-xs block truncate">{p.customerName}</span>
                        <span className="text-[11px] text-slate-500 font-normal block truncate">{p.companyName} • {p.policyType}</span>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                      isPaid 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : p.premiumStatus === "Unpaid"
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : isOverdue
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}>
                      {p.premiumStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-normal">Due Date</span>
                      <span className={`font-mono text-xs font-medium ${isOverdue ? "text-rose-600 font-semibold" : "text-slate-700"}`}>
                        {formatDateDisplay(p.nextDueDate)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-normal">Premium</span>
                      <span className="font-mono font-semibold text-slate-900 text-xs">
                        ₹{p.premiumAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-[11px] text-slate-500 font-mono">📞 {p.customerPhone || "N/A"}</span>
                    <button
                      onClick={() => setViewingPolicy(p)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer"
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* SINGLE POLICY VIEW DETAIL MODAL */}
      <AnimatePresence>
        {viewingPolicy && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 z-55 text-slate-800">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-950 uppercase tracking-tight">
                    Policy Renewal Details
                  </h3>
                </div>
                <button 
                  onClick={() => setViewingPolicy(null)} 
                  className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-800 cursor-pointer transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Customer Name</span>
                  <span className="text-sm font-bold text-slate-900 block">{viewingPolicy.customerName}</span>
                  <span className="text-slate-500 block">📧 {viewingPolicy.customerEmail || "No Email"}</span>
                  <span className="text-slate-500 block">📞 {viewingPolicy.customerPhone || "No Phone"}</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Policy Number</span>
                    <span className="font-mono font-semibold text-slate-800 block mt-0.5">#{viewingPolicy.policyNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Company</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">{viewingPolicy.companyName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Category / Type</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">{viewingPolicy.policyType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Premium Due</span>
                    <span className="font-mono font-bold text-slate-900 text-sm block mt-0.5">₹{viewingPolicy.premiumAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Next Due Date</span>
                    <span className="font-mono font-semibold text-teal-700 block mt-0.5">{formatDateDisplay(viewingPolicy.nextDueDate)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Status</span>
                    <span className="inline-block mt-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-sky-50 text-sky-700 border-sky-200">
                      {viewingPolicy.premiumStatus}
                    </span>
                  </div>
                </div>

                {viewingPolicy.notes && (
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Notes</span>
                    <p className="text-slate-600 font-normal leading-relaxed">{viewingPolicy.notes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
