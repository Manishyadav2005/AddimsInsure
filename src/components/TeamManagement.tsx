import React, { useState, useEffect } from "react";
import { UserSession, api } from "../lib/api";
import { TeamLeaderMaster, CallerMaster, BranchManagerMaster, TeamManagerMaster, RenewalManagerMaster, RenewalExecutiveMaster } from "../types";
import ConfirmModal from "./ConfirmModal";
import { Users, UserPlus, PhoneCall, Plus, Edit, Trash2, CheckCircle, XCircle, Search, UserCheck, Building2, UserCog, X, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TeamManagementProps {
  user: UserSession;
}

export default function TeamManagement({ user }: TeamManagementProps) {
  const [bms, setBms] = useState<BranchManagerMaster[]>([]);
  const [tms, setTms] = useState<TeamManagerMaster[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<TeamLeaderMaster[]>([]);
  const [callers, setCallers] = useState<CallerMaster[]>([]);
  const [renewalManagers, setRenewalManagers] = useState<RenewalManagerMaster[]>([]);
  const [renewalExecutives, setRenewalExecutives] = useState<RenewalExecutiveMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"BM" | "TM" | "TL" | "TSE" | "RENEWAL_MANAGER" | "RENEWAL_EXECUTIVE">("BM");

  // Modal State
  const [modalType, setModalType] = useState<"BM" | "TM" | "TL" | "CALLER" | "RENEWAL_MANAGER" | "RENEWAL_EXECUTIVE" | null>(null);
  const [editingBm, setEditingBm] = useState<BranchManagerMaster | null>(null);
  const [editingTm, setEditingTm] = useState<TeamManagerMaster | null>(null);
  const [editingTl, setEditingTl] = useState<TeamLeaderMaster | null>(null);
  const [editingCaller, setEditingCaller] = useState<CallerMaster | null>(null);
  const [editingRm, setEditingRm] = useState<RenewalManagerMaster | null>(null);
  const [editingRex, setEditingRex] = useState<RenewalExecutiveMaster | null>(null);

  // Form States
  const [bmForm, setBmForm] = useState({
    name: "",
    phone: "",
    email: "",
    employeeCode: "",
    dob: "",
    notes: "",
    status: "Active" as "Active" | "Inactive"
  });

  const [tmForm, setTmForm] = useState({
    name: "",
    bmId: "",
    phone: "",
    email: "",
    employeeCode: "",
    dob: "",
    notes: "",
    status: "Active" as "Active" | "Inactive"
  });

  const [tlForm, setTlForm] = useState({
    name: "",
    bmId: "",
    teamManagerId: "",
    phone: "",
    email: "",
    employeeCode: "",
    dob: "",
    notes: "",
    status: "Active" as "Active" | "Inactive"
  });

  const [callerForm, setCallerForm] = useState({
    name: "",
    bmId: "",
    teamManagerId: "",
    teamLeaderId: "",
    phone: "",
    email: "",
    employeeCode: "",
    dob: "",
    notes: "",
    status: "Active" as "Active" | "Inactive"
  });

  const [rmForm, setRmForm] = useState({
    name: "",
    phone: "",
    email: "",
    employeeCode: "",
    dob: "",
    notes: "",
    status: "Active" as "Active" | "Inactive"
  });

  const [rexForm, setRexForm] = useState({
    name: "",
    renewalManagerId: "",
    phone: "",
    email: "",
    employeeCode: "",
    dob: "",
    notes: "",
    status: "Active" as "Active" | "Inactive"
  });

  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchMasterData = async () => {
    setLoading(true);
    try {
      const [bmsData, tmsData, tlsData, callersData, rmsData, rexsData] = await Promise.all([
        api.getBMsMaster(),
        api.getTMsMaster(),
        api.getTeamLeadersMaster(),
        api.getCallersMaster(),
        api.getRenewalManagersMaster(),
        api.getRenewalExecutivesMaster()
      ]);
      setBms(bmsData);
      setTms(tmsData);
      setTeamLeaders(tlsData);
      setCallers(callersData);
      setRenewalManagers(rmsData);
      setRenewalExecutives(rexsData);
    } catch (err: any) {
      console.error("Failed to load master team data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  const handleDeleteBm = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this Branch Manager? This will permanently delete them from MongoDB.")) {
      try {
        await api.deleteBranchManagerMaster(id);
        fetchMasterData();
      } catch (err: any) {
        alert(err.message || "Failed to delete Branch Manager");
      }
    }
  };

  const handleDeleteTm = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this Team Manager? This will permanently delete them from MongoDB.")) {
      try {
        await api.deleteTeamManagerMaster(id);
        fetchMasterData();
      } catch (err: any) {
        alert(err.message || "Failed to delete Team Manager");
      }
    }
  };

  const handleDeleteTl = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this Team Leader? This will permanently delete them from MongoDB.")) {
      try {
        await api.deleteTeamLeaderMaster(id);
        fetchMasterData();
      } catch (err: any) {
        alert(err.message || "Failed to delete Team Leader");
      }
    }
  };

  const handleDeleteCaller = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this TSE? This will permanently delete them from MongoDB.")) {
      try {
        await api.deleteCallerMaster(id);
        fetchMasterData();
      } catch (err: any) {
        alert(err.message || "Failed to delete TSE");
      }
    }
  };

  const handleDeleteRm = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this Renewal Manager? Linked executives will become Unassigned.")) {
      try {
        await api.deleteRenewalManagerMaster(id);
        fetchMasterData();
      } catch (err: any) {
        alert(err.message || "Failed to delete Renewal Manager");
      }
    }
  };

  const handleDeleteRex = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this Renewal Executive? This will permanently delete them from MongoDB.")) {
      try {
        await api.deleteRenewalExecutiveMaster(id);
        fetchMasterData();
      } catch (err: any) {
        alert(err.message || "Failed to delete Renewal Executive");
      }
    }
  };

  // Open Create BM Modal
  const openCreateBm = () => {
    setEditingBm(null);
    setBmForm({ name: "", phone: "", email: "", employeeCode: "", dob: "", notes: "", status: "Active" });
    setFormError("");
    setModalType("BM");
  };

  // Open Edit BM Modal
  const openEditBm = (bm: BranchManagerMaster) => {
    setEditingBm(bm);
    setBmForm({
      name: bm.name || "",
      phone: bm.phone || "",
      email: bm.email || "",
      employeeCode: bm.employeeCode || "",
      dob: bm.dob || "",
      notes: bm.notes || "",
      status: (bm.status as any) || "Active"
    });
    setFormError("");
    setModalType("BM");
  };

  // Open Create TM Modal
  const openCreateTm = () => {
    setEditingTm(null);
    setTmForm({ name: "", bmId: "", phone: "", email: "", employeeCode: "", dob: "", notes: "", status: "Active" });
    setFormError("");
    setModalType("TM");
  };

  // Open Edit TM Modal
  const openEditTm = (tm: TeamManagerMaster) => {
    setEditingTm(tm);
    setTmForm({
      name: tm.name || "",
      bmId: tm.bmId || "",
      phone: tm.phone || "",
      email: tm.email || "",
      employeeCode: tm.employeeCode || "",
      dob: tm.dob || "",
      notes: tm.notes || "",
      status: (tm.status as any) || "Active"
    });
    setFormError("");
    setModalType("TM");
  };

  // Open Create TL Modal
  const openCreateTl = () => {
    setEditingTl(null);
    setTlForm({
      name: "",
      bmId: "",
      teamManagerId: "",
      phone: "",
      email: "",
      employeeCode: "",
      dob: "",
      notes: "",
      status: "Active"
    });
    setFormError("");
    setModalType("TL");
  };

  // Open Edit TL Modal
  const openEditTl = (tl: TeamLeaderMaster) => {
    setEditingTl(tl);
    setTlForm({
      name: tl.name || "",
      bmId: tl.bmId || "",
      teamManagerId: tl.teamManagerId || "",
      phone: tl.phone || "",
      email: tl.email || "",
      employeeCode: tl.employeeCode || "",
      dob: tl.dob || "",
      notes: tl.notes || "",
      status: (tl.status as any) || "Active"
    });
    setFormError("");
    setModalType("TL");
  };

  // Open Create TSE Modal
  const openCreateCaller = () => {
    setEditingCaller(null);
    setCallerForm({
      name: "",
      bmId: "",
      teamManagerId: "",
      teamLeaderId: "",
      phone: "",
      email: "",
      employeeCode: "",
      dob: "",
      notes: "",
      status: "Active"
    });
    setFormError("");
    setModalType("CALLER");
  };

  // Open Edit TSE Modal
  const openEditCaller = (caller: CallerMaster) => {
    setEditingCaller(caller);
    const parentTl = teamLeaders.find(tl => tl.id === caller.teamLeaderId);
    const parentTmId = caller.teamManagerId || parentTl?.teamManagerId || "";
    const parentBmId = caller.bmId || parentTl?.bmId || "";
    setCallerForm({
      name: caller.name || "",
      bmId: parentBmId,
      teamManagerId: parentTmId,
      teamLeaderId: caller.teamLeaderId || "",
      phone: caller.phone || "",
      email: caller.email || "",
      employeeCode: caller.employeeCode || "",
      dob: caller.dob || "",
      notes: caller.notes || "",
      status: (caller.status as any) || "Active"
    });
    setFormError("");
    setModalType("CALLER");
  };

  // Open Create RM Modal
  const openCreateRm = () => {
    setEditingRm(null);
    setRmForm({ name: "", phone: "", email: "", employeeCode: "", dob: "", notes: "", status: "Active" });
    setFormError("");
    setModalType("RENEWAL_MANAGER");
  };

  // Open Edit RM Modal
  const openEditRm = (rm: RenewalManagerMaster) => {
    setEditingRm(rm);
    setRmForm({
      name: rm.name || "",
      phone: rm.phone || "",
      email: rm.email || "",
      employeeCode: rm.employeeCode || "",
      dob: rm.dob || "",
      notes: rm.notes || "",
      status: (rm.status as any) || "Active"
    });
    setFormError("");
    setModalType("RENEWAL_MANAGER");
  };

  // Open Create Renewal Executive Modal
  const openCreateRex = () => {
    setEditingRex(null);
    setRexForm({ name: "", renewalManagerId: "", phone: "", email: "", employeeCode: "", dob: "", notes: "", status: "Active" });
    setFormError("");
    setModalType("RENEWAL_EXECUTIVE");
  };

  // Open Edit Renewal Executive Modal
  const openEditRex = (rex: RenewalExecutiveMaster) => {
    setEditingRex(rex);
    setRexForm({
      name: rex.name || "",
      renewalManagerId: rex.renewalManagerId || "",
      phone: rex.phone || "",
      email: rex.email || "",
      employeeCode: rex.employeeCode || "",
      dob: rex.dob || "",
      notes: rex.notes || "",
      status: (rex.status as any) || "Active"
    });
    setFormError("");
    setModalType("RENEWAL_EXECUTIVE");
  };

  // Handle Submit BM
  const handleBmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bmForm.name.trim()) {
      setFormError("Branch Manager Name is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingBm) {
        await api.updateBMMaster(editingBm.id, bmForm);
      } else {
        await api.createBMMaster(bmForm);
      }
      setModalType(null);
      setActiveTab("BM");
      fetchMasterData();
    } catch (err: any) {
      setFormError(err.message || "Failed to save Branch Manager.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Submit TM
  const handleTmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmForm.name.trim()) {
      setFormError("Team Manager Name is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingTm) {
        await api.updateTMMaster(editingTm.id, tmForm);
      } else {
        await api.createTMMaster(tmForm);
      }
      setModalType(null);
      setActiveTab("TM");
      fetchMasterData();
    } catch (err: any) {
      setFormError(err.message || "Failed to save Team Manager.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Submit TL
  const handleTlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tlForm.name.trim()) {
      setFormError("Team Leader Name is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingTl) {
        await api.updateTeamLeaderMaster(editingTl.id, tlForm);
      } else {
        await api.createTeamLeaderMaster(tlForm);
      }
      setModalType(null);
      setActiveTab("TL");
      fetchMasterData();
    } catch (err: any) {
      setFormError(err.message || "Failed to save Team Leader.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Submit TSE
  const handleCallerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callerForm.name.trim()) {
      setFormError("TSE Name is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingCaller) {
        await api.updateCallerMaster(editingCaller.id, callerForm);
      } else {
        await api.createCallerMaster(callerForm);
      }
      setModalType(null);
      setActiveTab("TSE");
      fetchMasterData();
    } catch (err: any) {
      setFormError(err.message || "Failed to save TSE.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Submit Renewal Manager
  const handleRmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rmForm.name.trim()) {
      setFormError("Renewal Manager Name is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingRm) {
        await api.updateRenewalManagerMaster(editingRm.id, rmForm);
      } else {
        await api.createRenewalManagerMaster(rmForm);
      }
      setModalType(null);
      setActiveTab("RENEWAL_MANAGER");
      fetchMasterData();
    } catch (err: any) {
      setFormError(err.message || "Failed to save Renewal Manager.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Submit Renewal Executive
  const handleRexSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rexForm.name.trim()) {
      setFormError("Renewal Executive Name is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingRex) {
        await api.updateRenewalExecutiveMaster(editingRex.id, rexForm);
      } else {
        await api.createRenewalExecutiveMaster(rexForm);
      }
      setModalType(null);
      setActiveTab("RENEWAL_EXECUTIVE");
      fetchMasterData();
    } catch (err: any) {
      setFormError(err.message || "Failed to save Renewal Executive.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBms = bms.filter(
    (bm) =>
      bm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bm.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bm.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTms = tms.filter(
    (tm) =>
      tm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tm.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tm.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTLs = teamLeaders.filter(
    (tl) =>
      tl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tl.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tl.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCallers = callers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRms = renewalManagers.filter(
    (rm) =>
      rm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rm.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rm.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRexs = renewalExecutives.filter(
    (rex) =>
      rex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rex.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rex.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rex.renewalManagerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-slate-900">Sales & Team Hierarchy Management</h2>
            <p className="text-xs text-slate-500 font-normal">
              Manage Sales Team (BM, TM, TL, TSE) and Renewal Team (Renewal Manager, Renewal Executive) master records
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openCreateBm}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
          >
            <Building2 className="w-4 h-4" />
            <span>+ Add BM</span>
          </button>
          <button
            onClick={openCreateTm}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
          >
            <UserCog className="w-4 h-4 text-slate-500" />
            <span>+ Add TM</span>
          </button>
          <button
            onClick={openCreateTl}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
          >
            <UserPlus className="w-4 h-4 text-slate-500" />
            <span>+ Add Team Leader</span>
          </button>
          <button
            onClick={openCreateCaller}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
          >
            <PhoneCall className="w-4 h-4 text-slate-500" />
            <span>+ Add TSE</span>
          </button>
          <button
            onClick={openCreateRm}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span>+ Add Renewal Manager</span>
          </button>
          <button
            onClick={openCreateRex}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
          >
            <UserCheck className="w-4 h-4 text-slate-500" />
            <span>+ Add Renewal Executive</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        <input
          type="text"
          placeholder="Search Branch Manager, Team Manager, Team Leader, TSE, Renewal Manager or Renewal Executive by name, email, employee code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden"
        />
      </div>

      {/* Clean Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab("BM")}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === "BM"
              ? "bg-red-50 text-red-800 border-red-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-50"
          }`}
        >
          <Building2 className={`w-4 h-4 ${activeTab === "BM" ? "text-red-600" : "text-slate-400"}`} />
          <span>Branch Managers ({bms.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("TM")}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === "TM"
              ? "bg-red-50 text-red-800 border-red-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-50"
          }`}
        >
          <UserCog className={`w-4 h-4 ${activeTab === "TM" ? "text-red-600" : "text-slate-400"}`} />
          <span>Team Managers ({tms.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("TL")}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === "TL"
              ? "bg-red-50 text-red-800 border-red-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-50"
          }`}
        >
          <Users className={`w-4 h-4 ${activeTab === "TL" ? "text-red-600" : "text-slate-400"}`} />
          <span>Team Leaders ({teamLeaders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("TSE")}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === "TSE"
              ? "bg-red-50 text-red-800 border-red-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-50"
          }`}
        >
          <PhoneCall className={`w-4 h-4 ${activeTab === "TSE" ? "text-red-600" : "text-slate-400"}`} />
          <span>TSEs ({callers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("RENEWAL_MANAGER")}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === "RENEWAL_MANAGER"
              ? "bg-white text-purple-700 border-purple-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-50"
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${activeTab === "RENEWAL_MANAGER" ? "text-purple-600" : "text-slate-400"}`} />
          <span>Renewal Managers ({renewalManagers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("RENEWAL_EXECUTIVE")}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === "RENEWAL_EXECUTIVE"
              ? "bg-white text-amber-700 border-amber-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-50"
          }`}
        >
          <UserCheck className={`w-4 h-4 ${activeTab === "RENEWAL_EXECUTIVE" ? "text-amber-600" : "text-slate-400"}`} />
          <span>Renewal Executives ({renewalExecutives.length})</span>
        </button>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        {/* TAB 1: BRANCH MANAGERS */}
        {activeTab === "BM" && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Building2 className="w-4.5 h-4.5 text-teal-600" />
                Branch Managers Master ({filteredBms.length})
              </h3>
              <span className="text-[10px] font-mono text-slate-400">{filteredBms.length} Records</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs font-medium text-slate-400">Loading Branch Managers...</div>
            ) : filteredBms.length === 0 ? (
              <div className="py-10 text-center text-xs font-medium text-slate-400 space-y-2">
                <p className="italic">No Branch Managers created yet.</p>
                <button
                  onClick={openCreateBm}
                  className="px-3.5 py-1.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl text-xs font-semibold hover:bg-teal-100 cursor-pointer transition inline-block"
                >
                  + Add Branch Manager
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-slate-800">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Branch Manager</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Employee Code</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Contact Info</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Status</th>
                      <th className="px-4 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                    {filteredBms.map((bm) => (
                      <tr key={bm.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5 border-r border-slate-100 font-semibold text-slate-900">
                          {bm.name}
                        </td>
                        <td className="px-4 py-3.5 border-r border-slate-100 font-mono text-teal-700 font-semibold">
                          {bm.employeeCode || "—"}
                        </td>
                        <td className="px-4 py-3.5 border-r border-slate-100 font-mono text-[11px]">
                          <div>{bm.phone || "—"}</div>
                          <div className="text-slate-500">{bm.email || "—"}</div>
                        </td>
                        <td className="px-4 py-3.5 border-r border-slate-100">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                            bm.status === "Active" || !bm.status
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${bm.status === "Active" || !bm.status ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                            {bm.status || "Active"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-1.5">
                          <button
                            onClick={() => openEditBm(bm)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer transition shadow-2xs"
                            title="Edit Branch Manager"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteBm(bm.id || (bm as any)._id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 border border-slate-200 transition cursor-pointer inline-block align-middle"
                            title="Delete Branch Manager"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* TAB 2: TEAM MANAGERS */}
        {activeTab === "TM" && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <UserCog className="w-4.5 h-4.5 text-red-600" />
                Team Managers Master ({filteredTms.length})
              </h3>
              <span className="text-[10px] font-mono text-slate-400">{filteredTms.length} Records</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs font-medium text-slate-400">Loading Team Managers...</div>
            ) : filteredTms.length === 0 ? (
              <div className="py-10 text-center text-xs font-medium text-slate-400 space-y-2">
                <p className="italic">No Team Managers created yet.</p>
                <button
                  onClick={openCreateTm}
                  className="px-3.5 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold hover:bg-red-100 cursor-pointer transition inline-block"
                >
                  + Add Team Manager
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-slate-800">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Team Manager</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Employee Code</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Assigned Branch Manager</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Contact Info</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Status</th>
                      <th className="px-4 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                    {filteredTms.map((tm) => {
                      const bm = bms.find((b) => b.id === tm.bmId);
                      return (
                        <tr key={tm.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 border-r border-slate-100 font-semibold text-slate-900">
                            {tm.name}
                          </td>
                          <td className="px-4 py-3.5 border-r border-slate-100 font-mono text-red-700 font-semibold">
                            {tm.employeeCode || "—"}
                          </td>
                          <td className="px-4 py-3.5 border-r border-slate-100 font-medium text-slate-700">
                            {bm ? bm.name : tm.bmName || "Unassigned"}
                          </td>
                          <td className="px-4 py-3.5 border-r border-slate-100 font-mono text-[11px]">
                            <div>{tm.phone || "—"}</div>
                            <div className="text-slate-500">{tm.email || "—"}</div>
                          </td>
                          <td className="px-4 py-3.5 border-r border-slate-100">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                              tm.status === "Active" || !tm.status
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${tm.status === "Active" || !tm.status ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                              {tm.status || "Active"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-1.5">
                            <button
                              onClick={() => openEditTm(tm)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer transition shadow-2xs"
                              title="Edit Team Manager"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTm(tm.id || (tm as any)._id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 border border-slate-200 transition cursor-pointer inline-block align-middle"
                              title="Delete Team Manager"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* TAB 3: TEAM LEADERS */}
        {activeTab === "TL" && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-indigo-600" />
                Team Leaders Master ({filteredTLs.length})
              </h3>
              <span className="text-[10px] font-mono text-slate-400">{filteredTLs.length} Records</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs font-medium text-slate-400">Loading Team Leaders...</div>
            ) : filteredTLs.length === 0 ? (
              <div className="py-10 text-center text-xs font-medium text-slate-400 space-y-2">
                <p className="italic">No Team Leaders created yet.</p>
                <button
                  onClick={openCreateTl}
                  className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold hover:bg-indigo-100 cursor-pointer transition inline-block"
                >
                  + Add Team Leader
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-slate-800">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Team Leader</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Employee Code</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Team Manager</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Branch Manager</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Contact Info</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Status</th>
                      <th className="px-4 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                    {filteredTLs.map((tl) => {
                      const parentTm = tms.find((t) => t.id === tl.teamManagerId);
                      const parentBm = bms.find((b) => b.id === (tl.bmId || parentTm?.bmId));
                      return (
                        <tr key={tl.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 border-r border-slate-100 font-semibold text-slate-900">
                            {tl.name}
                          </td>
                          <td className="px-4 py-3.5 border-r border-slate-100 font-mono text-indigo-700 font-semibold">
                            {tl.employeeCode || "—"}
                          </td>
                          <td className="px-4 py-3.5 border-r border-slate-100 font-medium text-slate-700">
                            {parentTm ? parentTm.name : "Unassigned"}
                          </td>
                          <td className="px-4 py-3.5 border-r border-slate-100 font-medium text-slate-500">
                            {parentBm ? parentBm.name : "—"}
                          </td>
                          <td className="px-4 py-3.5 border-r border-slate-100 font-mono text-[11px]">
                            <div>{tl.phone || "—"}</div>
                            <div className="text-slate-500">{tl.email || "—"}</div>
                          </td>
                          <td className="px-4 py-3.5 border-r border-slate-100">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                              tl.status === "Active" || !tl.status
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${tl.status === "Active" || !tl.status ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                              {tl.status || "Active"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-1.5">
                            <button
                              onClick={() => openEditTl(tl)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer transition shadow-2xs"
                              title="Edit Team Leader"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTl(tl.id || (tl as any)._id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 border border-slate-200 transition cursor-pointer inline-block align-middle"
                              title="Delete Team Leader"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* TAB 4: TSES */}
        {activeTab === "TSE" && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <PhoneCall className="w-4.5 h-4.5 text-sky-600" />
                TSE Master List ({filteredCallers.length})
              </h3>
              <span className="text-[10px] font-mono text-slate-400">{filteredCallers.length} Records</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs font-medium text-slate-400">Loading TSEs...</div>
            ) : filteredCallers.length === 0 ? (
              <div className="py-10 text-center text-xs font-medium text-slate-400 space-y-2">
                <p className="italic">No TSEs created yet.</p>
                <button
                  onClick={openCreateCaller}
                  className="px-3.5 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-xl text-xs font-semibold hover:bg-sky-100 cursor-pointer transition inline-block"
                >
                  + Add TSE
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-slate-800">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3.5 border-r border-slate-200/50">TSE Name</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Employee Code</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Team Leader</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Team Manager</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Branch Manager</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Contact Info</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Status</th>
                      <th className="px-4 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                    {filteredCallers.map((c) => {
                      const parentTl = teamLeaders.find((tl) => tl.id === c.teamLeaderId);
                      const parentTm = tms.find((t) => t.id === (c.teamManagerId || parentTl?.teamManagerId));
                      const parentBm = bms.find((b) => b.id === (c.bmId || parentTm?.bmId || parentTl?.bmId));
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 border-r border-slate-100 font-semibold text-slate-900">
                            {c.name}
                          </td>
                          <td className="px-4 py-3.5 border-r border-slate-100 font-mono text-sky-700 font-semibold">
                            {c.employeeCode || "—"}
                          </td>
                          <td className="px-4 py-3.5 border-r border-slate-100 font-medium text-slate-700">
                            {parentTl ? parentTl.name : "Unassigned"}
                          </td>
                          <td className="px-4 py-3.5 border-r border-slate-100 font-medium text-slate-600">
                            {parentTm ? parentTm.name : "—"}
                          </td>
                          <td className="px-4 py-3.5 border-r border-slate-100 font-medium text-slate-500">
                            {parentBm ? parentBm.name : "—"}
                          </td>
                          <td className="px-4 py-3.5 border-r border-slate-100 font-mono text-[11px]">
                            <div>{c.phone || "—"}</div>
                            <div className="text-slate-500">{c.email || "—"}</div>
                          </td>
                          <td className="px-4 py-3.5 border-r border-slate-100">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                              c.status === "Active" || !c.status
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${c.status === "Active" || !c.status ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                              {c.status || "Active"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-1.5">
                            <button
                              onClick={() => openEditCaller(c)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer transition shadow-2xs"
                              title="Edit TSE"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCaller(c.id || (c as any)._id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 border border-slate-200 transition cursor-pointer inline-block align-middle"
                              title="Delete TSE"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* TAB 5: RENEWAL MANAGERS */}
        {activeTab === "RENEWAL_MANAGER" && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <RefreshCw className="w-4.5 h-4.5 text-purple-600" />
                Renewal Managers Master ({filteredRms.length})
              </h3>
              <span className="text-[10px] font-mono text-slate-400">{filteredRms.length} Records</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs font-medium text-slate-400">Loading Renewal Managers...</div>
            ) : filteredRms.length === 0 ? (
              <div className="py-10 text-center text-xs font-medium text-slate-400 space-y-2">
                <p className="italic">No Renewal Managers created yet.</p>
                <button
                  onClick={openCreateRm}
                  className="px-3.5 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold hover:bg-purple-100 cursor-pointer transition inline-block"
                >
                  + Add Renewal Manager
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-slate-800">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Renewal Manager</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Employee Code</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Contact Info</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Status</th>
                      <th className="px-4 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                    {filteredRms.map((rm) => (
                      <tr key={rm.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5 border-r border-slate-100 font-semibold text-slate-900">
                          {rm.name}
                        </td>
                        <td className="px-4 py-3.5 border-r border-slate-100 font-mono text-purple-700 font-semibold">
                          {rm.employeeCode || "—"}
                        </td>
                        <td className="px-4 py-3.5 border-r border-slate-100 font-mono text-[11px]">
                          <div>{rm.phone || "—"}</div>
                          <div className="text-slate-500">{rm.email || "—"}</div>
                        </td>
                        <td className="px-4 py-3.5 border-r border-slate-100">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                            rm.status === "Active" || !rm.status
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${rm.status === "Active" || !rm.status ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                            {rm.status || "Active"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-1.5">
                          <button
                            onClick={() => openEditRm(rm)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer transition shadow-2xs"
                            title="Edit Renewal Manager"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRm(rm.id || (rm as any)._id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 border border-slate-200 transition cursor-pointer inline-block align-middle"
                            title="Delete Renewal Manager"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* TAB 6: RENEWAL EXECUTIVES */}
        {activeTab === "RENEWAL_EXECUTIVE" && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <UserCheck className="w-4.5 h-4.5 text-amber-600" />
                Renewal Executives Master ({filteredRexs.length})
              </h3>
              <span className="text-[10px] font-mono text-slate-400">{filteredRexs.length} Records</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs font-medium text-slate-400">Loading Renewal Executives...</div>
            ) : filteredRexs.length === 0 ? (
              <div className="py-10 text-center text-xs font-medium text-slate-400 space-y-2">
                <p className="italic">No Renewal Executives created yet.</p>
                <button
                  onClick={openCreateRex}
                  className="px-3.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold hover:bg-amber-100 cursor-pointer transition inline-block"
                >
                  + Add Renewal Executive
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-slate-800">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Renewal Executive</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Employee Code</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Assigned Renewal Manager</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Contact Info</th>
                      <th className="px-4 py-3.5 border-r border-slate-200/50">Status</th>
                      <th className="px-4 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                    {filteredRexs.map((rex) => {
                      const parentRm = renewalManagers.find((r) => r.id === rex.renewalManagerId);
                      return (
                        <tr key={rex.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 border-r border-slate-100 font-semibold text-slate-900">
                            {rex.name}
                          </td>
                          <td className="px-4 py-3.5 border-r border-slate-100 font-mono text-amber-700 font-semibold">
                            {rex.employeeCode || "—"}
                          </td>
                          <td className="px-4 py-3.5 border-r border-slate-100 font-medium text-slate-700">
                            {parentRm ? parentRm.name : rex.renewalManagerName || "Unassigned"}
                          </td>
                          <td className="px-4 py-3.5 border-r border-slate-100 font-mono text-[11px]">
                            <div>{rex.phone || "—"}</div>
                            <div className="text-slate-500">{rex.email || "—"}</div>
                          </td>
                          <td className="px-4 py-3.5 border-r border-slate-100">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                              rex.status === "Active" || !rex.status
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${rex.status === "Active" || !rex.status ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                              {rex.status || "Active"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-1.5">
                            <button
                              onClick={() => openEditRex(rex)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer transition shadow-2xs"
                              title="Edit Renewal Executive"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteRex(rex.id || (rex as any)._id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 border border-slate-200 transition cursor-pointer inline-block align-middle"
                              title="Delete Renewal Executive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL: CREATE / EDIT BRANCH MANAGER */}
      <AnimatePresence>
        {modalType === "BM" && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-55 flex items-center justify-center p-4 sm:p-6 text-slate-800">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                <h3 className="text-sm font-bold text-slate-950 uppercase tracking-tight flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  {editingBm ? "Edit Branch Manager" : "Add Branch Manager Master"}
                </h3>
                <button onClick={() => setModalType(null)} className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleBmSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rakesh Sharma"
                    value={bmForm.name}
                    onChange={(e) => setBmForm({ ...bmForm, name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 9876543210"
                      value={bmForm.phone}
                      onChange={(e) => setBmForm({ ...bmForm, phone: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Employee Code</label>
                    <input
                      type="text"
                      placeholder="e.g. BM-101"
                      value={bmForm.employeeCode}
                      onChange={(e) => setBmForm({ ...bmForm, employeeCode: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="e.g. rakesh.bm@company.com"
                    value={bmForm.email}
                    onChange={(e) => setBmForm({ ...bmForm, email: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={bmForm.dob}
                    onChange={(e) => setBmForm({ ...bmForm, dob: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={bmForm.status}
                    onChange={(e) => setBmForm({ ...bmForm, status: e.target.value as any })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-2xs"
                  >
                    {submitting ? "Saving..." : editingBm ? "Update Branch Manager" : "Create Branch Manager"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CREATE / EDIT TEAM MANAGER */}
      <AnimatePresence>
        {modalType === "TM" && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-55 flex items-center justify-center p-4 sm:p-6 text-slate-800">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                <h3 className="text-sm font-bold text-slate-950 uppercase tracking-tight flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-red-600" />
                  {editingTm ? "Edit Team Manager" : "Add Team Manager Master"}
                </h3>
                <button onClick={() => setModalType(null)} className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleTmSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assign Branch Manager (Optional)</label>
                  <select
                    value={tmForm.bmId}
                    onChange={(e) => setTmForm({ ...tmForm, bmId: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  >
                    <option value="">-- Select Branch Manager --</option>
                    {bms.map((bm) => (
                      <option key={bm.id} value={bm.id}>
                        {bm.name} {bm.employeeCode ? `(${bm.employeeCode})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Mehta"
                    value={tmForm.name}
                    onChange={(e) => setTmForm({ ...tmForm, name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 9876543210"
                      value={tmForm.phone}
                      onChange={(e) => setTmForm({ ...tmForm, phone: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Employee Code</label>
                    <input
                      type="text"
                      placeholder="e.g. TM-101"
                      value={tmForm.employeeCode}
                      onChange={(e) => setTmForm({ ...tmForm, employeeCode: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="e.g. vikram.tm@company.com"
                    value={tmForm.email}
                    onChange={(e) => setTmForm({ ...tmForm, email: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={tmForm.dob}
                    onChange={(e) => setTmForm({ ...tmForm, dob: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={tmForm.status}
                    onChange={(e) => setTmForm({ ...tmForm, status: e.target.value as any })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-2xs"
                  >
                    {submitting ? "Saving..." : editingTm ? "Update Team Manager" : "Create Team Manager"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CREATE / EDIT TEAM LEADER */}
      <AnimatePresence>
        {modalType === "TL" && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-55 flex items-center justify-center p-4 sm:p-6 text-slate-800">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                <h3 className="text-sm font-bold text-slate-950 uppercase tracking-tight flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  {editingTl ? "Edit Team Leader" : "Add Team Leader Master"}
                </h3>
                <button onClick={() => setModalType(null)} className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleTlSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assign Branch Manager (Optional)</label>
                  <select
                    value={tlForm.bmId}
                    onChange={(e) => {
                      const selectedBmId = e.target.value;
                      const parentTm = tms.find(t => t.id === tlForm.teamManagerId);
                      const tmMatches = !selectedBmId || parentTm?.bmId === selectedBmId;
                      setTlForm({
                        ...tlForm,
                        bmId: selectedBmId,
                        teamManagerId: tmMatches ? tlForm.teamManagerId : ""
                      });
                    }}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  >
                    <option value="">-- Select Branch Manager --</option>
                    {bms.map((bm) => (
                      <option key={bm.id} value={bm.id}>
                        {bm.name} {bm.employeeCode ? `(${bm.employeeCode})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assign Team Manager (Optional)</label>
                  <select
                    value={tlForm.teamManagerId}
                    onChange={(e) => {
                      const selectedTmId = e.target.value;
                      const parentTm = tms.find(t => t.id === selectedTmId);
                      setTlForm({
                        ...tlForm,
                        teamManagerId: selectedTmId,
                        bmId: parentTm?.bmId || tlForm.bmId
                      });
                    }}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  >
                    <option value="">-- Select Team Manager --</option>
                    {tms
                      .filter((tm) => !tlForm.bmId || tm.bmId === tlForm.bmId)
                      .map((tm) => (
                        <option key={tm.id} value={tm.id}>
                          {tm.name} {tm.employeeCode ? `(${tm.employeeCode})` : ""}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amit Sharma"
                    value={tlForm.name}
                    onChange={(e) => setTlForm({ ...tlForm, name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 9876543210"
                      value={tlForm.phone}
                      onChange={(e) => setTlForm({ ...tlForm, phone: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Employee Code</label>
                    <input
                      type="text"
                      placeholder="e.g. TL-101"
                      value={tlForm.employeeCode}
                      onChange={(e) => setTlForm({ ...tlForm, employeeCode: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="e.g. amit@company.com"
                    value={tlForm.email}
                    onChange={(e) => setTlForm({ ...tlForm, email: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={tlForm.dob}
                    onChange={(e) => setTlForm({ ...tlForm, dob: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={tlForm.status}
                    onChange={(e) => setTlForm({ ...tlForm, status: e.target.value as any })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-2xs"
                  >
                    {submitting ? "Saving..." : editingTl ? "Update Team Leader" : "Create Team Leader"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CREATE / EDIT TSE */}
      <AnimatePresence>
        {modalType === "CALLER" && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-55 flex items-center justify-center p-4 sm:p-6 text-slate-800">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                <h3 className="text-sm font-bold text-slate-950 uppercase tracking-tight flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-sky-600" />
                  {editingCaller ? "Edit TSE Master" : "Add TSE Master Record"}
                </h3>
                <button onClick={() => setModalType(null)} className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCallerSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assign Branch Manager (Optional)</label>
                  <select
                    value={callerForm.bmId}
                    onChange={(e) => {
                      const selectedBmId = e.target.value;
                      const parentTm = tms.find(t => t.id === callerForm.teamManagerId);
                      const parentTl = teamLeaders.find(tl => tl.id === callerForm.teamLeaderId);
                      const tmMatches = !selectedBmId || parentTm?.bmId === selectedBmId;
                      const tlMatches = !selectedBmId || parentTl?.bmId === selectedBmId;
                      setCallerForm({
                        ...callerForm,
                        bmId: selectedBmId,
                        teamManagerId: tmMatches ? callerForm.teamManagerId : "",
                        teamLeaderId: tlMatches ? callerForm.teamLeaderId : ""
                      });
                    }}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  >
                    <option value="">-- Select Branch Manager --</option>
                    {bms.map((bm) => (
                      <option key={bm.id} value={bm.id}>
                        {bm.name} {bm.employeeCode ? `(${bm.employeeCode})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assign Team Manager (Optional)</label>
                  <select
                    value={callerForm.teamManagerId}
                    onChange={(e) => {
                      const selectedTmId = e.target.value;
                      const parentTm = tms.find(t => t.id === selectedTmId);
                      const parentTl = teamLeaders.find(tl => tl.id === callerForm.teamLeaderId);
                      const tlMatches = !selectedTmId || parentTl?.teamManagerId === selectedTmId;
                      setCallerForm({
                        ...callerForm,
                        teamManagerId: selectedTmId,
                        bmId: parentTm?.bmId || callerForm.bmId,
                        teamLeaderId: tlMatches ? callerForm.teamLeaderId : ""
                      });
                    }}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  >
                    <option value="">-- Select Team Manager --</option>
                    {tms
                      .filter((tm) => !callerForm.bmId || tm.bmId === callerForm.bmId)
                      .map((tm) => (
                        <option key={tm.id} value={tm.id}>
                          {tm.name} {tm.employeeCode ? `(${tm.employeeCode})` : ""}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assign Team Leader (Optional)</label>
                  <select
                    value={callerForm.teamLeaderId}
                    onChange={(e) => {
                      const selectedTlId = e.target.value;
                      const parentTl = teamLeaders.find(tl => tl.id === selectedTlId);
                      setCallerForm({
                        ...callerForm,
                        teamLeaderId: selectedTlId,
                        teamManagerId: parentTl?.teamManagerId || callerForm.teamManagerId,
                        bmId: parentTl?.bmId || callerForm.bmId
                      });
                    }}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  >
                    <option value="">-- Select Team Leader --</option>
                    {teamLeaders
                      .filter((tl) => (!callerForm.teamManagerId || tl.teamManagerId === callerForm.teamManagerId) && (!callerForm.bmId || tl.bmId === callerForm.bmId))
                      .map((tl) => (
                        <option key={tl.id} value={tl.id}>
                          {tl.name} {tl.employeeCode ? `(${tl.employeeCode})` : ""}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">TSE Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Verma"
                    value={callerForm.name}
                    onChange={(e) => setCallerForm({ ...callerForm, name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 9123456789"
                      value={callerForm.phone}
                      onChange={(e) => setCallerForm({ ...callerForm, phone: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Employee Code</label>
                    <input
                      type="text"
                      placeholder="e.g. TSE-202"
                      value={callerForm.employeeCode}
                      onChange={(e) => setCallerForm({ ...callerForm, employeeCode: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="e.g. rahul.tse@company.com"
                    value={callerForm.email}
                    onChange={(e) => setCallerForm({ ...callerForm, email: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={callerForm.dob}
                    onChange={(e) => setCallerForm({ ...callerForm, dob: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={callerForm.status}
                    onChange={(e) => setCallerForm({ ...callerForm, status: e.target.value as any })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-2xs"
                  >
                    {submitting ? "Saving..." : editingCaller ? "Update TSE" : "Create TSE"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CREATE / EDIT RENEWAL MANAGER */}
      <AnimatePresence>
        {modalType === "RENEWAL_MANAGER" && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-55 flex items-center justify-center p-4 sm:p-6 text-slate-800">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                <h3 className="text-sm font-bold text-slate-950 uppercase tracking-tight flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-purple-600" />
                  {editingRm ? "Edit Renewal Manager" : "Add Renewal Manager Master"}
                </h3>
                <button onClick={() => setModalType(null)} className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRmSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Sharma"
                    value={rmForm.name}
                    onChange={(e) => setRmForm({ ...rmForm, name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 9876543210"
                      value={rmForm.phone}
                      onChange={(e) => setRmForm({ ...rmForm, phone: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Employee Code</label>
                    <input
                      type="text"
                      placeholder="e.g. RM-101"
                      value={rmForm.employeeCode}
                      onChange={(e) => setRmForm({ ...rmForm, employeeCode: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="e.g. rajesh.rm@company.com"
                    value={rmForm.email}
                    onChange={(e) => setRmForm({ ...rmForm, email: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={rmForm.dob}
                    onChange={(e) => setRmForm({ ...rmForm, dob: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={rmForm.status}
                    onChange={(e) => setRmForm({ ...rmForm, status: e.target.value as any })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-2xs"
                  >
                    {submitting ? "Saving..." : editingRm ? "Update Renewal Manager" : "Create Renewal Manager"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CREATE / EDIT RENEWAL EXECUTIVE */}
      <AnimatePresence>
        {modalType === "RENEWAL_EXECUTIVE" && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-55 flex items-center justify-center p-4 sm:p-6 text-slate-800">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                <h3 className="text-sm font-bold text-slate-950 uppercase tracking-tight flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  {editingRex ? "Edit Renewal Executive" : "Add Renewal Executive Master"}
                </h3>
                <button onClick={() => setModalType(null)} className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRexSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Renewal Manager (Optional)</label>
                  <select
                    value={rexForm.renewalManagerId}
                    onChange={(e) => setRexForm({ ...rexForm, renewalManagerId: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  >
                    <option value="">-- No Manager Assigned --</option>
                    {renewalManagers.map((rm) => (
                      <option key={rm.id} value={rm.id}>
                        {rm.name} {rm.employeeCode ? `(${rm.employeeCode})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sunita Patel"
                    value={rexForm.name}
                    onChange={(e) => setRexForm({ ...rexForm, name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 9876543210"
                      value={rexForm.phone}
                      onChange={(e) => setRexForm({ ...rexForm, phone: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Employee Code</label>
                    <input
                      type="text"
                      placeholder="e.g. RE-101"
                      value={rexForm.employeeCode}
                      onChange={(e) => setRexForm({ ...rexForm, employeeCode: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="e.g. sunita.re@company.com"
                    value={rexForm.email}
                    onChange={(e) => setRexForm({ ...rexForm, email: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={rexForm.dob}
                    onChange={(e) => setRexForm({ ...rexForm, dob: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={rexForm.status}
                    onChange={(e) => setRexForm({ ...rexForm, status: e.target.value as any })}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-2xs"
                  >
                    {submitting ? "Saving..." : editingRex ? "Update Renewal Executive" : "Create Renewal Executive"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
