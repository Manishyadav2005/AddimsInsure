import React, { useState, useEffect } from "react";
import { api, UserSession } from "../lib/api";
import { AuditLog } from "../types";
import { ShieldAlert, RefreshCw, Clock, User, AlertCircle } from "lucide-react";

interface AuditLogViewProps {
  user: UserSession;
}

export default function AuditLogView({ user }: AuditLogViewProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err: any) {
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-stone-200/90 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-[#ff5e00]" />
            System Audit & Activity Trail
          </h2>
          <p className="text-xs text-stone-500 font-medium">
            Immutable log of administrative, lead assignment, and customer conversion actions
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition cursor-pointer"
          title="Refresh Logs"
        >
          <RefreshCw className={`w-4.5 h-4.5 ${loading ? "animate-spin text-[#ff5e00]" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Log Timeline */}
      <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-stone-400">
          Activity Trail ({logs.length})
        </h3>

        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400 italic">
              No audit log entries recorded yet.
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id || log._id} className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-stone-900 uppercase tracking-wider text-[11px] bg-orange-50 text-orange-700 px-2.5 py-0.5 rounded-md border border-orange-200">
                    {log.action}
                  </span>
                  <span className="font-mono text-[11px] text-stone-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-stone-700 font-medium">
                  <User className="w-3.5 h-3.5 text-stone-400" />
                  <span>{log.userName || "User"} ({log.userRole || "ADMIN"})</span>
                </div>

                {log.metadata && (
                  <pre className="p-2 bg-white border border-stone-200 rounded-xl text-[10px] font-mono text-stone-600 overflow-x-auto">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
