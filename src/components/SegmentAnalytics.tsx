import React, { useState, useEffect } from "react";
import { Policy, formatSumAssuredDisplay } from "../types";
import { calculatePolicyMetrics, computeModuleKPIs } from "../lib/metrics";
import { fetchAgencyProfile } from "../lib/api";
import { 
  Shield, Building2, TrendingUp, DollarSign, Award, PieChart, Users, CheckCircle, Clock, AlertTriangle, Download, RefreshCcw, XCircle, Layers
} from "lucide-react";

import { motion } from "motion/react";

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

interface SegmentAnalyticsProps {
  segment: "new_business" | "fresh" | "port" | "renewal";
  policies: Policy[];
  onNavigateToLedger?: (filterType: string) => void;
}

export default function SegmentAnalytics({ segment, policies, onNavigateToLedger }: SegmentAnalyticsProps) {
  const metrics = calculatePolicyMetrics(policies);
  const [companyDisplayName, setCompanyDisplayName] = useState("Policy Master");

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

const [activeSegmentKey, setActiveSegmentKey] = useState<string>("");
  const [activeFilterKey, setActiveFilterKey] = useState<string>("");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsSearch, setDetailsSearch] = useState("");
  const [detailsCompany, setDetailsCompany] = useState("All");
  const [detailsPolicyType, setDetailsPolicyType] = useState("All");
  const [detailsPage, setDetailsPage] = useState(1);
  const DETAILS_PAGE_SIZE = 10;

  const [hoveredSlabIdx, setHoveredSlabIdx] = useState<number | null>(null);

  const [hoveredTenureIdx, setHoveredTenureIdx] = useState<number | null>(null);
  const [hoveredFinanceIdx, setHoveredFinanceIdx] = useState<number | null>(null);

  const handleCardClick = (segmentKey: string, filterKey: string) => {
    setActiveSegmentKey(segmentKey);
    setActiveFilterKey(filterKey);
    setIsDetailsOpen(true);
    setDetailsPage(1);
  };

  const getStatusFilteredList = (list: Policy[], filterKey: string) => {
    if (filterKey === "all") return list;
    return list.filter(p => (p.policyStatus || "Issued").trim() === filterKey);
  };

