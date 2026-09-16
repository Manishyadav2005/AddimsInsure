import React, { useState, useMemo } from "react";
import { Policy } from "../types";
import SegmentAnalytics from "./SegmentAnalytics";
import DateFilterBar, { filterPoliciesByDate } from "./DateFilterBar";

interface BusinessSegmentDashboardProps {
  segment: "new_business" | "fresh" | "port" | "renewal";
  policies: Policy[];
  user?: any;
  userId: string;
  onRefresh?: () => void;
  onAddEmailLog?: (log: any) => void;
  onNavigateToLedger?: (filterType: string) => void;
}

export default function BusinessSegmentDashboard({
  segment,
  policies,
  onRefresh,
  onNavigateToLedger,
}: BusinessSegmentDashboardProps) {
  // Standardized Date & Quick Filtering State
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [quickFilter, setQuickFilter] = useState<"" | "today" | "yesterday" | "last7">("");

  const filteredPolicies = useMemo(() => {
    return filterPoliciesByDate(policies, selectedMonth, fromDate, toDate);
  }, [policies, selectedMonth, fromDate, toDate]);

  return (
    <div className="space-y-6">
      {/* Standardized Date & Quick Filter Bar */}
      <DateFilterBar
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        fromDate={fromDate}
        setFromDate={setFromDate}
        toDate={toDate}
        setToDate={setToDate}
        quickFilter={quickFilter}
        setQuickFilter={setQuickFilter}
        onClearFilters={() => {
          setQuickFilter("");
          setSelectedMonth("");
          setFromDate("");
          setToDate("");
        }}
        onRefresh={onRefresh}
      />

      {/* Segment Analytics Content */}
      <SegmentAnalytics
        segment={segment}
        policies={filteredPolicies}
        onNavigateToLedger={onNavigateToLedger}
      />
    </div>
  );
}
