import React, { useState, useEffect } from "react";
import { TeamMember, PermissionKey } from "../types";
import { api } from "../lib/api";
import ConfirmModal from "./ConfirmModal";
import { UserCheck, Shield, Plus, Edit, Trash2, Key, CheckCircle, XCircle, Search, User, CheckSquare, Square } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface OperatorManagementProps {
  user: any;
}

export interface PermissionGroup {
  categoryName: string;
  permissions: { key: PermissionKey; label: string; description: string }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    categoryName: "Dashboard & Overview",
    permissions: [
      { key: "overview.view", label: "Overview Dashboard", description: "View summary statistics & overview page" },
      { key: "dashboard.view", label: "Dashboard Widgets", description: "View KPI cards & system status summary" }
    ]
  },
  {
    categoryName: "Policy Management Ledger",
    permissions: [
      { key: "policies.view", label: "View Policies Ledger", description: "Access policy list & policy detail pages" },
      { key: "policies.create", label: "Create Policy Record", description: "Register new policy entries" },
      { key: "policies.edit", label: "Edit Policy Record", description: "Modify existing policy & customer data" },
      { key: "policies.delete", label: "Delete Policy Record", description: "Delete policy records from database" },
      { key: "policies.export", label: "Export Policy Data", description: "Export policy ledger records to CSV" },
      { key: "policies.download", label: "Download Documents", description: "Download stored PDF policy documents" }
    ]
  },
  {
    categoryName: "New Business Portfolio",
    permissions: [
      { key: "newBusiness.view", label: "View New Business", description: "Access combined Fresh & Port portfolio" },
      { key: "newBusiness.create", label: "Create New Business", description: "Register new business policies" },
      { key: "newBusiness.edit", label: "Edit New Business", description: "Update new business registrations" },
      { key: "newBusiness.delete", label: "Delete New Business", description: "Remove new business registrations" },
      { key: "newBusiness.export", label: "Export New Business", description: "Export new business portfolio data" }
    ]
  },
  {
    categoryName: "Fresh Business Portfolio",
    permissions: [
      { key: "fresh.view", label: "View Fresh Portfolio", description: "Access Fresh policy registrations" },
      { key: "fresh.create", label: "Create Fresh Policy", description: "Register Fresh policy records" },
      { key: "fresh.edit", label: "Edit Fresh Policy", description: "Update Fresh policy registrations" },
      { key: "fresh.delete", label: "Delete Fresh Policy", description: "Remove Fresh policy records" },
      { key: "fresh.export", label: "Export Fresh Data", description: "Export Fresh portfolio dataset" }
    ]
  },
  {
    categoryName: "Portability Business Portfolio",
    permissions: [
      { key: "port.view", label: "View Portability Portfolio", description: "Access Ported policy registrations" },
      { key: "port.create", label: "Create Port Policy", description: "Register Ported policy records" },
      { key: "port.edit", label: "Edit Port Policy", description: "Update Ported policy registrations" },
      { key: "port.delete", label: "Delete Port Policy", description: "Remove Ported policy records" },
      { key: "port.export", label: "Export Port Data", description: "Export Portability portfolio dataset" }
    ]
  },
  {
    categoryName: "Policy Renewals Hub",
    permissions: [
      { key: "renewal.view", label: "View Renewals", description: "Access policy renewals hub & due dates" },
      { key: "renewal.create", label: "Create Renewal", description: "Register renewal policy entries" },
      { key: "renewal.edit", label: "Edit Renewal", description: "Modify renewal policy details" },
      { key: "renewal.delete", label: "Delete Renewal", description: "Delete renewal policy records" },
      { key: "renewal.export", label: "Export Renewals Report", description: "Export policy renewals report" }
    ]
  },
  {
    categoryName: "Client Birthday Tracker",
    permissions: [
      { key: "birthdays.view", label: "View Birthdays", description: "Access customer birthday reminder hub" },
      { key: "birthdays.create", label: "Create Birthday Entry", description: "Add customer birthday records" },
      { key: "birthdays.edit", label: "Edit Birthday Details", description: "Update customer birthday info" },
      { key: "birthdays.delete", label: "Delete Birthday", description: "Delete birthday records" }
    ]
  },
  {
    categoryName: "Revenue & Financials",
    permissions: [
      { key: "revenue.view", label: "View Revenue Dashboard", description: "Access financial revenue & payouts" },
      { key: "revenue.export", label: "Export Revenue Data", description: "Export financial revenue reports" }
    ]
  },
  {
    categoryName: "Insurance Contests",
    permissions: [
      { key: "contests.view", label: "View Contests", description: "Access active company contests" },
      { key: "contests.create", label: "Create Contest", description: "Add new insurance contest" },
      { key: "contests.edit", label: "Edit Contest", description: "Modify existing contest terms" },
      { key: "contests.delete", label: "Delete Contest", description: "Remove contest entries" }
    ]
  },
  {
    categoryName: "Performance & Conversion Reports",
    permissions: [
      { key: "reports.view", label: "View Reports", description: "Access conversion & performance reports" },
      { key: "reports.download", label: "Download Reports (PDF)", description: "Download formatted PDF reports" },
      { key: "reports.export", label: "Export Reports (CSV)", description: "Export report datasets to CSV" }
    ]
  },
  {
    categoryName: "Communication Dispatch Logs",
    permissions: [
      { key: "dispatch.view", label: "View Dispatch Logs", description: "Access email/WhatsApp communication logs" },
      { key: "dispatch.download", label: "Download Log Files", description: "Download dispatch attachments" },
      { key: "dispatch.export", label: "Export Dispatch Logs", description: "Export communication activity logs" }
    ]
  },
  {
    categoryName: "Team & Staff Management",
    permissions: [
      { key: "team.view", label: "View Team Hierarchy", description: "Access branch managers, team leaders, TSEs" },
      { key: "team.create", label: "Add Employee", description: "Onboard new staff members" },
      { key: "team.edit", label: "Edit Employee", description: "Modify staff designations & teams" },
      { key: "team.delete", label: "Delete Employee", description: "Remove staff members from system" },
      { key: "team.targets.manage", label: "Manage Team Targets", description: "Assign monthly targets to staff" }
    ]
  },
  {
    categoryName: "Employee Performance Tracking",
    permissions: [
      { key: "performance.view", label: "View Performance", description: "Access monthly employee performance" },
      { key: "performance.details", label: "View Performance Details", description: "Inspect employee drill-down stats" },
      { key: "performance.targets.manage", label: "Manage Targets", description: "Set/update monthly premium targets" },
      { key: "performance.export", label: "Export Performance Report", description: "Export monthly performance CSV" }
    ]
  },
  {
    categoryName: "Insurance Company Master",
    permissions: [
      { key: "insuranceCompanies.view", label: "View Insurance Companies", description: "Access company master list" },
      { key: "insuranceCompanies.create", label: "Add Insurance Company", description: "Create insurance company master" },
      { key: "insuranceCompanies.edit", label: "Edit Insurance Company", description: "Modify company payouts & terms" },
      { key: "insuranceCompanies.delete", label: "Delete Insurance Company", description: "Remove company from master list" }
    ]
  },
  {
    categoryName: "Gateway & Integration Settings",
    permissions: [
      { key: "gatewaySettings.view", label: "View Gateway Settings", description: "Access SMTP email & API configs" },
      { key: "gatewaySettings.edit", label: "Edit Gateway Settings", description: "Update credentials & gateway settings" }
    ]
  },
  {
    categoryName: "Highlights & Banners Management",
    permissions: [
      { key: "highlights.view", label: "View Highlights Banner", description: "View highlights on main dashboard" },
      { key: "highlightsManagement.view", label: "Highlights Admin Hub", description: "Access highlights management screen" },
      { key: "highlights.create", label: "Create Highlight", description: "Add new text highlights" },
      { key: "highlights.edit", label: "Edit Highlight", description: "Update existing highlight items" },
      { key: "highlights.delete", label: "Delete Highlight", description: "Delete highlight announcements" },
      { key: "highlights.banner.upload", label: "Upload Banner Image", description: "Upload top banner graphics" },
      { key: "highlights.banner.delete", label: "Delete Banner Image", description: "Delete top banner graphics" }
    ]
  },
  {
    categoryName: "Executive & Operator Management",
    permissions: [
      { key: "operators.view", label: "View Data Executives", description: "View list of data executive accounts" },
      { key: "operators.create", label: "Create Executive", description: "Onboard new data executive user" },
      { key: "operators.edit", label: "Edit Executive Permissions", description: "Modify executive RBAC permissions" },
      { key: "operators.delete", label: "Deactivate Executive", description: "Deactivate data executive accounts" }
    ]
  }
];

