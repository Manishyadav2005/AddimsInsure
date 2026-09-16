import { Policy } from "../types";

export interface CompanyContributionItem {
  companyName: string;
  count: number;
  volume: number;
  percentage: number;
}

export interface CategoryDistributionItem {
  categoryName: string;
  count: number;
  volume: number;
  percentage: number;
}

export interface SourceDistributionItem {
  sourceType: string;
  count: number;
  volume: number;
  percentage: number;
}

export interface PolicyMetrics {
  totalCount: number;
  totalVolume: number;
  totalSumAssured: number;
  averageSumAssured: number;

  freshCount: number;
  freshVolume: number;
  freshAvgPremium: number;
  freshSumAssured: number;
  freshAvgSumAssured: number;
  freshCashbackTotal: number;
  freshCashbackCount: number;
  freshPolicies: Policy[];
  freshCompanyContributions: CompanyContributionItem[];
  freshCategoryDistribution: CategoryDistributionItem[];

  portCount: number;
  portVolume: number;
  portAvgPremium: number;
  portSumAssured: number;
  portAvgSumAssured: number;
  portCashbackTotal: number;
  portCashbackCount: number;
  portPolicies: Policy[];
  portCompanyContributions: CompanyContributionItem[];
  portSourceDistribution: SourceDistributionItem[];

  newBusinessCount: number;
  newBusinessVolume: number;
  newBusinessSumAssured: number;
  newBusinessAvgSumAssured: number;
  newBusinessPolicies: Policy[];

  renewalCount: number;
  renewalVolume: number;
  renewalSumAssured: number;
  renewalAvgSumAssured: number;
  renewalCashbackTotal: number;
  renewalCashbackCount: number;
  renewedTodayCount: number;
  renewedTodayVolume: number;
  upcomingRenewalsCount: number;
  overdueRenewalsCount: number;
  renewalPolicies: Policy[];
  renewalCompanyContributions: CompanyContributionItem[];

  totalCashbackTotal: number;
  totalCashbackCount: number;

  issuedCount: number;
  issuedVolume: number;
  issuedPolicies: Policy[];

  pendingCount: number;
  pendingVolume: number;
  pendingPolicies: Policy[];

  paidCount: number;
  paidVolume: number;
  revenueVolume: number;

  unpaidCount: number;
  unpaidVolume: number;

  overdueCount: number;
  overdueVolume: number;
  overduePolicies: Policy[];
}

/**
 * Strict Business Type Classification:
 * - Fresh: businessType == "Fresh" (or "FRESH" / "NEW_BUSINESS" with subtype "FRESH" or empty)
 * - Port: businessType == "Port" (or "PORT" / subtype "PORT")
 * - Renewal: businessType == "Renewal" (or "RENEWAL")
 */
export function getPolicyClassification(p: Policy): "FRESH" | "PORT" | "RENEWAL" {
  const bType = (p.businessType || "").trim().toUpperCase();
  const bSub = (p.businessSubtype || "").trim().toUpperCase();
  const isPortCase = bType === "PORT" || bSub === "PORT" || Boolean(p.portabilityDetails?.previousInsuranceCompany);

  if (bType === "RENEWAL" || bSub === "RENEWAL") return "RENEWAL";
  if (isPortCase) return "PORT";
  return "FRESH";
}

function isToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const today = new Date().toISOString().split("T")[0];
  return dateStr.startsWith(today);
}

export type PolicyStatusType = "ISSUED" | "PENDING" | "CANCELLED";

/**
 * Strict Policy Status Classification:
 * - ISSUED: policyStatus == "Issued" (or empty with premiumStatus == "Paid")
 * - CANCELLED: policyStatus == "Cancelled"
 * - PENDING: fallback for all un-issued and un-cancelled policies
 */
export function getPolicyStatusType(p: Policy): PolicyStatusType {
  const s = (p.policyStatus || "").trim().toUpperCase();
  const prem = (p.premiumStatus || "").trim().toUpperCase();

  if (s === "ISSUED" || (!p.policyStatus && prem === "PAID")) {
    return "ISSUED";
  }
  if (s === "CANCELLED") {
    return "CANCELLED";
  }
  return "PENDING";
}

export interface ModuleKPIs {
  totalCount: number;
  totalVolume: number;
  totalSumAssured: number;
  avgPremium: number;
  avgSumAssured: number;

  issuedPolicies: Policy[];
  issuedCount: number;
  issuedVolume: number;

  pendingPolicies: Policy[];
  pendingCount: number;
  pendingVolume: number;

  cancelledPolicies: Policy[];
  cancelledCount: number;
  cancelledVolume: number;
}

/**
 * Universal Module KPI Calculation Engine
 * Guarantees Issued + Pending + Cancelled = Total Policies Invariant for any dataset.
 */
