import React from "react";
import { ShieldAlert, ArrowLeft } from "lucide-react";

interface AccessDeniedPageProps {
  moduleName?: string;
  onGoHome?: () => void;
}

export default function AccessDeniedPage({ moduleName = "this page", onGoHome }: AccessDeniedPageProps) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-12 text-center shadow-xs max-w-xl mx-auto my-12 space-y-4">
      <div className="w-16 h-16 bg-red-50 text-red-700 border border-red-200 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
        <ShieldAlert className="w-8 h-8 stroke-[2]" />
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Access Denied</h2>
        <p className="text-xs text-slate-500 font-normal">
          You do not have permission to view <strong className="text-slate-700">{moduleName}</strong>.
        </p>
      </div>

      <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600 text-left font-medium">
        Please contact your System Administrator to request the required permission for your account.
      </div>

      {onGoHome && (
        <button
          onClick={onGoHome}
          className="px-4 py-2 bg-[#660000] hover:bg-[#520000] text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
      )}
    </div>
  );
}
