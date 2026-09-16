import React, { useState, useMemo, useEffect, useRef } from "react";
import { calculatePolicyMetrics, computeModuleKPIs } from "../lib/metrics";
import { Policy, formatSumAssuredDisplay } from "../types";
import {
  TrendingUp, ShieldCheck, AlertCircle, Calendar, RefreshCcw,
  Clock, ArrowRight, Layers, FileText, Building2, Shield, DollarSign,
  CheckCircle, XCircle, ChevronLeft, ChevronRight, Eye, Info, X
} from "lucide-react";
import DateFilterBar, { filterPoliciesByDate } from "./DateFilterBar";
import { fetchAgencyProfile } from "../lib/api";
import { motion } from "motion/react";


interface DashboardStatsProps {
  policies: Policy[];
  onMetricClick?: (filterType: string) => void;
  onNavigateToLedger?: () => void;
  onRefresh?: () => void;
}

/**
 * Format YYYY-MM-DD or ISO string into "05 Aug 2026"
 */
function formatDateDisplay(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    const cleanStr = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const parts = cleanStr.split("-");
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

/**
 * Safely parses date string in any format (YYYY-MM-DD, DD-MM-YYYY, YYYY/MM/DD, ISO string)
 */
function parseYearMonthDay(dateStr?: string): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const cleanStr = dateStr.trim().split("T")[0];

  if (cleanStr.includes("-") || cleanStr.includes("/")) {
    const delimiter = cleanStr.includes("-") ? "-" : "/";
    const parts = cleanStr.split(delimiter).map(p => parseInt(p, 10));
    if (parts.length === 3 && !parts.some(isNaN)) {
      // YYYY-MM-DD or YYYY/MM/DD
      if (parts[0] > 1000) {
        return { year: parts[0], month: parts[1], day: parts[2] };
      }
      // DD-MM-YYYY or DD/MM/YYYY
      if (parts[2] > 1000) {
        return { year: parts[2], month: parts[1], day: parts[0] };
      }
    }
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }

  return null;
}

function normalizeTenureValue(raw: any): { numericValue: number; label: string } | null {
  if (raw === undefined || raw === null || raw === "") return null;

  if (typeof raw === "number") {
    if (isNaN(raw)) return null;
    return { numericValue: raw, label: `${raw} ${raw === 1 ? "Year" : "Years"}` };
  }

  const str = String(raw).trim();
  const match = str.match(/(\d+(\.\d+)?)/);
  if (!match) return null;

  const num = parseFloat(match[1]);
  if (isNaN(num)) return null;

  return { numericValue: num, label: `${num} ${num === 1 ? "Year" : "Years"}` };
}


/**
 * Normalizes Business Login Date or fallback dates into YYYY-MM-DD string
 */
function getNormalizedLoginDate(p: Policy): string {
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
  return clean;
}

/**
 * Checks if a given date falls within the target calendar month
 */
function isDateInCurrentMonth(dateStr?: string, targetYear?: number, targetMonth?: number): boolean {
  const parsed = parseYearMonthDay(dateStr);
  if (!parsed) return false;

  const now = new Date();
  const tYear = targetYear ?? now.getFullYear();
  const tMonth = targetMonth ?? (now.getMonth() + 1);

  return parsed.year === tYear && parsed.month === tMonth;
}

/**
 * Business classification helper based on saved Policy attributes
 */
