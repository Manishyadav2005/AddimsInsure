import React, { useState, useEffect, useMemo } from "react";
import { UserSession, api } from "../lib/api";
import ConfirmModal from "./ConfirmModal";
import {
  Megaphone, Plus, Edit, Trash2, Calendar, Award, Cake, PartyPopper,
  CheckCircle2, AlertTriangle, Star, MapPin, Clock, Users, RefreshCw, X, Filter, Search, Eye, Upload, Image as ImageIcon, Sparkles, LayoutGrid
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HighlightsManagementProps {
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

export default function HighlightsManagement({ user: _user }: HighlightsManagementProps) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals State
  const [isGenericModalOpen, setIsGenericModalOpen] = useState<boolean>(false);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState<boolean>(false);
  const [editingHighlight, setEditingHighlight] = useState<HighlightItem | null>(null);

  // Confirm Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<HighlightItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Generic Highlight Form State (NO BANNER IMAGE FIELD HERE)
  const [formType, setFormType] = useState<"BIRTHDAY" | "EVENT" | "ANNOUNCEMENT" | "RECOGNITION">("ANNOUNCEMENT");
  const [formTitle, setFormTitle] = useState<string>("");
  const [formPersonName, setFormPersonName] = useState<string>("");
  const [formTeam, setFormTeam] = useState<string>("");
  const [formDate, setFormDate] = useState<string>("");
  const [formTime, setFormTime] = useState<string>("");
  const [formLocation, setFormLocation] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formMessage, setFormMessage] = useState<string>("");
  const [formPriority, setFormPriority] = useState<"NORMAL" | "IMPORTANT" | "URGENT">("NORMAL");
  const [formDisplayFrom, setFormDisplayFrom] = useState<string>(todayStr);
  const [formDisplayUntil, setFormDisplayUntil] = useState<string>(
    new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formIsFeatured, setFormIsFeatured] = useState<boolean>(false);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");

  // Dedicated Banner Form State
  const [bannerTitle, setBannerTitle] = useState<string>("");
  const [bannerDescription, setBannerDescription] = useState<string>("");
  const [bannerImage, setBannerImage] = useState<string>("");
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const [bannerFilePreview, setBannerFilePreview] = useState<string | null>(null);
  const [bannerDisplayFrom, setBannerDisplayFrom] = useState<string>(todayStr);
  const [bannerDisplayUntil, setBannerDisplayUntil] = useState<string>(
    new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [bannerIsActive, setBannerIsActive] = useState<boolean>(true);

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

  useEffect(() => {
    fetchHighlightsData();
  }, []);

  const bannerHighlights = useMemo(() => {
    return highlights.filter(h => h.type === "BANNER");
  }, [highlights]);

  const genericHighlights = useMemo(() => {
    return highlights.filter(h => h.type !== "BANNER" && (
      typeFilter === "ALL" || h.type === typeFilter
    ) && (
      statusFilter === "ALL" ? true : statusFilter === "ACTIVE" ? h.isActive : !h.isActive
    ) && (
      h.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.personName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.team || "").toLowerCase().includes(searchTerm.toLowerCase())
    ));
  }, [highlights, typeFilter, statusFilter, searchTerm]);

  // Open Generic Highlight Modal
  const handleOpenCreateGeneric = () => {
    setEditingHighlight(null);
    setFormType("ANNOUNCEMENT");
    setFormTitle("");
    setFormPersonName("");
    setFormTeam("");
    setFormDate("");
    setFormTime("");
    setFormLocation("");
    setFormDescription("");
    setFormMessage("");
    setFormPriority("NORMAL");
    setFormDisplayFrom(todayStr);
    setFormDisplayUntil(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    setFormIsActive(true);
    setFormIsFeatured(false);
    setFormError("");
    setIsGenericModalOpen(true);
  };

  // Open Edit Generic Highlight Modal
  const handleOpenEditGeneric = (h: HighlightItem) => {
    setEditingHighlight(h);
    setFormType(h.type as any);
    setFormTitle(h.title || "");
    setFormPersonName(h.personName || "");
    setFormTeam(h.team || "");
    setFormDate(h.date || "");
    setFormTime(h.time || "");
    setFormLocation(h.location || "");
    setFormDescription(h.description || "");
    setFormMessage(h.message || "");
    setFormPriority(h.priority || "NORMAL");
    setFormDisplayFrom(h.displayFrom || todayStr);
    setFormDisplayUntil(h.displayUntil || todayStr);
    setFormIsActive(h.isActive);
    setFormIsFeatured(h.isFeatured);
    setFormError("");
    setIsGenericModalOpen(true);
  };

  // Open Add Banner Modal
  const handleOpenCreateBanner = () => {
    setEditingHighlight(null);
    setBannerTitle("");
    setBannerDescription("");
    setBannerImage("");
    setSelectedBannerFile(null);
    setBannerFilePreview(null);
    setBannerDisplayFrom(todayStr);
    setBannerDisplayUntil(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    setBannerIsActive(true);
    setFormError("");
    setIsBannerModalOpen(true);
  };

  // Open Edit Banner Modal
  const handleOpenEditBanner = (h: HighlightItem) => {
    setEditingHighlight(h);
    setBannerTitle(h.title || "");
    setBannerDescription(h.description || h.message || "");
    setBannerImage(h.image || "");
    setSelectedBannerFile(null);
    setBannerFilePreview(h.image || null);
    setBannerDisplayFrom(h.displayFrom || todayStr);
    setBannerDisplayUntil(h.displayUntil || todayStr);
    setBannerIsActive(h.isActive);
    setFormError("");
    setIsBannerModalOpen(true);
  };

  // Select Banner File
  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setFormError("Invalid image file format. Please choose a JPG, JPEG, PNG, or WEBP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError("File size exceeds 5MB limit. Please choose a smaller file.");
      return;
    }

    setFormError("");
    setSelectedBannerFile(file);
    setBannerFilePreview(URL.createObjectURL(file));
  };

  // Save Generic Highlight (No Banner Image Upload)
  const handleSaveGeneric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError("Title is required");
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError("");

      const payload = {
        type: formType,
        title: formTitle.trim(),
        personName: formPersonName.trim(),
        team: formTeam.trim(),
        date: formDate,
        time: formTime,
        location: formLocation.trim(),
        description: formDescription.trim(),
        message: formMessage.trim(),
        image: "", // Purely text content
        priority: formPriority,
        displayFrom: formDisplayFrom,
        displayUntil: formDisplayUntil,
        isActive: formIsActive,
        isFeatured: formIsFeatured
      };

      if (editingHighlight) {
        await api.updateHighlight(editingHighlight.id, payload);
      } else {
        await api.createHighlight(payload);
      }

      setIsGenericModalOpen(false);
      await fetchHighlightsData();
    } catch (err: any) {
      console.error("Save Highlight Error:", err);
      setFormError(err?.message || "Failed to save highlight");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Save Dedicated Banner
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBannerFile && !bannerImage) {
      setFormError("Banner Image file is required.");
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError("");

      let finalImageUrl = bannerImage;
      if (selectedBannerFile) {
        const uploadRes = await api.uploadHighlightBanner(selectedBannerFile);
        finalImageUrl = uploadRes.imageUrl;
      }

      const payload = {
        type: "BANNER",
        title: bannerTitle.trim() || "Highlight Banner",
        description: bannerDescription.trim(),
        message: bannerDescription.trim(),
        image: finalImageUrl,
        displayFrom: bannerDisplayFrom,
        displayUntil: bannerDisplayUntil,
        isActive: bannerIsActive,
        isFeatured: true
      };

      if (editingHighlight) {
        await api.updateHighlight(editingHighlight.id, payload);
      } else {
        await api.createHighlight(payload);
      }

      setIsBannerModalOpen(false);
      await fetchHighlightsData();
    } catch (err: any) {
      console.error("Save Banner Error:", err);
      setFormError(err?.message || "Failed to save banner");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await api.deleteHighlight(deleteTarget.id);
      setDeleteTarget(null);
      await fetchHighlightsData();
    } catch (err) {
      console.error("Delete Highlight Error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (h: HighlightItem) => {
    try {
      await api.updateHighlight(h.id, { isActive: !h.isActive });
      await fetchHighlightsData();
    } catch (err) {
      console.error("Toggle Active Error:", err);
    }
  };

  return (
    <div className="space-y-8 pb-10">

      {/* HEADER */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#660000]/10 text-[#660000] border border-[#660000]/20 rounded-xl">
            <Megaphone className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Highlights Management</span>
              <span className="px-2.5 py-0.5 bg-[#660000]/10 border border-[#660000]/20 text-[#660000] text-xs font-bold rounded-full uppercase tracking-wider">
                Admin Only
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage visual top banners, announcements, birthdays, events and recognition posts
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: DEDICATED HIGHLIGHT BANNERS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#660000]" />
              <span>Highlight Banners</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage banners displayed at the top of the Highlights page.
            </p>
          </div>

          <button
            onClick={handleOpenCreateBanner}
            className="px-4 py-2.5 bg-[#660000] text-white hover:bg-[#500000] rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Add Banner</span>
          </button>
        </div>

        {/* BANNERS MANAGEMENT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bannerHighlights.map((b) => {
            const isExpired = b.displayUntil < todayStr;
            const isUpcoming = b.displayFrom > todayStr;

            return (
              <div
                key={b.id}
                className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-2xs hover:border-[#660000]/40 transition group"
              >
                <div className="space-y-3">
                  {/* Thumbnail */}
                  <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-950 shadow-2xs">
                    {b.image ? (
                      <img src={b.image} alt={b.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-mono text-slate-400">
                        No Image
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleActive(b)}
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-xs border transition ${
                          b.isActive
                            ? "bg-emerald-500/90 text-white border-emerald-400"
                            : "bg-slate-800/90 text-slate-300 border-slate-700"
                        }`}
                      >
                        {b.isActive ? "Active" : "Inactive"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm truncate">{b.title}</h4>
                    {b.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 font-normal">{b.description}</p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] font-mono text-slate-600">
                  <div>
                    <span>{b.displayFrom} → {b.displayUntil}</span>
                    {isExpired && <span className="text-rose-500 font-bold block text-[10px]">Expired</span>}
                    {isUpcoming && <span className="text-amber-600 font-bold block text-[10px]">Scheduled</span>}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditBanner(b)}
                      className="p-1.5 text-slate-600 hover:text-[#660000] hover:bg-slate-200/80 rounded-lg transition cursor-pointer"
                      title="Edit Banner"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(b)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100/80 rounded-lg transition cursor-pointer"
                      title="Delete Banner"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {bannerHighlights.length === 0 && (
            <div className="col-span-full py-12 text-center text-xs text-slate-500 font-medium bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              No visual banners uploaded yet. Click "+ Add Banner" above to upload your first banner.
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: HIGHLIGHTS CONTENT MANAGEMENT */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#660000]" />
              <span>Highlights Content</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage announcements, birthdays, events and recognitions.
            </p>
          </div>

          <button
            onClick={handleOpenCreateGeneric}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Add Highlight</span>
          </button>
        </div>

        {/* FILTERS & SEARCH */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, person name or team..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-[#660000] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {["ALL", "ANNOUNCEMENT", "BIRTHDAY", "EVENT", "RECOGNITION"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition cursor-pointer ${
                    typeFilter === t
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {t === "ALL" ? "All Types" : t}
                </button>
              ))}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* CONTENT TABLE */}
        <div className="border border-slate-200/90 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Title & Details</th>
                  <th className="p-3.5">Person / Team</th>
                  <th className="p-3.5">Display Period</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Featured</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {genericHighlights.map((h) => {
                  const isExpired = h.displayUntil < todayStr;
                  const isUpcoming = h.displayFrom > todayStr;

                  return (
                    <tr key={h.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-extrabold rounded-md uppercase tracking-wider font-mono">
                          {h.type}
                        </span>
                      </td>
                      <td className="p-3.5 max-w-xs">
                        <span className="font-bold text-slate-900 block truncate text-sm">{h.title}</span>
                        {h.message && <span className="text-[11px] text-slate-500 block truncate">{h.message}</span>}
                      </td>
                      <td className="p-3.5">
                        {h.personName ? (
                          <div>
                            <span className="font-bold text-slate-800 block text-xs">{h.personName}</span>
                            {h.team && <span className="text-[10px] text-slate-500 block">{h.team}</span>}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">—</span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-600">
                        <div>{h.displayFrom} → {h.displayUntil}</div>
                        {isExpired && <span className="text-[10px] text-rose-500 font-semibold block">Expired</span>}
                        {isUpcoming && <span className="text-[10px] text-amber-600 font-semibold block">Scheduled</span>}
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => handleToggleActive(h)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider cursor-pointer border transition ${
                            h.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {h.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="p-3.5">
                        {h.isFeatured ? (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold rounded-md flex items-center gap-1 w-max">
                            <Star className="w-3 h-3 fill-amber-500 stroke-none" /> Featured
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">—</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenEditGeneric(h)}
                          className="p-1.5 text-slate-600 hover:text-[#660000] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Edit Record"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(h)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {genericHighlights.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-500 font-medium bg-slate-50">
                      No highlight content records found matching your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DEDICATED ADD / EDIT BANNER MODAL */}
      <AnimatePresence>
        {isBannerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#660000]" />
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {editingHighlight ? "Edit Highlight Banner" : "Add Highlight Banner"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsBannerModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveBanner} className="p-5 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* BANNER IMAGE UPLOAD CONTROL */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Banner Image *
                  </label>

                  {bannerFilePreview ? (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200 shadow-2xs group bg-slate-950">
                      <img src={bannerFilePreview} alt="Banner Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                        <label className="px-3.5 py-1.5 bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold rounded-lg cursor-pointer shadow-sm flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Change Image</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            onChange={handleBannerFileSelect}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 hover:border-[#660000] rounded-xl cursor-pointer bg-slate-50/70 hover:bg-rose-50/20 transition group">
                      <div className="flex flex-col items-center justify-center text-center p-4">
                        <div className="p-2.5 bg-slate-100 group-hover:bg-[#660000]/10 text-slate-500 group-hover:text-[#660000] rounded-xl mb-1.5 transition">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-800 group-hover:text-[#660000]">
                          Choose Image / Upload Banner *
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                          Supports PNG, JPG, JPEG or WEBP (Max size: 5MB)
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={handleBannerFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Banner Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Banner Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={bannerTitle}
                    onChange={(e) => setBannerTitle(e.target.value)}
                    placeholder="e.g. Annual Sales Conference 2026"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-[#660000] focus:outline-none"
                  />
                </div>

                {/* Short Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Short Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={bannerDescription}
                    onChange={(e) => setBannerDescription(e.target.value)}
                    placeholder="Short description or tagline..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-[#660000] focus:outline-none"
                  />
                </div>

                {/* Display Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Display Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={bannerDisplayFrom}
                      onChange={(e) => setBannerDisplayFrom(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-[#660000] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Display End Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={bannerDisplayUntil}
                      onChange={(e) => setBannerDisplayUntil(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-[#660000] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bannerIsActive}
                      onChange={(e) => setBannerIsActive(e.target.checked)}
                      className="w-4 h-4 text-[#660000] rounded focus:ring-0"
                    />
                    <span>Active (Visible on top of Highlights page)</span>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsBannerModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-5 py-2.5 bg-[#660000] hover:bg-[#500000] text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    {formSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>{editingHighlight ? "Update Banner" : "Save Banner"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GENERIC CREATE / EDIT HIGHLIGHT FORM MODAL (NO BANNER IMAGE FIELD) */}
      <AnimatePresence>
        {isGenericModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-slate-900" />
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {editingHighlight ? "Edit Highlight Record" : "Create New Highlight"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsGenericModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveGeneric} className="p-5 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Type Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Highlight Type *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { type: "ANNOUNCEMENT", label: "Announcement", icon: Megaphone },
                      { type: "BIRTHDAY", label: "Birthday", icon: Cake },
                      { type: "EVENT", label: "Event", icon: PartyPopper },
                      { type: "RECOGNITION", label: "Recognition", icon: Award },
                    ].map(t => (
                      <button
                        type="button"
                        key={t.type}
                        onClick={() => setFormType(t.type as any)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                          formType === t.type
                            ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <t.icon className="w-4 h-4" />
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Highlight Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Q3 Target Celebration Notice"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none"
                  />
                </div>

                {/* Person & Team Fields */}
                {(formType === "BIRTHDAY" || formType === "RECOGNITION") && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Person Name
                      </label>
                      <input
                        type="text"
                        value={formPersonName}
                        onChange={(e) => setFormPersonName(e.target.value)}
                        placeholder="Rakesh Sharma"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Team / Department
                      </label>
                      <input
                        type="text"
                        value={formTeam}
                        onChange={(e) => setFormTeam(e.target.value)}
                        placeholder="Team Sales"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Event Fields */}
                {formType === "EVENT" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Event Date
                      </label>
                      <input
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Time
                      </label>
                      <input
                        type="text"
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        placeholder="11:00 AM"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        placeholder="Main Auditorium"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Summary Message */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Summary Message
                  </label>
                  <input
                    type="text"
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    placeholder="Short message or subtitle"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none"
                  />
                </div>

                {/* Full Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Full Description
                  </label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Full announcement details..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none"
                  />
                </div>

                {/* Priority & Display Period */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Priority
                    </label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none"
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="IMPORTANT">Important</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Display From *
                    </label>
                    <input
                      type="date"
                      required
                      value={formDisplayFrom}
                      onChange={(e) => setFormDisplayFrom(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Display Until *
                    </label>
                    <input
                      type="date"
                      required
                      value={formDisplayUntil}
                      onChange={(e) => setFormDisplayUntil(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Status Toggles */}
                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 text-slate-900 rounded focus:ring-0"
                    />
                    <span>Active (Visible on Highlights page)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-amber-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsFeatured}
                      onChange={(e) => setFormIsFeatured(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-0"
                    />
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-500 stroke-none" /> Featured Item
                    </span>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsGenericModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    {formSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>{editingHighlight ? "Update Highlight" : "Publish Highlight"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Record"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

    </div>
  );
}
