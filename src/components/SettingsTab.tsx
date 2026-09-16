import React, { useState, useEffect } from "react";
import { MailSettings, WhatsAppSettings, AgencyProfile } from "../types";
import { 
  Mail, MessageSquare, Settings, Save, Sparkles, Loader2, CheckCircle, AlertTriangle, FileText, Building2, Upload, Phone
} from "lucide-react";
import { fetchAgencyProfile, saveAgencyProfile } from "../lib/api";

interface SettingsTabProps {
  mailSettings: MailSettings;
  setMailSettings: (settings: MailSettings) => void;
  whatsAppSettings: WhatsAppSettings;
  setWhatsAppSettings: (settings: WhatsAppSettings) => void;
  onSave: () => void;
  user?: any;
  onCompanyProfileUpdate?: (profile: AgencyProfile) => void;
}

export default function SettingsTab({ 
  mailSettings, 
  setMailSettings, 
  whatsAppSettings, 
  setWhatsAppSettings,
  onSave,
  user,
  onCompanyProfileUpdate
}: SettingsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"company" | "mail" | "whatsapp" | "templates">("company");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Simplified Company Profile State
  const tenantId = user?.tenantId || user?.uid || "tenant-default";
  const [companyProfile, setCompanyProfile] = useState<AgencyProfile>({
    tenantId,
    companyName: "",
    gstNumber: "",
    mobileNumber: "",
    email: "",
    logoUrl: ""
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Fetch company profile on mount
  useEffect(() => {
    if (tenantId) {
      fetchAgencyProfile(tenantId)
        .then((data) => {
          if (data) {
            setCompanyProfile({
              tenantId,
              companyName: data.companyName || data.agencyName || "",
              gstNumber: data.gstNumber || "",
              mobileNumber: data.mobileNumber || data.mobile || "",
              email: data.email || "",
              logoUrl: data.logoUrl || ""
            });
          }
        })
        .catch((err) => console.warn("Fetch company profile note:", err));
    }
  }, [tenantId]);

  // Fetch Mail & WhatsApp Settings from Backend on mount
  useEffect(() => {
    if (tenantId) {
      const fetchSettings = async () => {
        try {
          const token = localStorage.getItem("auth_token");
          const response = await fetch(`/api/settings?userId=${encodeURIComponent(tenantId)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          const data = await response.json();
          
          if (data?.mailSettings) {
            setMailSettings({
              senderName: data.mailSettings.senderName || "",
              senderEmail: data.mailSettings.senderEmail || "",
              smtpHost: data.mailSettings.smtpHost || "",
              smtpPort: data.mailSettings.smtpPort || "",
              username: data.mailSettings.username || "",
              apiKey: data.mailSettings.apiKey || "",
              smtpPassword: data.mailSettings.smtpPassword || "",
              credentialEmail: data.mailSettings.credentialEmail || "",
              enabled: data.mailSettings.enabled !== false
            });
          }

          if (data?.whatsAppSettings) {
            setWhatsAppSettings({
              phoneNumberId: data.whatsAppSettings.phoneNumberId || "",
              businessAccountId: data.whatsAppSettings.businessAccountId || "",
              accessToken: data.whatsAppSettings.accessToken || "",
              enabled: data.whatsAppSettings.enabled !== false,
              templates: {
                renewals: data.whatsAppSettings.templates?.renewals || "",
                birthdays: data.whatsAppSettings.templates?.birthdays || "",
                onboarding: data.whatsAppSettings.templates?.onboarding || ""
              }
            });
          }
        } catch (err) {
          console.warn("Could not fetch settings from backend, using localStorage:", err);
          // Fallback to localStorage
          const savedMail = localStorage.getItem("mail_settings");
          const savedWA = localStorage.getItem("whatsapp_settings");
          if (savedMail) setMailSettings(JSON.parse(savedMail));
          if (savedWA) setWhatsAppSettings(JSON.parse(savedWA));
        }
      };
      fetchSettings();
    }
  }, [tenantId]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCompanyProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveCompanyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyProfile.companyName.trim()) {
      alert("Company Name is required.");
      return;
    }
    if (!companyProfile.mobileNumber?.trim()) {
      alert("Mobile Number is required.");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await saveAgencyProfile({ ...companyProfile, tenantId });
      if (res.success && res.profile) {
        setCompanyProfile(res.profile);
        localStorage.setItem("cached_company_name", res.profile.companyName || "");
        if (res.profile.logoUrl) {
          localStorage.setItem("cached_company_logo", res.profile.logoUrl);
        }
        if (onCompanyProfileUpdate) {
          onCompanyProfileUpdate(res.profile);
        }
        window.dispatchEvent(new CustomEvent("agencyProfileUpdated", { detail: res.profile }));
      }
      setSaveStatus("Company Profile saved successfully to MongoDB Atlas!");
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to save Company Profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploadingLogo(true);

    try {
      const fd = new FormData();
      fd.append("logo", file);
      fd.append("tenantId", tenantId);

      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/agency-profile/logo", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd
      });
      const data = await res.json();
      if (data.success && data.logoUrl) {
        setCompanyProfile(prev => ({ ...prev, logoUrl: data.logoUrl }));
        localStorage.setItem("cached_company_logo", data.logoUrl);
        if (onCompanyProfileUpdate) {
          onCompanyProfileUpdate({ ...companyProfile, logoUrl: data.logoUrl });
        }
        window.dispatchEvent(new CustomEvent("agencyProfileUpdated", { detail: { ...companyProfile, logoUrl: data.logoUrl } }));
        setSaveStatus("Company Logo uploaded successfully!");
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (err: any) {
      alert("Logo upload failed: " + (err.message || "Unknown error"));
    } finally {
      setUploadingLogo(false);
    }
  };

 // Handle saving API configurations to Backend
  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          userId: tenantId,
          mailSettings,
          whatsAppSettings
        })
      });

      const data = await response.json();
      if (!response.ok || !data) {
        throw new Error(data?.error || "Failed to save settings to backend");
      }

      // Also save to localStorage for fallback
      localStorage.setItem("mail_settings", JSON.stringify(mailSettings));
      localStorage.setItem("whatsapp_settings", JSON.stringify(whatsAppSettings));
      onSave();

      setSaveStatus("All configuration credentials saved successfully to backend!");
      setTimeout(() => setSaveStatus(null), 4000);
 } catch (err: any) {
      setSaveStatus(null);
      alert("Failed to save settings: " + (err.message || "Unknown error"));
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs text-slate-850">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-base font-extrabold font-sans text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-pink-600 animate-spin-slow" />
            Control Hub & Gateway Settings
          </h2>
          <p className="text-slate-500 text-xs">Configure your global company branding, automated email servers, WhatsApp API, and dispatch templates</p>
        </div>

        {activeSubTab === "company" ? (
          <button
            onClick={handleSaveCompanyProfile}
            disabled={savingProfile}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition shadow-2xs disabled:opacity-50"
          >
            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savingProfile ? "Saving Profile..." : "Save Company Profile"}
          </button>
        ) : (
          <button
            onClick={handleSaveAll}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition shadow-2xs"
          >
            <Save className="w-4 h-4" />
            Save Configurations
          </button>
        )}
      </div>

      {saveStatus && (
        <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Sub-Tab Selector */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 mb-6">
        <button
          onClick={() => setActiveSubTab("company")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === "company"
              ? "bg-pink-600 text-white shadow-2xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Building2 className="w-4 h-4" />
          Company Profile
        </button>

        <button
          onClick={() => setActiveSubTab("mail")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === "mail"
              ? "bg-pink-600 text-white shadow-2xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Mail className="w-4 h-4" />
          Email SMTP Gateway
        </button>

        <button
          onClick={() => setActiveSubTab("whatsapp")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === "whatsapp"
              ? "bg-pink-600 text-white shadow-2xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          WhatsApp API
        </button>

        <button
          onClick={() => setActiveSubTab("templates")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === "templates"
              ? "bg-pink-600 text-white shadow-2xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          Dispatch Templates
        </button>
      </div>

      {/* ── TAB 1: SIMPLIFIED COMPANY PROFILE ─────────────────────────────── */}
      {activeSubTab === "company" && (
        <form onSubmit={handleSaveCompanyProfile} className="space-y-6">

          {/* Basic Information */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-pink-600" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  name="companyName"
                  value={companyProfile.companyName}
                  onChange={handleProfileChange}
                  required
                  placeholder="e.g. Agency Bazaar Insurance"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-pink-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">GST Number (Optional)</label>
                <input
                  type="text"
                  name="gstNumber"
                  value={companyProfile.gstNumber || ""}
                  onChange={handleProfileChange}
                  placeholder="e.g. 09ABCDE1234F1ZH"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-hidden focus:border-pink-600 uppercase"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Phone className="w-4 h-4 text-pink-600" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Mobile Number *</label>
                <input
                  type="text"
                  name="mobileNumber"
                  value={companyProfile.mobileNumber || ""}
                  onChange={handleProfileChange}
                  required
                  placeholder="e.g. +91 9876543210"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-hidden focus:border-pink-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  name="email"
                  value={companyProfile.email || ""}
                  onChange={handleProfileChange}
                  placeholder="e.g. support@agencybazaar.com"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-pink-600"
                />
              </div>
            </div>
          </div>



          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition shadow-md disabled:opacity-50"
            >
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingProfile ? "Saving Profile..." : "Save Company Profile"}
            </button>
          </div>

        </form>
      )}

     {/* ── TAB 2: EMAIL SMTP GATEWAY ────────────────────────────────────── */}
      {activeSubTab === "mail" && (
        <form onSubmit={handleSaveAll} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sender Name</label>
              <input
                type="text"
                value={mailSettings.senderName}
                onChange={(e) => setMailSettings({ ...mailSettings, senderName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sender Email</label>
              <input
                type="email"
                value={mailSettings.senderEmail}
                onChange={(e) => setMailSettings({ ...mailSettings, senderEmail: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Host</label>
              <input
                type="text"
                value={mailSettings.smtpHost}
                onChange={(e) => setMailSettings({ ...mailSettings, smtpHost: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Port</label>
              <input
                type="text"
                value={mailSettings.smtpPort}
                onChange={(e) => setMailSettings({ ...mailSettings, smtpPort: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Username</label>
              <input
                type="text"
                value={mailSettings.username}
                onChange={(e) => setMailSettings({ ...mailSettings, username: e.target.value })}
                placeholder="e.g. noreply@yourdomain.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Password <span className="text-pink-600 font-bold">*</span></label>
              <input
                type="password"
                value={mailSettings.smtpPassword || ""}
                onChange={(e) => setMailSettings({ ...mailSettings, smtpPassword: e.target.value })}
                placeholder="Enter SMTP password or app password (secured)"
                className="w-full bg-slate-50 border border-slate-200 focus:border-pink-500 focus:ring-1 focus:ring-pink-500/20 rounded-xl px-3 py-2 text-xs focus:outline-none transition"
              />
              <p className="text-[10px] text-slate-400 font-normal mt-1">Password will be encrypted and stored securely on backend only.</p>
            </div>
          </div>
        </form>
      )}
      {/* ── TAB 3: WHATSAPP META API ─────────────────────────────────────── */}
      {activeSubTab === "whatsapp" && (
        <form onSubmit={handleSaveAll} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number ID</label>
              <input
                type="text"
                value={whatsAppSettings.phoneNumberId}
                onChange={(e) => setWhatsAppSettings({ ...whatsAppSettings, phoneNumberId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Business Account ID</label>
              <input
                type="text"
                value={whatsAppSettings.businessAccountId}
                onChange={(e) => setWhatsAppSettings({ ...whatsAppSettings, businessAccountId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Permanent Access Token</label>
              <input
                type="password"
                value={whatsAppSettings.accessToken}
                onChange={(e) => setWhatsAppSettings({ ...whatsAppSettings, accessToken: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>
        </form>
      )}

      {/* ── TAB 4: DISPATCH TEMPLATES ─────────────────────────────────────── */}
      {activeSubTab === "templates" && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Renewal Reminder Template</h3>
            <textarea
              rows={4}
              value={whatsAppSettings.templates.renewals}
              onChange={(e) => setWhatsAppSettings({
                ...whatsAppSettings,
                templates: { ...whatsAppSettings.templates, renewals: e.target.value }
              })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs"
            />
          </div>
        </div>
      )}

    </div>
  );
}
