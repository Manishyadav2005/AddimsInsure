import React from "react";
import { Calendar, RefreshCcw } from "lucide-react";
import { Policy } from "../types";

/**
 * Normalizes Business Login Date or fallback dates into YYYY-MM-DD string
 */
export function getNormalizedLoginDate(p: Policy): string {
  const raw = p.businessLoginDate || p.startDate || (p.createdAt ? p.createdAt.split("T")[0] : "");
  if (!raw) return "";
  const clean = raw.includes("T") ? raw.split("T")[0] : raw.trim();
  if (clean.includes("-") || clean.includes("/")) {
    const delim = clean.includes("-") ? "-" : "/";
    const parts = clean.split(delim);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const m = parts[1].padStart(2, '0');
        const d = parts[2].padStart(2, '0');
        return `${parts[0]}-${m}-${d}`;
      } else if (parts[2].length === 4) {
        const m = parts[1].padStart(2, '0');
        const d = parts[0].padStart(2, '0');
        return `${parts[2]}-${m}-${d}`;
      }
    }
  }
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return clean;
}

/**
 * Filters policies by Business Login Date (Month or Date Range)
 */
export function filterPoliciesByDate(
  policies: Policy[],
  selectedMonth: string,
  fromDate: string,
  toDate: string
): Policy[] {
  if (!selectedMonth && !fromDate && !toDate) return policies;

  return policies.filter(p => {
    const loginDate = getNormalizedLoginDate(p);
    if (!loginDate) return false;

    if (selectedMonth) {
      return loginDate.startsWith(selectedMonth);
    }

    if (fromDate && loginDate < fromDate) return false;
    if (toDate && loginDate > toDate) return false;

    return true;
  });
}

interface DateFilterBarProps {
  selectedMonth: string;
  setSelectedMonth: (val: string) => void;
  fromDate: string;
  setFromDate: (val: string) => void;
  toDate: string;
  setToDate: (val: string) => void;
  quickFilter?: string;
  setQuickFilter?: (val: "" | "today" | "yesterday" | "last7") => void;
  onClearFilters: () => void;
  onRefresh?: () => void;
  actionButton?: React.ReactNode;
}

export default function DateFilterBar({
  selectedMonth,
  setSelectedMonth,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  quickFilter,
  setQuickFilter,
  onClearFilters,
  onRefresh,
  actionButton
}: DateFilterBarProps) {
  const hasActiveFilter = Boolean(selectedMonth || fromDate || toDate || quickFilter);

  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const handleQuickChange = (value: "" | "today" | "yesterday" | "last7") => {
    setSelectedMonth("");

    if (value === "today") {
      const ymd = formatYMD(new Date());
      setFromDate(ymd);
      setToDate(ymd);
    } else if (value === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const ymd = formatYMD(y);
      setFromDate(ymd);
      setToDate(ymd);
    } else if (value === "last7") {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 6);
      setFromDate(formatYMD(start));
      setToDate(formatYMD(end));
    } else {
      setFromDate("");
      setToDate("");
    }
    if (setQuickFilter) setQuickFilter(value);
  };

  const handleClear = () => {
    if (setQuickFilter) setQuickFilter("");
    setSelectedMonth("");
    setFromDate("");
    setToDate("");
    onClearFilters();
    if (onRefresh) onRefresh();
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="p-2 bg-[#DFBFBA]/20 border border-[#DFBFBA]/60 text-[#660000] rounded-xl shrink-0">
          <Calendar className="w-4 h-4" />
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-[#660000] transition">
          <span className="text-xs font-medium text-slate-500">Month:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              if (setQuickFilter) setQuickFilter("");
              setSelectedMonth(e.target.value);
              setFromDate("");
              setToDate("");
            }}
            className="bg-transparent text-xs font-normal text-slate-700 focus:outline-none cursor-pointer"
          />
        </div>

        <span className="text-xs font-normal text-slate-400">or</span>

        {/* From Date & To Date Range */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-[#660000] transition">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                if (setQuickFilter) setQuickFilter("");
                setFromDate(e.target.value);
                setSelectedMonth("");
              }}
              className="bg-transparent text-xs font-normal text-slate-700 focus:outline-none cursor-pointer"
            />
          </div>
          <span className="text-slate-300 font-normal">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                if (setQuickFilter) setQuickFilter("");
                setToDate(e.target.value);
                setSelectedMonth("");
              }}
              className="bg-transparent text-xs font-normal text-slate-700 focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Quick Filter Dropdown */}
        {setQuickFilter !== undefined ? (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shrink-0 focus-within:border-[#660000] transition">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Quick:</span>
            <select
              value={quickFilter || ""}
              onChange={(e) => handleQuickChange(e.target.value as any)}
              className={`bg-transparent text-xs font-normal focus:outline-none cursor-pointer ${
                quickFilter ? "text-[#660000] font-semibold" : "text-slate-700"
              }`}
            >
              <option value="">None</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
            </select>
          </div>
        ) : (
          actionButton
        )}
      </div>

      {/* Refresh / Clear Filters button */}
      <button
        type="button"
        onClick={handleClear}
        title={hasActiveFilter ? "Clear Filters" : "Refresh / Reload Data"}
        className="p-2 bg-[#DFBFBA]/20 hover:bg-[#DFBFBA]/50 text-[#660000] border border-[#DFBFBA] rounded-xl transition flex items-center justify-center cursor-pointer shadow-2xs shrink-0 ml-auto"
      >
        <RefreshCcw className="w-4 h-4 text-[#660000]" />
      </button>
    </div>
  );
}
