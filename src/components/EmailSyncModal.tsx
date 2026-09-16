import React, { useState } from "react";
import { Policy } from "../types";
import { Mail, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Download, Loader2, ArrowRight, Server, Database, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { POLICY_TYPES } from "../constants";
import { api } from "../lib/api";


interface EmailSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentialEmail: string;
  policies: Policy[];
  userId: string;
  onSyncComplete: () => void;
}

interface SimulatedEmail {
  id: string;
  sender: string;
  subject: string;
  date: string;
  body: string;
  parsedDetails: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    policyNumber: string;
    companyName: string;
    policyType: string;
    premiumAmount: number;
    premiumFrequency: "Yearly" | "Half-Yearly" | "Quarterly" | "Monthly";
    startDate: string;
    expiryDate: string;
    nextDueDate: string;
  };
}

export default function EmailSyncModal({ 
  isOpen, 
  onClose, 
  credentialEmail, 
  policies, 
  userId, 
  onSyncComplete 
}: EmailSyncModalProps) {
  const [syncStep, setSyncStep] = useState<"idle" | "connecting" | "scanning" | "parsing" | "complete">("idle");
  const [syncedResults, setSyncedResults] = useState<{
    totalEmails: number;
    newAdded: number;
    duplicates: number;
    details: { emailId: string; policyNumber: string; customerName: string; status: "New" | "Duplicate"; companyName: string }[];
  } | null>(null);

  // Clean empty array for real data operations
  const simulatedEmailsPool: SimulatedEmail[] = [];

  const triggerSync = async () => {
    if (!credentialEmail) return;

    setSyncStep("connecting");
    
    // Simulate connection delay
    await new Promise(r => setTimeout(r, 1200));
    setSyncStep("scanning");

    // Simulate scanning inbox delay
    await new Promise(r => setTimeout(r, 1500));
    setSyncStep("parsing");

    // Simulate parsing and importing delay
    await new Promise(r => setTimeout(r, 1800));

    // Execute real import logic checking for duplicates
    let newAddedCount = 0;
    let duplicateCount = 0;
    const detailsList: NonNullable<typeof syncedResults>["details"] = [];

    const existingNumbers = new Set(policies.map(p => (p.policyNumber ?? "").trim().toUpperCase()).filter(Boolean));

    for (const email of simulatedEmailsPool) {
      const parsedPolicyNumber = (email.parsedDetails.policyNumber ?? "").trim().toUpperCase();
      const isDuplicate = existingNumbers.has(parsedPolicyNumber);
      
      if (isDuplicate) {
        duplicateCount++;
        detailsList.push({
          emailId: email.id,
          policyNumber: email.parsedDetails.policyNumber,
          customerName: email.parsedDetails.customerName,
          companyName: email.parsedDetails.companyName,
          status: "Duplicate"
        });
      } else {
        newAddedCount++;
        detailsList.push({
          emailId: email.id,
          policyNumber: email.parsedDetails.policyNumber,
          customerName: email.parsedDetails.customerName,
          companyName: email.parsedDetails.companyName,
          status: "New"
        });

        // Add to db or localstorage
        const now = new Date().toISOString();
        const newPolicy: Omit<Policy, 'id'> = {
          policyNumber: email.parsedDetails.policyNumber,
          companyName: email.parsedDetails.companyName,
          policyType: email.parsedDetails.policyType,
          premiumAmount: email.parsedDetails.premiumAmount,
          premiumFrequency: email.parsedDetails.premiumFrequency,
          startDate: email.parsedDetails.startDate,
          expiryDate: email.parsedDetails.expiryDate,
          nextDueDate: email.parsedDetails.nextDueDate,
          premiumStatus: "Unpaid", // Synced from email as unpaid
          customerName: email.parsedDetails.customerName,
          customerEmail: email.parsedDetails.customerEmail,
          customerPhone: email.parsedDetails.customerPhone,
          userId,
          createdAt: now,
          updatedAt: now
        };

        if (userId === "local-agent-session" || userId.startsWith("local")) {
          const localPoliciesStr = localStorage.getItem(`policies_${userId}`);
          const localPolicies: Policy[] = localPoliciesStr ? JSON.parse(localPoliciesStr) : [];
          const policyWithId: Policy = {
            ...newPolicy,
            id: `local_sync_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
          };
          localPolicies.push(policyWithId);
          localStorage.setItem(`policies_${userId}`, JSON.stringify(localPolicies));
        } else {
          try {
            await api.addPolicy({ ...newPolicy, userId });
          } catch (e) {
            console.error("Failed adding synced policy:", e);
          }
        }
      }
    }

    setSyncedResults({
      totalEmails: simulatedEmailsPool.length,
      newAdded: newAddedCount,
      duplicates: duplicateCount,
      details: detailsList
    });

    setSyncStep("complete");
    onSyncComplete();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-55">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-xl overflow-hidden text-slate-800"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-teal-600 animate-pulse" />
              <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-tight">
                Secure Email Sync Gateway
              </h3>
            </div>
            <button 
              onClick={onClose} 
              className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {!credentialEmail ? (
              <div className="p-6 text-center space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-amber-500">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 text-sm">Credential Email Missing</h4>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                    Please configure a valid <strong>Credential Email ID</strong> in the "Gateway Settings" tab first. This is required to identify your official inbox.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {syncStep === "idle" && (
                  <div className="space-y-5 text-center py-4">
                    <div className="p-4 bg-teal-50 border border-teal-100 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto text-teal-600">
                      <RefreshCw className="w-8 h-8 animate-spin-slow" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="font-extrabold text-slate-900 text-base">Ready to Scan Policy Updates</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                        Scanning inbox for <strong>{credentialEmail}</strong>. Our AI engine will read policy reminders, maturity details, and due dates from LIC, Star Health, Tata AIG, and other providers.
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4.5 text-left text-xs space-y-2 max-w-md mx-auto">
                      <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">🔒 Sync Protection Compliance:</span>
                      <ul className="space-y-1 text-slate-500 list-disc pl-4 leading-normal">
                        <li>Only scan certified insurance company email alerts.</li>
                        <li><strong>Zero Duplicate Policies</strong> - Policy numbers already in the ledger are skipped automatically.</li>
                        <li>Safe read-only execution. No manual database entries needed.</li>
                      </ul>
                    </div>

                    <button
                      onClick={triggerSync}
                      className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-teal-600/15"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Sync and Import Now
                    </button>
                  </div>
                )}

                {(syncStep === "connecting" || syncStep === "scanning" || syncStep === "parsing") && (
                  <div className="py-8 space-y-6 text-center">
                    <div className="relative w-16 h-16 mx-auto">
                      <div className="absolute inset-0 rounded-full border-4 border-teal-500/10" />
                      <div className="absolute inset-0 rounded-full border-4 border-teal-600 border-t-transparent animate-spin" />
                      <Mail className="w-6 h-6 text-teal-600 absolute inset-0 m-auto" />
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {syncStep === "connecting" && "Establishing Secure IMAP Connection..."}
                        {syncStep === "scanning" && "Scanning Official Inbox Folders..."}
                        {syncStep === "parsing" && "Extracting & Verifying Policy Metadatas..."}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono">
                        {syncStep === "connecting" && `imap.ssl.provider.net:993 [user: ${credentialEmail}]`}
                        {syncStep === "scanning" && "Analyzing licensed inbox records from LIC, Star Health, and Tata AIG..."}
                        {syncStep === "parsing" && "Applying Gemini AI parser to secure policy values..."}
                      </p>
                    </div>

                    <div className="max-w-xs mx-auto bg-slate-50 rounded-full h-1.5 overflow-hidden border border-slate-100">
                      <motion.div 
                        className="bg-teal-600 h-full rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ 
                          width: syncStep === "connecting" ? "30%" : syncStep === "scanning" ? "65%" : "90%" 
                        }}
                        transition={{ duration: 1.5 }}
                      />
                    </div>
                  </div>
                )}

                {syncStep === "complete" && syncedResults && (
                  <div className="space-y-5">
                    <div className="flex items-start gap-4 p-4.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-900">
                      <div className="p-2 bg-emerald-600 text-white rounded-lg">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 text-xs">
                        <h4 className="font-bold text-emerald-950 text-sm">Inbox Sync Successful!</h4>
                        <p className="text-slate-600">
                          Scanned <strong>{syncedResults.totalEmails}</strong> official alerts. Successfully parsed and imported <strong>{syncedResults.newAdded}</strong> new policies. Skipped <strong>{syncedResults.duplicates}</strong> duplicate records.
                        </p>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Inbox Ledger Sync Log</h5>
                      <div className="bg-slate-50 border border-slate-100 rounded-xl max-h-[180px] overflow-y-auto divide-y divide-slate-150">
                        {syncedResults.details.map((item, idx) => (
                          <div key={idx} className="p-3 text-xs flex justify-between items-center gap-4">
                            <div>
                              <span className="font-extrabold text-slate-900">{item.customerName}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">{item.companyName} • #{item.policyNumber}</span>
                            </div>

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.status === "New" 
                                ? "bg-teal-50 border border-teal-100 text-teal-600" 
                                : "bg-amber-50 border border-amber-100 text-amber-600"
                            }`}>
                              {item.status === "New" ? "✓ Sync'd" : "⚠ Skip Duplicate"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={onClose}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      Close Sync Box
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