export default function OperatorManagement({ user }: OperatorManagementProps) {
  const [operators, setOperators] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<TeamMember | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    status: "Active" as "Active" | "Inactive",
    permissions: [
      "overview.view",
      "policies.view",
      "policies.create",
      "policies.edit",
      "renewals.view",
      "birthdays.view"
    ] as PermissionKey[]
  });

  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Confirm Deactivation Modal
  const [deactivateConfirm, setDeactivateConfirm] = useState<{ isOpen: boolean; operator: TeamMember | null }>({
    isOpen: false,
    operator: null
  });

  const fetchOperators = async () => {
    setLoading(true);
    try {
      const data = await api.getOperators();
      const normalizedData: TeamMember[] = (data || []).map((op: any) => {
        const idVal = (op._id || op.id || "").toString();
        return {
          ...op,
          _id: idVal,
          id: idVal
        };
      });
      setOperators(normalizedData);
    } catch (err: any) {
      console.error("Failed to fetch operators:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperators();
  }, []);

  const openCreateModal = () => {
    setEditingOperator(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      status: "Active",
      permissions: [
        "overview.view",
        "policies.view",
        "policies.create",
        "policies.edit",
        "renewals.view",
        "birthdays.view"
      ]
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (op: TeamMember) => {
    const idVal = (op._id || op.id || "").toString();
    const preservedOp: TeamMember = {
      ...op,
      _id: idVal,
      id: idVal
    };
    setEditingOperator(preservedOp);
    let perms = op.permissions ? [...op.permissions] : [];
    setFormData({
      name: op.name || "",
      email: op.email || "",
      password: "",
      status: op.status === "Inactive" ? "Inactive" : "Active",
      permissions: perms
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const togglePermission = (permKey: PermissionKey) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(permKey);
      if (exists) {
        return { ...prev, permissions: prev.permissions.filter((p) => p !== permKey) };
      } else {
        return { ...prev, permissions: [...prev.permissions, permKey] };
      }
    });
  };

  const selectAllInGroup = (group: PermissionGroup) => {
    setFormData(prev => {
      const groupKeys = group.permissions.map(p => p.key);
      const newPerms = Array.from(new Set([...prev.permissions, ...groupKeys]));
      return { ...prev, permissions: newPerms };
    });
  };

  const clearAllInGroup = (group: PermissionGroup) => {
    setFormData(prev => {
      const groupKeys = group.permissions.map(p => p.key);
      const newPerms = prev.permissions.filter(p => !groupKeys.includes(p));
      return { ...prev, permissions: newPerms };
    });
  };

  const selectAllPermissionsGlobal = () => {
    const allKeys = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));
    setFormData(prev => ({ ...prev, permissions: Array.from(new Set(allKeys)) }));
  };

  const clearAllPermissionsGlobal = () => {
    setFormData(prev => ({ ...prev, permissions: [] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError("Full Name and Email Address are required");
      return;
    }

    if (!editingOperator && !formData.password) {
      setFormError("Password is required for new data executive accounts");
      return;
    }

    const operatorId = (editingOperator?._id || editingOperator?.id || "").toString().trim();
    if (editingOperator && (!operatorId || operatorId === "undefined" || operatorId === "null")) {
      setFormError("User ID is required");
      return;
    }

    setSubmitting(true);
    try {
      if (editingOperator) {
        await api.updateOperator(operatorId, {
          userId: operatorId,
          id: operatorId,
          _id: operatorId,
          name: formData.name.trim(),
          fullName: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password.trim() ? formData.password.trim() : undefined,
          status: formData.status,
          permissions: formData.permissions
        });
      } else {
        await api.createOperator({
          name: formData.name.trim(),
          fullName: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          permissions: formData.permissions,
          status: formData.status
        });
      }
      setIsModalOpen(false);
      fetchOperators();
    } catch (err: any) {
      console.error("Save Operator Error:", err);
      setFormError(err.message || "Failed to save data executive details");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateConfirm.operator) return;
    const operatorId = (deactivateConfirm.operator._id || deactivateConfirm.operator.id || "").toString().trim();
    if (!operatorId || operatorId === "undefined" || operatorId === "null") {
      alert("User ID is required");
      return;
    }
    try {
      await api.updateOperator(operatorId, { status: "Inactive" });
      setDeactivateConfirm({ isOpen: false, operator: null });
      fetchOperators();
    } catch (err: any) {
      alert(err.message || "Failed to deactivate operator account");
    }
  };

  const filteredOperators = operators.filter(
    (op) =>
      (op.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (op.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#DFBFBA]/20 border border-[#DFBFBA]/60 text-[#660000] rounded-xl shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#660000] tracking-tight">
                Data Executive & Operator Management
              </h2>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Create data executive accounts and assign granular action-based access permissions.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-[#660000] hover:bg-[#520000] text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Executive</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search executive name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#660000] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-hidden"
            />
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            Total Executives: <strong className="text-slate-900">{operators.length}</strong>
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-semibold">
            Loading Data Executive accounts...
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">EXECUTIVE NAME</th>
                  <th className="px-4 py-3">EMAIL ADDRESS</th>
                  <th className="px-4 py-3">GRANTED PERMISSIONS</th>
                  <th className="px-4 py-3 text-center">STATUS</th>
                  <th className="px-4 py-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredOperators.map((op) => (
                  <tr key={op._id || op.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#DFBFBA]/20 text-[#660000] font-bold text-xs flex items-center justify-center border border-[#DFBFBA]">
                        {op.name ? op.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <span>{op.name}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{op.email}</td>
                    <td className="px-4 py-3 max-w-md">
                      {op.permissions && op.permissions.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {op.permissions.slice(0, 4).map((pKey) => (
                            <span
                              key={pKey}
                              className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-semibold rounded-md"
                            >
                              {pKey}
                            </span>
                          ))}
                          {op.permissions.length > 4 && (
                            <span className="px-2 py-0.5 bg-[#DFBFBA]/20 border border-[#DFBFBA]/60 text-[#660000] text-[10px] font-bold rounded-md">
                              +{op.permissions.length - 4} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No permissions assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          op.status === "Inactive"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {op.status === "Inactive" ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                        {op.status || "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(op)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-[#660000]" />
                          <span>Edit</span>
                        </button>
                        {op.status !== "Inactive" && (
                          <button
                            onClick={() => setDeactivateConfirm({ isOpen: true, operator: op })}
                            className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Deactivate Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredOperators.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs font-normal">
                      No executive accounts found matching search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT EXECUTIVE MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#660000] flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#660000]" />
                    <span>{editingOperator ? "Edit Executive Permissions" : "+ Add New Data Executive"}</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-normal">
                    Configure login credentials and select granted module permissions.
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 rounded-lg p-1 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#660000] rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. ramesh@organization.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#660000] rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {editingOperator ? "New Password (leave blank to keep existing)" : "Password *"}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#660000] rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Account Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#660000] rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* PERMISSION MANAGEMENT HEADER */}
                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wide text-slate-900 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#660000]" /> Access Permissions Matrix
                      </span>
                      <span className="text-[11px] text-slate-500 font-normal block mt-0.5">
                        Selected actions define exact feature access for this executive.
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-[#DFBFBA]/30 text-[#660000] border border-[#DFBFBA] text-xs font-bold rounded-lg font-mono">
                        {formData.permissions.length} Selected
                      </span>
                      <button
                        type="button"
                        onClick={selectAllPermissionsGlobal}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold rounded-lg transition cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={clearAllPermissionsGlobal}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold rounded-lg transition cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* GROUPED PERMISSION SECTIONS */}
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                    {PERMISSION_GROUPS.map((group) => {
                      const groupKeys = group.permissions.map(p => p.key);
                      const selectedCount = groupKeys.filter(k => formData.permissions.includes(k)).length;
                      const allSelected = selectedCount === groupKeys.length;

                      return (
                        <div key={group.categoryName} className="border border-slate-200 rounded-xl p-3.5 space-y-3 bg-white">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-xs font-extrabold text-[#660000] uppercase tracking-wide flex items-center gap-2">
                              <span>{group.categoryName}</span>
                              <span className="text-[10px] font-mono text-slate-400 font-normal">
                                ({selectedCount}/{groupKeys.length})
                              </span>
                            </span>

                            <div className="flex items-center gap-2 text-[11px] font-semibold">
                              <button
                                type="button"
                                onClick={() => selectAllInGroup(group)}
                                className="text-[#660000] hover:underline cursor-pointer"
                              >
                                Select Group
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                type="button"
                                onClick={() => clearAllInGroup(group)}
                                className="text-slate-500 hover:underline cursor-pointer"
                              >
                                Clear Group
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {group.permissions.map((perm) => {
                              const isChecked = formData.permissions.includes(perm.key);
                              return (
                                <label
                                  key={perm.key}
                                  onClick={() => togglePermission(perm.key)}
                                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition select-none ${
                                    isChecked
                                      ? "bg-[#DFBFBA]/20 border-[#DFBFBA] text-slate-900 shadow-2xs"
                                      : "bg-slate-50/50 border-slate-200 hover:border-slate-300 text-slate-700"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}}
                                    className="mt-0.5 accent-[#660000] cursor-pointer"
                                  />
                                  <div>
                                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                                      {perm.label}
                                    </span>
                                    <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                                      {perm.description}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-[#660000] hover:bg-[#520000] text-white font-semibold rounded-xl text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : editingOperator ? "Save Changes" : "Create Executive"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DEACTIVATION MODAL */}
      {deactivateConfirm.isOpen && deactivateConfirm.operator && (
        <ConfirmModal
          isOpen={deactivateConfirm.isOpen}
          title="Deactivate Data Executive"
          message={`Are you sure you want to deactivate ${deactivateConfirm.operator.name}'s account? They will lose access to Policy Master.`}
          confirmText="Yes, Deactivate Account"
          onConfirm={handleDeactivate}
          onCancel={() => setDeactivateConfirm({ isOpen: false, operator: null })}
        />
      )}
    </div>
  );
}
