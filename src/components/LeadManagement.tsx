import React, { useState, useEffect } from "react";
import { api, UserSession } from "../lib/api";
import { Lead, CallStatus } from "../types";
import { PhoneCall, Plus, Search, RefreshCw, Calendar, CheckCircle2, Clock, MessageSquare, ArrowRight, UserCheck, AlertCircle, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LeadManagementProps {
  user: UserSession;
}

const CALL_STATUSES: { status: CallStatus; label: string; color: string }[] = [
  { status: "New", label: "New Lead", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { status: "Contacted", label: "Contacted", color: "bg-sky-50 text-sky-700 border-sky-200" },
  { status: "Interested", label: "Interested", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { status: "Follow-up", label: "Follow-up Scheduled", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { status: "Call Back", label: "Call Back Needed", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { status: "No Answer", label: "No Answer", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { status: "Not Interested", label: "Not Interested", color: "bg-stone-100 text-stone-600 border-stone-200" },
  { status: "Converted", label: "Converted Policy", color: "bg-purple-50 text-purple-700 border-purple-200" },
];

export default function LeadManagement({ user }: LeadManagementProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Add Lead Form State
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [policyType, setPolicyType] = useState("Health Insurance");
  const [estimatedAmount, setEstimatedAmount] = useState(15000);
  const [followUpDate, setFollowUpDate] = useState("");

  // Update Call Status Modal State
  const [newStatus, setNewStatus] = useState<CallStatus>("Contacted");
  const [callNote, setCallNote] = useState("");
  const [updateFollowUp, setUpdateFollowUp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Assign Lead Modal State
  const [assigningLead, setAssigningLead] = useState<Lead | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [targetCallerId, setTargetCallerId] = useState("");

  const fetchLeads = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getLeads();
      setLeads(data);
      if (user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "TEAM_LEADER") {
        const team = await api.getTeamMembers();
        setTeamMembers(team);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (window.confirm("Are you sure you want to delete this lead? This will permanently delete it from MongoDB.")) {
      try {
        await api.deleteLead(leadId);
        fetchLeads();
      } catch (err: any) {
        setError(err.message || "Failed to delete lead");
      }
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await api.createLead({
        customerName,
        customerEmail,
        customerPhone,
        policyType,
        estimatedAmount: Number(estimatedAmount),
        followUpDate: followUpDate ? followUpDate : undefined
      });
      setIsAddModalOpen(false);
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      fetchLeads();
    } catch (err: any) {
      setError(err.message || "Failed to create lead");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCallStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setSubmitting(true);
    setError("");

    try {
      await api.updateLeadStatus(selectedLead.id || selectedLead._id!, {
        callStatus: newStatus,
        note: callNote,
        followUpDate: updateFollowUp ? updateFollowUp : undefined
      });
      setSelectedLead(null);
      setCallNote("");
      fetchLeads();
    } catch (err: any) {
      setError(err.message || "Failed to update call status");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertLead = async (lead: Lead) => {
    if (!window.confirm(`Convert lead '${lead.customerName}' into a Customer and register Policy?`)) return;
    try {
      await api.convertLeadToCustomer(lead.id || lead._id!, {
        companyName: "Star Health Insurance",
        policyType: lead.policyType || "Health Insurance",
        premiumAmount: lead.estimatedAmount || 15000,
        premiumFrequency: "Yearly"
      });
      fetchLeads();
    } catch (err: any) {
      setError(err.message || "Failed to convert lead to customer");
    }
  };

  const handleAssignLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningLead || !targetCallerId) return;
    setSubmitting(true);
    setError("");

    try {
      await api.assignLead(assigningLead.id || assigningLead._id!, targetCallerId);
      setAssigningLead(null);
      setTargetCallerId("");
      fetchLeads();
    } catch (err: any) {
      setError(err.message || "Failed to assign lead");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.customerName.toLowerCase().includes(search.toLowerCase()) || 
                          (l.customerPhone && l.customerPhone.includes(search)) ||
                          (l.customerEmail && l.customerEmail.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "All" || l.callStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-stone-200/90 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <PhoneCall className="w-6 h-6 text-[#ff5e00]" />
            Leads & Caller Activity Dashboard
          </h2>
          <p className="text-xs text-stone-500 font-medium">
            Manage assigned customer leads, call dispositions, notes, and policy conversions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLeads}
            disabled={loading}
            className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition cursor-pointer"
            title="Refresh Leads"
          >
            <RefreshCw className={`w-4.5 h-4.5 ${loading ? "animate-spin text-[#ff5e00]" : ""}`} />
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-[#ff5e00] to-[#ff0022] hover:brightness-105 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add New Lead
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search lead name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:border-[#ff5e00]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter("All")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
              statusFilter === "All"
                ? "bg-stone-900 text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
          >
            All Leads ({leads.length})
          </button>

          {CALL_STATUSES.map(s => (
            <button
              key={s.status}
              onClick={() => setStatusFilter(s.status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer whitespace-nowrap border ${
                statusFilter === s.status ? "ring-2 ring-[#ff5e00] " + s.color : s.color
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 border-r border-slate-200/50">Customer</th>
                <th className="px-5 py-3.5 border-r border-slate-200/50">Phone & Email</th>
                <th className="px-5 py-3.5 border-r border-slate-200/50">Policy Interest</th>
                <th className="px-5 py-3.5 border-r border-slate-200/50">Call Status</th>
                <th className="px-5 py-3.5 border-r border-slate-200/50">Follow-up Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs text-slate-500 font-medium">
                    No leads found matching your criteria. Click "+ Add New Lead" to create a lead!
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const statusInfo = CALL_STATUSES.find(s => s.status === lead.callStatus) || CALL_STATUSES[0];

                  return (
                    <tr key={lead._id || lead.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 border-r border-slate-100">
                        <div className="font-semibold text-slate-900 text-xs">{lead.customerName}</div>
                        {lead.assignedToName && (
                          <div className="text-[11px] text-slate-500 font-normal mt-0.5">Assigned: {lead.assignedToName}</div>
                        )}
                      </td>

                      <td className="px-5 py-3.5 border-r border-slate-100">
                        <div className="font-mono text-xs font-medium text-slate-700">{lead.customerPhone || "N/A"}</div>
                        <div className="font-mono text-[11px] text-slate-500">{lead.customerEmail}</div>
                      </td>

                      <td className="px-5 py-3.5 border-r border-slate-100">
                        <div className="font-medium text-slate-800 text-xs">{lead.policyType || "General Insurance"}</div>
                        <div className="text-[11px] text-emerald-600 font-medium">Est. ₹{(lead.estimatedAmount || 15000).toLocaleString("en-IN")}</div>
                      </td>

                      <td className="px-5 py-3.5 border-r border-slate-100">
                        <span className="px-2.5 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 text-[11px] font-medium uppercase tracking-wide">
                          {statusInfo.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 font-mono text-xs font-medium text-slate-700 border-r border-slate-100">
                        {lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                      </td>

                      <td className="px-5 py-3.5 text-right space-x-1.5">
                        {(user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "TEAM_LEADER") && (
                          <button
                            onClick={() => { setAssigningLead(lead); setTargetCallerId(lead.assignedTo || ""); }}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium text-xs rounded-lg border border-amber-200 transition cursor-pointer"
                          >
                            Assign
                          </button>
                        )}

                        <button
                          onClick={() => { setSelectedLead(lead); setNewStatus(lead.callStatus); }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg border border-slate-200 transition cursor-pointer"
                        >
                          Update Call
                        </button>

                        {lead.callStatus !== "Converted" && (
                          <button
                            onClick={() => handleConvertLead(lead)}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs rounded-lg transition cursor-pointer shadow-2xs"
                          >
                            Convert
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteLead(lead._id || lead.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 border border-slate-200 transition cursor-pointer inline-block align-middle"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Lead */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white backdrop-blur-xl border border-stone-200 rounded-3xl shadow-2xl p-6 relative z-10 text-stone-900"
            >
              <h3 className="text-lg font-black text-stone-900 mb-4 pb-3 border-b border-stone-100">Add New Lead</h3>

              <form onSubmit={handleCreateLead} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 mb-1">Customer Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anish Kumar"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#ff5e00]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+91 9876543210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#ff5e00]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="anish@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#ff5e00]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 mb-1">Policy Type</label>
                    <select
                      value={policyType}
                      onChange={(e) => setPolicyType(e.target.value)}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#ff5e00]"
                    >
                      <option value="Health Insurance">Health Insurance</option>
                      <option value="Motor Insurance">Motor Insurance</option>
                      <option value="Life Insurance">Life Insurance</option>
                      <option value="Term Plan">Term Plan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 mb-1">Estimated Premium (₹)</label>
                    <input
                      type="number"
                      value={estimatedAmount}
                      onChange={(e) => setEstimatedAmount(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#ff5e00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 mb-1">Next Follow-Up Date</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#ff5e00]"
                  />
                </div>

                <div className="pt-4 border-t border-stone-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-gradient-to-r from-[#ff5e00] to-[#ff0022] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-md"
                  >
                    {submitting ? "Saving..." : "Add Lead"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Update Call Status & Notes */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLead(null)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white backdrop-blur-xl border border-stone-200 rounded-3xl shadow-2xl p-6 relative z-10 text-stone-900 space-y-4"
            >
              <div className="border-b border-stone-100 pb-3">
                <h3 className="text-lg font-black text-stone-900">Update Call - {selectedLead.customerName}</h3>
                <p className="text-xs text-stone-500 font-mono">{selectedLead.customerPhone} • {selectedLead.customerEmail}</p>
              </div>

              <form onSubmit={handleUpdateCallStatus} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 mb-1">Call Disposition / Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as CallStatus)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#ff5e00]"
                  >
                    {CALL_STATUSES.map(s => (
                      <option key={s.status} value={s.status}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 mb-1">Add Call Notes / Summary</label>
                  <textarea
                    rows={3}
                    placeholder="Enter call notes (e.g., Customer asked for 10% discount, agreed to buy next Monday)..."
                    value={callNote}
                    onChange={(e) => setCallNote(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#ff5e00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 mb-1">Schedule Follow-Up Date</label>
                  <input
                    type="date"
                    value={updateFollowUp}
                    onChange={(e) => setUpdateFollowUp(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#ff5e00]"
                  />
                </div>

                {selectedLead.notes && selectedLead.notes.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-extrabold uppercase text-stone-400 tracking-wider">Previous Call Notes ({selectedLead.notes.length})</span>
                    <div className="max-h-32 overflow-y-auto space-y-2 mt-1.5 p-3 bg-stone-50 border border-stone-200 rounded-xl">
                      {selectedLead.notes.map((n, idx) => (
                        <div key={idx} className="text-xs border-b border-stone-200/60 pb-1.5 last:border-none">
                          <p className="text-stone-800 font-medium">{n.note}</p>
                          <span className="text-[10px] text-stone-400">{n.addedByName || n.addedBy} • {new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-stone-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-gradient-to-r from-[#ff5e00] to-[#ff0022] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-md"
                  >
                    {submitting ? "Updating..." : "Save Call Status"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Assign Lead */}
      <AnimatePresence>
        {assigningLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAssigningLead(null)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white backdrop-blur-xl border border-stone-200 rounded-3xl shadow-2xl p-6 relative z-10 text-stone-900 space-y-4"
            >
              <h3 className="text-lg font-black text-stone-900 border-b border-stone-100 pb-3">
                Assign Lead - {assigningLead.customerName}
              </h3>

              <form onSubmit={handleAssignLeadSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 mb-1">Select Assignee (Team Member / Caller)</label>
                  <select
                    value={targetCallerId}
                    onChange={(e) => setTargetCallerId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#ff5e00]"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m._id} value={m._id}>{m.name || m.email} ({m.role})</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 border-t border-stone-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setAssigningLead(null)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-gradient-to-r from-[#ff5e00] to-[#ff0022] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-md"
                  >
                    {submitting ? "Assigning..." : "Confirm Assignment"}
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