export function computeModuleKPIs(dataset: Policy[]): ModuleKPIs {
  let totalVolume = 0;
  let totalSumAssured = 0;

  const issuedPolicies: Policy[] = [];
  let issuedVolume = 0;

  const pendingPolicies: Policy[] = [];
  let pendingVolume = 0;

  const cancelledPolicies: Policy[] = [];
  let cancelledVolume = 0;

  for (const p of dataset) {
    const amt = Number(p.premiumAmount) || 0;
    const sa = Number(p.sumAssured) || 0;
    totalVolume += amt;
    totalSumAssured += sa;

    const st = getPolicyStatusType(p);
    if (st === "ISSUED") {
      issuedPolicies.push(p);
      issuedVolume += amt;
    } else if (st === "CANCELLED") {
      cancelledPolicies.push(p);
      cancelledVolume += amt;
    } else {
      pendingPolicies.push(p);
      pendingVolume += amt;
    }
  }

  const totalCount = dataset.length;

  return {
    totalCount,
    totalVolume,
    totalSumAssured,
    avgPremium: totalCount > 0 ? Math.round(totalVolume / totalCount) : 0,
    avgSumAssured: totalCount > 0 ? Math.round(totalSumAssured / totalCount) : 0,

    issuedPolicies,
    issuedCount: issuedPolicies.length,
    issuedVolume,

    pendingPolicies,
    pendingCount: pendingPolicies.length,
    pendingVolume,

    cancelledPolicies,
    cancelledCount: cancelledPolicies.length,
    cancelledVolume,
  };
}

/**
 * Centralized Calculation Engine — Strict Business Type Segregation
 */
export function calculatePolicyMetrics(policies: Policy[]): PolicyMetrics {
  let totalVolume = 0;
  let totalSumAssured = 0;

  const freshPolicies: Policy[] = [];
  let freshVolume = 0;
  let freshSumAssured = 0;
  let freshCashbackTotal = 0;
  let freshCashbackCount = 0;

  const portPolicies: Policy[] = [];
  let portVolume = 0;
  let portSumAssured = 0;
  let portCashbackTotal = 0;
  let portCashbackCount = 0;

  const renewalPolicies: Policy[] = [];
  let renewalVolume = 0;
  let renewalSumAssured = 0;
  let renewalCashbackTotal = 0;
  let renewalCashbackCount = 0;
  let renewedTodayCount = 0;
  let renewedTodayVolume = 0;

  const issuedPolicies: Policy[] = [];
  let issuedVolume = 0;

  const pendingPolicies: Policy[] = [];
  let pendingVolume = 0;

  const cancelledPolicies: Policy[] = [];
  let cancelledVolume = 0;

  let paidCount = 0;
  let paidVolume = 0;

  let unpaidCount = 0;
  let unpaidVolume = 0;

  const overduePolicies: Policy[] = [];
  let overdueVolume = 0;

  for (const p of policies) {
    const amt = Number(p.premiumAmount) || 0;
    const sa = Number(p.sumAssured) || 0;
    const cbEnabled = p.cashbackEnabled === true || (p as any).cashbackEnabled === "true" || (p as any).cashbackEnabled === "Yes" || (p as any).cashback === "Yes";
    const cbAmt = cbEnabled ? (Number(p.cashbackAmount) || 0) : 0;
    totalVolume += amt;
    totalSumAssured += sa;

    // Classification
    const cls = getPolicyClassification(p);
    if (cls === "RENEWAL") {
      renewalPolicies.push(p);
      renewalVolume += amt;
      renewalSumAssured += sa;
      if (cbEnabled) {
        renewalCashbackCount++;
        renewalCashbackTotal += cbAmt;
      }

      const loginDate = p.businessLoginDate || p.startDate || (p.createdAt ? p.createdAt.split("T")[0] : "");
      if (isToday(loginDate)) {
        renewedTodayCount++;
        renewedTodayVolume += amt;
      }
    } else if (cls === "PORT") {
      portPolicies.push(p);
      portVolume += amt;
      portSumAssured += sa;
      if (cbEnabled) {
        portCashbackCount++;
        portCashbackTotal += cbAmt;
      }
    } else {
      freshPolicies.push(p);
      freshVolume += amt;
      freshSumAssured += sa;
      if (cbEnabled) {
        freshCashbackCount++;
        freshCashbackTotal += cbAmt;
      }
    }

    // Policy Status
    const st = getPolicyStatusType(p);
    if (st === "ISSUED") {
      issuedPolicies.push(p);
      issuedVolume += amt;
    } else if (st === "CANCELLED") {
      cancelledPolicies.push(p);
      cancelledVolume += amt;
    } else {
      pendingPolicies.push(p);
      pendingVolume += amt;
    }

    // Payment Status / Revenue
    const premStatus = (p.premiumStatus || "").toLowerCase();
    if (premStatus === "paid" || st === "ISSUED") {
      paidCount++;
      paidVolume += amt;
    } else {
      unpaidCount++;
      unpaidVolume += amt;
    }

    // Overdue
    if (premStatus === "overdue") {
      overduePolicies.push(p);
      overdueVolume += amt;
    }
  }

  const newBusinessPolicies = [...freshPolicies, ...portPolicies];
  const freshCount = freshPolicies.length;
  const portCount = portPolicies.length;
  const renewalCount = renewalPolicies.length;

  return {
    totalCount: policies.length,
    totalVolume,
    totalSumAssured,
    averageSumAssured: policies.length > 0 ? Math.round(totalSumAssured / policies.length) : 0,

    freshCount,
    freshVolume,
    freshAvgPremium: freshCount > 0 ? Math.round(freshVolume / freshCount) : 0,
    freshSumAssured,
    freshAvgSumAssured: freshCount > 0 ? Math.round(freshSumAssured / freshCount) : 0,
    freshCashbackTotal,
    freshCashbackCount,
    freshPolicies,
    freshCompanyContributions: getCompanyContributions(freshPolicies),
    freshCategoryDistribution: getCategoryDistribution(freshPolicies),

    portCount,
    portVolume,
    portAvgPremium: portCount > 0 ? Math.round(portVolume / portCount) : 0,
    portSumAssured,
    portAvgSumAssured: portCount > 0 ? Math.round(portSumAssured / portCount) : 0,
    portCashbackTotal,
    portCashbackCount,
    portPolicies,
    portCompanyContributions: getCompanyContributions(portPolicies),
    portSourceDistribution: getSourceDistribution(portPolicies),

    newBusinessCount: newBusinessPolicies.length,
    newBusinessVolume: freshVolume + portVolume,
    newBusinessSumAssured: freshSumAssured + portSumAssured,
    newBusinessAvgSumAssured: newBusinessPolicies.length > 0 ? Math.round((freshSumAssured + portSumAssured) / newBusinessPolicies.length) : 0,
    newBusinessPolicies,

    renewalCount: renewalPolicies.length,
    renewalVolume,
    renewalSumAssured,
    renewalAvgSumAssured: renewalCount > 0 ? Math.round(renewalSumAssured / renewalCount) : 0,
    renewalCashbackTotal,
    renewalCashbackCount,
    renewedTodayCount,
    renewedTodayVolume,
    upcomingRenewalsCount: renewalPolicies.filter(p => (p.premiumStatus || "").toLowerCase() !== "paid").length,
    overdueRenewalsCount: renewalPolicies.filter(p => (p.premiumStatus || "").toLowerCase() === "overdue").length,
    renewalPolicies,
    renewalCompanyContributions: getCompanyContributions(renewalPolicies),

    totalCashbackTotal: freshCashbackTotal + portCashbackTotal + renewalCashbackTotal,
    totalCashbackCount: freshCashbackCount + portCashbackCount + renewalCashbackCount,

    issuedCount: issuedPolicies.length,
    issuedVolume,
    issuedPolicies,

    pendingCount: pendingPolicies.length,
    pendingVolume,
    pendingPolicies,

    paidCount,
    paidVolume,
    revenueVolume: paidVolume,

    unpaidCount,
    unpaidVolume,

    overdueCount: overduePolicies.length,
    overdueVolume,
    overduePolicies,
  };
}

