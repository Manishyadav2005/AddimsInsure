import React, { useState, useEffect, useMemo } from "react";
import { api } from "../lib/api";
import {
  PerformanceDashboardData,
  EmployeePerformanceItem
} from "../types";
import { Award, Users, AlertCircle } from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const fmtCurr = (num: number) => `₹${(num || 0).toLocaleString("en-IN")}`;
export const fmtLakhs = (num: number) => {
  const val = num || 0;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val}`;
};

interface TopPerformersCardProps {
  sortedEmployeePerformances: EmployeePerformanceItem[];
  performanceScope?: "MTD" | "YTD";
  selectedMonth: number;
  selectedYear: number;
}

export function TopPerformersCard({
  sortedEmployeePerformances,
  performanceScope = "MTD",
  selectedMonth,
  selectedYear
}: TopPerformersCardProps) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between h-full">
      <div className="pb-2 border-b border-slate-100">
        <h3 className="text-sm font-bold text-[#660000] flex items-center gap-2">
          <Award className="w-4.5 h-4.5 text-[#660000]" />
          <span>Top Performers ({performanceScope} Scope — {MONTH_NAMES[selectedMonth - 1]} {selectedYear})</span>
        </h3>
        <p className="text-xs text-slate-500 font-normal mt-0.5">Ranked by Policy Ledger Achievement %</p>
      </div>

      <div className="space-y-2.5">
        {sortedEmployeePerformances.slice(0, 5).map((emp, idx) => {
          const rank = idx + 1;
          const isYtd = performanceScope === "YTD";
          const ach = isYtd ? (emp.ytd?.achievement ?? emp.mtd?.achievement ?? 0) : (emp.mtd?.achievement ?? emp.actualPremium ?? 0);
          const tgt = isYtd ? (emp.ytd?.assignedTarget ?? emp.mtd?.assignedTarget ?? 0) : (emp.mtd?.assignedTarget ?? emp.premiumTarget ?? 0);
          const pct = isYtd ? (emp.ytd?.achievementPercentage ?? emp.mtd?.achievementPercentage ?? 0) : (emp.mtd?.achievementPercentage ?? emp.premiumAchievement ?? 0);

          const rawNop = isYtd
            ? (emp.ytd?.actualPolicies ?? emp.actualPolicies ?? emp.policyStats?.issued ?? emp.policyStats?.total ?? 0)
            : (emp.mtd?.actualPolicies ?? emp.actualPolicies ?? emp.policyStats?.issued ?? emp.policyStats?.total ?? 0);
          const nop = typeof rawNop === "number" && !isNaN(rawNop) ? rawNop : 0;

          if (rank === 1) {
            return (
              <div
                key={emp.employeeId}
                className="bg-[#FFFDF5] border border-[#E6C200]/50 rounded-xl p-3.5 shadow-2xs relative overflow-hidden transition-all hover:shadow-xs group"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#B8860B]" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1 pr-2">
                    <span className="w-9 h-9 bg-gradient-to-br from-[#FFDF00] to-[#D4AF37] text-white border border-[#B8860B] text-base rounded-xl shadow-2xs flex items-center justify-center shrink-0 font-bold mt-0.5">
                      🥇
                    </span>
                    <div className="min-w-0 flex-1">
                      {/* Row 1: Name + Champion badge */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="truncate font-bold text-slate-900 text-sm sm:text-base group-hover:text-[#B8860B] transition-colors">
                          {emp.employeeName}
                        </h4>
                        <span className="px-2 py-0.5 bg-[#D4AF37]/20 border border-[#D4AF37]/60 text-[#B8860B] text-[9px] font-bold rounded-md uppercase tracking-wider shrink-0">
                          CHAMPION
                        </span>
                      </div>
                      {/* Row 2: Designation */}
                      <span className="text-xs text-slate-600 font-normal block truncate mt-0.5">
                        {emp.role} • {emp.teamName}
                      </span>
                      {/* Row 3: NOP */}
                      <span className="text-xs font-semibold text-slate-600 block mt-1 font-mono">
                        NOP: {nop}
                      </span>
                    </div>
                  </div>

                  {/* Right: Percentage (top) & Premium / Target (bottom) */}
                  <div className="text-right shrink-0 flex flex-col justify-between self-stretch">
                    <span className="block font-mono text-lg sm:text-xl font-bold text-[#B8860B] leading-none">
                      {pct}%
                    </span>
                    <span className="text-xs font-mono text-slate-600 block mt-auto pt-1 font-medium">
                      {fmtLakhs(ach)} <span className="text-slate-400 font-normal">/</span> {tgt > 0 ? fmtLakhs(tgt) : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          if (rank === 2) {
            return (
              <div
                key={emp.employeeId}
                className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3 shadow-2xs flex items-start justify-between gap-3 transition-all hover:bg-slate-100/70 group"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1 pr-2">
                  <span className="w-8 h-8 bg-slate-200 text-slate-800 border border-slate-300 text-sm rounded-lg shadow-2xs flex items-center justify-center shrink-0 font-bold mt-0.5">
                    🥈
                  </span>
                  <div className="min-w-0 flex-1">
                    {/* Row 1: Name */}
                    <h4 className="truncate font-bold text-slate-900 text-xs sm:text-sm group-hover:text-[#660000] transition-colors">
                      {emp.employeeName}
                    </h4>
                    {/* Row 2: Designation */}
                    <span className="text-[11px] text-slate-500 font-normal block truncate mt-0.5">
                      {emp.role} • {emp.teamName}
                    </span>
                    {/* Row 3: NOP */}
                    <span className="text-[11px] font-semibold text-slate-600 block mt-1 font-mono">
                      NOP: {nop}
                    </span>
                  </div>
                </div>

                {/* Right: Percentage (top) & Premium / Target (bottom) */}
                <div className="text-right shrink-0 flex flex-col justify-between self-stretch">
                  <span className="block font-mono text-base sm:text-lg font-bold text-[#660000] leading-none">
                    {pct}%
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 block mt-auto pt-1 font-medium">
                    {fmtLakhs(ach)} <span className="text-slate-400 font-normal">/</span> {tgt > 0 ? fmtLakhs(tgt) : "N/A"}
                  </span>
                </div>
              </div>
            );
          }

          if (rank === 3) {
            return (
              <div
                key={emp.employeeId}
                className="bg-amber-50/30 border border-amber-200/60 rounded-xl p-3 shadow-2xs flex items-start justify-between gap-3 transition-all hover:bg-amber-50/60 group"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1 pr-2">
                  <span className="w-8 h-8 bg-amber-100 text-amber-900 border border-amber-300 text-sm rounded-lg shadow-2xs flex items-center justify-center shrink-0 font-bold mt-0.5">
                    🥉
                  </span>
                  <div className="min-w-0 flex-1">
                    {/* Row 1: Name */}
                    <h4 className="truncate font-bold text-slate-900 text-xs sm:text-sm group-hover:text-[#660000] transition-colors">
                      {emp.employeeName}
                    </h4>
                    {/* Row 2: Designation */}
                    <span className="text-[11px] text-slate-500 font-normal block truncate mt-0.5">
                      {emp.role} • {emp.teamName}
                    </span>
                    {/* Row 3: NOP */}
                    <span className="text-[11px] font-semibold text-slate-600 block mt-1 font-mono">
                      NOP: {nop}
                    </span>
                  </div>
                </div>

                {/* Right: Percentage (top) & Premium / Target (bottom) */}
                <div className="text-right shrink-0 flex flex-col justify-between self-stretch">
                  <span className="block font-mono text-base sm:text-lg font-bold text-[#660000] leading-none">
                    {pct}%
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 block mt-auto pt-1 font-medium">
                    {fmtLakhs(ach)} <span className="text-slate-400 font-normal">/</span> {tgt > 0 ? fmtLakhs(tgt) : "N/A"}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={emp.employeeId}
              className="bg-white border-b border-slate-100 last:border-0 p-2.5 rounded-lg flex items-start justify-between gap-3 transition-all hover:bg-slate-50/80 group"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1 pr-2">
                <span className="w-7 h-7 bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold font-mono rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  #{rank}
                </span>
                <div className="min-w-0 flex-1">
                  {/* Row 1: Name */}
                  <h4 className="truncate font-semibold text-slate-800 text-xs sm:text-sm group-hover:text-slate-900">
                    {emp.employeeName}
                  </h4>
                  {/* Row 2: Designation */}
                  <span className="text-[11px] text-slate-500 font-normal block truncate mt-0.5">
                    {emp.role} • {emp.teamName}
                  </span>
                  {/* Row 3: NOP */}
                  <span className="text-[11px] font-semibold text-slate-600 block mt-1 font-mono">
                    NOP: {nop}
                  </span>
                </div>
              </div>

              {/* Right: Percentage (top) & Premium / Target (bottom) */}
              <div className="text-right shrink-0 flex flex-col justify-between self-stretch">
                <span className="block font-mono text-sm sm:text-base font-bold text-slate-800 leading-none">
                  {pct}%
                </span>
                <span className="text-[11px] font-mono text-slate-500 block mt-auto pt-1 font-medium">
                  {fmtLakhs(ach)} <span className="text-slate-400 font-normal">/</span> {tgt > 0 ? fmtLakhs(tgt) : "N/A"}
                </span>
              </div>
            </div>
          );
        })}

        {sortedEmployeePerformances.length === 0 && (
          <div className="py-10 text-center text-xs text-slate-500 font-medium bg-slate-50 border border-dashed border-slate-200 rounded-xl">
            No performance data available
          </div>
        )}
      </div>
    </div>
  );
}

interface TeamPerformanceDistributionCardProps {
  data: PerformanceDashboardData | null;
  performanceScope?: "MTD" | "YTD";
}

export function TeamPerformanceDistributionCard({
  data,
  performanceScope = "MTD"
}: TeamPerformanceDistributionCardProps) {
  const managementPerformancesList = useMemo(() => {
    if (!data) return [];
    if (data.managementPerformances && data.managementPerformances.length > 0) {
      return data.managementPerformances.map((m) => {
        const empMatch = data.employeePerformances?.find((e) => e.employeeId === m.id || e.employeeName === m.name);
        return {
          ...m,
          actualPolicies: m.actualPolicies ?? m.mtd?.actualPolicies ?? empMatch?.actualPolicies ?? empMatch?.mtd?.actualPolicies ?? (m.policyStats?.issued ?? m.policyStats?.total ?? empMatch?.policyStats?.issued ?? empMatch?.policyStats?.total ?? 0),
          policyStats: m.policyStats || empMatch?.policyStats
        };
      });
    }
    return data.employeePerformances
      .filter((e) => ["Branch Manager", "Team Manager", "Team Leader"].includes(e.role))
      .map((e) => ({
        id: e.employeeId,
        name: e.employeeName,
        role: e.role,
        tseCount: 0,
        actualPolicies: e.actualPolicies || e.mtd?.actualPolicies || (e.policyStats?.issued ?? e.policyStats?.total ?? 0),
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

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between h-full">
      <div className="pb-2 border-b border-slate-100">
        <h3 className="text-sm font-bold text-[#660000] flex items-center gap-2">
          <Users className="w-4.5 h-4.5 text-[#660000]" />
          <span>Team Performance Distribution</span>
        </h3>
      </div>

      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
        {sortedMgmtList.map((m) => {
          const isYtd = performanceScope === "YTD";
          const ach = isYtd ? (m.ytd?.achievement ?? 0) : (m.mtd?.achievement ?? 0);
          const tgt = isYtd ? (m.ytd?.assignedTarget ?? 0) : (m.mtd?.assignedTarget ?? 0);
          const pct = isYtd ? (m.ytd?.achievementPercentage ?? 0) : (m.mtd?.achievementPercentage ?? 0);
          const rem = isYtd ? (m.ytd?.remainingTarget ?? 0) : (m.mtd?.remainingTarget ?? 0);
          const empMatch = data?.employeePerformances?.find((e) => e.employeeId === m.id || e.employeeName === m.name);
          const rawNop = isYtd
            ? ((m as any).ytd?.actualPolicies ?? empMatch?.ytd?.actualPolicies ?? (m as any).actualPolicies ?? empMatch?.actualPolicies ?? (m.policyStats?.issued ?? m.policyStats?.total ?? empMatch?.policyStats?.issued ?? empMatch?.policyStats?.total ?? 0))
            : ((m as any).mtd?.actualPolicies ?? empMatch?.mtd?.actualPolicies ?? (m as any).actualPolicies ?? empMatch?.actualPolicies ?? (m.policyStats?.issued ?? m.policyStats?.total ?? empMatch?.policyStats?.issued ?? empMatch?.policyStats?.total ?? 0));
          const nop = Number(rawNop) || 0;

          let badgeBg = "bg-rose-50 text-rose-800 border-rose-200";
          let barBg = "bg-rose-500";
          if (tgt === 0) {
            badgeBg = "bg-slate-100 text-slate-600 border-slate-200";
            barBg = "bg-slate-300";
          } else if (pct >= 90) {
            badgeBg = "bg-emerald-50 text-emerald-800 border-emerald-200";
            barBg = "bg-emerald-600";
          } else if (pct >= 50) {
            badgeBg = "bg-[#DFBFBA]/30 text-[#660000] border-[#DFBFBA]/80";
            barBg = "bg-[#660000]";
          }

          return (
            <div key={m.id} className="p-3 bg-white border border-slate-200/90 rounded-xl space-y-2 hover:border-[#660000]/40 transition-all shadow-2xs">
              {/* ROW 1: Performer Name + Role Badge (left) & Performance Percentage (right) */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{m.name}</h4>
                  <span className="px-1.5 py-0.2 bg-[#660000]/10 text-[#660000] border border-[#660000]/20 text-[10px] font-semibold rounded-md uppercase tracking-wider shrink-0">
                    {m.role}
                  </span>
                </div>
                <div className="shrink-0">
                  <span className={`px-2 py-0.5 border text-xs font-mono font-bold rounded-lg ${badgeBg}`}>
                    {tgt > 0 ? `${pct}%` : "No Target"}
                  </span>
                </div>
              </div>

              {/* ROW 2 & 3: Left (Reporting TSEs on second row, NOP on third row) & Right (Premium / Target & Remaining) */}
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <span className="text-[11px] text-slate-500 font-normal block truncate">
                    {m.tseCount > 0 ? `${m.tseCount} Reporting TSEs` : "Management Leader"}
                  </span>
                  <span className="text-[11px] text-slate-600 font-medium block truncate">
                    NOP: <span className="font-bold font-mono text-slate-800">{nop}</span>
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[11px] font-mono font-bold text-slate-900">
                    {fmtCurr(ach)} <span className="text-slate-400 font-normal">/</span> {tgt > 0 ? fmtCurr(tgt) : "N/A"}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 block font-normal">
                    Remaining: {rem > 0 ? fmtCurr(rem) : "₹0"}
                  </span>
                </div>
              </div>

              {/* BOTTOM: Progress Bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${barBg}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          );
        })}

        {sortedMgmtList.length === 0 && (
          <div className="py-12 text-center text-xs text-slate-500 font-medium bg-slate-50 border border-dashed border-slate-200 rounded-xl">
            No team management performance records available
          </div>
        )}
      </div>
    </div>
  );
}

interface OverviewPerformanceSectionProps {
  selectedMonth: number;
  selectedYear: number;
}

export function OverviewPerformanceSection({ selectedMonth, selectedYear }: OverviewPerformanceSectionProps) {
  const [data, setData] = useState<PerformanceDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError("");

    api.getPerformanceDashboard(selectedMonth, selectedYear)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Overview Performance Dashboard Error:", err);
          setError(err.message || "Failed to load performance data");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedMonth, selectedYear]);

  const sortedEmployeePerformances = useMemo(() => {
    if (!data) return [];
    const list = [...data.employeePerformances];
    list.sort((a, b) => {
      const pctA = a.mtd?.achievementPercentage ?? a.premiumAchievement ?? 0;
      const pctB = b.mtd?.achievementPercentage ?? b.premiumAchievement ?? 0;
      return pctB - pctA;
    });
    return list;
  }, [data]);

  if (loading && !data) {
    return (
      <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 gap-2 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
        <div className="w-6 h-6 border-2 border-[#660000] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold">Loading Performance Analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="col-span-full p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2 font-medium">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>Failed to load performance analytics: {error}</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      <TopPerformersCard
        sortedEmployeePerformances={sortedEmployeePerformances}
        performanceScope="MTD"
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />
      <TeamPerformanceDistributionCard
        data={data}
        performanceScope="MTD"
      />
    </div>
  );
}
