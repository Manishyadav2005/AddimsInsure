import React from "react";
import { UserSession } from "../lib/api";
import { Lock, Shield, AlertTriangle, Mail, LogOut, ExternalLink } from "lucide-react";
import { motion } from "motion/react";

interface SubscriptionGateProps {
  user: UserSession;
  onLogOut: () => void;
}

export default function SubscriptionGate({ user, onLogOut }: SubscriptionGateProps) {
  const isSuspended = user.subscriptionStatus === "Suspended";

  return (
    <div 
      className="min-h-screen relative flex flex-col items-center justify-center p-4 select-none overflow-hidden text-stone-900"
      style={{
        backgroundColor: "#eae4d8",
        backgroundImage: `
          radial-gradient(circle at 50% 35%, #f7f3ea 0%, #e5ded2 55%, #d6cebf 100%),
          linear-gradient(to right, rgba(230, 92, 0, 0.06) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(230, 92, 0, 0.06) 1px, transparent 1px)
        `,
        backgroundSize: "100% 100%, 36px 36px, 36px 36px"
      }}
    >
      <div className="absolute w-[500px] h-[500px] bg-orange-400/20 rounded-full blur-[100px] pointer-events-none -translate-y-10" />

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[460px] bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-3xl shadow-[0_20px_50px_rgba(180,140,100,0.18)] p-8 relative z-10 text-stone-900 flex flex-col items-center text-center"
      >
        {/* Header Icon */}
        <div className="w-16 h-16 bg-gradient-to-br from-[#ff5e00] to-[#ff0022] text-white rounded-2xl flex items-center justify-center mb-5 shadow-[0_6px_25px_rgba(255,94,0,0.35)]">
          <Lock className="w-8 h-8 stroke-[2.2]" />
        </div>

        <h1 className="text-2xl font-black tracking-wider text-stone-900 uppercase font-sans">
          {isSuspended ? "Account Suspended" : "Subscription Expired"}
        </h1>

        <p className="text-[#e65c00] text-xs font-extrabold uppercase tracking-[0.2em] mt-1 mb-4">
          {user.tenantName || "Client Organization"}
        </p>

        <div className="w-full bg-red-50 border border-red-200 p-4 rounded-2xl mb-6 text-xs text-stone-700 text-left space-y-2">
          <div className="flex items-center gap-2 text-red-700 font-extrabold">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              {isSuspended 
                ? "Access to your workspace has been temporarily suspended." 
                : "Your company's subscription validity period has ended."}
            </span>
          </div>
          <p className="text-stone-600 text-[11px] leading-relaxed font-medium">
            All your policies, customer records, and email logs are securely saved. Please renew your subscription plan with the platform administrator to restore instant access.
          </p>
        </div>

        {/* Contact Info Box */}
        <div className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-xs space-y-3 mb-6">
          <div className="flex items-center justify-between text-stone-700">
            <span className="text-stone-500 font-bold">Account Email:</span>
            <span className="font-mono text-stone-900 font-black">{user.email}</span>
          </div>

          {user.validUntil && (
            <div className="flex items-center justify-between text-stone-700">
              <span className="text-stone-500 font-bold">Expired On:</span>
              <span className="font-mono text-red-600 font-black">
                {new Date(user.validUntil).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-stone-700">
            <span className="text-stone-500 font-bold">Contact Admin:</span>
            <span className="text-[#e65c00] font-black flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />
              policy@gmail.com
            </span>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={onLogOut}
          className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs border border-stone-200 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out & Try Another Account
        </button>
      </motion.div>

      <p className="text-[11px] text-stone-600 font-medium text-center mt-6 relative z-10">
        Powered by Policy Master Cloud Engine
      </p>
    </div>
  );
}
