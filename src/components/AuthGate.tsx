import React, { useState } from "react";
import { api, UserSession } from "../lib/api";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import BrandLogo from "./BrandLogo";

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
        backgroundColor: "#0B1120",
        backgroundImage: `
          radial-gradient(circle at 50% 25%, rgba(37, 99, 235, 0.18) 0%, transparent 55%),
          radial-gradient(circle at 80% 80%, rgba(6, 182, 212, 0.12) 0%, transparent 45%),
          radial-gradient(circle at 20% 85%, rgba(30, 58, 138, 0.25) 0%, transparent 50%),
          linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: "100% 100%, 100% 100%, 100% 100%, 40px 40px, 40px 40px"
      }}
    >
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute w-[550px] h-[550px] bg-blue-600/15 rounded-full blur-[110px] pointer-events-none -translate-y-12" />
      <div className="absolute w-[350px] h-[350px] bg-cyan-500/10 rounded-full blur-[90px] pointer-events-none translate-x-44 translate-y-36" />

      <motion.div 
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-[420px] bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-3xl shadow-[0_25px_60px_rgba(2,12,38,0.45)] p-8 relative z-10 text-slate-900 flex flex-col items-center"
      >
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center mb-6 w-full pt-1">
          <div className="mb-3.5">
            <BrandLogo size="lg" />
          </div>
          
          <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase text-center font-sans">
            Addims <span className="text-blue-600">InSure</span>
          </h1>
          
          <p className="text-slate-500 text-xs font-semibold tracking-normal mt-1 text-center">
            Smart Insurance CRM &amp; Policy Management
          </p>

          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50/90 border border-blue-200/80 rounded-full shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-blue-700 text-[10px] font-extrabold tracking-wider uppercase font-mono">
              Admin Portal
            </span>
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="w-full mb-5 p-3 bg-red-50/90 border border-red-200 text-red-700 rounded-xl text-xs text-center font-medium shadow-2xs"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleAuth} className="w-full space-y-4">
          {/* Email input */}
          <div className="relative flex items-center">
            <Mail className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 text-sm transition-all shadow-2xs"
            />
          </div>

          {/* Password input with toggle */}
          <div className="relative flex items-center">
            <Lock className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 text-sm transition-all shadow-2xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3.5 bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 active:scale-[0.99] disabled:opacity-50 text-white font-extrabold tracking-wider uppercase text-sm rounded-xl transition-all cursor-pointer shadow-[0_8px_25px_rgba(37,99,235,0.35)] flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Muted Subtitle */}
        <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mt-6 text-center">
          Authorized Personnel Only
        </p>
      </motion.div>

      {/* Outer Footer */}
      <p className="text-[12px] text-slate-400 font-medium text-center mt-6 relative z-10">
        Powered by{" "}
        <a
          href="https://manish.page/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-white hover:text-cyan-400 transition-colors underline decoration-slate-500 hover:decoration-cyan-400"
        >
          MS
        </a>
      </p>
    </div>
  );
}
