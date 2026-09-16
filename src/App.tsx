import React, { useState, useEffect } from "react";
import { api, UserSession } from "./lib/api";
import { Policy, EmailLog, MailSettings, WhatsAppSettings } from "./types";

// Component Imports
import AuthGate from "./components/AuthGate";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import SubscriptionGate from "./components/SubscriptionGate";
import DashboardStats from "./components/DashboardStats";
import PolicyList from "./components/PolicyList";
import RenewalDashboard from "./components/RenewalDashboard";
import EmailLogs from "./components/EmailLogs";
import BirthdayDashboard from "./components/BirthdayDashboard";
import SettingsTab from "./components/SettingsTab";
import EmailSyncModal from "./components/EmailSyncModal";
import CustomerManagement from "./components/CustomerManagement";
import FollowUpManagement from "./components/FollowUpManagement";
import ReportsDashboard from "./components/ReportsDashboard";
import AuditLogView from "./components/AuditLogView";
import BusinessSegmentDashboard from "./components/BusinessSegmentDashboard";
import SegmentAnalytics from "./components/SegmentAnalytics";

import TeamManagement from "./components/TeamManagement";
import LeadManagement from "./components/LeadManagement";
import OperatorManagement from "./components/OperatorManagement";
import InsuranceCompanyManagement from "./components/InsuranceCompanyManagement";
import ContestManagement from "./components/ContestManagement";
import RevenueManagement from "./components/RevenueManagement";
import PerformanceManagement from "./components/PerformanceManagement";
import HighlightsView from "./components/HighlightsView";
import HighlightsManagement from "./components/HighlightsManagement";
import AdvisorManagement from "./components/AdvisorManagement";
import AccessDeniedPage from "./components/AccessDeniedPage";
import BrandLogo from "./components/BrandLogo";
import { hasPermission as checkPermission } from "./lib/permissions";



