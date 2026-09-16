import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Yes, Delete",
  cancelText = "Cancel",
  type = "danger",
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const isDanger = type === "danger";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 10 }}
          className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 relative z-10 text-slate-800 space-y-4"
        >
          {/* Close button */}
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 cursor-pointer text-base transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Icon + Title */}
          <div className="flex items-start gap-3.5 pr-6">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
              isDanger ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-amber-50 border-amber-100 text-amber-600"
            }`}>
              {isDanger ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                {title}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase border border-slate-200 rounded-xl cursor-pointer shadow-2xs transition"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`px-5 py-2 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-2xs transition ${
                isDanger ? "bg-rose-600 hover:bg-rose-500" : "bg-red-600 hover:bg-red-500"
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