const renderDetailsSection = (segmentKey: string, segmentPolicies: Policy[], segmentLabel: string) => {
    if (activeSegmentKey !== segmentKey || !isDetailsOpen) {
      return (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-10 text-center">
            <AlertTriangle className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-xs font-semibold">
              Select any dashboard card above to view detailed policy records.
            </p>
          </div>
        </div>
      );
    }
    const filterLabelMap: Record<string, string> = {
      all: `Total ${segmentLabel} Policies`,
      Issued: "Issued Policies",
      Pending: "Pending Policies",
      Cancelled: "Cancelled Policies"
    };

    const statusFiltered = getStatusFilteredList(segmentPolicies, activeFilterKey);
    const companyOptions = Array.from(new Set(segmentPolicies.map(p => p.companyName).filter(Boolean))).sort();
    const typeOptions = Array.from(new Set(segmentPolicies.map(p => p.policyType).filter(Boolean))).sort();

    const q = detailsSearch.trim().toLowerCase();
    const tableData = statusFiltered.filter(p => {
      const matchesSearch = !q ||
        (p.customerName || "").toLowerCase().includes(q) ||
        (p.policyNumber || "").toLowerCase().includes(q) ||
        (p.customerPhone || "").toLowerCase().includes(q);
      const matchesCompany = detailsCompany === "All" || p.companyName === detailsCompany;
      const matchesType = detailsPolicyType === "All" || p.policyType === detailsPolicyType;
      return matchesSearch && matchesCompany && matchesType;
    });

    const totalPages = Math.max(1, Math.ceil(tableData.length / DETAILS_PAGE_SIZE));
    const paginated = tableData.slice((detailsPage - 1) * DETAILS_PAGE_SIZE, detailsPage * DETAILS_PAGE_SIZE);

    const exportDetailsExcel = () => exportSegmentCsv(filterLabelMap[activeFilterKey] || segmentLabel, tableData);

    const exportDetailsPdf = () => {
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
      const rows = tableData.map(p => `
        <tr style="border-bottom:1px solid #e2e8f0;font-size:12px;">
          <td style="padding:8px;">${p.policyNumber || "N/A"}</td>
          <td style="padding:8px;"><strong>${p.customerName}</strong></td>
          <td style="padding:8px;">${p.companyName}</td>
          <td style="padding:8px;">${p.policyType || p.productName || "—"}</td>
          <td style="padding:8px;text-align:right;font-weight:bold;">INR ${p.premiumAmount.toLocaleString("en-IN")}</td>
          <td style="padding:8px;">${p.policyStatus || "Pending"}</td>
          <td style="padding:8px;">${formatDate(p.businessLoginDate || p.startDate)}</td>
          <td style="padding:8px;">${formatDate(p.nextDueDate || p.expiryDate)}</td>
        </tr>
      `).join("");
      printWindow.document.write(`
        <html><head><title>${filterLabelMap[activeFilterKey]}</title>
        <style>body{font-family:'Segoe UI',sans-serif;color:#1e293b;padding:30px;}
        h1{font-size:20px;margin-bottom:5px;} p{margin:0 0 20px 0;font-size:12px;color:#64748b;}
        table{width:100%;border-collapse:collapse;} th{background:#f1f5f9;color:#475569;text-align:left;padding:10px 8px;border-bottom:2px solid #e2e8f0;font-size:11px;}</style>
        </head><body>
        <h1>${filterLabelMap[activeFilterKey]} — ${segmentLabel}</h1>
        <p>Generated on ${new Date().toLocaleString("en-IN")} • ${tableData.length} records</p>
        <table><thead><tr><th>Policy No</th><th>Customer</th><th>Company</th><th>Type</th><th style="text-align:right;">Premium</th><th>Status</th><th>Issue Date</th><th>Renewal Date</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="8" style="text-align:center;padding:20px;color:#64748b;">No records found.</td></tr>'}</tbody></table>
        <script>window.onload=function(){window.print();window.close();}</script>
        </body></html>
      `);
      printWindow.document.close();
    };

    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {tableData.length === 0 ? (
          <div className="p-10 text-center">
            <AlertTriangle className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-xs font-semibold">No {filterLabelMap[activeFilterKey] || segmentLabel} found.</p>
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
                  {paginated.map((p, idx) => {
                    const bType = (p.businessType || "").toUpperCase();
                    const bSubtype = (p.businessSubtype || (p as any).businessSubtype || "").toUpperCase();
                    const typeText = bType === "RENEWAL" ? "Renewal" : (bType === "PORT" || bSubtype === "PORT") ? "Port" : "Fresh";
                    
                    // Calculate Serial Number based on current page & position
                    const serialNumber = (detailsPage - 1) * DETAILS_PAGE_SIZE + idx + 1;
                    const serialNumberDisplay = String(serialNumber).padStart(2, "0");
                    
                    return (
                    <tr key={p.id || p.policyNumber} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-600 text-xs w-14 shrink-0">
                        {serialNumberDisplay}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{p.customerName}</td>
                      <td className="py-3 px-4 text-slate-700">{typeText}</td>
                      <td className="py-3 px-4 text-slate-700">{p.productName || p.policyType || "—"}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{p.policyTenure ? `${p.policyTenure} Yr` : "—"}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{formatDate(p.businessLoginDate || p.startDate)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900 font-mono">
                        {formatSumAssuredDisplay(p.sumAssured, (p as any).sumAssuredType)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900 font-mono">₹{p.premiumAmount.toLocaleString("en-IN")}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {p.policyStatus || ""}
                        </span>
                      </td>
                   <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openPolicyDetailPDF(p, companyDisplayName)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer"
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
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                Showing {(detailsPage - 1) * DETAILS_PAGE_SIZE + 1}–{Math.min(detailsPage * DETAILS_PAGE_SIZE, tableData.length)} of {tableData.length}
              </span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={detailsPage <= 1} onClick={() => setDetailsPage(pg => Math.max(1, pg - 1))} className="p-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer">‹</button>
                <span className="text-xs font-semibold text-slate-700 font-mono">Page {detailsPage} of {totalPages}</span>
                <button type="button" disabled={detailsPage >= totalPages} onClick={() => setDetailsPage(pg => Math.min(totalPages, pg + 1))} className="p-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer">›</button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

const renderFinanceDistributionCard = (scopedPolicies: Policy[]) => {
    const financeTotal = scopedPolicies.length;
    const fullPaymentCount = scopedPolicies.filter(p => (p.paymentMode || "").trim() === "Direct").length;
    const companyEmiCount = scopedPolicies.filter(p => (p.paymentMode || "").trim() === "Finance/EMI" && (p.financeType || "").trim() === "Company EMI").length;
    const vendorFinanceCount = scopedPolicies.filter(p => (p.paymentMode || "").trim() === "Finance/EMI" && (p.financeType || "").trim() === "Vendor Finance").length;

    const financeSafeTotal = financeTotal || 1;
    const fullPaymentPct = Math.round((fullPaymentCount / financeSafeTotal) * 100);
    const companyEmiPct = Math.round((companyEmiCount / financeSafeTotal) * 100);
    const vendorFinancePct = Math.round((vendorFinanceCount / financeSafeTotal) * 100);

    const financeCircumference = 2 * Math.PI * 40;
    const fullPaymentDash = (fullPaymentCount / financeSafeTotal) * financeCircumference;
    const companyEmiDash = (companyEmiCount / financeSafeTotal) * financeCircumference;
    const vendorFinanceDash = (vendorFinanceCount / financeSafeTotal) * financeCircumference;

    const financeSegments = [
      { key: "full", label: "Full Payment", count: fullPaymentCount, percentage: fullPaymentPct, color: "#10b981", dotClass: "bg-emerald-500" },
      { key: "company", label: "Company EMI", count: companyEmiCount, percentage: companyEmiPct, color: "#f59e0b", dotClass: "bg-amber-500" },
      { key: "vendor", label: "Vendor Finance", count: vendorFinanceCount, percentage: vendorFinancePct, color: "#0ea5e9", dotClass: "bg-sky-500" },
    ];

    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
        <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#660000]" />
          Finance Distribution
        </h3>
        <p className="text-[11px] text-slate-500 font-medium mt-1 mb-3">Policy distribution by payment mode</p>

        <div className="flex items-center justify-center gap-6 py-2">
          <div className="relative w-28 h-28 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="14" />
              {financeTotal > 0 && (
                <>
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={financeSegments[0].color} strokeWidth="14"
                    strokeDasharray={`${fullPaymentDash} ${financeCircumference}`}
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
                    strokeDashoffset={-fullPaymentDash}
                    strokeLinecap="butt"
                    onMouseEnter={() => setHoveredFinanceIdx(1)}
                    onMouseLeave={() => setHoveredFinanceIdx(null)}
                    style={{ cursor: "pointer" }}
                  />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={financeSegments[2].color} strokeWidth="14"
                    strokeDasharray={`${vendorFinanceDash} ${financeCircumference}`}
                    strokeDashoffset={-(fullPaymentDash + companyEmiDash)}
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
                <div className="font-bold text-white/60 uppercase text-[9px] tracking-wider mb-1">Payment Mode</div>
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
    );
  };
const fmtCurrency = (val: number) => `₹${val.toLocaleString("en-IN")}`;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const parts = dateStr.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const formatDateLong = (dateStr?: string) => {
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
  };

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
            ${row("Issue Date", formatDateLong(p.businessLoginDate || p.startDate))}
            ${row("Renewal / Due Date", formatDateLong(p.nextDueDate || p.expiryDate))}
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
            ${row("Date of Birth", formatDateLong(p.customerBirthday))}
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
              ${row("EMI Start Date", formatDateLong(p.emiStartDate))}
            </table>
          ` : ""}

          ${p.portabilityDetails?.previousInsuranceCompany ? `
            ${sectionTitle("Portability Details")}
            <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
              ${row("Previous Insurance Company", p.portabilityDetails.previousInsuranceCompany)}
              ${row("Previous Policy Number", p.portabilityDetails.previousPolicyNumber)}
              ${row("Previous Product", p.portabilityDetails.previousProductName)}
              ${row("Previous Policy Expiry", formatDateLong(p.portabilityDetails.previousPolicyExpiryDate))}
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
                <span class="status-badge">${p.policyStatus || "Pending"}</span>
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

  const sanitizeCsvCell = (val: any): string => {
    if (val == null) return '""';
    let str = String(val).trim();
    if (/^[=+\-@\t\r]/.test(str)) str = "'" + str;
    return `"${str.replace(/"/g, '""')}"`;
  };

  const exportSegmentCsv = (segName: string, policyList: Policy[]) => {
    if (policyList.length === 0) {
      alert(`No ${segName} policy data available to export.`);
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const filename = `${segName}_Business_Report_${todayStr}.csv`;

    let csv = "\uFEFF";
    csv += `${(companyDisplayName || "POLICY MASTER").toUpperCase()} — ${segName.toUpperCase()} BUSINESS REPORT\n`;
    csv += `Generated On: ${new Date().toLocaleString("en-IN")}\n`;
    csv += `Total ${segName} Records: ${policyList.length}\n\n`;

    csv += "Policy Number,Customer Name,Customer Phone,Customer Email,Insurance Company,Product Name,Business Type,Premium Amount,Policy Status,Login Date\n";

    policyList.forEach(p => {
      const row = [
        sanitizeCsvCell(p.policyNumber),
        sanitizeCsvCell(p.customerName),
        sanitizeCsvCell(p.customerPhone),
        sanitizeCsvCell(p.customerEmail),
        sanitizeCsvCell(p.companyName),
        sanitizeCsvCell(p.productName || p.policyType || ""),
        sanitizeCsvCell(p.businessType || segName.toUpperCase()),
        sanitizeCsvCell(p.premiumAmount || 0),
        sanitizeCsvCell(p.policyStatus || "Pending"),
        sanitizeCsvCell(p.businessLoginDate || p.startDate || "")
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

  // ── 1. COMBINED NEW BUSINESS OVERVIEW (FRESH + PORT) ────────────────────────
  if (segment === "new_business") {
    const topCompany = metrics.freshCompanyContributions[0]?.companyName || "N/A";
    const recentNewBusiness = [...metrics.newBusinessPolicies].slice(0, 8);
    const avgNewBizPremium = metrics.newBusinessCount > 0 ? Math.round(metrics.newBusinessVolume / metrics.newBusinessCount) : 0;

    // Status breakdowns for New Business (Fresh + Port)
    const kpi = computeModuleKPIs(metrics.newBusinessPolicies);

    return (
      <div className="space-y-6">
        {/* New Business Metric Cards (2 Rows of 3 Cards Each = 6 Cards Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Row 1 - 1. Total New Business Policies */}
          <div
            onClick={() => handleCardClick("new_business", "all")}
            className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all cursor-pointer hover:border-slate-300 hover:shadow-sm group"
          >
            <div className="space-y-1 min-w-0 pr-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total New Business Policies
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
                {kpi.totalCount}
              </span>
              <span className="text-[11px] font-medium text-slate-500 block truncate font-mono">
                {fmtCurrency(kpi.totalVolume)}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className="w-9 h-9 bg-indigo-50 text-indigo-600 border-indigo-200 border rounded-xl flex items-center justify-center shadow-2xs">
                <Layers className="w-4.5 h-4.5 stroke-[2]" />
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[10px] font-bold text-emerald-700 font-mono whitespace-nowrap">
                  Fresh: {metrics.freshCount}
                </span>
                <span className="text-[10px] font-bold text-indigo-700 font-mono whitespace-nowrap">
                  Port: {metrics.portCount}
                </span>
              </div>
            </div>
          </div>



          {/* Row 1 - 2. Issued Policies */}
          <div
            onClick={() => handleCardClick("new_business", "Issued")}
            className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all cursor-pointer hover:border-slate-300 hover:shadow-sm group"
          >
            <div className="space-y-1 min-w-0 pr-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Issued Policies
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
                {kpi.issuedCount}
              </span>
              <span className="text-[11px] font-medium text-slate-500 block truncate font-mono">
                {fmtCurrency(kpi.issuedVolume)}
              </span>
            </div>
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 border-emerald-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <CheckCircle className="w-4.5 h-4.5 stroke-[2]" />
            </div>
          </div>

          {/* Row 1 - 3. Pending Policies */}
          <div
            onClick={() => handleCardClick("new_business", "Pending")}
            className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all cursor-pointer hover:border-slate-300 hover:shadow-sm group"
          >
            <div className="space-y-1 min-w-0 pr-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Pending Policies
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
                {kpi.pendingCount}
              </span>
              <span className="text-[11px] font-medium text-slate-500 block truncate font-mono">
                {fmtCurrency(kpi.pendingVolume)}
              </span>
            </div>
            <div className="w-9 h-9 bg-amber-50 text-amber-600 border-amber-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <Clock className="w-4.5 h-4.5 stroke-[2]" />
            </div>
          </div>

          {/* Row 2 - 1. Cancelled Policies */}
          <div
            onClick={() => handleCardClick("new_business", "Cancelled")}
            className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all cursor-pointer hover:border-slate-300 hover:shadow-sm group"
          >
            <div className="space-y-1 min-w-0 pr-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Cancelled Policies
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
                {kpi.cancelledCount}
              </span>
              <span className="text-[11px] font-medium text-slate-500 block truncate font-mono">
                {fmtCurrency(kpi.cancelledVolume)}
              </span>
            </div>
            <div className="w-9 h-9 bg-rose-50 text-rose-600 border-rose-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <XCircle className="w-4.5 h-4.5 stroke-[2]" />
            </div>
          </div>

          {/* Row 2 - 2. Average Sum Assured */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all hover:border-slate-300 hover:shadow-sm group">
            <div className="space-y-1 min-w-0 pr-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Average Sum Assured
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
                {fmtCurrency(kpi.avgSumAssured)}
              </span>
              <span className="text-[11px] font-medium text-slate-500 block truncate">
                Average insurance coverage per policy
              </span>
            </div>
            <div className="w-9 h-9 bg-blue-50 text-blue-600 border-blue-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <Shield className="w-4.5 h-4.5 stroke-[2]" />
            </div>
          </div>

          {/* Row 2 - 3. Average Premium */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all hover:border-slate-300 hover:shadow-sm group">
            <div className="space-y-1 min-w-0 pr-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Average Premium
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
                {fmtCurrency(kpi.avgPremium)}
              </span>
              <span className="text-[11px] font-medium text-slate-500 block truncate">
                Per new policy average
              </span>
            </div>
            <div className="w-9 h-9 bg-purple-50 text-purple-600 border-purple-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <TrendingUp className="w-4.5 h-4.5 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* Breakdown Cards Row 1: Fresh vs Port + Finance Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600" />
              Fresh vs Port Breakdown
            </h3>
            {(() => {
              const fTotal = metrics.freshCount + metrics.portCount || 1;
              const fPct = Math.round((metrics.freshCount / fTotal) * 100);
              const pPct = 100 - fPct;
              const circumference = 2 * Math.PI * 40;
              const freshDash = (fPct / 100) * circumference;
              return (
                <div className="flex items-center justify-center gap-8 py-2">
                  <div className="relative w-28 h-28 shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="14" />
                      <circle
                        cx="50" cy="50" r="40" fill="none"
                        stroke="#10b981" strokeWidth="14"
                        strokeDasharray={`${freshDash} ${circumference}`}
                        strokeLinecap="round"
                      />
                     <circle
                        cx="50" cy="50" r="40" fill="none"
                        stroke="#eab308" strokeWidth="14"
                        strokeDasharray={`${circumference - freshDash} ${circumference}`}
                        strokeDashoffset={-freshDash}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-extrabold text-slate-900 font-mono leading-none">{fTotal - (metrics.freshCount + metrics.portCount === 0 ? 1 : 0)}</span>
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">Policies</span>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-bold text-slate-800">Fresh</span>
                      <span className="font-mono font-bold text-slate-600">{metrics.freshCount} ({fPct}%)</span>
                    </div>
                   <div className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shrink-0" />
                      <span className="font-bold text-slate-800">Port</span>
                      <span className="font-mono font-bold text-slate-600">{metrics.portCount} ({pPct}%)</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {renderFinanceDistributionCard(metrics.newBusinessPolicies)}
        </div>

        {/* TOP COMPANIES PREMIUM CONTRIBUTION (full width) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
          <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-red-600" />
            Top Companies Premium Contribution
          </h3>
          <div className="space-y-2.5">
            {metrics.freshCompanyContributions.slice(0, 5).map((c, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{c.companyName}</span>
                  <span className="font-mono font-bold text-slate-600">{fmtCurrency(c.volume)} ({c.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-red-500 h-full rounded-full" style={{ width: `${c.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SUM ASSURED DISTRIBUTION + PRODUCT MIX ON POLICY TENURE (New Business scoped) */}
        {(() => {
          const nbPolicies = metrics.newBusinessPolicies;

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

          const totalSumAssuredPolicies = nbPolicies.filter(p => Number(p.sumAssured) > 0 || p.sumAssuredType === "UNLIMITED" || (p as any).sumAssured === "UNLIMITED").length;

          const sumAssuredDistribution = sumAssuredBuckets.map(bucket => {
            const policiesInBucket = nbPolicies.filter(p => {
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
          nbPolicies.forEach(p => {
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

          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SUM ASSURED DISTRIBUTION */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.1 }}
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

              {/* POLICY TENURE MIX (True Pie Chart) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.15 }}
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
          );
        })()}

        {renderDetailsSection("new_business", metrics.newBusinessPolicies, "New Business")}
      </div>
    );
  }

  // ── 2. FRESH BUSINESS MODULE ───────────────────────────────────────────────
  if (segment === "fresh") {
    const topCompany = metrics.freshCompanyContributions[0]?.companyName || "N/A";
    const recentFresh = [...metrics.freshPolicies].slice(0, 5);

    // Status breakdowns for Fresh policies
    const kpi = computeModuleKPIs(metrics.freshPolicies);

    return (
      <div className="space-y-6">
        {/* Fresh Metric Cards (2 Rows of 3 Cards Each = 6 Cards Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Row 1 - 1. Total Fresh Policies */}
          <div
            onClick={() => handleCardClick("fresh", "all")}
            className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all cursor-pointer hover:border-slate-300 hover:shadow-sm group"
          >
            <div className="space-y-1 min-w-0 pr-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Fresh Policies
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
                {kpi.totalCount}
              </span>
              <span className="text-[11px] font-medium text-slate-500 block truncate font-mono">
                {fmtCurrency(kpi.totalVolume)}
              </span>
            </div>
            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 border-indigo-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <Layers className="w-4.5 h-4.5 stroke-[2]" />
            </div>
          </div>

          {/* Row 1 - 2. Issued Policies */}
          <div
            onClick={() => handleCardClick("fresh", "Issued")}
            className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all cursor-pointer hover:border-slate-300 hover:shadow-sm group"
          >
            <div className="space-y-1 min-w-0 pr-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Issued Policies
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
                {kpi.issuedCount}
              </span>
              <span className="text-[11px] font-medium text-slate-500 block truncate font-mono">
                {fmtCurrency(kpi.issuedVolume)}
              </span>
            </div>
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 border-emerald-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <CheckCircle className="w-4.5 h-4.5 stroke-[2]" />
            </div>
          </div>

          {/* Row 1 - 3. Pending Policies */}
          <div
            onClick={() => handleCardClick("fresh", "Pending")}
            className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all cursor-pointer hover:border-slate-300 hover:shadow-sm group"
          >
            <div className="space-y-1 min-w-0 pr-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Pending Policies
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
                {kpi.pendingCount}
              </span>
              <span className="text-[11px] font-medium text-slate-500 block truncate font-mono">
                {fmtCurrency(kpi.pendingVolume)}
              </span>
            </div>
            <div className="w-9 h-9 bg-amber-50 text-amber-600 border-amber-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <Clock className="w-4.5 h-4.5 stroke-[2]" />
            </div>
          </div>

          {/* Row 2 - 1. Cancelled Policies */}
          <div
            onClick={() => handleCardClick("fresh", "Cancelled")}
            className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all cursor-pointer hover:border-slate-300 hover:shadow-sm group"
          >
            <div className="space-y-1 min-w-0 pr-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Cancelled Policies
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
                {kpi.cancelledCount}
              </span>
              <span className="text-[11px] font-medium text-slate-500 block truncate font-mono">
                {fmtCurrency(kpi.cancelledVolume)}
              </span>
            </div>
            <div className="w-9 h-9 bg-rose-50 text-rose-600 border-rose-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <XCircle className="w-4.5 h-4.5 stroke-[2]" />
            </div>
          </div>

          {/* Row 2 - 2. Average Sum Assured */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all hover:border-slate-300 hover:shadow-sm group">
            <div className="space-y-1 min-w-0 pr-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Average Sum Assured
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
                {fmtCurrency(kpi.avgSumAssured)}
              </span>
              <span className="text-[11px] font-medium text-slate-500 block truncate">
                Average insurance coverage per policy
              </span>
            </div>
            <div className="w-9 h-9 bg-blue-50 text-blue-600 border-blue-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <Shield className="w-4.5 h-4.5 stroke-[2]" />
            </div>
          </div>

          {/* Row 2 - 3. Average Premium */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all hover:border-slate-300 hover:shadow-sm group">
            <div className="space-y-1 min-w-0 pr-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Average Premium
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
                {fmtCurrency(kpi.avgPremium)}
              </span>
              <span className="text-[11px] font-medium text-slate-500 block truncate">
                Per fresh policy average
              </span>
            </div>
            <div className="w-9 h-9 bg-purple-50 text-purple-600 border-purple-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <TrendingUp className="w-4.5 h-4.5 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* Company & Category Distribution Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              Fresh Company Contribution
            </h3>
            <div className="space-y-2.5">
              {metrics.freshCompanyContributions.slice(0, 5).map((c, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{c.companyName}</span>
                    <span className="font-mono font-bold text-slate-600">{fmtCurrency(c.volume)} ({c.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${c.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-2">
              <PieChart className="w-4 h-4 text-red-600" />
              Fresh Category Distribution
            </h3>
            <div className="space-y-2.5">
              {metrics.freshCategoryDistribution.slice(0, 5).map((c, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{c.categoryName}</span>
                    <span className="font-mono font-bold text-slate-600">{c.count} policies ({c.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full rounded-full" style={{ width: `${c.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
      </div>

        {/* FINANCE DISTRIBUTION (Fresh scoped) */}
        {renderFinanceDistributionCard(metrics.freshPolicies)}

        {/* SUM ASSURED DISTRIBUTION + PRODUCT MIX ON POLICY TENURE (Fresh scoped) */}
        {(() => {
          const scopedPolicies = metrics.freshPolicies;

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

          const totalSumAssuredPolicies = scopedPolicies.filter(p => Number(p.sumAssured) > 0 || p.sumAssuredType === "UNLIMITED" || (p as any).sumAssured === "UNLIMITED").length;

          const sumAssuredDistribution = sumAssuredBuckets.map(bucket => {
            const policiesInBucket = scopedPolicies.filter(p => {
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
          scopedPolicies.forEach(p => {
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

          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SUM ASSURED DISTRIBUTION */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.1 }}
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

              {/* POLICY TENURE MIX (True Pie Chart) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.15 }}
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
          );
        })()}

        {renderDetailsSection("fresh", metrics.freshPolicies, "Fresh Business")}
      </div>
    );
  }

  // ── 3. PORTABILITY BUSINESS MODULE ─────────────────────────────────────────
  if (segment === "port") {
    const topCompany = metrics.portCompanyContributions[0]?.companyName || "N/A";
    const recentPort = [...metrics.portPolicies].slice(0, 5);

    // Status breakdowns for Port policies
    // Status breakdowns for Port policies
    const kpi = computeModuleKPIs(metrics.portPolicies);

    return (
      <div className="space-y-6">
        {/* Port Metric Cards (2 Rows of 3 Cards Each = 6 Cards Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Row 1 - 1. Total Port Policies */}
          <div
            onClick={() => handleCardClick("port", "all")}
            className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all cursor-pointer hover:border-slate-300 hover:shadow-sm group"
          >
            <div className="space-y-1 min-w-0 pr-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Port Policies
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
                {kpi.totalCount}
              </span>
              <span className="text-[11px] font-medium text-slate-500 block truncate font-mono">
                {fmtCurrency(kpi.totalVolume)}
              </span>
            </div>
            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 border-indigo-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <Layers className="w-4.5 h-4.5 stroke-[2]" />
            </div>
          </div>

          {/* Row 1 - 2. Issued Policies */}
          <div
            onClick={() => handleCardClick("port", "Issued")}
            className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all cursor-pointer hover:border-slate-300 hover:shadow-sm group"
          >
            <div className="space-y-1 min-w-0 pr-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Issued Policies
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
                {kpi.issuedCount}
              </span>
              <span className="text-[11px] font-medium text-slate-500 block truncate font-mono">
                {fmtCurrency(kpi.issuedVolume)}
              </span>
            </div>
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 border-emerald-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <CheckCircle className="w-4.5 h-4.5 stroke-[2]" />
            </div>
          </div>

          {/* Row 1 - 3. Pending Policies */}
          <div
            onClick={() => handleCardClick("port", "Pending")}
            className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all cursor-pointer hover:border-slate-300 hover:shadow-sm group"
          >
            <div className="space-y-1 min-w-0 pr-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Pending Policies
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
                {kpi.pendingCount}
              </span>
              <span className="text-[11px] font-medium text-slate-500 block truncate font-mono">
                {fmtCurrency(kpi.pendingVolume)}
              </span>
            </div>
            <div className="w-9 h-9 bg-amber-50 text-amber-600 border-amber-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <Clock className="w-4.5 h-4.5 stroke-[2]" />
            </div>
          </div>

          {/* Row 2 - 1. Cancelled Policies */}
          <div
            onClick={() => handleCardClick("port", "Cancelled")}
            className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all cursor-pointer hover:border-slate-300 hover:shadow-sm group"
          >
            <div className="space-y-1 min-w-0 pr-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Cancelled Policies
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
                {kpi.cancelledCount}
              </span>
              <span className="text-[11px] font-medium text-slate-500 block truncate font-mono">
                {fmtCurrency(kpi.cancelledVolume)}
              </span>
            </div>
            <div className="w-9 h-9 bg-rose-50 text-rose-600 border-rose-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <XCircle className="w-4.5 h-4.5 stroke-[2]" />
            </div>
          </div>

          {/* Row 2 - 2. Average Sum Assured */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all hover:border-slate-300 hover:shadow-sm group">
            <div className="space-y-1 min-w-0 pr-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Average Sum Assured
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
                {fmtCurrency(kpi.avgSumAssured)}
              </span>
              <span className="text-[11px] font-medium text-slate-500 block truncate">
                Average insurance coverage per policy
              </span>
            </div>
            <div className="w-9 h-9 bg-blue-50 text-blue-600 border-blue-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <Shield className="w-4.5 h-4.5 stroke-[2]" />
            </div>
          </div>

          {/* Row 2 - 3. Average Premium */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all hover:border-slate-300 hover:shadow-sm group">
            <div className="space-y-1 min-w-0 pr-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Average Premium
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
                {fmtCurrency(kpi.avgPremium)}
              </span>
              <span className="text-[11px] font-medium text-slate-500 block truncate">
                Per ported policy average
              </span>
            </div>
            <div className="w-9 h-9 bg-purple-50 text-purple-600 border-purple-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <TrendingUp className="w-4.5 h-4.5 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* Company & Source Distribution Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Port Company Contribution
            </h3>
            <div className="space-y-2.5">
              {metrics.portCompanyContributions.slice(0, 5).map((c, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{c.companyName}</span>
                    <span className="font-mono font-bold text-slate-600">{fmtCurrency(c.volume)} ({c.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${c.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              Port Source Distribution
            </h3>
            <div className="space-y-2.5">
              {metrics.portSourceDistribution.map((c, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{c.sourceType}</span>
                    <span className="font-mono font-bold text-slate-600">{c.count} policies ({c.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-teal-500 h-full rounded-full" style={{ width: `${c.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FINANCE DISTRIBUTION (Port scoped) */}
        {renderFinanceDistributionCard(metrics.portPolicies)}

        {/* SUM ASSURED DISTRIBUTION + PRODUCT MIX ON POLICY TENURE (Port scoped) */}
        {(() => {
          const scopedPolicies = metrics.portPolicies;

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

          const totalSumAssuredPolicies = scopedPolicies.filter(p => Number(p.sumAssured) > 0 || p.sumAssuredType === "UNLIMITED" || (p as any).sumAssured === "UNLIMITED").length;

          const sumAssuredDistribution = sumAssuredBuckets.map(bucket => {
            const policiesInBucket = scopedPolicies.filter(p => {
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
          scopedPolicies.forEach(p => {
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

          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SUM ASSURED DISTRIBUTION */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.1 }}
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

              {/* POLICY TENURE MIX (True Pie Chart) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.15 }}
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
          );
        })()}

        {renderDetailsSection("port", metrics.portPolicies, "Portability Business")}
      </div>
    );
  }

  // ── 4. RENEWAL MODULE ──────────────────────────────────────────────────────
  const recentRenewal = [...metrics.renewalPolicies].slice(0, 5);

  // Status breakdowns for Renewal policies
  const renewalList = metrics.renewalPolicies;
  // Status breakdowns for Renewal policies
  const kpi = computeModuleKPIs(metrics.renewalPolicies);

  return (
    <div className="space-y-6">
      {/* Renewal Metric Cards (2 Rows of 3 Cards Each = 6 Cards Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* Row 1 - 1. Total Renewal Policies */}
        <div
          onClick={() => handleCardClick("renewal", "all")}
          className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all cursor-pointer hover:border-slate-300 hover:shadow-sm group"
        >
          <div className="space-y-1 min-w-0 pr-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Renewal Policies
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
              {kpi.totalCount}
            </span>
            <span className="text-[11px] font-medium text-slate-500 block truncate font-mono">
              {fmtCurrency(kpi.totalVolume)}
            </span>
          </div>
          <div className="w-9 h-9 bg-indigo-50 text-indigo-600 border-indigo-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
            <Layers className="w-4.5 h-4.5 stroke-[2]" />
          </div>
        </div>

        {/* Row 1 - 2. Issued Policies */}
        <div
          onClick={() => handleCardClick("renewal", "Issued")}
          className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all cursor-pointer hover:border-slate-300 hover:shadow-sm group"
        >
          <div className="space-y-1 min-w-0 pr-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Issued Policies
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
              {kpi.issuedCount}
            </span>
            <span className="text-[11px] font-medium text-slate-500 block truncate font-mono">
              {fmtCurrency(kpi.issuedVolume)}
            </span>
          </div>
          <div className="w-9 h-9 bg-emerald-50 text-emerald-600 border-emerald-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
            <CheckCircle className="w-4.5 h-4.5 stroke-[2]" />
          </div>
        </div>

        {/* Row 1 - 3. Pending Policies */}
        <div
          onClick={() => handleCardClick("renewal", "Pending")}
          className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all cursor-pointer hover:border-slate-300 hover:shadow-sm group"
        >
          <div className="space-y-1 min-w-0 pr-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Pending Policies
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
              {kpi.pendingCount}
            </span>
            <span className="text-[11px] font-medium text-slate-500 block truncate font-mono">
              {fmtCurrency(kpi.pendingVolume)}
            </span>
          </div>
          <div className="w-9 h-9 bg-amber-50 text-amber-600 border-amber-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
            <Clock className="w-4.5 h-4.5 stroke-[2]" />
          </div>
        </div>

        {/* Row 2 - 1. Cancelled Policies */}
        <div
          onClick={() => handleCardClick("renewal", "Cancelled")}
          className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all cursor-pointer hover:border-slate-300 hover:shadow-sm group"
        >
          <div className="space-y-1 min-w-0 pr-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Cancelled Policies
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
              {kpi.cancelledCount}
            </span>
            <span className="text-[11px] font-medium text-slate-500 block truncate font-mono">
              {fmtCurrency(kpi.cancelledVolume)}
            </span>
          </div>
          <div className="w-9 h-9 bg-rose-50 text-rose-600 border-rose-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
            <XCircle className="w-4.5 h-4.5 stroke-[2]" />
          </div>
        </div>

        {/* Row 2 - 2. Average Sum Assured */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all hover:border-slate-300 hover:shadow-sm group">
          <div className="space-y-1 min-w-0 pr-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Average Sum Assured
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
              {fmtCurrency(kpi.avgSumAssured)}
            </span>
            <span className="text-[11px] font-medium text-slate-500 block truncate">
              Average insurance coverage per policy
            </span>
          </div>
          <div className="w-9 h-9 bg-blue-50 text-blue-600 border-blue-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
            <Shield className="w-4.5 h-4.5 stroke-[2]" />
          </div>
        </div>

        {/* Row 2 - 3. Average Premium */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex items-center justify-between transition-all hover:border-slate-300 hover:shadow-sm group">
          <div className="space-y-1 min-w-0 pr-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Average Premium
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight block font-mono">
              {fmtCurrency(kpi.avgPremium)}
            </span>
            <span className="text-[11px] font-medium text-slate-500 block truncate">
              Per renewal policy average
            </span>
          </div>
          <div className="w-9 h-9 bg-purple-50 text-purple-600 border-purple-200 border rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
            <TrendingUp className="w-4.5 h-4.5 stroke-[2]" />
          </div>
        </div>
      </div>

   {/* Row 1: Finance Distribution + Renewal Company Contribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderFinanceDistributionCard(metrics.renewalPolicies)}

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
          <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-rose-600" />
            Renewal Company Contribution
          </h3>
          <div className="space-y-2.5">
            {metrics.renewalCompanyContributions.slice(0, 5).map((c, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{c.companyName}</span>
                  <span className="font-mono font-bold text-slate-600">{fmtCurrency(c.volume)} ({c.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-600 h-full rounded-full" style={{ width: `${c.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Sum Assured Distribution + Policy Tenure Mix (Renewal scoped) */}
      {(() => {
        const scopedPolicies = metrics.renewalPolicies;

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

        const totalSumAssuredPolicies = scopedPolicies.filter(p => Number(p.sumAssured) > 0 || p.sumAssuredType === "UNLIMITED" || (p as any).sumAssured === "UNLIMITED").length;

        const sumAssuredDistribution = sumAssuredBuckets.map(bucket => {
          const policiesInBucket = scopedPolicies.filter(p => {
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
        scopedPolicies.forEach(p => {
          const norm = normalizeTenureValue(p.policyTenure);
          if (!norm) return;
          const key = String(norm.numericValue);
          if (!tenureGroups[key]) {
            tenureGroups[key] = { numericValue: norm.numericValue, label: norm.label, count: 0, totalPremium: 0 };
          }
          tenureGroups[key].count += 1;
          tenureGroups[key].totalPremium += Number(p.premiumAmount) || 0;
        });

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

        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SUM ASSURED DISTRIBUTION */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.1 }}
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

            {/* POLICY TENURE MIX (True Pie Chart) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.15 }}
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
        );
      })()}

      {renderDetailsSection("renewal", metrics.renewalPolicies, "Renewal")}
    </div>
  );
}