// Icons
import {
  Shield, LogOut, LayoutDashboard, ListFilter, CalendarRange,
  Mail, Sparkles, AlertTriangle, Cloud, User as UserIcon, RefreshCw, Clock, Megaphone,
  Cake, Settings, Menu, X, Database, Users, PhoneCall, UserCheck, Calendar, BarChart3, ShieldAlert,
  ChevronLeft, ChevronRight, PanelLeft, Building2, DollarSign, Trophy, Target, Briefcase
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Initial Demo/Mock Data Helpers for Local Sandbox Fallback
function getInitialDemoPolicies(userId: string): Policy[] {
  return [];
}

function getInitialDemoEmails(): EmailLog[] {
  return [];
}

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "highlights" | "highlights_mgmt" | "new_business" | "fresh" | "port" | "leads" | "followups" | "customers" | "policies" | "renewals" | "birthdays" | "operators" | "team" | "advisors" | "performance" | "companies" | "contests" | "revenue" | "reports" | "audit" | "emails" | "settings"
  >("dashboard");


  const [dbLoading, setDbLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [externalFilter, setExternalFilter] = useState<string | undefined>(undefined);
  const [dbConnected, setDbConnected] = useState(false);

  // Load Mail & WhatsApp Meta configurations
  const [mailSettings, setMailSettings] = useState<MailSettings>(() => {
    const saved = localStorage.getItem("mail_settings");
    return saved ? JSON.parse(saved) : {
      senderName: "Policy Master Agent",
      senderEmail: "updates@policymaster.com",
      smtpHost: "smtp.mailgun.org",
      smtpPort: "587",
      username: "",
      apiKey: "",
      enabled: false,
      credentialEmail: ""
    };
  });

  const [whatsAppSettings, setWhatsAppSettings] = useState<WhatsAppSettings>(() => {
    const saved = localStorage.getItem("whatsapp_settings");
    return saved ? JSON.parse(saved) : {
      phoneNumberId: "",
      businessAccountId: "",
      accessToken: "",
      enabled: false,
      templates: {
        renewals: "Hello {{customerName}},\n\nThis is a friendly reminder that your premium of ₹{{premiumAmount}} for policy #{{policyNumber}} is due on {{nextDueDate}}.\n\nRegards,\n{{senderName}}",
        birthdays: "Happy Birthday {{customerName}}! 🎂\n\nWe wish you a fantastic year ahead! As your trusted insurance advisors, we are always here to protect what matters most to you.\n\nWarm regards,\n{{senderName}}",
        onboarding: "Welcome {{customerName}} to Addims InSure! 🛡\n\nYour policy #{{policyNumber}} with {{companyName}} has been successfully registered on our secure ledger.\n\nWarm regards,\n{{senderName}}"
      }
    };
  });

  // Check MongoDB Connection and session on load
  useEffect(() => {
    // Clean any legacy dummy localStorage data
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("policies_") || key.startsWith("emails_")) {
        const item = localStorage.getItem(key);
        if (item && (item.includes("Aarav Sharma") || item.includes("demo_p"))) {
          localStorage.removeItem(key);
        }
      }
    });

    api.getDbStatus().then(status => setDbConnected(status.connected)).catch(() => setDbConnected(false));

    // Restore MongoDB user or local sandbox user session
    const mongoUserStr = localStorage.getItem("mongo_user");
    const localUserStr = localStorage.getItem("local_user");

    if (mongoUserStr) {
      try {
        setUser(JSON.parse(mongoUserStr));
      } catch (e) {
        localStorage.removeItem("mongo_user");
      }
    } else if (localUserStr) {
      try {
        setUser(JSON.parse(localUserStr));
      } catch (e) {
        localStorage.removeItem("local_user");
      }
    }

    setAuthLoading(false);
  }, []);

  // Fetch Policies and Email Logs from MongoDB for current user
  const fetchMongoData = async () => {
    if (!user) return;
    setDbLoading(true);

    if (user.uid === "local-agent-session" || user.uid.startsWith("local")) {
      const localPoliciesStr = localStorage.getItem(`policies_${user.uid}`);
      const localEmailsStr = localStorage.getItem(`emails_${user.uid}`);
      let localPolicies: Policy[] = localPoliciesStr ? JSON.parse(localPoliciesStr) : [];
      let localEmails: EmailLog[] = localEmailsStr ? JSON.parse(localEmailsStr) : [];

      localPolicies = localPolicies.filter(p => !p.id?.startsWith("demo_p") && p.customerName !== "Aarav Sharma" && p.customerName !== "Priya Patel");
      localEmails = localEmails.filter(e => !e.id?.startsWith("demo_e"));

      setPolicies(localPolicies);
      setEmails(localEmails);
      setDbLoading(false);
      return;
    }

    try {
      const fetchedPolicies = await api.getPolicies(user.uid);
      const fetchedEmails = await api.getEmailLogs(user.uid);
      setPolicies(fetchedPolicies);
      setEmails(fetchedEmails);

      try {
        const settingsRes = await api.getSettings(user.uid);
        if (settingsRes.mailSettings && Object.keys(settingsRes.mailSettings).length > 0) {
          setMailSettings(settingsRes.mailSettings);
        }
        if (settingsRes.whatsAppSettings && Object.keys(settingsRes.whatsAppSettings).length > 0) {
          setWhatsAppSettings(settingsRes.whatsAppSettings);
        }
      } catch (sErr) {
        console.warn("Failed fetching MongoDB settings:", sErr);
      }
    } catch (err) {
      console.error("Error fetching MongoDB data:", err);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMongoData();
    } else {
      setPolicies([]);
      setEmails([]);
    }
  }, [user]);

  const handleSettingsSave = async () => {
    const savedMail = localStorage.getItem("mail_settings");
    const savedWhatsApp = localStorage.getItem("whatsapp_settings");
    if (savedMail) setMailSettings(JSON.parse(savedMail));
    if (savedWhatsApp) setWhatsAppSettings(JSON.parse(savedWhatsApp));

    if (user && user.uid && !user.uid.startsWith("local")) {
      try {
        await api.saveSettings(user.uid, mailSettings, whatsAppSettings);
      } catch (err) {
        console.error("Error saving settings to MongoDB:", err);
      }
    }
  };

  // Log Out Handler
  const handleLogOut = async () => {
    localStorage.clear();
    setUser(null);
    setPolicies([]);
    setEmails([]);
  };

  // Calculate Urgent Dues
  const getPremiumAlerts = () => {
    const today = new Date();
    const urgentDues: { policy: Policy; daysLeft: number }[] = [];

    policies.forEach((p) => {
      if (p.nextDueDate && (p.premiumStatus === "Unpaid" || p.premiumStatus === "Overdue")) {
        const dueDate = new Date(p.nextDueDate);
        const timeDiff = dueDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
        if (daysLeft <= 15) {
          urgentDues.push({ policy: p, daysLeft });
        }
      }
    });

    return { urgentDues };
  };

  const { urgentDues } = getPremiumAlerts();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 gap-3">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold tracking-wide">Connecting to Addims InSure...</span>
      </div>
    );
  }

  if (!user) {
    return <AuthGate onSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  // SuperAdmin Role Routing
  if (user.role === "SUPER_ADMIN") {
    return <SuperAdminDashboard user={user} onLogOut={handleLogOut} />;
  }

  // Tenant Subscription Protection Check
  if (user.subscriptionStatus === "Expired" || user.subscriptionStatus === "Suspended") {
    return <SubscriptionGate user={user} onLogOut={handleLogOut} />;
  }

  const hasPermission = (permKey: string | string[]) => {
    return checkPermission(user, permKey as any);
  };

  interface SubNavItem {
    id: string;
    label: string;
  }

  interface NavItem {
    id: string;
    label: string;
    icon: any;
    badgeCount?: number;
    children?: SubNavItem[];
  }

  interface NavSection {
    title: string;
    items: NavItem[];
  }

  const navSections: NavSection[] = [
    {
      title: "HIGHLIGHTS",
      items: [
        hasPermission(["highlights.view", "highlightsManagement.view"]) && { id: "highlights", label: "Highlights", icon: Sparkles }
      ].filter(Boolean) as NavItem[]
    },
    {
      title: "MAIN",
      items: [
        hasPermission(["overview.view", "dashboard.view"]) && { id: "dashboard", label: "Overview", icon: LayoutDashboard },
        hasPermission(["newBusiness.view", "policies.view"]) && {
          id: "new_business",
          label: "New Business",
          icon: Shield,
          children: [
            hasPermission(["fresh.view", "newBusiness.view", "policies.view"]) && { id: "fresh", label: "Fresh" },
            hasPermission(["port.view", "newBusiness.view", "policies.view"]) && { id: "port", label: "Port" }
          ].filter(Boolean) as SubNavItem[]
        },
        hasPermission(["renewal.view", "renewals.view", "policies.view"]) && { id: "renewals", label: "Renewal", icon: CalendarRange },
      ].filter(Boolean) as NavItem[]
    },

    {
      title: "POLICY MANAGEMENT",
      items: [
        hasPermission(["policies.view"]) && { id: "policies", label: "Policies Ledger", icon: ListFilter },
        hasPermission(["birthdays.view"]) && { id: "birthdays", label: "Client Birthdays", icon: Cake },
      ].filter(Boolean) as NavItem[]
    },
    {
      title: "BUSINESS & REVENUE",
      items: [
        hasPermission(["revenue.view"]) && { id: "revenue", label: "Revenue", icon: DollarSign },
        hasPermission(["contests.view"]) && { id: "contests", label: "Contests", icon: Trophy },
        hasPermission(["reports.view"]) && { id: "reports", label: "Reports", icon: BarChart3 },
      ].filter(Boolean) as NavItem[]
    },
    {
      title: "TEAM MANAGEMENT",
      items: [
        hasPermission(["operators.view", "operators.create", "operators.edit"]) && { id: "operators", label: "Data Executives", icon: UserCheck },
        hasPermission(["team.view", "team.create", "team.edit"]) && { id: "team", label: "Sales Team", icon: Users },
        hasPermission(["advisors.view", "advisors.create", "advisors.edit", "advisors.manage", "team.view", "team.create"]) && { id: "advisors", label: "Advisors", icon: Briefcase },
        hasPermission(["performance.view", "performance.details", "performance.targets.manage"]) && { id: "performance", label: "Performance", icon: Target },
      ].filter(Boolean) as NavItem[]
    },
    {
      title: "COMMUNICATION",
      items: [
        hasPermission(["dispatch.view"]) && { id: "emails", label: "Dispatch Logs", icon: Mail, badgeCount: emails.length },
      ].filter(Boolean) as NavItem[]
    },
    {
      title: "CONFIGURATION",
      items: [
        hasPermission(["insuranceCompanies.view", "companies.view"]) && { id: "companies", label: "Insurance Companies", icon: Building2 },
        hasPermission(["gatewaySettings.view", "settings.view"]) && { id: "settings", label: "Gateway Settings", icon: Settings },
        hasPermission(["highlightsManagement.view", "highlights.create", "highlights.edit", "highlights.banner.upload"]) && { id: "highlights_mgmt", label: "Highlights Management", icon: Megaphone },
      ].filter(Boolean) as NavItem[]
    }

  ].filter(section => section.items.length > 0);

  const renderSidebarContent = () => (
    <div className={`relative flex flex-col h-full bg-white text-slate-800 border-r border-slate-200/80 transition-all duration-300 ${isSidebarCollapsed ? "py-5 px-2" : "py-5 px-4"}`}>

      {/* Floating Circular Sidebar Toggle Button for Desktop */}
      <button
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="hidden lg:flex absolute -right-3.5 top-6 w-[30px] h-[30px] bg-white border border-slate-200/90 rounded-full items-center justify-center text-slate-500 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-300 cursor-pointer shadow-xs z-40 transition-all"
        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isSidebarCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* 1. TOP SECTION (Fixed - Centered Logo) */}
      <div className={`flex items-center shrink-0 mb-4 ${isSidebarCollapsed ? "justify-center" : "px-1"}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandLogo size="sm" className="shrink-0" />
          {!isSidebarCollapsed && (
            <div className="min-w-0">
              <span className="text-base font-black tracking-tight text-slate-900 flex items-center gap-1 leading-none">
                Addims <span className="text-blue-600">InSure</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-tight mt-1 block truncate" title="Smart Insurance CRM">
                Smart Insurance CRM
              </span>
              <span className="text-[9px] text-blue-600 font-mono mt-0.5 block font-bold">
                {user.role === "ADMIN" ? "ADMIN PORTAL" : user.role === "OPERATOR" ? "OPERATOR PORTAL" : "PORTAL"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. MAIN NAVIGATION SECTION (Scrollable, Native Scrollbar Hidden) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pr-0.5 space-y-4">


        {/* Dynamic RBAC Navigation Menu Grouped into Sections */}
        <nav className="space-y-3">
          {navSections.map(section => (
            <div key={section.title} className="space-y-1">
              {!isSidebarCollapsed ? (
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 pt-1.5 pb-0.5 block select-none">
                  {section.title}
                </div>
              ) : (
                <div className="h-px bg-slate-200 mx-2 my-1.5" />
              )}
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const IconComponent = item.icon;
                  const isActive = activeTab === item.id || (item.id === "new_business" && (activeTab === "fresh" || activeTab === "port"));
                  return (
                    <div key={item.id} className="space-y-0.5">
                      <button
                        onClick={() => {
                          setActiveTab(item.id as any);
                          setIsMobileMenuOpen(false);
                        }}
                        title={isSidebarCollapsed ? item.label : undefined}
                        className={`w-full rounded-xl text-xs font-medium flex items-center transition-all ${isSidebarCollapsed ? "justify-center p-2.5" : "px-3 py-2 justify-between text-left"
                          } ${isActive
                            ? "bg-pink-50/80 text-pink-900 border border-pink-200/90 shadow-2xs font-bold"
                            : "text-slate-600 hover:bg-pink-50/50 hover:text-pink-800"
                          }`}
                      >
                        <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
                          <IconComponent className={`w-4.5 h-4.5 shrink-0 ${isActive ? "text-pink-600" : "text-slate-400"}`} />
                          {!isSidebarCollapsed && <span>{item.label}</span>}
                        </div>
                        {!isSidebarCollapsed && item.badgeCount !== undefined && item.badgeCount > 0 && (
                          <span className="bg-pink-100 border border-pink-200 text-[10px] text-pink-800 px-1.5 py-0.2 rounded font-mono font-semibold">
                            {item.badgeCount}
                          </span>
                        )}
                        {!isSidebarCollapsed && item.children && (
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isActive ? "rotate-90 text-pink-600" : "text-slate-400"}`} />
                        )}
                      </button>

                      {/* Render Children (Fresh / Port) */}
                      {item.children && isActive && !isSidebarCollapsed && (
                        <div className="ml-5 pl-3 border-l-2 border-pink-200/80 my-1 space-y-1">
                          {item.children.map(child => {
                            const isChildActive = activeTab === child.id;
                            return (
                              <button
                                key={child.id}
                                onClick={() => {
                                  setActiveTab(child.id as any);
                                  setIsMobileMenuOpen(false);
                                }}
                                className={`w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 transition cursor-pointer ${isChildActive
                                  ? "bg-pink-100/90 text-pink-900 font-extrabold shadow-2xs"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-semibold"
                                  }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isChildActive ? "bg-pink-600 animate-pulse" : "bg-slate-300"}`} />
                                {child.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* 3. USER FOOTER SECTION */}
      <div className="pt-3 border-t border-slate-200/80 shrink-0 space-y-2">
        {!isSidebarCollapsed && (
          <div className="flex items-center justify-between px-1">
            <div className="min-w-0 pr-2">
              <div className="text-xs font-bold text-slate-900 truncate">
                {user.email.split("@")[0]}
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                {user.email}
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              <UserIcon className="w-3.5 h-3.5 text-slate-600" />
            </div>
          </div>
        )}

        <button
          onClick={handleLogOut}
          title={isSidebarCollapsed ? "Sign Out" : undefined}
          className={`w-full py-1 bg-slate-50 hover:bg-pink-50 text-slate-600 hover:text-pink-700 border border-slate-200 hover:border-pink-200 rounded-md text-[10px] font-bold flex items-center justify-center ${isSidebarCollapsed ? "px-0" : "gap-1"
            } transition cursor-pointer shadow-2xs`}
        >
          <LogOut className="w-3 h-3 shrink-0" />
          {!isSidebarCollapsed && <span>Sign Out</span>}
        </button>
      </div>

    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex text-slate-900 font-sans selection:bg-pink-600 selection:text-white">

      {/* Desktop Fixed Sidebar */}
      <aside className={`hidden lg:block ${isSidebarCollapsed ? "w-20" : "w-64"} border-r border-slate-200 shrink-0 fixed top-0 bottom-0 left-0 z-30 transition-all duration-300 ease-in-out bg-white`}>
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 bottom-0 left-0 w-72 z-50 lg:hidden shadow-2xl"
            >
              {renderSidebarContent()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className={`flex-1 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"} flex flex-col min-w-0 min-h-screen transition-all duration-300 ease-in-out`}>

        {/* Top Navbar Header */}
        {activeTab !== "highlights" ? (
          <header className="bg-white border-b border-slate-200/80 sticky top-0 z-20 px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <h1 className="text-base font-extrabold tracking-tight text-slate-900 capitalize flex items-center gap-2">
                  {activeTab === "dashboard" && "Dashboard Overview"}
                  {activeTab === "highlights_mgmt" && "Highlights & Recognition Management"}
                  {activeTab === "new_business" && "New Business Portfolio"}

                  {activeTab === "fresh" && "Fresh Business Portfolio"}
                  {activeTab === "port" && "Portability Business Portfolio"}
                  {activeTab === "leads" && "Leads & Caller Management"}
                  {activeTab === "followups" && "Scheduled Follow-Ups & Task Board"}
                  {activeTab === "customers" && "Customer Relationship Management"}
                  {activeTab === "policies" && "Policy Management Ledger"}
                  {activeTab === "renewals" && "Policy Renewals Hub"}
                  {activeTab === "revenue" && "Revenue Management & Financial Tracking"}
                  {activeTab === "contests" && "Insurance Company Contest Management"}
                  {activeTab === "birthdays" && "Customer Birthday Tracker"}
                  {activeTab === "operators" && "Data Executive Management & Access Control"}
                  {activeTab === "team" && "Team & Caller Master Management"}
                  {activeTab === "companies" && "Insurance Company Master Management"}
                  {activeTab === "reports" && "Performance & Conversion Reports"}
                  {activeTab === "audit" && "System Activity Audit Trail"}
                  {activeTab === "emails" && "Communication Dispatch Logs"}
                  {activeTab === "settings" && "Integration & Gateway Settings"}
                </h1>
                <p className="text-xs text-slate-500 font-normal hidden sm:block">
                  Secure Multi-Tenant Policy Ledger & Customer Renewal Hub
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Connection Status Badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-pink-50 text-pink-700 border border-pink-200/80 rounded-full text-xs font-medium">
                <Cloud className="w-3.5 h-3.5 text-pink-600" />
                <span>Cloud Synced</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              {/* Quick Sync Button */}
              <button
                onClick={fetchMongoData}
                disabled={dbLoading}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                title="Refresh Ledger Data"
              >
                <RefreshCw className={`w-4.5 h-4.5 ${dbLoading ? "animate-spin text-pink-600" : ""}`} />
              </button>
            </div>
          </header>
        ) : (
          <div className="lg:hidden fixed top-3 left-3 z-30">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2.5 bg-white/90 text-slate-700 hover:bg-white rounded-xl shadow-md border border-slate-200 backdrop-blur-xs"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        )}


        {/* Dynamic Main Body Views */}
        <main className="p-4 sm:p-6 flex-1 max-w-7xl w-full mx-auto space-y-5">

          {/* Urgent Renewal Alert Banner */}
          {urgentDues.length > 0 && activeTab === "dashboard" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between gap-4 text-amber-900"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-600 rounded-xl shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-sm block">Action Required: {urgentDues.length} Policy Premiums Due Soon</span>
                  <span className="text-xs text-amber-700">Immediate attention needed to prevent coverage lapses.</span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab("renewals")}
                className="px-4 py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-xl text-xs font-bold shrink-0 transition"
              >
                Review Renewals
              </button>
            </motion.div>
          )}

          {activeTab === "dashboard" && (
            hasPermission(["dashboard.view", "overview.view"]) ? (
              <DashboardStats
                policies={policies}
                onRefresh={fetchMongoData}
                onMetricClick={(filter) => {
                  setActiveTab("policies");
                  if (filter) setExternalFilter(filter);
                }}
                onNavigateToLedger={() => setActiveTab("policies")}
              />
            ) : <AccessDeniedPage moduleName="Dashboard Overview" onGoHome={() => setActiveTab("highlights")} />
          )}

          {activeTab === "highlights" && (
            hasPermission(["highlights.view", "highlightsManagement.view"]) ? (
              <HighlightsView user={user} />
            ) : <AccessDeniedPage moduleName="Highlights" onGoHome={() => setActiveTab("dashboard")} />
          )}

          {activeTab === "highlights_mgmt" && (
            hasPermission(["highlightsManagement.view", "highlights.create", "highlights.edit", "highlights.banner.upload"]) ? (
              <HighlightsManagement user={user} />
            ) : <AccessDeniedPage moduleName="Highlights Management" onGoHome={() => setActiveTab("dashboard")} />
          )}

          {activeTab === "new_business" && (
            hasPermission(["newBusiness.view", "policies.view"]) ? (
              <BusinessSegmentDashboard
                segment="new_business"
                policies={policies}
                user={user}
                userId={user.uid}
                onRefresh={fetchMongoData}
                onAddEmailLog={(newLog) => setEmails(prev => [newLog, ...prev])}
                onNavigateToLedger={(filter) => {
                  setActiveTab("policies");
                  if (filter) setExternalFilter(filter);
                }}
              />
            ) : <AccessDeniedPage moduleName="New Business Portfolio" onGoHome={() => setActiveTab("dashboard")} />
          )}

          {activeTab === "fresh" && (
            hasPermission(["fresh.view", "newBusiness.view", "policies.view"]) ? (
              <BusinessSegmentDashboard
                segment="fresh"
                policies={policies}
                user={user}
                userId={user.uid}
                onRefresh={fetchMongoData}
                onAddEmailLog={(newLog) => setEmails(prev => [newLog, ...prev])}
                onNavigateToLedger={(filter) => {
                  setActiveTab("policies");
                  if (filter) setExternalFilter(filter);
                }}
              />
            ) : <AccessDeniedPage moduleName="Fresh Business Portfolio" onGoHome={() => setActiveTab("dashboard")} />
          )}

          {activeTab === "port" && (
            hasPermission(["port.view", "newBusiness.view", "policies.view"]) ? (
              <BusinessSegmentDashboard
                segment="port"
                policies={policies}
                user={user}
                userId={user.uid}
                onRefresh={fetchMongoData}
                onAddEmailLog={(newLog) => setEmails(prev => [newLog, ...prev])}
                onNavigateToLedger={(filter) => {
                  setActiveTab("policies");
                  if (filter) setExternalFilter(filter);
                }}
              />
            ) : <AccessDeniedPage moduleName="Portability Business Portfolio" onGoHome={() => setActiveTab("dashboard")} />
          )}

          {activeTab === "leads" && (
            hasPermission(["leads.view"]) ? (
              <LeadManagement user={user} />
            ) : <AccessDeniedPage moduleName="Leads Management" onGoHome={() => setActiveTab("dashboard")} />
          )}

          {activeTab === "followups" && (
            hasPermission(["followups.view"]) ? (
              <FollowUpManagement user={user} />
            ) : <AccessDeniedPage moduleName="Scheduled Follow-Ups" onGoHome={() => setActiveTab("dashboard")} />
          )}

          {activeTab === "customers" && (
            hasPermission(["customers.view"]) ? (
              <CustomerManagement user={user} />
            ) : <AccessDeniedPage moduleName="Customer Relationship Management" onGoHome={() => setActiveTab("dashboard")} />
          )}

          {activeTab === "policies" && (
            hasPermission(["policies.view"]) ? (
              <PolicyList
                policies={policies}
                user={user}
                userId={user.uid}
                onRefresh={fetchMongoData}
                onAddEmailLog={(newLog) => setEmails(prev => [newLog, ...prev])}
                externalFilter={externalFilter}
                onClearExternalFilter={() => setExternalFilter(undefined)}
              />
            ) : <AccessDeniedPage moduleName="Policies Management Ledger" onGoHome={() => setActiveTab("dashboard")} />
          )}

          {activeTab === "renewals" && (
            hasPermission(["renewal.view", "renewals.view", "policies.view"]) ? (
              <BusinessSegmentDashboard
                segment="renewal"
                policies={policies}
                user={user}
                userId={user.uid}
                onRefresh={fetchMongoData}
                onAddEmailLog={(newLog) => setEmails(prev => [newLog, ...prev])}
                onNavigateToLedger={(filter) => {
                  setActiveTab("policies");
                  if (filter) setExternalFilter(filter);
                }}
              />
            ) : <AccessDeniedPage moduleName="Policy Renewals Hub" onGoHome={() => setActiveTab("dashboard")} />
          )}

          {activeTab === "birthdays" && (
            hasPermission(["birthdays.view"]) ? (
              <BirthdayDashboard
                policies={policies}
                whatsAppSettings={whatsAppSettings}
                onAddEmailLog={(newLog) => setEmails(prev => [newLog, ...prev])}
                userId={user.uid}
              />
            ) : <AccessDeniedPage moduleName="Customer Birthday Tracker" onGoHome={() => setActiveTab("dashboard")} />
          )}

          {activeTab === "operators" && (
            hasPermission(["operators.view", "operators.create", "operators.edit"]) ? (
              <OperatorManagement user={user} />
            ) : <AccessDeniedPage moduleName="Data Executive Management" onGoHome={() => setActiveTab("dashboard")} />
          )}

          {activeTab === "team" && (
            hasPermission(["team.view", "team.create", "team.edit"]) ? (
              <TeamManagement user={user} />
            ) : <AccessDeniedPage moduleName="Sales Team Management" onGoHome={() => setActiveTab("dashboard")} />
          )}

          {activeTab === "advisors" && (
            checkPermission(user, ["advisors.view", "advisors.create", "advisors.edit", "advisors.manage", "team.view", "team.create"]) ||
            ["SUPER_ADMIN", "ADMIN", "TENANT_ADMIN"].includes((user.role || "").toUpperCase()) ? (
              <AdvisorManagement user={user} />
            ) : <AccessDeniedPage moduleName="Advisor Master Management" onGoHome={() => setActiveTab("dashboard")} />
          )}

          {activeTab === "performance" && (
            hasPermission(["performance.view", "performance.details", "performance.targets.manage"]) ? (
              <PerformanceManagement user={user} />
            ) : <AccessDeniedPage moduleName="Performance Tracking" onGoHome={() => setActiveTab("dashboard")} />
          )}

          {activeTab === "companies" && (
            hasPermission(["insuranceCompanies.view", "companies.view"]) ? (
              <InsuranceCompanyManagement user={user} />
            ) : <AccessDeniedPage moduleName="Insurance Company Management" onGoHome={() => setActiveTab("dashboard")} />
          )}

          {activeTab === "contests" && (
            hasPermission(["contests.view"]) ? (
              <ContestManagement user={user} />
            ) : <AccessDeniedPage moduleName="Contest Management" onGoHome={() => setActiveTab("dashboard")} />
          )}

          {activeTab === "revenue" && (
            hasPermission(["revenue.view"]) ? (
              <RevenueManagement user={user} />
            ) : <AccessDeniedPage moduleName="Revenue Management" onGoHome={() => setActiveTab("dashboard")} />
          )}

          {activeTab === "reports" && (
            hasPermission(["reports.view"]) ? (
              <ReportsDashboard user={user} />
            ) : <AccessDeniedPage moduleName="Reports Dashboard" onGoHome={() => setActiveTab("dashboard")} />
          )}

          {activeTab === "audit" && (
            hasPermission(["activity_logs.view", "overview.view"]) ? (
              <AuditLogView user={user} />
            ) : <AccessDeniedPage moduleName="System Audit Trail" onGoHome={() => setActiveTab("dashboard")} />
          )}

          {activeTab === "emails" && (
            hasPermission(["dispatch.view"]) ? (
              <EmailLogs logs={emails} onRefresh={fetchMongoData} />
            ) : <AccessDeniedPage moduleName="Dispatch Communication Logs" onGoHome={() => setActiveTab("dashboard")} />
          )}

          {activeTab === "settings" && (
            hasPermission(["gatewaySettings.view", "settings.view"]) ? (
              <SettingsTab
                mailSettings={mailSettings}
                setMailSettings={setMailSettings}
                whatsAppSettings={whatsAppSettings}
                setWhatsAppSettings={setWhatsAppSettings}
                onSave={handleSettingsSave}
                user={user}
              />
            ) : <AccessDeniedPage moduleName="Gateway & Integration Settings" onGoHome={() => setActiveTab("dashboard")} />
          )}

        </main>
      </div>

      {/* Sync Email Modal */}
      <EmailSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        credentialEmail={mailSettings.credentialEmail || mailSettings.senderEmail}
        policies={policies}
        userId={user.uid}
        onSyncComplete={fetchMongoData}
      />
    </div>
  );
}
