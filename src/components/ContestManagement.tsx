import React, { useState, useEffect } from "react";
import { api, UserSession } from "../lib/api";
import { InsuranceCompany } from "../types";
import { 
  Trophy, Plus, Search, Edit2, CheckCircle2, XCircle, RefreshCw, 
  AlertCircle, Calendar, Award, IndianRupee, Filter, X, Check, DollarSign, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ConfirmModal from "./ConfirmModal";

interface ContestManagementProps {
  user: UserSession;
}

export default function ContestManagement({ user }: ContestManagementProps) {
  const [contests, setContests] = useState<any[]>([]);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState("All");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("All");
  const [selectedQualificationFilter, setSelectedQualificationFilter] = useState("All");
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState("All");

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContest, setEditingContest] = useState<any | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    insuranceCompanyId: "",
    type: "Monthly" as "Monthly" | "Quarterly" | "Annual",
    startDate: "",
    endDate: "",
    targetAmount: "",
    rewardAmount: "",
    status: "Active" as "Active" | "Inactive"
  });

  // Payment Confirmation Modal
  const [paymentConfirmState, setPaymentConfirmState] = useState<{
    isOpen: boolean;
    contestId: string;
    contestName: string;
    rewardAmount: number;
    newStatus: "Paid" | "Unpaid";
  }>({
    isOpen: false,
    contestId: "",
    contestName: "",
    rewardAmount: 0,
    newStatus: "Paid"
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [contestRes, companyRes] = await Promise.all([
        api.getContests(),
        api.getActiveInsuranceCompanies()
      ]);
      setContests(contestRes);
      setCompanies(companyRes);
      if (companyRes.length > 0 && !formData.insuranceCompanyId) {
        setFormData(prev => ({ ...prev, insuranceCompanyId: companyRes[0].id }));
      }
    } catch (err: any) {
      console.error("Error fetching contest data:", err);
      setError(err.message || "Failed to load contest management data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContest = async (contestId: string) => {
    if (window.confirm("Are you sure you want to delete this contest? This will permanently delete it from MongoDB.")) {
      try {
        await api.deleteContest(contestId);
        fetchData();
      } catch (err: any) {
        setError(err.message || "Failed to delete contest");
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingContest(null);
    setFormError(null);
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const y = today.getFullYear();
    const m = today.getMonth();
    const firstDay = `${y}-${pad(m + 1)}-01`;
    const lastDay = `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`;

    setFormData({
      name: "",
      insuranceCompanyId: companies.length > 0 ? companies[0].id : "",
      type: "Monthly",
      startDate: firstDay,
      endDate: lastDay,
      targetAmount: "500000",
      rewardAmount: "50000",
      status: "Active"
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: any) => {
    setEditingContest(c);
    setFormError(null);
    setFormData({
      name: c.name,
      insuranceCompanyId: c.insuranceCompanyId,
      type: c.type || "Monthly",
      startDate: c.startDate,
      endDate: c.endDate,
      targetAmount: String(c.targetAmount || 0),
      rewardAmount: String(c.rewardAmount || 0),
      status: c.status || "Active"
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    const targetVal = parseFloat(formData.targetAmount);
    const rewardVal = parseFloat(formData.rewardAmount);

    if (!formData.name.trim()) {
      setFormError("Contest name is required");
      setFormLoading(false);
      return;
    }

    if (!formData.insuranceCompanyId) {
      setFormError("Insurance Company is required");
      setFormLoading(false);
      return;
    }

    if (isNaN(targetVal) || targetVal <= 0) {
      setFormError("Target Business Amount must be greater than 0");
      setFormLoading(false);
      return;
    }

    if (isNaN(rewardVal) || rewardVal < 0) {
      setFormError("Reward Amount must be a valid non-negative number");
      setFormLoading(false);
      return;
    }

    const selectedComp = companies.find(comp => comp.id === formData.insuranceCompanyId);
    const companyName = selectedComp ? selectedComp.name : "Insurance Company";

    try {
      if (editingContest) {
        await api.updateContest(editingContest.id, {
          ...formData,
          companyName,
          targetAmount: targetVal,
          rewardAmount: rewardVal
        });
      } else {
        await api.createContest({
          ...formData,
          companyName,
          targetAmount: targetVal,
          rewardAmount: rewardVal
        });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("Error saving contest:", err);
      setFormError(err.message || "Failed to save contest record");
    } finally {
      setFormLoading(false);
    }
  };

  const handlePaymentToggleConfirm = async () => {
    try {
      await api.updateContestPaymentStatus(
        paymentConfirmState.contestId,
        paymentConfirmState.newStatus
      );
      setPaymentConfirmState({ isOpen: false, contestId: "", contestName: "", rewardAmount: 0, newStatus: "Paid" });
      fetchData();
    } catch (err: any) {
      console.error("Error updating contest payment status:", err);
      alert(err.message || "Failed to update payment status");
    }
  };

  // Filtered List
  const filteredContests = contests.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = selectedCompanyFilter === "All" || c.insuranceCompanyId === selectedCompanyFilter;
    const matchesType = selectedTypeFilter === "All" || c.type === selectedTypeFilter;
    const matchesQual = selectedQualificationFilter === "All" || c.qualificationStatus === selectedQualificationFilter;
    const matchesPayment = selectedPaymentFilter === "All" || c.paymentStatus === selectedPaymentFilter;

    return matchesSearch && matchesCompany && matchesType && matchesQual && matchesPayment;
  });

  const fmt = (val: number) => (val || 0).toLocaleString("en-IN");

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-rose-700" />
            Insurance Company Contest Management
          </h2>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Configure Insurance Company target contests, track real business qualification & manage reward payouts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition cursor-pointer"
            title="Refresh Contests"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-rose-700" : ""}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Contest</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-teal-600" /> Contest Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search contest name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Company */}
          <select
            value={selectedCompanyFilter}
            onChange={(e) => setSelectedCompanyFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="All">All Insurance Companies</option>
            {companies.map((comp) => (
              <option key={comp.id} value={comp.id}>{comp.name}</option>
            ))}
          </select>

          {/* Type */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="All">All Contest Types</option>
            <option value="Monthly">Monthly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Annual">Annual</option>
          </select>

          {/* Qualification */}
          <select
            value={selectedQualificationFilter}
            onChange={(e) => setSelectedQualificationFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="All">All Qualification Status</option>
            <option value="QUALIFIED">Qualified Only</option>
            <option value="NOT QUALIFIED">Not Qualified Only</option>
          </select>

          {/* Payment Status */}
          <select
            value={selectedPaymentFilter}
            onChange={(e) => setSelectedPaymentFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="All">All Payment Status</option>
            <option value="Unpaid">Unpaid Rewards</option>
            <option value="Paid">Paid Rewards</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Contests Cards / Table View */}
      {loading ? (
        <div className="py-16 text-center text-xs font-medium text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
          Loading contests...
        </div>
      ) : filteredContests.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-500 font-medium space-y-3 shadow-xs">
          <Trophy className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
          <p className="text-xs font-semibold text-slate-700">No contests found matching your filters.</p>
          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl text-xs font-semibold hover:bg-teal-100 cursor-pointer transition inline-block"
          >
            + Create First Contest
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContests.map((c) => {
            const isQualified = c.qualificationStatus === "QUALIFIED";
            const isPaid = c.paymentStatus === "Paid";
            const progressPct = Math.min(c.achievementPercentage || 0, 100);

            return (
              <div
                key={c.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div className="space-y-2.5">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                        c.type === "Monthly"
                          ? "bg-sky-50 text-sky-700 border-sky-200"
                          : c.type === "Quarterly"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {c.type} Contest
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{c.name}</h3>
                      <p className="text-xs font-medium text-slate-600 flex items-center gap-1 mt-0.5">
                        <Award className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        {c.companyName}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(c)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer transition"
                        title="Edit Contest"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteContest(c.id || c._id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer transition"
                        title="Delete Contest"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Period */}
                  <div className="text-[11px] font-normal text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/70 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Period: {c.startDate} to {c.endDate}</span>
                  </div>

                  {/* Target vs Actual Progress */}
                  <div className="space-y-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
                    <div className="flex items-center justify-between text-xs font-normal">
                      <span className="text-slate-500 uppercase text-[10px] font-semibold">Target Business</span>
                      <span className="font-mono text-slate-900 font-semibold">₹{fmt(c.targetAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-normal">
                      <span className="text-slate-500 uppercase text-[10px] font-semibold">Achieved (New Business)</span>
                      <span className={`font-mono font-semibold ${isQualified ? "text-emerald-700" : "text-slate-900"}`}>
                        ₹{fmt(c.actualBusiness || 0)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 mb-1">
                        <span>Achievement</span>
                        <span className={`font-mono ${isQualified ? "text-emerald-700 font-semibold" : "text-slate-600"}`}>
                          {(c.achievementPercentage || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full transition-all ${isQualified ? "bg-emerald-500" : "bg-teal-600"}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Status Badges Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* Qualification Status */}
                    <div className={`p-2.5 rounded-xl border flex flex-col justify-center ${
                      isQualified
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}>
                      <span className="text-[9px] font-semibold uppercase text-slate-400 block">Qualification</span>
                      <span className="text-xs font-semibold flex items-center gap-1 mt-0.5">
                        {isQualified ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="text-emerald-700">QUALIFIED ✓</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-500">NOT QUALIFIED</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Reward Amount */}
                    <div className={`p-2.5 rounded-xl border flex flex-col justify-center ${
                      isPaid
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : isQualified
                        ? "bg-sky-50 border-sky-200 text-sky-800"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}>
                      <span className="text-[9px] font-semibold uppercase text-slate-400 block">Reward Amount</span>
                      <span className="text-xs font-semibold font-mono text-slate-900 mt-0.5">₹{fmt(c.rewardAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-[10px] font-medium text-slate-500">
                    Reward Status:{" "}
                    <span className={`font-semibold ${isPaid ? "text-emerald-700" : "text-sky-700"}`}>
                      {c.paymentStatus.toUpperCase()}
                    </span>
                  </div>

                  {isQualified ? (
                    <button
                      onClick={() =>
                        setPaymentConfirmState({
                          isOpen: true,
                          contestId: c.id,
                          contestName: c.name,
                          rewardAmount: c.rewardAmount,
                          newStatus: isPaid ? "Unpaid" : "Paid"
                        })
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                        isPaid
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                          : "bg-teal-600 hover:bg-teal-700 text-white shadow-2xs"
                      }`}
                    >
                      <DollarSign className="w-3 h-3" />
                      <span>{isPaid ? "Mark Unpaid" : "Mark Paid"}</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400 italic">Target Not Met</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Contest Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-xs text-slate-800">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                <h3 className="text-sm font-bold text-slate-950 uppercase tracking-tight flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-teal-600" />
                  {editingContest ? "Edit Contest Configuration" : "Add New Contest"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Contest Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contest Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. August Growth Contest"
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>

                {/* Insurance Company */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Insurance Company *</label>
                  <select
                    value={formData.insuranceCompanyId}
                    onChange={(e) => setFormData({ ...formData, insuranceCompanyId: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  >
                    <option value="">-- Select Insurance Company --</option>
                    {companies.map((comp) => (
                      <option key={comp.id} value={comp.id}>{comp.name}</option>
                    ))}
                  </select>
                </div>

                {/* Type & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contest Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Annual">Annual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Configuration Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Start Date & End Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-mono font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">End Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-mono font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                </div>

                {/* Target Amount & Reward Amount */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Business Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.targetAmount}
                      onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                      placeholder="e.g. 500000"
                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-mono font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Reward Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.rewardAmount}
                      onChange={(e) => setFormData({ ...formData, rewardAmount: e.target.value })}
                      placeholder="e.g. 50000"
                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-mono font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-2xs"
                  >
                    {formLoading ? "Saving..." : editingContest ? "Update Contest" : "Create Contest"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Marking Reward Paid/Unpaid */}
      <ConfirmModal
        isOpen={paymentConfirmState.isOpen}
        title={`Mark Contest Reward as ${paymentConfirmState.newStatus}`}
        message={`Are you sure you want to mark the ₹${fmt(paymentConfirmState.rewardAmount)} reward for contest '${paymentConfirmState.contestName}' as ${paymentConfirmState.newStatus}?`}
        confirmText={`Mark as ${paymentConfirmState.newStatus}`}
        cancelText="Cancel"
        type={paymentConfirmState.newStatus === "Paid" ? "info" : "danger"}
        onConfirm={handlePaymentToggleConfirm}
        onCancel={() => setPaymentConfirmState({ isOpen: false, contestId: "", contestName: "", rewardAmount: 0, newStatus: "Paid" })}
      />
    </div>
  );
}
