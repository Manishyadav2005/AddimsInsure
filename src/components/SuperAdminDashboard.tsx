import React, { useState, useEffect } from "react";
import { api, UserSession } from "../lib/api";
import { Tenant, SuperAdminStats } from "../types";
import { 
  Building2, Shield, Plus, Calendar, CheckCircle2, AlertTriangle, 
  XCircle, Clock, Search, LogOut, RefreshCw, Layers, Lock, UserCheck, Key, Edit, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ConfirmModal from "./ConfirmModal";
import BrandLogo from "./BrandLogo";

interface SuperAdminDashboardProps {
  user: UserSession;
  onLogOut: () => void;
}

export default function SuperAdminDashboard({ user, onLogOut }: SuperAdminDashboardProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  // Form State - Create
  const [name, setName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState<"Basic" | "Pro" | "Enterprise">("Pro");
  const [monthsValid, setMonthsValid] = useState(12);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Form State - Edit
  const [editName, setEditName] = useState("");
  const [editAdminName, setEditAdminName] = useState("");
  const [editAdminEmail, setEditAdminEmail] = useState("");
  const [editPlan, setEditPlan] = useState<"Basic" | "Pro" | "Enterprise">("Pro");
  const [editStatus, setEditStatus] = useState<"Active" | "Suspended">("Active");
  const [editValidUntil, setEditValidUntil] = useState("");
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const openEditModal = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditName(tenant.name);
    setEditAdminName(tenant.adminName || "");
    setEditAdminEmail(tenant.adminEmail);
    setEditPlan(tenant.plan as any);
    setEditStatus(tenant.status as any);
    const vDate = new Date(tenant.validUntil);
    setEditValidUntil(vDate.toISOString().split("T")[0]);
    setEditError("");
  };

  const handleSaveTenantChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setEditLoading(true);
    setEditError("");

    try {
      await api.updateTenantSubscription(editingTenant._id, {
        name: editName,
        adminName: editAdminName,
        adminEmail: editAdminEmail,
        plan: editPlan,
        status: editStatus,
        validUntil: editValidUntil
      });
      setEditingTenant(null);
      fetchSuperAdminData();
    } catch (err: any) {
      setEditError(err.message || "Failed to update client company.");
    } finally {
      setEditLoading(false);
    }
  };

  const fetchSuperAdminData = async () => {
    setLoading(true);
    try {
      const [fetchedStats, fetchedTenants] = await Promise.all([
        api.getSuperAdminStats(),
        api.getTenants()
      ]);
      setStats(fetchedStats);
      setTenants(fetchedTenants);
    } catch (err) {
      console.error("SuperAdmin Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuperAdminData();
  }, []);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    try {
      await api.createTenant({
        name,
        adminName,
        adminEmail,
        password,
        plan,
        monthsValid
      });
      setIsCreateModalOpen(false);
      setName("");
      setAdminName("");
      setAdminEmail("");
      setPassword("");
      fetchSuperAdminData();
    } catch (err: any) {
      setFormError(err.message || "Failed to create client company.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleExtendSubscription = async (tenantId: string, addMonths: number) => {
    try {
      await api.updateTenantSubscription(tenantId, { addMonths });
      fetchSuperAdminData();
    } catch (err) {
      console.error("Extend Subscription Error:", err);
    }
  };

  const handleToggleStatus = async (tenantId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "Active" ? "Suspended" : "Active";
    try {
      await api.updateTenantSubscription(tenantId, { status: nextStatus });
      fetchSuperAdminData();
    } catch (err) {
      console.error("Toggle Status Error:", err);
    }
  };

  const [deleteConfirmState, setDeleteConfirmState] = useState<{ isOpen: boolean; tenantId: string; companyName: string }>({
    isOpen: false,
    tenantId: "",
    companyName: ""
  });

  const handleDeleteCompanyClick = (tenantId: string, companyName: string) => {
    setDeleteConfirmState({ isOpen: true, tenantId, companyName });
  };

  const handleConfirmDeleteCompany = async () => {
    if (!deleteConfirmState.tenantId) return;
    try {
      await api.deleteTenant(deleteConfirmState.tenantId);
      fetchSuperAdminData();
    } catch (err) {
      console.error("Delete Tenant Error:", err);
    } finally {
      setDeleteConfirmState({ isOpen: false, tenantId: "", companyName: "" });
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.adminEmail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div 
      className="min-h-screen relative flex flex-col font-sans select-none overflow-x-hidden text-stone-900"
      style={{
        backgroundColor: "#ece5d8",
        backgroundImage: `
          radial-gradient(circle at 50% 20%, #f9f6f0 0%, #e9e1d3 50%, #d8cdbd 100%),
          linear-gradient(to right, rgba(230, 92, 0, 0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(230, 92, 0, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: "100% 100%, 32px 32px, 32px 32px"
      }}
    >
      {/* Ambient background glow highlights */}
      <div className="absolute w-[700px] h-[700px] bg-gradient-to-tr from-blue-600/10 to-cyan-500/10 rounded-full blur-[130px] pointer-events-none -translate-y-32 left-1/2 -translate-x-1/2" />

      {/* Header Bar */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3.5">
          <BrandLogo size="md" className="shrink-0" />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black tracking-tight text-slate-900 font-sans">
                Addims <span className="text-blue-600">InSure</span> Owner Portal
              </h1>
              <span className="text-[10px] font-mono font-extrabold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200 shadow-2xs">
                SUPER ADMIN
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Enterprise Client Subscription &amp; Platform Management &bull; Powered by Addims</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={fetchSuperAdminData}
            disabled={loading}
            className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition cursor-pointer border border-slate-200 shadow-2xs"
            title="Refresh Platform Data"
          >
            <RefreshCw className={`w-4.5 h-4.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>

          <div className="h-7 w-px bg-slate-200" />

          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl">
            <div className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              SA
            </div>
            <span className="font-extrabold text-xs text-slate-800 hidden sm:inline">{user.email}</span>
          </div>

          <button
            onClick={onLogOut}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8 relative z-10">
        
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Clients */}
          <div className="relative overflow-hidden bg-white border border-stone-200/80 p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 group">
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-amber-50/60 opacity-60 pointer-events-none transition-transform duration-500 group-hover:scale-110" />
            <div className="space-y-1.5 min-w-0 pr-3 relative z-10">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400 block font-sans tracking-wide">TOTAL CLIENTS</span>
              <div className="text-3xl font-black text-stone-900 tracking-tight font-sans">{stats?.totalTenants || 0}</div>
              <div className="text-xs text-stone-400 font-semibold block">Registered Client Companies</div>
            </div>
            <div className="w-12 h-12 bg-amber-50/90 text-amber-600 border border-amber-100 rounded-2xl flex items-center justify-center shrink-0 relative z-10 shadow-2xs">
              <Building2 className="w-5.5 h-5.5 stroke-[2.2]" />
            </div>
          </div>

          {/* Card 2: Active Subscriptions */}
          <div className="relative overflow-hidden bg-white border border-stone-200/80 p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 group">
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-emerald-50/60 opacity-60 pointer-events-none transition-transform duration-500 group-hover:scale-110" />
            <div className="space-y-1.5 min-w-0 pr-3 relative z-10">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400 block font-sans tracking-wide">ACTIVE SUBSCRIPTIONS</span>
              <div className="text-3xl font-black text-stone-900 tracking-tight font-sans">{stats?.activeTenants || 0}</div>
              <div className="text-xs text-emerald-600 font-bold block">Active paying clients</div>
            </div>
            <div className="w-12 h-12 bg-emerald-50/90 text-emerald-600 border border-emerald-100 rounded-2xl flex items-center justify-center shrink-0 relative z-10 shadow-2xs">
              <CheckCircle2 className="w-5.5 h-5.5 stroke-[2.2]" />
            </div>
          </div>

          {/* Card 3: Suspended / Expired */}
          <div className="relative overflow-hidden bg-white border border-stone-200/80 p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 group">
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-rose-50/60 opacity-60 pointer-events-none transition-transform duration-500 group-hover:scale-110" />
            <div className="space-y-1.5 min-w-0 pr-3 relative z-10">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400 block font-sans tracking-wide">SUSPENDED / EXPIRED</span>
              <div className="text-3xl font-black text-stone-900 tracking-tight font-sans">{(stats?.suspendedTenants || 0) + (stats?.expiredTenants || 0)}</div>
              <div className="text-xs text-rose-500 font-semibold block">Needs subscription renewal</div>
            </div>
            <div className="w-12 h-12 bg-rose-50/90 text-rose-600 border border-rose-100 rounded-2xl flex items-center justify-center shrink-0 relative z-10 shadow-2xs">
              <AlertTriangle className="w-5.5 h-5.5 stroke-[2.2]" />
            </div>
          </div>

          {/* Card 4: Total System Policies */}
          <div className="relative overflow-hidden bg-white border border-stone-200/80 p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 group">
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-sky-50/60 opacity-60 pointer-events-none transition-transform duration-500 group-hover:scale-110" />
            <div className="space-y-1.5 min-w-0 pr-3 relative z-10">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400 block font-sans tracking-wide">TOTAL SYSTEM POLICIES</span>
              <div className="text-3xl font-black text-stone-900 tracking-tight font-sans">{stats?.totalPolicies || 0}</div>
              <div className="text-xs text-stone-400 font-semibold block">Managed across tenants</div>
            </div>
            <div className="w-12 h-12 bg-sky-50/90 text-sky-600 border border-sky-100 rounded-2xl flex items-center justify-center shrink-0 relative z-10 shadow-2xs">
              <Layers className="w-5.5 h-5.5 stroke-[2.2]" />
            </div>
          </div>
        </div>

        {/* Search & Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-stone-400 absolute left-4 top-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search company name or admin email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/95 border border-stone-200/90 rounded-2xl text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#ff5e00] focus:ring-2 focus:ring-[#ff5e00]/20 text-sm shadow-xs transition-all font-medium"
            />
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Create Client Company
          </button>
        </div>

        {/* Client Companies Table */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-800 border-collapse">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 border-r border-slate-200">Company Name</th>
                  <th className="px-4 py-3 border-r border-slate-200">Admin Email</th>
                  <th className="px-4 py-3 border-r border-slate-200">Plan</th>
                  <th className="px-4 py-3 border-r border-slate-200">Valid Until</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500 font-bold">
                      <Building2 className="w-8 h-8 mx-auto text-slate-400 mb-2 stroke-[1.5]" />
                      No client companies created yet. Click "+ Create Client Company" to create your first client!
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => {
                    const validDate = new Date(t.validUntil);
                    const isExpired = validDate < new Date();
                    const daysLeft = Math.ceil((validDate.getTime() - Date.now()) / (1000 * 3600 * 24));

                    return (
                      <tr key={t._id} className="hover:bg-slate-50/80 transition-colors duration-150 border-b border-slate-200">
                        <td className="px-4 py-2.5 font-black text-[#ff5e00] font-mono text-xs border-r border-slate-100 flex items-center gap-2">
                          <span className="text-[#ff5e00] font-extrabold uppercase">{t.name}</span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 font-mono text-[11px] font-bold border-r border-slate-100">{t.adminEmail}</td>
                        <td className="px-4 py-2.5 border-r border-slate-100">
                          <span className="px-2 py-0.5 rounded border border-slate-900 bg-white text-slate-900 font-mono text-[10px] font-black uppercase tracking-wider">
                            {t.plan}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 border-r border-slate-100 font-mono">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-extrabold text-slate-900">
                              {validDate.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                            <span className={`text-[9px] font-bold ${isExpired ? "text-red-600" : daysLeft <= 15 ? "text-amber-600" : "text-slate-400"}`}>
                              {isExpired ? "Expired" : `${daysLeft} days remaining`}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 border-r border-slate-100 text-center">
                          <span className="px-2 py-0.5 rounded border border-slate-900 bg-white text-slate-900 font-mono text-[10px] font-black uppercase">
                            {isExpired ? "EXPIRED" : t.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(t)}
                              className="p-2 bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-900 rounded-lg shadow-[1px_1px_0px_0px_#0f172a] active:translate-y-0.5 transition-all cursor-pointer"
                              title="Edit Client Company"
                            >
                              <Edit className="w-4 h-4 stroke-[2.2]" />
                            </button>

                            <button
                              onClick={() => handleDeleteCompanyClick(t._id, t.name)}
                              className="p-2 bg-white hover:bg-red-50 text-red-600 border-2 border-slate-900 rounded-lg shadow-[1px_1px_0px_0px_#0f172a] active:translate-y-0.5 transition-all cursor-pointer"
                              title="Delete Client Company"
                            >
                              <Trash2 className="w-4 h-4 stroke-[2.2]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create Company Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-white/98 backdrop-blur-2xl border border-stone-200 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.25)] p-7 relative z-10 text-stone-900"
            >
              <div className="flex items-center justify-between mb-6 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 bg-gradient-to-br from-[#ff5e00] to-[#ff0022] text-white rounded-2xl flex items-center justify-center shadow-[0_6px_20px_rgba(255,94,0,0.3)]">
                    <Building2 className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-stone-900 tracking-tight">Create Client Company Account</h2>
                    <p className="text-xs text-stone-500 font-medium">Setup company admin credentials and subscription</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 text-stone-400 hover:text-stone-800 rounded-xl hover:bg-stone-100 cursor-pointer transition"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateCompany} className="space-y-4.5">
                <div>
                  <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1.5">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Financial Corp"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50/80 border border-stone-200 rounded-2xl text-stone-900 text-sm focus:outline-none focus:border-[#ff5e00] focus:ring-2 focus:ring-[#ff5e00]/20 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1.5">
                    Admin Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sanjeev Kumar"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50/80 border border-stone-200 rounded-2xl text-stone-900 text-sm focus:outline-none focus:border-[#ff5e00] focus:ring-2 focus:ring-[#ff5e00]/20 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1.5">
                    Client Admin Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@clientcompany.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50/80 border border-stone-200 rounded-2xl text-stone-900 text-sm focus:outline-none focus:border-[#ff5e00] focus:ring-2 focus:ring-[#ff5e00]/20 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1.5">
                    Initial Password
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Set password for client admin"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50/80 border border-stone-200 rounded-2xl text-stone-900 text-sm focus:outline-none focus:border-[#ff5e00] focus:ring-2 focus:ring-[#ff5e00]/20 font-mono font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1.5">
                      Subscription Plan
                    </label>
                    <select
                      value={plan}
                      onChange={(e) => setPlan(e.target.value as any)}
                      className="w-full px-4 py-3 bg-stone-50/80 border border-stone-200 rounded-2xl text-stone-900 text-sm focus:outline-none focus:border-[#ff5e00] focus:ring-2 focus:ring-[#ff5e00]/20 font-bold"
                    >
                      <option value="Basic">Basic (₹499/mo)</option>
                      <option value="Pro">Pro (₹1,499/mo)</option>
                      <option value="Enterprise">Enterprise (₹4,999/mo)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1.5">
                      Validity Period
                    </label>
                    <select
                      value={monthsValid}
                      onChange={(e) => setMonthsValid(parseInt(e.target.value, 10))}
                      className="w-full px-4 py-3 bg-stone-50/80 border border-stone-200 rounded-2xl text-stone-900 text-sm focus:outline-none focus:border-[#ff5e00] focus:ring-2 focus:ring-[#ff5e00]/20 font-bold"
                    >
                      <option value={1}>1 Month Trial</option>
                      <option value={6}>6 Months</option>
                      <option value={12}>1 Year (12 Months)</option>
                      <option value={24}>2 Years</option>
                    </select>
                  </div>
                </div>

                <div className="pt-5 border-t border-stone-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-5 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl text-xs font-extrabold transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition shadow-sm cursor-pointer"
                  >
                    {formLoading ? "Creating..." : "Create & Activate Company"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Company Modal */}
      <AnimatePresence>
        {editingTenant && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 relative z-10 text-slate-800 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black uppercase text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#ff5e00]" />
                  Edit Client Company
                </h3>
                <button onClick={() => setEditingTenant(null)} className="text-slate-500 hover:text-slate-900 font-black cursor-pointer text-lg">
                  ✕
                </button>
              </div>

              {editError && (
                <div className="p-3 bg-red-50 border-2 border-red-500 text-red-700 font-bold text-xs rounded">
                  {editError}
                </div>
              )}

              <form onSubmit={handleSaveTenantChanges} className="space-y-4 text-xs font-bold">
                <div>
                  <label className="block text-slate-800 uppercase tracking-wider text-[10px] mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-900 rounded font-bold text-xs bg-white text-slate-900 focus:outline-none focus:border-[#ff5e00]"
                  />
                </div>

                <div>
                  <label className="block text-slate-800 uppercase tracking-wider text-[10px] mb-1">Admin Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sanjeev Kumar"
                    value={editAdminName}
                    onChange={(e) => setEditAdminName(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-900 rounded font-bold text-xs bg-white text-slate-900 focus:outline-none focus:border-[#ff5e00]"
                  />
                </div>

                <div>
                  <label className="block text-slate-800 uppercase tracking-wider text-[10px] mb-1">Admin Email Address</label>
                  <input
                    type="email"
                    required
                    value={editAdminEmail}
                    onChange={(e) => setEditAdminEmail(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-900 rounded font-mono text-xs bg-white text-slate-900 focus:outline-none focus:border-[#ff5e00]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-800 uppercase tracking-wider text-[10px] mb-1">Subscription Plan</label>
                    <select
                      value={editPlan}
                      onChange={(e) => setEditPlan(e.target.value as any)}
                      className="w-full px-3 py-2 border-2 border-slate-900 rounded font-black text-xs bg-white text-slate-900 focus:outline-none"
                    >
                      <option value="Basic">Basic Plan</option>
                      <option value="Pro">Pro Plan</option>
                      <option value="Enterprise">Enterprise Plan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-800 uppercase tracking-wider text-[10px] mb-1">Account Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border-2 border-slate-900 rounded font-black text-xs bg-white text-slate-900 focus:outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-800 uppercase tracking-wider text-[10px] mb-1">Valid Until Date</label>
                  <input
                    type="date"
                    required
                    value={editValidUntil}
                    onChange={(e) => setEditValidUntil(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-900 rounded font-mono text-xs bg-white text-slate-900 focus:outline-none focus:border-[#ff5e00]"
                  />
                </div>

                <div>
                  <label className="block text-slate-800 uppercase tracking-wider text-[10px] mb-2">Quick Extend Options</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await handleExtendSubscription(editingTenant._id, 1);
                        const vDate = new Date(editingTenant.validUntil);
                        vDate.setMonth(vDate.getMonth() + 1);
                        setEditValidUntil(vDate.toISOString().split("T")[0]);
                      }}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-xs uppercase border-2 border-slate-900 rounded active:translate-y-0.5 cursor-pointer"
                    >
                      +1 Month
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleExtendSubscription(editingTenant._id, 12);
                        const vDate = new Date(editingTenant.validUntil);
                        vDate.setMonth(vDate.getMonth() + 12);
                        setEditValidUntil(vDate.toISOString().split("T")[0]);
                      }}
                      className="flex-1 py-2 bg-amber-100 hover:bg-amber-200 text-amber-950 font-black text-xs uppercase border-2 border-slate-900 rounded active:translate-y-0.5 cursor-pointer"
                    >
                      +1 Year
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingTenant(null)}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase border border-slate-200 rounded-xl cursor-pointer shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="px-6 py-2 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-2xs cursor-pointer"
                  >
                    {editLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmState.isOpen}
        title="Delete Client Company"
        message={`Are you sure you want to delete '${deleteConfirmState.companyName}' and remove its admin account? This action cannot be undone.`}
        confirmText="Delete Company"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmDeleteCompany}
        onCancel={() => setDeleteConfirmState({ isOpen: false, tenantId: "", companyName: "" })}
      />
    </div>
  );
}
