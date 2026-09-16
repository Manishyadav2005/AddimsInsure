import React, { useState } from "react";
import { api, UserSession } from "../lib/api";
import { Shield, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";

interface AuthGateProps {
  onSuccess: (user: UserSession) => void;
}

export default function AuthGate({ onSuccess }: AuthGateProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.login(email, password);
      localStorage.setItem("auth_token", response.token);
      localStorage.setItem("mongo_user", JSON.stringify(response.user));
      onSuccess(response.user);
    } catch (err: any) {
      console.warn("MongoDB Auth process message:", err?.message || err);
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen relative flex flex-col items-center justify-center p-4 select-none overflow-hidden"
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
      {/* Background radial highlight behind card */}
      <div className="absolute w-[500px] h-[500px] bg-orange-400/20 rounded-full blur-[90px] pointer-events-none -translate-y-10" />

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[420px] bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-3xl shadow-[0_20px_50px_rgba(180,140,100,0.18)] p-8 relative z-10 text-stone-900 flex flex-col items-center"
      >
        {/* Shield Logo Badge & Title */}
        <div className="flex flex-col items-center mb-7 w-full pt-2">
          <div className="w-14 h-14 bg-gradient-to-br from-[#ff5e00] to-[#ff1a00] text-white rounded-2xl flex items-center justify-center mb-4 shadow-[0_6px_20px_rgba(255,94,0,0.35)]">
            <Shield className="w-7 h-7 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-stone-900 uppercase text-center font-sans">
            Addims <span className="text-[#ff5e00]">InSure</span>
          </h1>
          <p className="text-stone-500 text-xs font-semibold tracking-wide mt-1 text-center">
            Smart Insurance CRM &amp; Policy Management
          </p>
          <p className="text-[#e65c00] text-[11px] font-extrabold tracking-[0.22em] uppercase mt-1 text-center">
            Admin Portal
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="w-full mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs text-center"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleAuth} className="w-full space-y-4">
          {/* Email input */}
          <div className="relative flex items-center">
            <Mail className="w-5 h-5 text-stone-400 absolute left-4 pointer-events-none" />
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-stone-50/90 border border-stone-300/80 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#ff5e00] focus:ring-1 focus:ring-[#ff5e00] text-sm transition-colors"
            />
          </div>

          {/* Password input with toggle */}
          <div className="relative flex items-center">
            <Lock className="w-5 h-5 text-stone-400 absolute left-4 pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-3 bg-stone-50/90 border border-stone-300/80 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#ff5e00] focus:ring-1 focus:ring-[#ff5e00] text-sm transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 text-stone-400 hover:text-stone-600 focus:outline-none cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3.5 bg-gradient-to-r from-[#ff5e00] via-[#ff3b00] to-[#ff0022] hover:brightness-105 active:scale-[0.99] disabled:opacity-50 text-white font-extrabold tracking-wider uppercase text-sm rounded-xl transition-all cursor-pointer shadow-[0_6px_20px_rgba(255,94,0,0.35)] flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Muted Subtitle */}
        <p className="text-[10px] font-bold tracking-[0.2em] text-stone-400 uppercase mt-6 text-center">
          Authorized Personnel Only
        </p>
      </motion.div>

      {/* Outer Footer */}
      <p className="text-[11px] text-stone-600 font-medium text-center mt-6 relative z-10">
        Powered by{" "}
        <a
          href="https://manish.page/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-stone-800 hover:text-[#ff5e00] transition-colors underline decoration-stone-400/60 hover:decoration-[#ff5e00]"
        >
          MS
        </a>
      </p>
    </div>
  );
}