function getBusinessClassification(p: Policy) {
  const bType = (p.businessType || "").toUpperCase();
  const bSubtype = (p.businessSubtype || (p as any).businessSubtype || "").toUpperCase();
  const isPortCase = bType === "PORT" || bSubtype === "PORT" || Boolean(p.portabilityDetails?.previousInsuranceCompany);

  if (bType === "RENEWAL") {
    return { key: "RENEWAL", label: "RENEWAL", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" };
  }
  if (isPortCase) {
    return { key: "PORT", label: "NEW BUSINESS • PORT", badgeClass: "bg-sky-50 text-sky-700 border-sky-200" };
  }
  return { key: "FRESH", label: "NEW BUSINESS • FRESH", badgeClass: "bg-teal-50 text-teal-700 border-teal-200" };
}

/**
 * Product Name helper
 */
function getProductNameDisplay(p: Policy) {
  if (
    p.productName &&
    typeof p.productName === "string" &&
    p.productName.trim() &&
    p.productName.trim() !== "—" &&
    p.productName.trim().toLowerCase() !== "undefined" &&
    p.productName.trim().toLowerCase() !== "null"
  ) {
    return p.productName.trim();
  }
  return "—";
}

/**
 * Resolves a friendly status label consistent with the rest of the dashboard
 */
function getStatusDisplay(p: Policy) {
  return (p.policyStatus || "").trim();
}

/**
 * Opens a full policy detail sheet as a printable PDF in a new tab
 */
function openPolicyDetailPDF(p: Policy, companyName: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const row = (label: string, value?: string | number | null) => {
    if (value === undefined || value === null || value === "") return "";
    return `
      <tr>
        <td style="padding:8px 12px;color:#64748b;font-weight:600;width:40%;border-bottom:1px solid #f1f5f9;">${label}</td>
        <td style="padding:8px 12px;color:#0f172a;font-weight:600;border-bottom:1px solid #f1f5f9;">${value}</td>
      </tr>
    `;
  };

  const sectionTitle = (title: string) => `
    <div style="margin:20px 0 8px 0;font-size:11px;font-weight:800;letter-spacing:0.06em;color:#660000;text-transform:uppercase;border-bottom:2px solid #660000;padding-bottom:6px;">
      ${title}
    </div>
  `;

  const fullAddress = [p.houseFlat, p.streetArea, p.landmark, p.address, p.city, p.district, p.state, p.pincode]
    .filter(Boolean)
    .join(", ");

  const familyRows = (p.familyMembersList && p.familyMembersList.length > 0)
    ? p.familyMembersList.map(m => `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;">${m.name || "—"}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;">${m.relationship || "—"}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;">${m.dob || "—"}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;">${m.gender || "—"}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;">${m.healthStatus || m.medicalDetails || "—"}</td>
        </tr>
      `).join("")
    : "";

  const documentHTML = `
        ${sectionTitle("Policy Information")}
        <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
          ${row("Policy Number", p.policyNumber || "N/A")}
          ${row("Insurance Company", p.companyName)}
          ${row("Product Name", p.productName)}
          ${row("Policy Type", p.policyType)}
          ${row("Premium Amount", `₹${(p.premiumAmount || 0).toLocaleString("en-IN")}`)}
          ${row("Sum Assured", formatSumAssuredDisplay(p.sumAssured, (p as any).sumAssuredType))}
          ${row("Premium Frequency", p.premiumFrequency)}
          ${row("Issue Date", formatDateDisplay(p.businessLoginDate || p.startDate))}
          ${row("Renewal / Due Date", formatDateDisplay(p.nextDueDate || p.expiryDate))}
          ${row("Business Type", p.businessType)}
          ${row("Business Subtype", p.businessSubtype)}
          ${row("Policy Tenure (Years)", p.policyTenure)}
        </table>

        ${sectionTitle("Customer Information")}
        <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
          ${row("Customer Name", p.customerName)}
          ${row("Phone Number", p.customerPhone)}
          ${row("WhatsApp Number", p.whatsappNumber)}
          ${row("Email", p.customerEmail)}
          ${row("Date of Birth", formatDateDisplay(p.customerBirthday))}
          ${row("Gender", p.gender)}
          ${row("Marital Status", p.maritalStatus)}
          ${row("Occupation", p.occupation)}
          ${row("Annual Income", p.annualIncome)}
          ${row("Address", fullAddress)}
        </table>

        ${(p.paymentMode === "Finance/EMI") ? `
          ${sectionTitle("Finance / EMI Details")}
          <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
            ${row("Payment Mode", p.paymentMode)}
            ${row("Finance Type", p.financeType)}
            ${row("Finance Vendor", p.financeVendor)}
            ${row("Financed Amount", p.financedAmount ? `₹${p.financedAmount.toLocaleString("en-IN")}` : "")}
            ${row("Down Payment", p.downPayment ? `₹${p.downPayment.toLocaleString("en-IN")}` : "")}
            ${row("EMI Amount", p.emiAmount ? `₹${p.emiAmount.toLocaleString("en-IN")}` : "")}
            ${row("EMI Tenure (Months)", p.emiTenure)}
            ${row("EMI Start Date", formatDateDisplay(p.emiStartDate))}
          </table>
        ` : ""}

        ${p.portabilityDetails?.previousInsuranceCompany ? `
          ${sectionTitle("Portability Details")}
          <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
            ${row("Previous Insurance Company", p.portabilityDetails.previousInsuranceCompany)}
            ${row("Previous Policy Number", p.portabilityDetails.previousPolicyNumber)}
            ${row("Previous Product", p.portabilityDetails.previousProductName)}
            ${row("Previous Policy Expiry", formatDateDisplay(p.portabilityDetails.previousPolicyExpiryDate))}
            ${row("Previous Sum Insured", p.portabilityDetails.previousSumInsured)}
          </table>
        ` : ""}

        ${familyRows ? `
          ${sectionTitle("Family Members Covered")}
          <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:6px 10px;text-align:left;font-size:10.5px;color:#64748b;">Name</th>
                <th style="padding:6px 10px;text-align:left;font-size:10.5px;color:#64748b;">Relationship</th>
                <th style="padding:6px 10px;text-align:left;font-size:10.5px;color:#64748b;">DOB</th>
                <th style="padding:6px 10px;text-align:left;font-size:10.5px;color:#64748b;">Gender</th>
                <th style="padding:6px 10px;text-align:left;font-size:10.5px;color:#64748b;">Health Status</th>
              </tr>
            </thead>
            <tbody>${familyRows}</tbody>
          </table>
        ` : ""}

        ${sectionTitle("Servicing & Source")}
        <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
          ${row("Team Leader", p.teamLeaderName)}
          ${row("Caller / TSE", p.tseName || p.callerName)}
          ${row("Source Type", p.sourceType)}
          ${row("Source Person", p.sourcePersonName)}
        </table>

        ${p.notes ? `
          ${sectionTitle("Notes")}
          <p style="font-size:12.5px;color:#334155;">${p.notes}</p>
        ` : ""}
  `;

  printWindow.document.write(`
    <html>
     <head>
        <title>${companyName} - Policy ${p.policyNumber || ""}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #1e293b;
            background: #eef1f5;
            margin: 0;
            padding: 32px 16px 60px 16px;
          }
          .toolbar {
            max-width: 780px;
            margin: 0 auto 16px auto;
            display: flex;
            justify-content: flex-end;
          }
          .download-btn {
            background: #660000;
            color: #fff;
            border: none;
            padding: 11px 24px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 10px rgba(102,0,0,0.25);
          }
          .download-btn:hover { background: #4d0000; }
          .sheet {
            max-width: 780px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 8px 30px rgba(15,23,42,0.10);
            padding: 40px 44px;
          }
          .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 3px solid #660000; padding-bottom: 16px; margin-bottom: 4px; }
          .header h1 { font-size: 19px; margin:0; color:#660000; }
          .header p { margin: 2px 0 0 0; font-size: 11px; color:#64748b; }
          .status-badge { display:inline-block; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; background:#f1f5f9; border:1px solid #e2e8f0; color:#334155; }
          @media print {
            body { background: #fff; padding: 0; }
            .toolbar { display: none; }
            .sheet { box-shadow: none; border-radius: 0; max-width: 100%; padding: 20px 30px; }
          }
        </style>
      </head>
      <body>
       <div class="toolbar">
          <button class="download-btn" id="pdfDownloadBtn" onclick="downloadAsPDF()">⬇ PDF</button>
        </div>
        <div class="sheet">
          <div class="header">
            <div>
              <h1>${companyName}</h1>
              <p>Full Policy Detail Sheet</p>
            </div>
            <div style="text-align:right;">
              <span class="status-badge">${getStatusDisplay(p)}</span>
              <p>Generated on ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
          </div>
      ${documentHTML}
        </div>
        <script>
          function downloadAsPDF() {
            const btn = document.getElementById('pdfDownloadBtn');
            const originalText = btn.innerText;
            btn.innerText = 'Generating...';
            btn.disabled = true;

            const element = document.querySelector('.sheet');
            const opt = {
              margin: 0,
              filename: 'Policy_${p.policyNumber || p.customerName.replace(/\\s+/g, "_")}.pdf',
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true },
              jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(element).save().then(() => {
              btn.innerText = originalText;
              btn.disabled = false;
            });
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
const CARD_LABELS: Record<string, string> = {
  ALL: "Total Policies",
  ISSUED: "Issued Policies",
  PENDING: "Pending Policies",
  CANCELLED: "Cancelled Policies"
};

const PAGE_SIZE = 10;

export default function DashboardStats({ policies, onMetricClick, onNavigateToLedger, onRefresh }: DashboardStatsProps) {
  // Date & Status Filtering State
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"ALL" | "ISSUED" | "PENDING" | "CANCELLED">("ALL");

  // Policy Details Section state (opens only after a card is clicked)
const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsPage, setDetailsPage] = useState(1);
  const detailsSectionRef = useRef<HTMLDivElement>(null);
  const [companyDisplayName, setCompanyDisplayName] = useState("Policy Master");
  const [hoveredSlabIdx, setHoveredSlabIdx] = useState<number | null>(null);
  const [hoveredTenureIdx, setHoveredTenureIdx] = useState<number | null>(null);
  const [hoveredFinanceIdx, setHoveredFinanceIdx] = useState<number | null>(null);
  const hasActiveFilter = Boolean(selectedMonth || fromDate || toDate || selectedStatusFilter !== "ALL");

  const targetMonth = useMemo(() => {
    if (selectedMonth) {
      const parts = selectedMonth.split("-");
      if (parts.length === 2) {
        return parseInt(parts[1], 10);
      }
    }
    if (fromDate) {
      const parsed = parseYearMonthDay(fromDate);
      if (parsed) return parsed.month;
    }
    return new Date().getMonth() + 1;
  }, [selectedMonth, fromDate]);

  const targetYear = useMemo(() => {
    if (selectedMonth) {
      const parts = selectedMonth.split("-");
      if (parts.length === 2) {
        return parseInt(parts[0], 10);
      }
    }
    if (fromDate) {
      const parsed = parseYearMonthDay(fromDate);
      if (parsed) return parsed.year;
    }
    return new Date().getFullYear();
  }, [selectedMonth, fromDate]);


  // Quick Date Filter (Today / Yesterday / Last 7 Days) — reuses existing From/To filtering
  const [quickFilter, setQuickFilter] = useState<"" | "today" | "yesterday" | "last7">("");

  // Filter policies based on Business Login Date
  const filteredPolicies = useMemo(() => {
    return filterPoliciesByDate(policies, selectedMonth, fromDate, toDate);
  }, [policies, selectedMonth, fromDate, toDate]);

  // Filter policies for lower tables/widgets based on quick status card selection
  const statusFilteredPolicies = useMemo(() => {
    if (selectedStatusFilter === "ALL") return filteredPolicies;
    return filteredPolicies.filter(p => {
      const s = (p.policyStatus || "Issued").trim().toUpperCase();
      const prem = (p.premiumStatus || "").trim().toUpperCase();
      if (selectedStatusFilter === "ISSUED") return s === "ISSUED";
      if (selectedStatusFilter === "PENDING") return s === "PENDING" || (!p.policyStatus && prem === "PENDING");
      if (selectedStatusFilter === "CANCELLED") return s === "CANCELLED";
      return true;
    });
  }, [filteredPolicies, selectedStatusFilter]);

 const handleStatusCardClick = (targetStatus: "ALL" | "ISSUED" | "PENDING" | "CANCELLED") => {
    setSelectedStatusFilter(targetStatus);
    setIsDetailsOpen(true);
    setTimeout(() => {
      detailsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const getEmptyStateMessage = () => {
    if (selectedStatusFilter === "ISSUED") return "No Issued Policies Found";
    if (selectedStatusFilter === "PENDING") return "No Pending Policies Found";
    if (selectedStatusFilter === "CANCELLED") return "No Cancelled Policies Found";
    return "No Policy Records Found";
  };

  // Reset pagination whenever the active card or local filters change
 useEffect(() => {
    setDetailsPage(1);
  }, [selectedStatusFilter, isDetailsOpen]);

  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("mongo_user") || "{}");
      const tenantId = storedUser?.tenantId || storedUser?.uid;
      if (tenantId) {
        fetchAgencyProfile(tenantId)
          .then((data: any) => {
            const name = data?.companyName || data?.agencyName;
            if (name) setCompanyDisplayName(name);
          })
          .catch(() => {});
      }
    } catch {}
  }, []);
  // Final table dataset: status-card filtered
  const detailsTableData = statusFilteredPolicies;
  const detailsTotalPages = Math.max(1, Math.ceil(detailsTableData.length / PAGE_SIZE));
  const detailsPaginated = detailsTableData.slice((detailsPage - 1) * PAGE_SIZE, detailsPage * PAGE_SIZE);

  
  // Filter policies based on Business Login Date
  const metrics = calculatePolicyMetrics(filteredPolicies);

  // 1. Active Premium Volume & Average Premium
  const activePolicies = filteredPolicies.filter(p => (p.premiumStatus as any) !== "Lapsed");
  const totalActivePremium = metrics.totalVolume;
  const avgPremium = filteredPolicies.length > 0 ? Math.round(metrics.totalVolume / filteredPolicies.length) : 0;

  // 2. Business Mix Counts & Volumes from Central Engine
  const freshCount = metrics.freshCount;
  const freshAmount = metrics.freshVolume;
  const portCount = metrics.portCount;
  const portAmount = metrics.portVolume;
  const renewalCount = metrics.renewalCount;
  const renewalAmount = metrics.renewalVolume;
  const totalNewBusiness = metrics.newBusinessCount;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const getLoginDate = (p: Policy) => p.businessLoginDate || p.startDate || (p.createdAt ? p.createdAt.split("T")[0] : "");

  // Policy Status Counts & Premium Volumes for Overview KPI Cards
  const overviewKPIs = computeModuleKPIs(filteredPolicies);
  const policyMetrics = calculatePolicyMetrics(filteredPolicies);
  const totalPolicyCount = overviewKPIs.totalCount;
  const totalPolicyVolume = overviewKPIs.totalVolume;

  const issuedPolicyCount = overviewKPIs.issuedCount;
  const issuedPolicyVolume = overviewKPIs.issuedVolume;

  const pendingPolicyCount = overviewKPIs.pendingCount;
  const pendingPolicyVolume = overviewKPIs.pendingVolume;

  const cancelledPolicyCount = overviewKPIs.cancelledCount;
  const cancelledPolicyVolume = overviewKPIs.cancelledVolume;

  // Cashback Metrics from Active Filtered Policies
  const freshCashbackTotal = policyMetrics.freshCashbackTotal;
  const freshCashbackCount = policyMetrics.freshCashbackCount;
  const portCashbackTotal = policyMetrics.portCashbackTotal;
  const portCashbackCount = policyMetrics.portCashbackCount;
  const renewalCashbackTotal = policyMetrics.renewalCashbackTotal;
  const renewalCashbackCount = policyMetrics.renewalCashbackCount;

  // 1. Top Summary Card: Renewals Due This Month
  const renewalsDueThisMonthPolicies = filteredPolicies.filter(p => {
    const dueDate = p.nextDueDate || p.expiryDate;
    return isDateInCurrentMonth(dueDate, currentYear, currentMonth);
  });
  const renewalsDueThisMonthCount = renewalsDueThisMonthPolicies.length;
  const renewalsDueThisMonthVolume = renewalsDueThisMonthPolicies.reduce((sum, p) => sum + (Number(p.premiumAmount) || 0), 0);

  // 4. Overdue Alerts
  const overduePolicies = filteredPolicies.filter(p => p.premiumStatus === "Overdue");

  // 5. Total & Policy Status Counts
  const statusCounts = {
    Paid: filteredPolicies.filter(p => p.premiumStatus === "Paid").length,
    Unpaid: filteredPolicies.filter(p => (p.premiumStatus as any) === "Unpaid" || (p.policyStatus as any) === "Pending" || (p.premiumStatus as any) === "Upcoming").length,
    Overdue: overduePolicies.length,
    Lapsed: filteredPolicies.filter(p => p.premiumStatus === "Lapsed").length,
  };

  const totalPoliciesCount = filteredPolicies.length || 1;

  // 6. Top Companies Premium Contribution
  const companyShare: { [key: string]: number } = {};
  filteredPolicies.forEach(p => {
    if (p.companyName) {
      companyShare[p.companyName] = (companyShare[p.companyName] || 0) + (p.premiumAmount || 0);
    }
  });

  const companySharesArray = Object.entries(companyShare)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

 const totalShareValue = companySharesArray.reduce((sum, item) => sum + item.value, 0) || 1;

  // Sum Assured Distribution (fixed ascending slabs, includes 75L and Unlimited / Above 3 Cr)
  const sumAssuredBuckets = [
    { label: "5L", displayValue: "₹5,00,000", min: 0, max: 500000 },
    { label: "7.5L", displayValue: "₹7,50,000", min: 500000, max: 750000 },
    { label: "10L", displayValue: "₹10,00,000", min: 750000, max: 1000000 },
    { label: "15L", displayValue: "₹15,00,000", min: 1000000, max: 1500000 },
    { label: "20L", displayValue: "₹20,00,000", min: 1500000, max: 2000000 },
    { label: "25L", displayValue: "₹25,00,000", min: 2000000, max: 2500000 },
    { label: "50L", displayValue: "₹50,00,000", min: 2500000, max: 5000000 },
    { label: "75L", displayValue: "₹75,00,000", min: 5000000, max: 7500000 },
    { label: "1Cr", displayValue: "₹1,00,00,000", min: 7500000, max: 10000000 },
    { label: "2Cr", displayValue: "₹2,00,00,000", min: 10000000, max: 20000000 },
    { label: "3Cr", displayValue: "₹3,00,00,000", min: 20000000, max: 30000000 },
    { label: "Above 3Cr", displayValue: "Above ₹3 Cr", min: 30000000, max: Infinity, isUnlimited: true },
  ];

  const totalSumAssuredPolicies = filteredPolicies.filter(p => Number(p.sumAssured) > 0 || p.sumAssuredType === "UNLIMITED" || (p as any).sumAssured === "UNLIMITED").length;

  const sumAssuredDistribution = sumAssuredBuckets.map(bucket => {
    const policiesInBucket = filteredPolicies.filter(p => {
      if ((bucket as any).isUnlimited && (p.sumAssuredType === "UNLIMITED" || (p as any).sumAssured === "UNLIMITED")) {
        return true;
      }
      const sa = Number(p.sumAssured) || 0;
      return sa > bucket.min && sa <= bucket.max;
    });
    const count = policiesInBucket.length;
    const totalPremium = policiesInBucket.reduce((sum, p) => sum + (Number(p.premiumAmount) || 0), 0);
    const percentage = totalSumAssuredPolicies > 0 ? Math.round((count / totalSumAssuredPolicies) * 1000) / 10 : 0;
    return { ...bucket, count, totalPremium, percentage };
  });

  const maxSlabCount = Math.max(...sumAssuredDistribution.map(s => s.count), 1);

  const tenureGroups: Record<string, { numericValue: number; label: string; count: number; totalPremium: number }> = {};

  filteredPolicies.forEach(p => {
    const norm = normalizeTenureValue(p.policyTenure);
    if (!norm) return;
    const key = String(norm.numericValue);
    if (!tenureGroups[key]) {
      tenureGroups[key] = { numericValue: norm.numericValue, label: norm.label, count: 0, totalPremium: 0 };
    }
    tenureGroups[key].count += 1;
    tenureGroups[key].totalPremium += Number(p.premiumAmount) || 0;
  });

// Always show Year 1 to Year 5 on the chart, even if a tenure has 0 policies.
  // Any tenure beyond 5 years found in real data still shows up dynamically (no data is hidden).
  for (let y = 1; y <= 5; y++) {
    const key = String(y);
    if (!tenureGroups[key]) {
      tenureGroups[key] = { numericValue: y, label: `${y} ${y === 1 ? "Year" : "Years"}`, count: 0, totalPremium: 0 };
    }
  }

  const totalTenurePolicies = Object.values(tenureGroups).reduce((sum, g) => sum + g.count, 0);

  const tenureDistribution = Object.values(tenureGroups)
    .sort((a, b) => a.numericValue - b.numericValue)
    .map(g => ({
      ...g,
      percentage: totalTenurePolicies > 0 ? Math.round((g.count / totalTenurePolicies) * 1000) / 10 : 0,
    }));

  const maxTenureCount = Math.max(...tenureDistribution.map(t => t.count), 1);
  // Finance Distribution — Full Payment / Company EMI / Vendor Finance
  // Uses ONLY existing paymentMode + financeType fields, no schema change.
  const financeTotal = filteredPolicies.length;

  const binaFinanceCount = filteredPolicies.filter(
    p => (p.paymentMode || "").trim() === "Direct"
  ).length;

  const companyEmiCount = filteredPolicies.filter(
    p => (p.paymentMode || "").trim() === "Finance/EMI" && (p.financeType || "").trim() === "Company EMI"
  ).length;

  const vendorFinanceCount = filteredPolicies.filter(
    p => (p.paymentMode || "").trim() === "Finance/EMI" && (p.financeType || "").trim() === "Vendor Finance"
  ).length;

  const financeSafeTotal = financeTotal || 1;
  const binaFinancePct = Math.round((binaFinanceCount / financeSafeTotal) * 100);
  const companyEmiPct = Math.round((companyEmiCount / financeSafeTotal) * 100);
  const vendorFinancePct = Math.round((vendorFinanceCount / financeSafeTotal) * 100);

  const financeCircumference = 2 * Math.PI * 40;
  const binaFinanceDash = (binaFinanceCount / financeSafeTotal) * financeCircumference;
  const companyEmiDash = (companyEmiCount / financeSafeTotal) * financeCircumference;
  const vendorFinanceDash = (vendorFinanceCount / financeSafeTotal) * financeCircumference;

  const financeSegments = [
    { key: "bina", label: "Full Payment", count: binaFinanceCount, percentage: binaFinancePct, color: "#10b981", dotClass: "bg-emerald-500" },
    { key: "company", label: "Company EMI", count: companyEmiCount, percentage: companyEmiPct, color: "#f59e0b", dotClass: "bg-amber-500" },
    { key: "vendor", label: "Vendor Finance", count: vendorFinanceCount, percentage: vendorFinancePct, color: "#0ea5e9", dotClass: "bg-sky-500" },
  ];
  // 7. Recent Policy Activity (Latest 5 registered records)
  const recentPolicies = [...filteredPolicies]
    .sort((a, b) => {
      const dateA = a.businessLoginDate || a.createdAt || a.startDate || "";
      const dateB = b.businessLoginDate || b.createdAt || b.startDate || "";
      const timeA = new Date(dateA).getTime() || 0;
      const timeB = new Date(dateB).getTime() || 0;
      return timeB - timeA;
    })
    .slice(0, 5);

  // 8. Upcoming Renewals (Next 5 nearest due dates)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingRenewalsList = [...filteredPolicies]
    .filter(p => {
      const dueDate = p.nextDueDate || p.expiryDate;
      if (!dueDate || p.premiumStatus === "Paid" || p.premiumStatus === "Overdue" || p.premiumStatus === "Lapsed") {
        return false;
      }
      const parsed = parseYearMonthDay(dueDate);
      if (!parsed) return false;
      const due = new Date(parsed.year, parsed.month - 1, parsed.day);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0;
    })
    .map(p => {
      const dueDate = (p.nextDueDate || p.expiryDate)!;
      const parsed = parseYearMonthDay(dueDate)!;
      const due = new Date(parsed.year, parsed.month - 1, parsed.day);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...p, diffDays, displayDueDate: dueDate };
    })
    .sort((a, b) => a.diffDays - b.diffDays)
    .slice(0, 5);

  // Helper StatCard Component (Clean White Card UI)
  const StatCard = ({ title, value, subtext, icon: Icon, colorClass, delay, onClick, isActive }: {
    title: string;
    value: string | number;
    subtext: string;
    icon: React.ElementType;
    colorClass: { text: string; border: string; iconBg: string };
    delay: number;
    onClick?: () => void;
    isActive?: boolean;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: delay * 0.05 }}
      onClick={onClick}
    className={`bg-white border rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all group ${
        onClick ? "cursor-pointer" : "cursor-default"
      } ${
        isActive
          ? "border-[#660000] bg-[#660000]/5 shadow-sm ring-1 ring-[#660000]/40"
          : onClick ? "border-slate-200/90 hover:border-slate-300 hover:shadow-sm" : "border-slate-200/90"
      }`}
    >
      <div className="space-y-1 min-w-0 pr-2">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
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

  return (
    <div className="space-y-6">
      {/* REUSABLE STANDARDIZED DATE & QUICK FILTER BAR */}
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

      {/* OVERVIEW KPI CARDS (6 Cards Grid) */}


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* 1. TOTAL POLICIES */}
        <StatCard
          title="Total Policies"
          value={totalPolicyCount}
          subtext={`₹${totalPolicyVolume.toLocaleString("en-IN")}`}
          icon={Layers}
          colorClass={{
            text: "text-indigo-600",
            border: "border-indigo-200",
            iconBg: "bg-indigo-50",
          }}
          delay={0}
          isActive={isDetailsOpen && selectedStatusFilter === "ALL"}
          onClick={() => handleStatusCardClick("ALL")}
        />

        {/* 2. ISSUED POLICIES */}
        <StatCard
          title="Issued Policies"
          value={issuedPolicyCount}
          subtext={`₹${issuedPolicyVolume.toLocaleString("en-IN")}`}
          icon={CheckCircle}
          colorClass={{
            text: "text-emerald-600",
            border: "border-emerald-200",
            iconBg: "bg-emerald-50",
          }}
          delay={1}
          isActive={isDetailsOpen && selectedStatusFilter === "ISSUED"}
          onClick={() => handleStatusCardClick("ISSUED")}
        />

        {/* 3. PENDING POLICIES */}
        <StatCard
          title="Pending Policies"
          value={pendingPolicyCount}
          subtext={`₹${pendingPolicyVolume.toLocaleString("en-IN")}`}
          icon={Clock}
          colorClass={{
            text: "text-amber-600",
            border: "border-amber-200",
            iconBg: "bg-amber-50",
          }}
          delay={2}
          isActive={isDetailsOpen && selectedStatusFilter === "PENDING"}
          onClick={() => handleStatusCardClick("PENDING")}
        />

        {/* 4. CANCELLED POLICIES */}
        <StatCard
          title="Cancelled Policies"
          value={cancelledPolicyCount}
          subtext={`₹${cancelledPolicyVolume.toLocaleString("en-IN")}`}
          icon={XCircle}
          colorClass={{
            text: "text-rose-600",
            border: "border-rose-200",
            iconBg: "bg-rose-50",
          }}
          delay={3}
          isActive={isDetailsOpen && selectedStatusFilter === "CANCELLED"}
          onClick={() => handleStatusCardClick("CANCELLED")}
        />

      {/* 5. AVERAGE SUM ASSURED */}
        <StatCard
          title="Average Sum Assured"
          value={`₹${overviewKPIs.avgSumAssured.toLocaleString("en-IN")}`}
          subtext="Average insurance coverage per policy"
          icon={Shield}
          colorClass={{
            text: "text-blue-600",
            border: "border-blue-200",
            iconBg: "bg-blue-50",
          }}
          delay={4}
        />

       {/* 6. AVERAGE PREMIUM */}
        <StatCard
          title="Average Premium"
          value={`₹${overviewKPIs.avgPremium.toLocaleString("en-IN")}`}
          subtext="Average premium volume per policy"
          icon={DollarSign}
          colorClass={{
            text: "text-purple-600",
            border: "border-purple-200",
            iconBg: "bg-purple-50",
          }}
          delay={5}
        />
      </div>

      {/* CASHBACK OVERVIEW AREA (3 Separate Cards: Fresh, Port, Renewal) */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#660000]" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Cashback Overview</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* 1. FRESH CASHBACK */}
          <StatCard
            title="Fresh Cashback"
            value={`₹${freshCashbackTotal.toLocaleString("en-IN")}`}
            subtext={`${freshCashbackCount} ${freshCashbackCount === 1 ? "Cashback Policy" : "Cashback Policies"}`}
            icon={DollarSign}
            colorClass={{
              text: "text-teal-700",
              border: "border-teal-200",
              iconBg: "bg-teal-50",
            }}
            delay={6}
          />

          {/* 2. PORT CASHBACK */}
          <StatCard
            title="Port Cashback"
            value={`₹${portCashbackTotal.toLocaleString("en-IN")}`}
            subtext={`${portCashbackCount} ${portCashbackCount === 1 ? "Cashback Policy" : "Cashback Policies"}`}
            icon={DollarSign}
            colorClass={{
              text: "text-sky-700",
              border: "border-sky-200",
              iconBg: "bg-sky-50",
            }}
            delay={7}
          />

          {/* 3. RENEWAL CASHBACK */}
          <StatCard
            title="Renewal Cashback"
            value={`₹${renewalCashbackTotal.toLocaleString("en-IN")}`}
            subtext={`${renewalCashbackCount} ${renewalCashbackCount === 1 ? "Cashback Policy" : "Cashback Policies"}`}
            icon={DollarSign}
            colorClass={{
              text: "text-purple-700",
              border: "border-purple-200",
              iconBg: "bg-purple-50",
            }}
            delay={8}
          />
        </div>
      </div>

      {/* SECOND AREA: GLOBAL STATUS RATIO & TOP COMPANIES CONTRIBUTION */}


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Finance Distribution */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, delay: 0.2 }}
          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs lg:col-span-1 flex flex-col justify-between space-y-5"
        >
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#660000]" />
              Finance Distribution
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mb-4">Policy distribution by payment mode</p>

            <div className="flex items-center justify-center gap-6 py-2">
              <div className="relative w-28 h-28 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="14" />
                  {financeTotal > 0 && (
                    <>
                      <circle
                        cx="50" cy="50" r="40" fill="none"
                        stroke={financeSegments[0].color} strokeWidth="14"
                        strokeDasharray={`${binaFinanceDash} ${financeCircumference}`}
                        strokeDashoffset={0}
                        strokeLinecap="butt"
                        onMouseEnter={() => setHoveredFinanceIdx(0)}
                        onMouseLeave={() => setHoveredFinanceIdx(null)}
                        style={{ cursor: "pointer" }}
                      />
                      <circle
                        cx="50" cy="50" r="40" fill="none"
                        stroke={financeSegments[1].color} strokeWidth="14"
                        strokeDasharray={`${companyEmiDash} ${financeCircumference}`}
                        strokeDashoffset={-binaFinanceDash}
                        strokeLinecap="butt"
                        onMouseEnter={() => setHoveredFinanceIdx(1)}
                        onMouseLeave={() => setHoveredFinanceIdx(null)}
                        style={{ cursor: "pointer" }}
                      />
                      <circle
                        cx="50" cy="50" r="40" fill="none"
                        stroke={financeSegments[2].color} strokeWidth="14"
                        strokeDasharray={`${vendorFinanceDash} ${financeCircumference}`}
                        strokeDashoffset={-(binaFinanceDash + companyEmiDash)}
                        strokeLinecap="butt"
                        onMouseEnter={() => setHoveredFinanceIdx(2)}
                        onMouseLeave={() => setHoveredFinanceIdx(null)}
                        style={{ cursor: "pointer" }}
                      />
                    </>
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-extrabold text-slate-900 font-mono leading-none">{financeTotal}</span>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">Policies</span>
                </div>

                {hoveredFinanceIdx !== null && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-20 w-40 bg-slate-900 text-white rounded-xl shadow-xl p-3 text-[11px] pointer-events-none">
                    <div className="font-bold text-white/60 uppercase text-[9px] tracking-wider mb-1">Finance Status</div>
                    <div className="font-extrabold font-mono mb-2">{financeSegments[hoveredFinanceIdx].label}</div>
                    <div className="flex justify-between mb-1">
                      <span className="text-white/60">Policies</span>
                      <span className="font-bold font-mono">{financeSegments[hoveredFinanceIdx].count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Share</span>
                      <span className="font-bold font-mono">{financeSegments[hoveredFinanceIdx].percentage}%</span>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-slate-900" />
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                {financeSegments.map((seg, idx) => (
                  <div
                    key={seg.key}
                    className="flex items-center gap-2 text-xs cursor-pointer"
                    onMouseEnter={() => setHoveredFinanceIdx(idx)}
                    onMouseLeave={() => setHoveredFinanceIdx(null)}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${seg.dotClass} shrink-0`} />
                    <span className="font-bold text-slate-800">{seg.label}</span>
                    <span className="font-mono font-bold text-slate-600">{seg.count} ({seg.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-500 font-normal flex items-center gap-2">
            <RefreshCcw className="w-4 h-4 text-[#660000] shrink-0" />
            <span>Synchronized dynamically with Policy Ledger records.</span>
          </div>
        </motion.div>

        {/* Top Companies Premium Contribution */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, delay: 0.3 }}
          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs lg:col-span-2 flex flex-col justify-between space-y-5"
        >
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#660000]" />
              TOP COMPANIES PREMIUM CONTRIBUTION
            </h3>

            {companySharesArray.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs font-normal italic">
                No active policies yet to compute company contribution.
              </div>
            ) : (
              <div className="space-y-4">
                {companySharesArray.map((item, idx) => {
                  const percent = Math.round((item.value / totalShareValue) * 100);
                  const colors = [
                    "bg-[#660000]",
                    "bg-[#DFBFBA]",
                    "bg-sky-500",
                    "bg-indigo-500",
                    "bg-purple-500"
                  ];
                  return (
                    <div key={item.name} className="flex items-center gap-4">
                      <span className="w-32 text-xs font-semibold text-slate-800 truncate" title={item.name}>{item.name}</span>
                      <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden flex">
                        <div
                          className={`${colors[idx % colors.length]} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-36 text-right text-xs font-semibold text-slate-900 font-mono">
                        ₹{item.value.toLocaleString("en-IN")} ({percent}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-xs text-slate-500 font-normal">
            <span>Total Insured Records: <strong className="text-slate-900 font-semibold font-mono">{filteredPolicies.length}</strong></span>
            <span>Monthly Renewals Volume: <strong className="text-purple-700 font-bold font-mono">₹{renewalsDueThisMonthVolume.toLocaleString("en-IN")}</strong></span>
          </div>
        </motion.div>
      </div>

          {/* ANALYTICS ROW: SUM ASSURED + PRODUCT MIX SIDE BY SIDE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">


      {/* SUM ASSURED DISTRIBUTION HISTOGRAM */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.4 }}
        className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs"
      >
        <div className="mb-5">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#660000]" />
            Sum Assured Distribution
          </h3>


          <p className="text-[11px] text-slate-500 font-medium mt-1">Policy Count by Sum Assured Slabs</p>
        </div>

        {totalSumAssuredPolicies === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs font-normal italic">
            No Sum Assured data available.
          </div>
        ) : (
          <div className="relative">
            <div
              className="flex items-end justify-between gap-2 sm:gap-3 h-56 border-b border-slate-200 relative"
              style={{
                backgroundImage: "repeating-linear-gradient(to top, transparent, transparent calc(25% - 1px), #f1f5f9 25%)"
              }}
            >
              {sumAssuredDistribution.map((slab, idx) => {
                const heightPct = (slab.count / maxSlabCount) * 100;
                const rainbowColors = [
                  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
                  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef"
                ];
                const barColor = rainbowColors[idx % rainbowColors.length];
                return (
                  <div
                    key={slab.label}
                    className="flex-1 h-full flex flex-col justify-end items-center relative"
                    onMouseEnter={() => setHoveredSlabIdx(idx)}
                    onMouseLeave={() => setHoveredSlabIdx(null)}
                    onClick={() => setHoveredSlabIdx(hoveredSlabIdx === idx ? null : idx)}
                  >
                    {hoveredSlabIdx === idx && (
                      <div className="absolute bottom-full mb-2 z-20 w-40 bg-slate-900 text-white rounded-xl shadow-xl p-3 text-[11px] pointer-events-none">
                        <div className="font-bold text-white/60 uppercase text-[9px] tracking-wider mb-1">Sum Assured</div>
                        <div className="font-extrabold font-mono mb-2">{slab.displayValue}</div>
                        <div className="flex justify-between mb-1">
                          <span className="text-white/60">Policies</span>
                          <span className="font-bold font-mono">{slab.count}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span className="text-white/60">Portfolio Share</span>
                          <span className="font-bold font-mono">{slab.percentage}%</span>
                        </div>
                        {slab.totalPremium > 0 && (
                          <div className="flex justify-between">
                            <span className="text-white/60">Total Premium</span>
                            <span className="font-bold font-mono">₹{slab.totalPremium.toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-slate-900" />
                      </div>
                    )}
                   {slab.count > 0 && (
                      <span className="text-[10px] font-bold text-slate-600 font-mono mb-1">
                        {slab.percentage}%
                      </span>
                    )}
                   <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.04, ease: "easeOut" }}
                      className="w-full max-w-[36px] rounded-t-lg hover:opacity-80 transition-opacity cursor-pointer"
                      style={{ minHeight: slab.count > 0 ? 4 : 0, backgroundColor: barColor }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-2 sm:gap-3 mt-2">
              {sumAssuredDistribution.map(slab => (
                <span key={slab.label} className="flex-1 text-center text-[10px] font-semibold text-slate-500 font-mono">
                  {slab.label}
                </span>
              ))}
            </div>
            <div className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-3">
              Number of Policies
            </div>
          </div>
        )}
      </motion.div>

     {/* POLICY TENURE MIX (True Pie Chart with in-slice labels) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.45 }}
        className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs"
      >
        <div className="mb-5">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#660000]" />
            Policy Tenure Mix
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Policy distribution by tenure</p>
        </div>

        {(() => {
          const tenurePieData = tenureDistribution.filter(t => t.count > 0);
          const tenurePieTotal = tenurePieData.reduce((sum, t) => sum + t.count, 0);
          const tenurePieSafeTotal = tenurePieTotal || 1;
         const tenureColors = [
            "#f5c518", "#84cc16", "#ec1e79", "#22c1e8", "#6b7280",
            "#f97316", "#a855f7", "#06b6d4", "#65a30d", "#e11d48"
          ];

          if (tenurePieData.length === 0) {
            return (
              <div className="text-center py-10 text-slate-400 text-xs font-normal italic">
                No policy tenure data available.
              </div>
            );
          }

          const cx = 50, cy = 50, r = 48;
          let cumulativeAngle = -90;

          const polarToCartesian = (angleDeg: number, radius: number) => {
            const rad = (angleDeg * Math.PI) / 180;
            return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
          };

          const tenureSlices = tenurePieData.map((t, idx) => {
            const percentage = Math.round((t.count / tenurePieSafeTotal) * 1000) / 10;
            const sweepAngle = (t.count / tenurePieSafeTotal) * 360;
            const startAngle = cumulativeAngle;
            const endAngle = cumulativeAngle + sweepAngle;
            const midAngle = startAngle + sweepAngle / 2;
            cumulativeAngle = endAngle;

            const start = polarToCartesian(startAngle, r);
            const end = polarToCartesian(endAngle, r);
            const largeArcFlag = sweepAngle > 180 ? 1 : 0;

            const isFullCircle = tenurePieData.length === 1;
            const path = isFullCircle
              ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
              : `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;

            // Position label roughly at 60% radius along the slice's middle angle
            const labelPos = polarToCartesian(midAngle, r * 0.6);

          return {
              label: t.label,
              count: t.count,
              percentage,
              totalPremium: t.totalPremium,
              color: tenureColors[idx % tenureColors.length],
              path,
              labelX: labelPos.x,
              labelY: labelPos.y,
              sweepAngle
            };
          });

          return (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
              <div className="relative w-52 h-52 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {tenureSlices.map((seg, idx) => (
                    <g key={seg.label}>
                      <path
                        d={seg.path}
                        fill={seg.color}
                        stroke="#ffffff"
                        strokeWidth="1"
                        onMouseEnter={() => setHoveredTenureIdx(idx)}
                        onMouseLeave={() => setHoveredTenureIdx(null)}
                        style={{ cursor: "pointer" }}
                      />
                      {seg.sweepAngle > 12 && (
                        <text
                          x={seg.labelX}
                          y={seg.labelY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="9"
                          fontWeight="800"
                          fill="#ffffff"
                          style={{ pointerEvents: "none" }}
                        >
                          {seg.count}
                        </text>
                      )}
                    </g>
                  ))}
                </svg>

                {hoveredTenureIdx !== null && tenureSlices[hoveredTenureIdx] && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-20 w-44 bg-slate-900 text-white rounded-xl shadow-xl p-3 text-[11px] pointer-events-none">
                    <div className="font-bold text-white/60 uppercase text-[9px] tracking-wider mb-1">Policy Tenure</div>
                    <div className="font-extrabold font-mono mb-2">{tenureSlices[hoveredTenureIdx].label}</div>
                    <div className="flex justify-between mb-1">
                      <span className="text-white/60">Policies</span>
                      <span className="font-bold font-mono">{tenureSlices[hoveredTenureIdx].count}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-white/60">Share</span>
                      <span className="font-bold font-mono">{tenureSlices[hoveredTenureIdx].percentage}%</span>
                    </div>
                    {tenureSlices[hoveredTenureIdx].totalPremium > 0 && (
                      <div className="flex justify-between">
                        <span className="text-white/60">Total Premium</span>
                        <span className="font-bold font-mono">₹{tenureSlices[hoveredTenureIdx].totalPremium.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-slate-900" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {tenureSlices.map((seg, idx) => (
                  <div
                    key={seg.label}
                    className="flex items-center gap-2 text-xs cursor-pointer"
                    onMouseEnter={() => setHoveredTenureIdx(idx)}
                    onMouseLeave={() => setHoveredTenureIdx(null)}
                  >
                    <span className="w-3.5 h-3.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className="font-bold text-slate-800">{seg.label}</span>
                    <span className="font-mono font-bold text-slate-600">{seg.count} ({seg.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </motion.div>

       </div>



      {/* ═══════════════════════════════════════════════════════════ */}
      {/* POLICY DETAILS SECTION — opens inline when a card is clicked */}
      {/* ═══════════════════════════════════════════════════════════ */}

     <motion.div
        ref={detailsSectionRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden"
      >
        {!isDetailsOpen ? (
          <div className="p-10 text-center">
            <Info className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-xs font-semibold">
              Select any dashboard card above to view detailed policy records.
            </p>
          </div>
        ) : (
          <>

            {/* Table */}
            {detailsTableData.length === 0 ? (
              <div className="p-10 text-center">
                <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-xs font-semibold">{getEmptyStateMessage()}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 text-center w-14 shrink-0">S.No.</th>
                    <th className="py-3 px-4">Customer Name</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Product Name</th>
                        <th className="py-3 px-4">Policy Tenure</th>
                        <th className="py-3 px-4">Business Login Date</th>
                        <th className="py-3 px-4 text-right">Sum Assured</th>
                        <th className="py-3 px-4 text-right">Premium</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                   <tbody className="divide-y divide-slate-100 font-medium">
                      {detailsPaginated.map((p, idx) => {
                        const bType = (p.businessType || "").toUpperCase();
                        const bSubtype = (p.businessSubtype || (p as any).businessSubtype || "").toUpperCase();
                        const typeText = bType === "RENEWAL" ? "Renewal" : (bType === "PORT" || bSubtype === "PORT") ? "Port" : "Fresh";

                        // Calculate Serial Number based on current page & position
                        const serialNumber = (detailsPage - 1) * PAGE_SIZE + idx + 1;
                        const serialNumberDisplay = String(serialNumber).padStart(2, "0");

                        return (
                        <tr key={p.id || p.policyNumber} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-600 text-xs w-14 shrink-0">
                            {serialNumberDisplay}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{p.customerName}</td>
                          <td className="py-3 px-4 text-slate-700">{typeText}</td>
                          <td className="py-3 px-4 text-slate-700">{getProductNameDisplay(p)}</td>
                          <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{p.policyTenure ? `${p.policyTenure} Yr` : "—"}</td>
                          <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                            {formatDateDisplay(p.businessLoginDate || p.startDate)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-900 font-mono">
                            {formatSumAssuredDisplay(p.sumAssured, (p as any).sumAssuredType)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-900 font-mono">
                            ₹{p.premiumAmount.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {getStatusDisplay(p)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => openPolicyDetailPDF(p, companyDisplayName)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1 ml-auto"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </button>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Showing {(detailsPage - 1) * PAGE_SIZE + 1}–{Math.min(detailsPage * PAGE_SIZE, detailsTableData.length)} of {detailsTableData.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={detailsPage <= 1}
                      onClick={() => setDetailsPage(p => Math.max(1, p - 1))}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>
                    <span className="text-xs font-semibold text-slate-700 font-mono">
                      Page {detailsPage} of {detailsTotalPages}
                    </span>
                    <button
                      type="button"
                      disabled={detailsPage >= detailsTotalPages}
                      onClick={() => setDetailsPage(p => Math.min(detailsTotalPages, p + 1))}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}