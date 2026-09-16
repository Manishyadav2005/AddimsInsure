import React, { useState, useMemo } from "react";
import { EmailLog } from "../types";
import { 
  Mail, CheckCircle2, Clock, Calendar, Eye, Send, ArrowRight, ShieldCheck, X, Info, 
  Search, AlertCircle, RefreshCw, Download, ChevronLeft, ChevronRight, Filter, AlertTriangle, MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface EmailLogsProps {
  logs: EmailLog[];
  onRefresh?: () => void;
}

const TYPE_LABELS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  RenewalReminder: { label: "Renewal Reminder", bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-200" },
  ExpiryAlert: { label: "Premium Due Reminder", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  PremiumDue: { label: "Premium Due Reminder", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  BirthdayWish: { label: "Birthday Wish", bg: "bg-pink-50", text: "text-pink-800", border: "border-pink-200" },
  Welcome: { label: "Policy Notification", bg: "bg-sky-50", text: "text-sky-800", border: "border-sky-200" },
  Onboarding: { label: "Policy Notification", bg: "bg-sky-50", text: "text-sky-800", border: "border-sky-200" },
  PaymentReminder: { label: "Payment Reminder", bg: "bg-indigo-50", text: "text-indigo-800", border: "border-indigo-200" },
  Promotion: { label: "Promotion", bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  Other: { label: "Other", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" }
};

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  Sent: { label: "Sent", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: CheckCircle2 },
  Delivered: { label: "Delivered", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: CheckCircle2 },
  Pending: { label: "Pending", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: Clock },
  Failed: { label: "Failed", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", icon: AlertTriangle }
};

// Mask contact info for privacy in table view
function maskContact(contact?: string): string {
  if (!contact) return "—";
  const clean = contact.trim();
  if (clean.includes("@")) {
    const parts = clean.split("@");
    if (parts[0].length <= 2) return `${parts[0]}***@${parts[1]}`;
    return `${parts[0].slice(0, 2)}***${parts[0].slice(-1)}@${parts[1]}`;
  }
  const digitsOnly = clean.replace(/\D/g, "");
  if (digitsOnly.length >= 10) {
    const start = digitsOnly.slice(0, 2);
    const end = digitsOnly.slice(-2);
    return `${start}******${end}`;
  }
  return clean;
}

export default function EmailLogs({ logs, onRefresh }: EmailLogsProps) {
  // Defensive guard: ensure logs is always a safe array, even if parent passes undefined/null/non-array
  const safeLogs = Array.isArray(logs) ? logs : [];

  // Modal View State
  const [viewingLog, setViewingLog] = useState<EmailLog | null>(null);

  // Filter States
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Pagination State
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Date Range Validation
  const isDateRangeInvalid = !!fromDate && !!toDate && toDate < fromDate;

  // Filter & Sort Logic
  const filteredLogs = useMemo(() => {
    return safeLogs
      .filter((log) => {
        // Search Filter
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const matchName = log.recipientName?.toLowerCase().includes(q);
          const matchEmail = log.recipientEmail?.toLowerCase().includes(q);
          const matchPhone = log.recipientPhone?.includes(q);
          const matchPolicy = log.policyNumber?.toLowerCase().includes(q);
          const matchSubject = log.subject?.toLowerCase().includes(q);
          if (!matchName && !matchEmail && !matchPhone && !matchPolicy && !matchSubject) {
            return false;
          }
        }

        // Date Range Filter
        if (fromDate) {
          const logDate = new Date(log.sentAt).getTime();
          const fromTime = new Date(fromDate + "T00:00:00").getTime();
          if (!isNaN(logDate) && !isNaN(fromTime) && logDate < fromTime) {
            return false;
          }
        }

        if (toDate) {
          const logDate = new Date(log.sentAt).getTime();
          const toTime = new Date(toDate + "T23:59:59").getTime();
          if (!isNaN(logDate) && !isNaN(toTime) && logDate > toTime) {
            return false;
          }
        }

        // Communication Type Filter
        if (typeFilter !== "ALL" && log.type !== typeFilter) {
          return false;
        }

        // Channel Filter
        if (channelFilter !== "ALL" && (log.channel || "Email") !== channelFilter) {
          return false;
        }

        // Delivery Status Filter
        if (statusFilter !== "ALL" && log.status !== statusFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }, [safeLogs, search, fromDate, toDate, typeFilter, channelFilter, statusFilter]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setTypeFilter("ALL");
    setChannelFilter("ALL");
    setStatusFilter("ALL");
    setCurrentPage(1);
  };

  const isFiltered = !!search || !!fromDate || !!toDate || typeFilter !== "ALL" || channelFilter !== "ALL" || statusFilter !== "ALL";

  // Pagination Logic
  const totalRecords = filteredLogs.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // CSV Export
  const handleExportCSV = () => {
    const filename = `Dispatch_Logs_${new Date().toISOString().split("T")[0]}.csv`;
    let csv = "\uFEFF"; // UTF-8 BOM
    csv += "Customer Name,Policy Number,Communication Type,Channel,Recipient,Sent Date & Time,Status\n";

    filteredLogs.forEach((log) => {
      const typeInfo = TYPE_LABELS[log.type]?.label || log.type;
      const channelStr = log.channel || "Email";
      const sentTime = new Date(log.sentAt).toLocaleString("en-IN");
      csv += `"${log.recipientName}","${log.policyNumber}","${typeInfo}","${channelStr}","${log.recipientEmail}","${sentTime}","${log.status}"\n`;
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
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Mail className="w-5 h-5 text-teal-600" />
            Communication Dispatch Logs
          </h2>
          <p className="text-slate-500 text-xs font-normal">
            Track customer notifications, delivery status and communication history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
              title="Refresh logs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {filteredLogs.length > 0 && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Logs</span>
            </button>
          )}
        </div>
      </div>

      {/* ALWAYS VISIBLE FILTER TOOLBAR GRID (Renders unconditionally regardless of logs.length) */}
      <div className="space-y-3 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80">
        {/* Row 1: Search & Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by customer name, mobile or policy number..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 focus:border-teal-500 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden transition font-medium"
            />
          </div>

          {/* From Date */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide shrink-0">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
              className="w-full bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden font-mono"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide shrink-0">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
              className="w-full bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden font-mono"
            />
          </div>
        </div>

        {/* Date Range Validation Warning */}
        {isDateRangeInvalid && (
          <div className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            To Date cannot be earlier than From Date.
          </div>
        )}

        {/* Row 2: Dropdowns & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Communication Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Communication Types</option>
              <option value="RenewalReminder">Renewal Reminder</option>
              <option value="ExpiryAlert">Premium Due Reminder</option>
              <option value="BirthdayWish">Birthday Wish</option>
              <option value="Welcome">Policy Notification</option>
              <option value="PaymentReminder">Payment Reminder</option>
              <option value="Other">Other</option>
            </select>

            {/* Channel Filter */}
            <select
              value={channelFilter}
              onChange={(e) => { setChannelFilter(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Channels</option>
              <option value="Email">Email</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="SMS">SMS</option>
              <option value="Both">Email & WhatsApp</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Sent">Sent</option>
              <option value="Delivered">Delivered</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          <button
            type="button"
            onClick={handleResetFilters}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl cursor-pointer transition shadow-2xs border ${
              isFiltered
                ? "bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* RECORD COUNT HEADER (When logs exist) */}
      {safeLogs.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
          <span>
            {isFiltered 
              ? `Showing ${filteredLogs.length} of ${safeLogs.length} communication records`
              : `Showing ${safeLogs.length} communication records`}
          </span>

          {totalRecords > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-bold">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-hidden"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* RESULTS DISPLAY: TABLE VS TWO DISTINCT EMPTY STATES */}
      {safeLogs.length === 0 ? (
        /* CASE 1: Absolutely no dispatch records in the database */
        <div className="text-center py-14 bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl space-y-2">
          <Mail className="w-10 h-10 text-slate-300 mx-auto mb-1" />
          <p className="text-slate-800 font-extrabold text-sm">No communication records found.</p>
          <p className="text-slate-500 text-xs font-medium">
            Customer notifications and reminders will appear here once they are sent.
          </p>
        </div>
      ) : filteredLogs.length === 0 ? (
        /* CASE 2: Records exist in DB but filters return 0 results */
        <div className="text-center py-14 bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl space-y-3">
          <Filter className="w-9 h-9 text-slate-400 mx-auto" />
          <div>
            <p className="text-slate-800 font-extrabold text-sm">No communications match the selected filters.</p>
            <p className="text-slate-500 text-xs font-medium mt-1">
              Try adjusting your search or filters.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs rounded-xl shadow-2xs transition cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* DATA TABLE VIEW */
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-slate-800">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Policy Number</th>
                  <th className="py-3 px-4">Communication Type</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Sent Date & Time</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedLogs.map((log) => {
                  const typeCfg = TYPE_LABELS[log.type] || TYPE_LABELS.Other;
                  const statusCfg = STATUS_BADGES[log.status] || STATUS_BADGES.Sent;
                  const StatusIcon = statusCfg.icon;
                  const channelLabel = log.channel || "Email";

                  return (
                    <tr key={log.id || `${log.sentAt}-${log.recipientEmail}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {log.recipientName || "Policyholder"}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                        #{log.policyNumber || "N/A"}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border ${typeCfg.bg} ${typeCfg.text} ${typeCfg.border}`}>
                          {typeCfg.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 text-[11px]">
                          {channelLabel === "WhatsApp" || channelLabel === "Both" ? (
                            <MessageSquare className="w-3 h-3 text-emerald-600 shrink-0" />
                          ) : (
                            <Mail className="w-3 h-3 text-teal-600 shrink-0" />
                          )}
                          {channelLabel}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                        {maskContact(log.recipientEmail || log.recipientPhone)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {new Date(log.sentAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setViewingLog(log)}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION FOOTER */}
          {totalPages > 1 && (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-semibold">
              <div>
                Page {currentPage} of {totalPages}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW COMMUNICATION DETAILS AUDIT MODAL */}
      <AnimatePresence>
        {viewingLog && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-55">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-800 space-y-0"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-950 uppercase tracking-tight flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Communication Dispatch Audit
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    ID: {viewingLog.providerMessageId || viewingLog.id || "LOG-ENTRY"}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setViewingLog(null)} 
                  className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-800 cursor-pointer transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs space-y-2 text-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Customer</span>
                    <span className="font-extrabold text-slate-900">{viewingLog.recipientName}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Policy Number</span>
                    <span className="font-mono font-bold text-slate-800">#{viewingLog.policyNumber}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Recipient Contact</span>
                    <span className="font-mono font-semibold text-slate-800">{viewingLog.recipientEmail || viewingLog.recipientPhone || "—"}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Channel</span>
                    <span className="font-bold text-slate-800">{viewingLog.channel || "Email"}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Sent Timestamp</span>
                    <span className="font-medium text-slate-700">{new Date(viewingLog.sentAt).toLocaleString("en-IN")}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${STATUS_BADGES[viewingLog.status]?.bg || "bg-emerald-50"} ${STATUS_BADGES[viewingLog.status]?.text || "text-emerald-700"}`}>
                      {viewingLog.status}
                    </span>
                  </div>
                </div>

                {/* Failure Reason Alert */}
                {viewingLog.status === "Failed" && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                    <div className="font-extrabold flex items-center gap-1 text-rose-900">
                      <AlertTriangle className="w-4 h-4 text-rose-600" /> Failure Reason
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {viewingLog.failureReason || "Provider delivery error or recipient mail server rejected connection."}
                    </p>
                  </div>
                )}

                {/* Subject & Body */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Subject / Header</label>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs font-bold text-slate-900">
                    {viewingLog.subject}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Dispatched Message Content</label>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-slate-800 text-xs whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto font-sans">
                    {viewingLog.body}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingLog(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition"
                >
                  Close Audit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
