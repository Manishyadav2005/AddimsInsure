import React, { useState, useEffect } from "react";
import { api, UserSession } from "../lib/api";
import { FollowUp } from "../types";
import { Calendar, Clock, CheckCircle2, AlertTriangle, Plus, RefreshCw, X, MessageSquare, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FollowUpManagementProps {
  user: UserSession;
}

export default function FollowUpManagement({ user }: FollowUpManagementProps) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "today" | "upcoming" | "overdue" | "completed">("today");
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchFollowUps = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getFollowUps(filter);
      setFollowUps(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch follow-ups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, [filter]);

  const handleMarkCompleted = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowUp) return;
    setSubmitting(true);

    try {
      await api.updateFollowUpStatus(selectedFollowUp.id || selectedFollowUp._id!, "COMPLETED", completionNotes);
      setSelectedFollowUp(null);
      setCompletionNotes("");
      fetchFollowUps();
    } catch (err: any) {
      setError(err.message || "Failed to complete follow-up");
    } finally {
      setSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-stone-200/90 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#ff5e00]" />
            Follow-Up & Schedule Manager
          </h2>
          <p className="text-xs text-stone-500 font-medium">
            Manage scheduled callbacks, today's tasks, overdue follow-ups, and completed actions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchFollowUps}
            disabled={loading}
            className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition cursor-pointer"
            title="Refresh Follow-ups"
          >
            <RefreshCw className={`w-4.5 h-4.5 ${loading ? "animate-spin text-[#ff5e00]" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter("today")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
            filter === "today"
              ? "bg-gradient-to-r from-[#ff5e00] to-[#ff0022] text-white border-transparent shadow-md"
              : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
          }`}
        >
          Today's Follow-ups
        </button>

        <button
          onClick={() => setFilter("overdue")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
            filter === "overdue"
              ? "bg-red-600 text-white border-transparent shadow-md"
              : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
          }`}
        >
          Overdue Follow-ups
        </button>

        <button
          onClick={() => setFilter("upcoming")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
            filter === "upcoming"
              ? "bg-stone-900 text-white border-transparent shadow-md"
              : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
          }`}
        >
          Upcoming Follow-ups
        </button>

        <button
          onClick={() => setFilter("completed")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
            filter === "completed"
              ? "bg-emerald-600 text-white border-transparent shadow-md"
              : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
          }`}
        >
          Completed
        </button>
      </div>

      {/* Follow-ups List */}
      <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-stone-400">
          Scheduled Tasks ({followUps.length})
        </h3>

        <div className="space-y-3">
          {followUps.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400 italic">
              No follow-ups found for this view filter.
            </div>
          ) : (
            followUps.map((flw) => {
              const isOverdue = flw.followUpDate < todayStr && flw.status === "PENDING";

              return (
                <div
                  key={flw.id || flw._id}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                    flw.status === "COMPLETED"
                      ? "bg-emerald-50/50 border-emerald-200"
                      : isOverdue
                      ? "bg-red-50/50 border-red-200"
                      : "bg-stone-50 border-stone-200"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-stone-900 text-sm">{flw.title || "Scheduled Callback"}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                        flw.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : isOverdue
                          ? "bg-red-100 text-red-800 border-red-300"
                          : "bg-amber-100 text-amber-800 border-amber-300"
                      }`}>
                        {flw.status === "COMPLETED" ? "Completed" : isOverdue ? "Overdue" : "Pending"}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600">{flw.notes || "No additional notes"}</p>

                    <div className="flex items-center gap-4 text-[11px] font-mono text-stone-500 pt-1">
                      <span className="flex items-center gap-1 font-bold text-stone-800">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        {flw.followUpDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        {flw.followUpTime || "10:00 AM"}
                      </span>
                      <span>Assigned: {flw.assignedToName || "Agent"}</span>
                    </div>
                  </div>

                  {flw.status === "PENDING" && (
                    <button
                      onClick={() => setSelectedFollowUp(flw)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      Mark Complete
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: Mark Complete */}
      <AnimatePresence>
        {selectedFollowUp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFollowUp(null)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white backdrop-blur-xl border border-stone-200 rounded-3xl shadow-2xl p-6 relative z-10 text-stone-900 space-y-4"
            >
              <h3 className="text-lg font-black text-stone-900 border-b border-stone-100 pb-3">Complete Follow-Up</h3>

              <form onSubmit={handleMarkCompleted} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 mb-1">Outcome / Final Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Record notes on callback outcome..."
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#ff5e00]"
                  />
                </div>

                <div className="pt-4 border-t border-stone-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedFollowUp(null)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-md"
                  >
                    {submitting ? "Completing..." : "Complete Task"}
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
