import React, { useState, useEffect, useMemo } from "react";
import { UserSession, api } from "../lib/api";
import {
  Sparkles, Calendar, Cake, PartyPopper,
  Star, MapPin, Users, ChevronLeft, ChevronRight, Megaphone
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { OverviewPerformanceSection } from "./PerformanceWidgets";


interface HighlightsViewProps {
  user: UserSession;
}

export interface HighlightItem {
  id: string;
  tenantId: string;
  type: "BIRTHDAY" | "EVENT" | "ANNOUNCEMENT" | "RECOGNITION" | "BANNER";
  title: string;
  personName?: string;
  team?: string;
  date?: string;
  time?: string;
  location?: string;
  description?: string;
  message?: string;
  image?: string;
  priority?: "NORMAL" | "IMPORTANT" | "URGENT";
  displayFrom: string;
  displayUntil: string;
  isActive: boolean;
  isFeatured: boolean;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeBirthdayItem {
  id: string;
  name: string;
  role: string;
  team?: string;
  dob: string;
  nextBirthday: Date;
  daysUntil: number;
  formattedDate: string;
  badgeLabel: string;
  isToday: boolean;
}

const MONTH_SHORT_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getEmployeeBirthdayItem(id: string, name: string, role: string, team: string, dobStr: string): EmployeeBirthdayItem | null {
  if (!dobStr || !dobStr.trim()) return null;
  const parts = dobStr.trim().split("-");
  if (parts.length !== 3) return null;

  let year: number, month: number, day: number;
  if (parts[0].length === 4) {
    // YYYY-MM-DD
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else {
    // DD-MM-YYYY
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    year = parseInt(parts[2], 10);
  }

  if (isNaN(month) || isNaN(day) || month < 0 || month > 11 || day < 1 || day > 31) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let nextBday = new Date(today.getFullYear(), month, day);
  if (nextBday.getTime() < today.getTime()) {
    nextBday = new Date(today.getFullYear() + 1, month, day);
  }

  const diffTime = nextBday.getTime() - today.getTime();
  const daysUntil = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (daysUntil < 0 || daysUntil > 30) return null;

  const formattedDate = `${day} ${MONTH_SHORT_NAMES[month]}`;
  let badgeLabel = formattedDate;
  let isToday = false;

  if (daysUntil === 0) {
    badgeLabel = "Today";
    isToday = true;
  } else if (daysUntil === 1) {
    badgeLabel = "Tomorrow";
  } else if (daysUntil <= 7) {
    badgeLabel = `In ${daysUntil} days`;
  }

  return {
    id,
    name,
    role,
    team,
    dob: dobStr,
    nextBirthday: nextBday,
    daysUntil,
    formattedDate,
    badgeLabel,
    isToday
  };
}

export default function HighlightsView({ user: _user }: HighlightsViewProps) {
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [employeeBirthdays, setEmployeeBirthdays] = useState<EmployeeBirthdayItem[]>([]);
  const [_loading, setLoading] = useState<boolean>(true);

  // Carousel State & Index
  const [activeBannerIdx, setActiveBannerIdx] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const fetchHighlightsData = async () => {
    try {
      setLoading(true);
      const res = await api.getHighlights();
      setHighlights(res || []);
    } catch (err) {
      console.error("Failed to fetch highlights:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamBirthdays = async () => {
    try {
      const [bms, tms, tls, callers, rms, rexs] = await Promise.all([
        api.getBMsMaster().catch(() => []),
        api.getTMsMaster().catch(() => []),
        api.getTeamLeadersMaster().catch(() => []),
        api.getCallersMaster().catch(() => []),
        api.getRenewalManagersMaster().catch(() => []),
        api.getRenewalExecutivesMaster().catch(() => [])
      ]);

      const items: EmployeeBirthdayItem[] = [];

      (bms || []).forEach(b => {
        if (b.status === "Active" && b.dob) {
          const item = getEmployeeBirthdayItem(b.id, b.name, "Branch Manager", "Management", b.dob);
          if (item) items.push(item);
        }
      });

      (tms || []).forEach(t => {
        if (t.status === "Active" && t.dob) {
          const item = getEmployeeBirthdayItem(t.id, t.name, "Team Manager", t.bmName || "Management", t.dob);
          if (item) items.push(item);
        }
      });

      (tls || []).forEach(t => {
        if (t.status === "Active" && t.dob) {
          const item = getEmployeeBirthdayItem(t.id, t.name, "Team Leader", t.teamManagerName || "Sales Team", t.dob);
          if (item) items.push(item);
        }
      });

      (callers || []).forEach(c => {
        if (c.status === "Active" && c.dob) {
          const item = getEmployeeBirthdayItem(c.id, c.name, "TSE", c.teamLeaderName || "Sales Team", c.dob);
          if (item) items.push(item);
        }
      });

      (rms || []).forEach(r => {
        if (r.status === "Active" && r.dob) {
          const item = getEmployeeBirthdayItem(r.id, r.name, "Renewal Manager", "Renewal Team", r.dob);
          if (item) items.push(item);
        }
      });

      (rexs || []).forEach(r => {
        if (r.status === "Active" && r.dob) {
          const item = getEmployeeBirthdayItem(r.id, r.name, "Renewal Executive", r.renewalManagerName || "Renewal Team", r.dob);
          if (item) items.push(item);
        }
      });

      // Sort chronologically by next upcoming birthday
      items.sort((a, b) => a.daysUntil - b.daysUntil);
      setEmployeeBirthdays(items);
    } catch (err) {
      console.error("Failed to fetch team birthdays:", err);
    }
  };

  useEffect(() => {
    fetchHighlightsData();
    fetchTeamBirthdays();
  }, []);

  // Filter Active Uploaded Banners (Only type === BANNER)
  const activeBannerHighlights = useMemo(() => {
    return highlights.filter(h => h.type === "BANNER" && h.isActive);
  }, [highlights]);

  // Automatic Carousel Rotation (5s Interval, Right-to-Left, Pause on Hover)
  useEffect(() => {
    if (activeBannerHighlights.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setActiveBannerIdx(prev => (prev === activeBannerHighlights.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [activeBannerHighlights.length, isHovered]);

  const eventHighlights = useMemo(() => {
    return highlights.filter(h => h.type === "EVENT" && h.isActive);
  }, [highlights]);

  const announcementHighlights = useMemo(() => {
    return highlights.filter(h => h.type === "ANNOUNCEMENT" && h.isActive);
  }, [highlights]);

  const recognitionHighlights = useMemo(() => {
    return highlights.filter(h => h.type === "RECOGNITION" && h.isActive);
  }, [highlights]);

  // Carousel Navigation Handlers
  const handlePrevBanner = () => {
    setActiveBannerIdx(prev => (prev === 0 ? activeBannerHighlights.length - 1 : prev - 1));
  };

  const handleNextBanner = () => {
    setActiveBannerIdx(prev => (prev === activeBannerHighlights.length - 1 ? 0 : prev + 1));
  };

  const currentBanner = activeBannerHighlights[activeBannerIdx] || activeBannerHighlights[0] || null;

  return (
    <div className="space-y-6 pb-8">

      {/* 1. LARGE FEATURED HIGHLIGHT BANNER CAROUSEL AREA */}
      {currentBanner ? (
        <div
          className="relative group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBanner.id || activeBannerIdx}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {currentBanner.image ? (
                <div className="relative rounded-2xl overflow-hidden shadow-xs border border-slate-200/90 bg-slate-950 w-full flex items-center justify-center">
                  {/* Subtle Ambient Blurred Background */}
                  <img
                    src={currentBanner.image}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover filter blur-xl opacity-20 scale-105 pointer-events-none"
                  />
                  {/* Complete Banner Image - 100% Uncropped */}
                  <img
                    src={currentBanner.image}
                    alt={currentBanner.title || "Banner"}
                    className="relative z-10 w-full h-auto object-contain rounded-2xl block"
                  />
                </div>
              ) : (
                <div
                  className={`rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden flex flex-col md:flex-row items-stretch justify-between gap-5 border h-[180px] sm:h-[240px] md:h-[270px] lg:h-[280px] ${
                    currentBanner.type === "BIRTHDAY"
                      ? "bg-gradient-to-r from-rose-950 via-rose-900 to-red-950 text-white border-rose-800"
                      : currentBanner.type === "EVENT"
                      ? "bg-gradient-to-r from-indigo-950 via-slate-900 to-blue-950 text-white border-indigo-800"
                      : currentBanner.type === "RECOGNITION"
                      ? "bg-gradient-to-r from-[#500000] via-[#660000] to-[#3A0000] text-white border-[#800000]"
                      : "bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white border-slate-800"
                  }`}
                >
                  {/* Background Glow */}
                  <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />

                  {/* Left Column Content */}
                  <div className="space-y-2.5 max-w-2xl relative z-10 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-300 stroke-none" />
                          FEATURED HIGHLIGHT
                        </span>
                        <span className="px-2.5 py-0.5 bg-white/10 text-white/90 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                          {currentBanner.type}
                        </span>
                        {currentBanner.priority === "URGENT" && (
                          <span className="px-2 py-0.5 bg-rose-500/30 border border-rose-400/40 text-rose-200 text-[10px] font-bold rounded-md uppercase tracking-wider">
                            URGENT
                          </span>
                        )}
                      </div>

                      <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-white leading-tight">
                        {currentBanner.title}
                      </h2>

                      {currentBanner.personName && (
                        <div className="text-xs sm:text-sm font-extrabold text-amber-300 flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-amber-400" />
                          <span>{currentBanner.personName} {currentBanner.team ? `(${currentBanner.team})` : ""}</span>
                        </div>
                      )}

                      {currentBanner.message && (
                        <p className="text-xs text-slate-200 font-medium leading-relaxed max-w-xl line-clamp-2">
                          "{currentBanner.message}"
                        </p>
                      )}

                      {currentBanner.description && (
                        <p className="text-xs text-slate-300 font-normal line-clamp-1 leading-relaxed">
                          {currentBanner.description}
                        </p>
                      )}
                    </div>

                    {/* Banner Footer Info */}
                    <div className="pt-2 flex items-center gap-4 text-xs text-amber-200/90 font-medium border-t border-white/10 flex-wrap">
                      {currentBanner.date && (
                        <span className="flex items-center gap-1.5 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-amber-300" />
                          {currentBanner.date} {currentBanner.time ? `• ${currentBanner.time}` : ""}
                        </span>
                      )}
                      {currentBanner.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-300" />
                          {currentBanner.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column Icon */}
                  <div className="shrink-0 relative z-10 flex items-center justify-center md:justify-end min-w-[120px]">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-xl backdrop-blur-xs">
                      {currentBanner.type === "BIRTHDAY" && "🎂"}
                      {currentBanner.type === "EVENT" && "🎉"}
                      {currentBanner.type === "ANNOUNCEMENT" && "📢"}
                      {currentBanner.type === "RECOGNITION" && "🏆"}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Carousel Arrows (Visible when 2+ active items exist) */}
          {activeBannerHighlights.length > 1 && (
            <>
              <button
                onClick={handlePrevBanner}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 bg-slate-950/60 hover:bg-slate-950/85 text-white rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 transition cursor-pointer shadow-md opacity-70 group-hover:opacity-100 z-20"
                title="Previous Banner"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                onClick={handleNextBanner}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 bg-slate-950/60 hover:bg-slate-950/85 text-white rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 transition cursor-pointer shadow-md opacity-70 group-hover:opacity-100 z-20"
                title="Next Banner"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Pagination Dots */}
              <div className="flex items-center justify-center gap-1.5 pt-2.5 pb-1">
                {activeBannerHighlights.map((h, idx) => (
                  <button
                    key={h.id || idx}
                    onClick={() => setActiveBannerIdx(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      activeBannerIdx === idx ? "w-6 bg-[#660000]" : "w-1.5 bg-slate-300 hover:bg-slate-400"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        /* MINIMAL CLEAN NO-CONTENT STATE (NO CRUD BUTTONS) */
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-10 text-center shadow-xs space-y-2">
          <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No active highlights right now.</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            Important birthdays, events and company recognitions will appear here when published.
          </p>
        </div>
      )}

      {/* 2. TOP PERFORMERS & TEAM PERFORMANCE DISTRIBUTION */}
      <OverviewPerformanceSection
        selectedMonth={new Date().getMonth() + 1}
        selectedYear={new Date().getFullYear()}
      />

      {/* 3. BIRTHDAYS & EVENTS DUAL GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* UPCOMING BIRTHDAYS (AUTOMATICALLY GENERATED FROM EMPLOYEE DOB MASTER DATA) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#660000] flex items-center gap-2">
                <Cake className="w-4.5 h-4.5 text-[#660000]" />
                <span>Upcoming Birthdays</span>
              </h3>
              <p className="text-xs text-slate-500 font-normal mt-0.5">Automated Team & Employee Birthdays</p>
            </div>
            <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg font-mono">
              {employeeBirthdays.length} Upcoming
            </span>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {employeeBirthdays.map(b => (
              <div
                key={b.id}
                className={`border rounded-xl p-3.5 shadow-2xs flex items-center justify-between gap-3 transition ${
                  b.isToday
                    ? "bg-gradient-to-r from-rose-100/90 to-red-100/80 border-rose-300 shadow-sm"
                    : "bg-gradient-to-r from-rose-50/50 to-red-50/30 border-rose-200/80 hover:border-rose-300"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 border rounded-xl flex items-center justify-center text-lg shrink-0 font-bold shadow-2xs ${
                    b.isToday ? "bg-rose-600 text-white border-rose-700 animate-bounce" : "bg-rose-100 text-rose-700 border-rose-200"
                  }`}>
                    🎂
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{b.name}</h4>
                      {b.isToday && (
                        <span className="px-2 py-0.2 bg-rose-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider">
                          Happy Birthday!
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 truncate mt-0.5">{b.role} {b.team ? `• ${b.team}` : ""}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] font-medium">
                      <span className="font-mono text-rose-700 font-bold">{b.formattedDate}</span>
                      <span className={`px-2 py-0.3 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        b.isToday
                          ? "bg-rose-200 text-rose-900 border border-rose-300 font-extrabold"
                          : "bg-white/90 text-slate-700 border border-slate-200"
                      }`}>
                        {b.badgeLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {employeeBirthdays.length === 0 && (
              <div className="py-10 text-center text-xs text-slate-500 font-medium bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                No upcoming birthdays
              </div>
            )}
          </div>
        </div>

        {/* UPCOMING EVENTS */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#660000] flex items-center gap-2">
                <PartyPopper className="w-4.5 h-4.5 text-[#660000]" />
                <span>Upcoming Events</span>
              </h3>
              <p className="text-xs text-slate-500 font-normal mt-0.5">Company Meets & Celebrations</p>
            </div>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg font-mono">
              {eventHighlights.length} Active
            </span>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {eventHighlights.map(ev => (
              <div
                key={ev.id}
                className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex items-center justify-between gap-3 transition hover:border-[#660000]/40"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl flex items-center justify-center text-lg shrink-0 font-bold shadow-2xs">
                    🎉
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm truncate">{ev.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{ev.description || ev.message}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 font-medium flex-wrap">
                      {ev.date && (
                        <span className="flex items-center gap-1 font-mono text-indigo-700 font-bold">
                          <Calendar className="w-3 h-3 text-indigo-500" />
                          {ev.date} {ev.time ? `(${ev.time})` : ""}
                        </span>
                      )}
                      {ev.location && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {ev.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {eventHighlights.length === 0 && (
              <div className="py-10 text-center text-xs text-slate-500 font-medium bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                No upcoming events published
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 4. ANNOUNCEMENTS & ACHIEVEMENTS FEED */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#660000] flex items-center gap-2">
              <Megaphone className="w-4.5 h-4.5 text-[#660000]" />
              <span>Announcements & Achievements</span>
            </h3>
            <p className="text-xs text-slate-500 font-normal mt-0.5">Important policy notices & employee awards</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...announcementHighlights, ...recognitionHighlights].map(item => {
            const isAnn = item.type === "ANNOUNCEMENT";
            const priorityColor =
              item.priority === "URGENT"
                ? "bg-rose-100 text-rose-800 border-rose-200"
                : item.priority === "IMPORTANT"
                ? "bg-amber-100 text-amber-800 border-amber-200"
                : "bg-slate-100 text-slate-700 border-slate-200";

            return (
              <div
                key={item.id}
                className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4 space-y-2 flex flex-col justify-between transition hover:bg-slate-100/60 hover:border-slate-300"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-md uppercase tracking-wider ${priorityColor}`}>
                      {isAnn ? `ANNOUNCEMENT • ${item.priority}` : "RECOGNITION AWARD"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {item.displayFrom}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>

                  {item.personName && (
                    <p className="text-xs font-semibold text-[#660000] flex items-center gap-1">
                      <Star className="w-3 h-3 fill-[#660000] stroke-none" />
                      {item.personName} {item.team ? `(${item.team})` : ""}
                    </p>
                  )}

                  <p className="text-xs text-slate-600 font-normal leading-relaxed">
                    {item.message || item.description}
                  </p>
                </div>

                <div className="pt-2 text-[10px] text-slate-400 font-medium flex items-center justify-between border-t border-slate-200/60">
                  <span>Display until: {item.displayUntil}</span>
                  {item.isFeatured && (
                    <span className="text-amber-600 font-bold flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-500 stroke-none" /> Featured
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {announcementHighlights.length === 0 && recognitionHighlights.length === 0 && (
            <div className="col-span-full py-12 text-center text-xs text-slate-500 font-medium bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              No active announcements or recognition posts available
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
