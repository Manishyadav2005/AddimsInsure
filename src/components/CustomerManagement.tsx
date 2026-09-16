import React, { useState, useEffect } from "react";
import { api, UserSession } from "../lib/api";
import { Customer, Policy, CallLog, FollowUp } from "../types";
import { UserCheck, Plus, Search, RefreshCw, Phone, Mail, MapPin, Calendar, Shield, Clock, FileText, X, AlertCircle, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CustomerManagementProps {
  user: UserSession;
}

export default function CustomerManagement({ user }: CustomerManagementProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Profile Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerPolicies, setCustomerPolicies] = useState<Policy[]>([]);
  const [customerCallLogs, setCustomerCallLogs] = useState<CallLog[]>([]);
  const [customerFollowUps, setCustomerFollowUps] = useState<FollowUp[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);

  // Add Customer Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [source, setSource] = useState("Direct Client");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this customer? This will permanently remove them from MongoDB.")) {
      try {
        await api.deleteCustomer(id);
        fetchCustomers();
      } catch (err: any) {
        setError(err.message || "Failed to delete customer");
      }
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenProfile = async (cust: Customer) => {
    setSelectedCustomer(cust);
    setProfileLoading(true);
    try {
      const res = await api.getCustomerProfile(cust.id || cust._id!);
      setCustomerPolicies(res.policies || []);
      setCustomerCallLogs(res.callLogs || []);
      setCustomerFollowUps(res.followUps || []);
    } catch (err: any) {
      console.error("Failed to load customer profile details:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await api.createCustomer({
        customerName,
        customerPhone,
        alternatePhone,
        customerEmail,
        dob,
        address,
        city,
        state,
        pincode,
        source,
        notes
      });
      setIsAddModalOpen(false);
      resetForm();
      fetchCustomers();
    } catch (err: any) {
      setError(err.message || "Failed to create customer");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setAlternatePhone("");
    setCustomerEmail("");
    setDob("");
    setAddress("");
    setCity("");
    setState("");
    setPincode("");
    setSource("Direct Client");
    setNotes("");
  };

  const filteredCustomers = customers.filter(c => 
    c.customerName.toLowerCase().includes(search.toLowerCase()) ||
    (c.customerPhone && c.customerPhone.includes(search)) ||
    (c.customerEmail && c.customerEmail.toLowerCase().includes(search.toLowerCase())) ||
    (c.city && c.city.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-stone-200/90 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#ff5e00]" />
            Customer Relationship Management
          </h2>
          <p className="text-xs text-stone-500 font-medium">
            Converted policyholders, customer profiles, multi-policy ledgers, and call history
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCustomers}
            disabled={loading}
            className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition cursor-pointer"
            title="Refresh Customers"
          >
            <RefreshCw className={`w-4.5 h-4.5 ${loading ? "animate-spin text-[#ff5e00]" : ""}`} />
          </button>

          <button
            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
            className="px-5 py-2.5 bg-gradient-to-r from-[#ff5e00] to-[#ff0022] hover:brightness-105 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add Customer
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative w-full sm:w-96">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5 pointer-events-none" />
        <input
          type="text"
          placeholder="Search customer name, phone, email, city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:border-[#ff5e00]"
        />
      </div>

      {/* Customer Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-stone-400 italic bg-white/95 rounded-3xl border border-stone-200/90 p-8">
            No customers found. Converted leads automatically create customer records here!
          </div>
        ) : (
          filteredCustomers.map((cust) => (
            <div key={cust.id || cust._id} className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-3xl p-6 shadow-sm hover:shadow-md transition space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-black text-stone-900 text-base">{cust.customerName}</h3>
                  <span className="text-[10px] font-mono font-bold bg-orange-50 text-orange-700 px-2 py-0.5 rounded-md border border-orange-200">
                    Source: {cust.source || "Lead"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenProfile(cust)}
                    className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-xs"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(cust.id || cust._id || "")}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 border border-slate-200 transition cursor-pointer"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-stone-600 border-t border-stone-100 pt-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span className="font-mono font-bold">{cust.customerPhone || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span className="font-mono text-stone-600 truncate">{cust.customerEmail || "N/A"}</span>
                </div>
                {cust.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>{cust.city}{cust.state ? `, ${cust.state}` : ""}</span>
                  </div>
                )}
              </div>

              {cust.assignedToName && (
                <div className="text-[11px] text-stone-400 border-t border-stone-100 pt-2 font-medium">
                  Assigned Advisor: <span className="font-bold text-stone-700">{cust.assignedToName}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal: Add Customer */}
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
              className="w-full max-w-lg bg-white backdrop-blur-xl border border-stone-200 rounded-3xl shadow-2xl p-6 relative z-10 text-stone-900 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-black text-stone-900 mb-4 pb-3 border-b border-stone-100">Add Customer Profile</h3>

              <form onSubmit={handleCreateCustomer} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sanjeev Gupta"
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
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 mb-1">Alternate Phone</label>
                    <input
                      type="text"
                      placeholder="+91 9876500000"
                      value={alternatePhone}
                      onChange={(e) => setAlternatePhone(e.target.value)}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#ff5e00]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="sanjeev@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#ff5e00]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#ff5e00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 mb-1">Address</label>
                  <input
                    type="text"
                    placeholder="Flat 402, Sunrise Towers"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#ff5e00]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-stone-700 mb-1">City</label>
                    <input
                      type="text"
                      placeholder="Mumbai"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-[#ff5e00]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-stone-700 mb-1">State</label>
                    <input
                      type="text"
                      placeholder="Maharashtra"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-[#ff5e00]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-stone-700 mb-1">Pincode</label>
                    <input
                      type="text"
                      placeholder="400001"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-[#ff5e00]"
                    />
                  </div>
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
                    {submitting ? "Saving..." : "Save Customer"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Customer Detailed Profile (Policies + Call Timeline + Follow-ups) */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCustomer(null)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-white backdrop-blur-xl border border-stone-200 rounded-3xl shadow-2xl p-6 relative z-10 text-stone-900 max-h-[90vh] overflow-y-auto space-y-6"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div>
                  <h3 className="text-xl font-black text-stone-900">{selectedCustomer.customerName}</h3>
                  <p className="text-xs text-stone-500 font-mono">{selectedCustomer.customerPhone} • {selectedCustomer.customerEmail}</p>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {profileLoading ? (
                <div className="py-12 text-center text-stone-400 font-bold text-xs animate-pulse">
                  Loading Customer Multi-Policy Profile & History...
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Policies Section */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-stone-400 flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-[#ff5e00]" />
                      Customer Policies Ledger ({customerPolicies.length})
                    </h4>

                    {customerPolicies.length === 0 ? (
                      <p className="text-xs text-stone-400 italic p-4 bg-stone-50 rounded-2xl border border-stone-200 text-center">
                        No policies created for this customer yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {customerPolicies.map((p) => (
                          <div key={p.id || p.policyNumber} className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-between text-xs">
                            <div>
                              <span className="font-extrabold text-stone-900">{p.policyType}</span>
                              <span className="font-mono text-stone-500 ml-2">#{p.policyNumber}</span>
                              <p className="text-[11px] text-stone-500">{p.companyName} • ₹{p.premiumAmount.toLocaleString("en-IN")}/yr</p>
                            </div>
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-full text-[10px]">
                              {p.premiumStatus}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Call Timeline Section */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-stone-400 flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      Historical Call Timeline ({customerCallLogs.length})
                    </h4>

                    {customerCallLogs.length === 0 ? (
                      <p className="text-xs text-stone-400 italic p-4 bg-stone-50 rounded-2xl border border-stone-200 text-center">
                        No call activity logs recorded yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {customerCallLogs.map((log) => (
                          <div key={log.id || log._id} className="p-3 bg-stone-50 border border-stone-200 rounded-2xl space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-stone-900">{log.callStatus}</span>
                              <span className="text-[10px] text-stone-400 font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-stone-700">{log.notes || "No notes entered"}</p>
                            <span className="text-[10px] text-stone-400 block font-medium">Logged by: {log.assignedToName || log.createdBy || "Agent"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