export function getCompanyContributions(policies: Policy[]): CompanyContributionItem[] {
  const map: { [key: string]: { count: number; volume: number } } = {};
  let totalVol = 0;

  for (const p of policies) {
    const name = p.companyName || "Other / Unassigned";
    const amt = Number(p.premiumAmount) || 0;
    totalVol += amt;

    if (!map[name]) map[name] = { count: 0, volume: 0 };
    map[name].count += 1;
    map[name].volume += amt;
  }

  return Object.entries(map)
    .map(([companyName, d]) => ({
      companyName,
      count: d.count,
      volume: d.volume,
      percentage: totalVol > 0 ? Math.round((d.volume / totalVol) * 100) : 0
    }))
    .sort((a, b) => b.volume - a.volume);
}

export function getCategoryDistribution(policies: Policy[]): CategoryDistributionItem[] {
  const map: { [key: string]: { count: number; volume: number } } = {};
  let totalVol = 0;

  for (const p of policies) {
    const name = p.policyType || "General Insurance";
    const amt = Number(p.premiumAmount) || 0;
    totalVol += amt;

    if (!map[name]) map[name] = { count: 0, volume: 0 };
    map[name].count += 1;
    map[name].volume += amt;
  }

  return Object.entries(map)
    .map(([categoryName, d]) => ({
      categoryName,
      count: d.count,
      volume: d.volume,
      percentage: totalVol > 0 ? Math.round((d.volume / totalVol) * 100) : 0
    }))
    .sort((a, b) => b.volume - a.volume);
}

export function getSourceDistribution(policies: Policy[]): SourceDistributionItem[] {
  const map: { [key: string]: { count: number; volume: number } } = {};
  let totalVol = 0;

  for (const p of policies) {
    const sType = p.sourceType === "direct" ? "Direct" : p.sourceType === "referral" ? "Referral" : "Sales Team";
    const amt = Number(p.premiumAmount) || 0;
    totalVol += amt;

    if (!map[sType]) map[sType] = { count: 0, volume: 0 };
    map[sType].count += 1;
    map[sType].volume += amt;
  }

  return Object.entries(map)
    .map(([sourceType, d]) => ({
      sourceType,
      count: d.count,
      volume: d.volume,
      percentage: totalVol > 0 ? Math.round((d.volume / totalVol) * 100) : 0
    }))
    .sort((a, b) => b.volume - a.volume);
}
