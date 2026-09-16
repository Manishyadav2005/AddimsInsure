import React, { useState, useRef, useEffect } from "react";
import { Policy, EmailLog, WhatsAppSettings } from "../types";
import { 
  Cake, Gift, Mail, CheckCircle, Sparkles, Loader2, Info, Calendar, Search, AlertCircle, Send, ChevronLeft, ChevronRight, Phone
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface BirthdayDashboardProps {
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

// Robustly parse birthday string into Month, Day, Year
function getBirthdayMonthAndDay(dobStr?: string): { month: number; day: number; year: number } | null {
  if (!dobStr) return null;
  const clean = dobStr.trim();
  const parts = clean.split(/[-/]/).map(Number);
  if (parts.length < 3) return null;

  let year = 0, month = 0, day = 0;
  if (parts[0] > 1000) {
    // YYYY-MM-DD
    year = parts[0];
    month = parts[1];
    day = parts[2];
  } else if (parts[2] > 1000) {
    // DD-MM-YYYY
    day = parts[0];
    month = parts[1];
    year = parts[2];
  } else {
    // Fallback assuming YYYY-MM-DD
    month = parts[1];
    day = parts[0];
    year = parts[2] || 2000;
  }

  if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return { month, day, year };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function isBirthdayInRange(dobStr: string, fromStr: string, toStr: string): boolean {
  const bday = getBirthdayMonthAndDay(dobStr);
  if (!bday) return false;

  const from = new Date(fromStr + "T00:00:00");
  const to = new Date(toStr + "T23:59:59");
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return false;

  const startYear = from.getFullYear();
  const endYear = to.getFullYear();

  for (let y = startYear; y <= endYear; y++) {
    let m = bday.month - 1;
    let d = bday.day;
    if (m === 1 && d === 29 && !isLeapYear(y)) {
      d = 28;
    }
    const bdayOccurrence = new Date(y, m, d);
    if (bdayOccurrence >= from && bdayOccurrence <= to) {
      return true;
    }
  }
  return false;
}

function calculateTurningAge(dobStr?: string, targetYear: number = new Date().getFullYear()): number | null {
  const bday = getBirthdayMonthAndDay(dobStr);
  if (!bday || !bday.year || bday.year < 1900) return null;
  return Math.max(0, targetYear - bday.year);
}

function getBirthdayStatus(dobStr?: string, refDate: Date = new Date()): { label: string; isToday: boolean; isSoon: boolean } {
  const bday = getBirthdayMonthAndDay(dobStr);
  if (!bday) return { label: "N/A", isToday: false, isSoon: false };

  const refYear = refDate.getFullYear();
  const todayZero = new Date(refYear, refDate.getMonth(), refDate.getDate());

  let bdayThisYear = new Date(refYear, bday.month - 1, bday.day);
  const diffMs = bdayThisYear.getTime() - todayZero.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { label: "Birthday Today 🎉", isToday: true, isSoon: true };
  } else if (diffDays === 1) {
    return { label: "Tomorrow", isToday: false, isSoon: true };
  } else if (diffDays > 1 && diffDays <= 7) {
    return { label: `In ${diffDays} Days`, isToday: false, isSoon: true };
  } else if (diffDays > 7 && diffDays <= 30) {
    return { label: `In ${diffDays} Days`, isToday: false, isSoon: false };
  } else {
    return { label: `${bday.day} ${SHORT_MONTH_NAMES[bday.month - 1]}`, isToday: false, isSoon: false };
  }
}

export default function BirthdayDashboard({ policies, whatsAppSettings, onAddEmailLog, userId }: BirthdayDashboardProps) {
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

 // Dynamic Current System Date — useMemo se stable rakho
  const now = React.useMemo(() => new Date(), []);
  const currentSystemMonth = now.getMonth() + 1; // 1-12
  const currentSystemDay = now.getDate();
  const currentSystemYear = now.getFullYear();

  const getTodayISO = () => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getAddDaysISO = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Period Selector Mode: "today" | "next7" | "thisMonth" | "byMonth" | "dateRange"
  const [periodMode, setPeriodMode] = useState<"today" | "next7" | "thisMonth" | "byMonth" | "dateRange">("thisMonth");

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number>(currentSystemMonth);
  const [fromDate, setFromDate] = useState<string>(() => getTodayISO());
  const [toDate, setToDate] = useState<string>(() => getAddDaysISO(7));

  // Month Picker Popover State
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const monthPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
        setIsMonthPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Deduplicate policyholders with DOB recorded
  const uniqueCustomers = Array.from(
    new Map(
      policies
        .filter(p => p.customerBirthday)
        .map(p => [p.customerEmail || p.id, p])
    ).values()
  );

  const todayISO = getTodayISO();
  const next7DaysISO = getAddDaysISO(7);

  // Filter customers according to active period and search
  const filteredCustomers = uniqueCustomers.filter(policy => {
    if (!policy.customerBirthday) return false;
    const bday = getBirthdayMonthAndDay(policy.customerBirthday);
    if (!bday) return false;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = policy.customerName.toLowerCase().includes(q);
      const matchPhone = policy.customerPhone && policy.customerPhone.includes(q);
      const matchPolicy = policy.policyNumber && policy.policyNumber.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchPolicy) return false;
    }

   // Period Mode filter
  if (periodMode === "today") {
    console.log("Birthday check:", {
      customerName: policy.customerName,
      bdayMonth: bday.month,
      bdayDay: bday.day,
      systemMonth: currentSystemMonth,
      systemDay: currentSystemDay,
      match: bday.month === currentSystemMonth && bday.day === currentSystemDay,
      rawDOB: policy.customerBirthday
    });
    return bday.month === currentSystemMonth && bday.day === currentSystemDay;
  }

    if (periodMode === "next7") {
      return isBirthdayInRange(policy.customerBirthday, todayISO, next7DaysISO);
    }

    if (periodMode === "thisMonth") {
      return bday.month === currentSystemMonth;
    }

    if (periodMode === "byMonth") {
      return bday.month === selectedMonth;
    }

    if (periodMode === "dateRange") {
      if (!fromDate || !toDate || toDate < fromDate) return false;
      return isBirthdayInRange(policy.customerBirthday, fromDate, toDate);
    }

    return true;
  });

  const sendBirthdayWish = async (policy: Policy) => {
    if (!policy.id) return;
    setSendingId(policy.id);
    setStatusMessage(null);

    try {
      const template = whatsAppSettings.templates.birthdays;
      const formattedBody = template
        .replace(/\{\{customerName\}\}/g, policy.customerName)
        .replace(/\{\{policyNumber\}\}/g, policy.policyNumber || "")
        .replace(/\{\{premiumAmount\}\}/g, `₹${policy.premiumAmount.toLocaleString("en-IN")}`)
        .replace(/\{\{nextDueDate\}\}/g, policy.nextDueDate || "N/A")
        .replace(/\{\{companyName\}\}/g, policy.companyName)
        .replace(/\{\{senderName\}\}/g, "Policy Master Management");

      const subject = `Happy Birthday, ${policy.customerName}! 🎂 - Warm wishes from Policy Master`;

      // Call real email endpoint
      const emailResponse = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          recipientEmail: policy.customerEmail || "",
          recipientName: policy.customerName,
          subject,
          body: formattedBody,
          policyId: policy.id,
          type: "BirthdayWish"
        })
      });

      const emailData = await emailResponse.json();

      if (!emailResponse.ok || !emailData.success) {
        throw new Error(emailData.error || "Failed to send birthday email");
      }

      // Email sent successfully - add to logs
      const newLog = emailData.log;
      onAddEmailLog(newLog);

      setStatusMessage({
        type: "success",
        text: `🎉 Happy Birthday wish sent to ${policy.customerName} (${policy.customerEmail})!`
      });

    } catch (err: any) {
      console.error("Birthday email error:", err);
      setStatusMessage({
        type: "error",
        text: `Failed to send birthday wish: ${err.message || "Unknown error"}`
      });
    } finally {
      setSendingId(null);
      setTimeout(() => setStatusMessage(null), 8000);
    }
  };
  const getEmptyStateMessage = () => {
    if (periodMode === "today") return "No customer birthdays today.";
    if (periodMode === "next7") return "No customer birthdays in the next 7 days.";
    if (periodMode === "thisMonth") return `No customer birthdays found for ${MONTH_NAMES[currentSystemMonth - 1]}.`;
    if (periodMode === "byMonth") return `No customer birthdays found for ${MONTH_NAMES[selectedMonth - 1]}.`;
    if (periodMode === "dateRange") return "No customer birthdays found for the selected period.";
    return "No customer birthdays found.";
  };

  const isDateRangeInvalid = periodMode === "dateRange" && !!fromDate && !!toDate && toDate < fromDate;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs text-slate-800 space-y-6">
      
      {/* Header Segment */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Cake className="w-5 h-5 text-pink-600 animate-pulse" />
            Customer Birthday Calendar
          </h2>
          <p className="text-slate-500 text-xs font-normal">Track upcoming customer birthdays and send timely wishes.</p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setPeriodMode("today")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              periodMode === "today" ? "bg-white text-pink-700 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setPeriodMode("next7")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              periodMode === "next7" ? "bg-white text-pink-700 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Next 7 Days
          </button>
          <button
            type="button"
            onClick={() => setPeriodMode("thisMonth")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              periodMode === "thisMonth" ? "bg-white text-pink-700 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => setPeriodMode("byMonth")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              periodMode === "byMonth" ? "bg-white text-pink-700 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            By Month
          </button>
          <button
            type="button"
            onClick={() => setPeriodMode("dateRange")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              periodMode === "dateRange" ? "bg-white text-pink-700 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Date Range
          </button>
        </div>
      </div>

      {/* Filter Controls Bar (Search, Month Picker, Date Range) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by customer name, mobile or policy number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-pink-500 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-pink-500/20 transition font-medium"
          />
        </div>

        {/* Dynamic Period Inputs (By Month / Date Range) */}
        <div className="flex items-center gap-3">
          {periodMode === "byMonth" && (
            <div className="relative" ref={monthPickerRef}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Select Month:</span>
                <button
                  type="button"
                  onClick={() => setIsMonthPickerOpen(prev => !prev)}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-pink-500 flex items-center gap-2 cursor-pointer shadow-2xs transition"
                >
                  <span>{MONTH_NAMES[selectedMonth - 1]}</span>
                  <Calendar className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                </button>
              </div>

              {isMonthPickerOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-3 text-slate-800 animate-in fade-in zoom-in-95 duration-100">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pb-2 mb-2 border-b border-slate-100">
                    Select Birthday Month
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SHORT_MONTH_NAMES.map((m, idx) => {
                      const monthNum = idx + 1;
                      const isSelected = selectedMonth === monthNum;
                      const isCurrent = currentSystemMonth === monthNum;

                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setSelectedMonth(monthNum);
                            setIsMonthPickerOpen(false);
                          }}
                          className={`py-2 px-1 text-xs rounded-xl font-bold transition cursor-pointer relative ${
                            isSelected
                              ? "bg-pink-600 text-white shadow-xs"
                              : isCurrent
                              ? "bg-pink-50 text-pink-800 border border-pink-200 font-extrabold"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {m}
                          {isCurrent && !isSelected && (
                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-pink-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {periodMode === "dateRange" && (
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    From <span className="text-pink-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-pink-500 font-mono"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    To <span className="text-pink-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-pink-500 font-mono"
                  />
                </div>
              </div>

              {isDateRangeInvalid && (
                <div className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-0.5">
                  <AlertCircle className="w-3 h-3" />
                  To Date cannot be earlier than From Date.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dispatched Notification Status */}
      {statusMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3.5 rounded-xl flex items-start gap-2.5 border text-xs leading-relaxed ${
            statusMessage.type === "success" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{statusMessage.text}</div>
        </motion.div>
      )}

      {/* RESULTS LIST: DESKTOP TABLE VS MOBILE CARDS */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
          <Gift className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-500 text-xs font-semibold">{getEmptyStateMessage()}</p>
          <p className="text-slate-400 text-[11px] mt-1">
            {search ? "Try adjusting your search criteria or period filter." : "Make sure policyholder birth dates are recorded in policy entries."}
          </p>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW */}
          <div className="hidden sm:block bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-slate-800">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 text-center w-14 shrink-0">S.No.</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Date of Birth</th>
                    <th className="py-3 px-4">Turning Age</th>
                    <th className="py-3 px-4">Mobile Number</th>
                    <th className="py-3 px-4">Policy Number</th>
                    <th className="py-3 px-4 text-center">Birthday Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredCustomers.map((policy, idx) => {
                    const bday = getBirthdayMonthAndDay(policy.customerBirthday);
                    const turningAge = calculateTurningAge(policy.customerBirthday, currentSystemYear);
                    const status = getBirthdayStatus(policy.customerBirthday, now);
                    const serialNumberDisplay = String(idx + 1).padStart(2, "0");

                    return (
                      <tr key={policy.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-600 text-xs w-14 shrink-0">
                          {serialNumberDisplay}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{policy.customerName}</div>
                          <div className="text-[11px] text-slate-400 font-normal">{policy.customerEmail}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                          {policy.customerBirthday}
                        </td>
                        <td className="py-3.5 px-4">
                          {turningAge !== null ? (
                            <span className="font-bold text-pink-700 bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-md text-[11px]">
                              {turningAge} Yrs
                            </span>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {policy.customerPhone ? (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              {policy.customerPhone}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No Phone</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 font-semibold">
                          #{policy.policyNumber}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-2xs ${
                            status.isToday 
                              ? "bg-pink-600 text-white animate-pulse" 
                              : status.isSoon 
                              ? "bg-pink-100 text-pink-800 border border-pink-200" 
                              : "bg-slate-100 text-slate-700"
                          }`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => sendBirthdayWish(policy)}
                            disabled={sendingId !== null}
                            className="px-2.5 py-1.5 bg-gradient-to-r from-pink-600 via-rose-600 to-pink-600 bg-[length:200%_auto] hover:bg-right text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all duration-500 shadow-sm shadow-pink-500/30 hover:shadow-md hover:shadow-pink-500/40 hover:-translate-y-0.5 ml-auto disabled:opacity-40 disabled:translate-y-0 disabled:shadow-none whitespace-nowrap border border-pink-500/20"
                          >
                            {sendingId === policy.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3 drop-shadow-sm" />
                            )}
                            <span>Wish</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARDS VIEW */}
          <div className="sm:hidden space-y-3">
            {filteredCustomers.map(policy => {
              const turningAge = calculateTurningAge(policy.customerBirthday, currentSystemYear);
              const status = getBirthdayStatus(policy.customerBirthday, now);

              return (
                <div
                  key={policy.id}
                  className="bg-white border border-slate-200 hover:border-pink-300 rounded-2xl p-4 space-y-3 shadow-2xs transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">{policy.customerName}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">{policy.customerEmail}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                      status.isToday ? "bg-pink-600 text-white" : "bg-pink-50 text-pink-700 border border-pink-100"
                    }`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 text-slate-600">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">DOB</span>
                      <span className="font-mono font-semibold">{policy.customerBirthday}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Turning Age</span>
                      <span className="font-bold text-pink-700">{turningAge !== null ? `${turningAge} Yrs` : "N/A"}</span>
                    </div>
                    <div>manish yafab mnis
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Mobile</span>
                      <span>{policy.customerPhone || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Policy #</span>
                      <span className="font-mono">{policy.policyNumber}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                   <button
                      type="button"
                      onClick={() => sendBirthdayWish(policy)}
                      disabled={sendingId !== null}
                      className="w-full py-2 bg-gradient-to-r from-pink-600 via-rose-600 to-pink-600 bg-[length:200%_auto] hover:bg-right text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all duration-500 shadow-sm shadow-pink-500/30 disabled:opacity-40 border border-pink-500/20"
                    >
                      {sendingId === policy.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3 drop-shadow-sm" />
                      )}
                     <span>Wish</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
