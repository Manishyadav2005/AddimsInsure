import React, { useState, useEffect } from "react";
import { api, UserSession } from "../lib/api";
import { InsuranceCompany, InsuranceProduct } from "../types";
import { 
  Building2, Plus, Search, Edit2, CheckCircle2, XCircle, RefreshCw, 
  AlertCircle, Shield, TrendingUp, Percent, X, Trash2, Filter, Eye, Box
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface InsuranceCompanyManagementProps {
  user: UserSession;
}

export default function InsuranceCompanyManagement({ user }: InsuranceCompanyManagementProps) {
  const [activeTab, setActiveTab] = useState<"COMPANIES" | "PRODUCTS">("COMPANIES");

  // Companies State
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Company Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<InsuranceCompany | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    newBusinessPayoutPercentage: "15.00",
    renewalPayoutPercentage: "5.00",
    status: "Active" as "Active" | "Inactive"
  });

  // Company View / Drawer State
  const [viewingCompany, setViewingCompany] = useState<InsuranceCompany | null>(null);

  // Products State
  const [products, setProducts] = useState<InsuranceProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [prodSearchTerm, setProdSearchTerm] = useState("");
  const [selectedProdCompanyFilter, setSelectedProdCompanyFilter] = useState<string>("All");
  const [selectedProdStatusFilter, setSelectedProdStatusFilter] = useState<string>("All");

  // Product Modal State
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<InsuranceProduct | null>(null);
  const [prodFormLoading, setProdFormLoading] = useState(false);
  const [prodFormError, setProdFormError] = useState<string | null>(null);

  const [prodFormData, setProdFormData] = useState({
    companyId: "",
    name: "",
    code: "",
    description: "",
    status: "Active" as "Active" | "Inactive"
  });

  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getInsuranceCompanies();
      setCompanies(data);
    } catch (err: any) {
      console.error("Error fetching companies:", err);
      setError(err.message || "Failed to load insurance companies");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await api.getInsuranceProducts();
      setProducts(data);
    } catch (err: any) {
      console.error("Error fetching products:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchProducts();
  }, []);

  // Company Modal Handlers
  const openAddModal = () => {
    setEditingCompany(null);
    setFormData({
      name: "",
      code: "",
      newBusinessPayoutPercentage: "15.00",
      renewalPayoutPercentage: "5.00",
      status: "Active"
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (company: InsuranceCompany) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      code: company.code || "",
      newBusinessPayoutPercentage: company.newBusinessPayoutPercentage.toString(),
      renewalPayoutPercentage: company.renewalPayoutPercentage.toString(),
      status: company.status || "Active"
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const newPayout = parseFloat(formData.newBusinessPayoutPercentage);
    const renPayout = parseFloat(formData.renewalPayoutPercentage);

    if (isNaN(newPayout) || newPayout < 0 || newPayout > 100) {
      setFormError("New Business Payout must be between 0% and 100%");
      return;
    }
    if (isNaN(renPayout) || renPayout < 0 || renPayout > 100) {
      setFormError("Renewal Payout must be between 0% and 100%");
      return;
    }

    setFormLoading(true);

    try {
      if (editingCompany) {
        await api.updateInsuranceCompany(editingCompany.id, {
          name: formData.name,
          code: formData.code,
          newBusinessPayoutPercentage: newPayout,
          renewalPayoutPercentage: renPayout,
          status: formData.status
        });
      } else {
        await api.createInsuranceCompany({
          name: formData.name,
          code: formData.code,
          newBusinessPayoutPercentage: newPayout,
          renewalPayoutPercentage: renPayout,
          status: formData.status
        });
      }

      setIsModalOpen(false);
      fetchCompanies();
    } catch (err: any) {
      setFormError(err.message || "Failed to save insurance company");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      await api.toggleInsuranceCompanyStatus(id, newStatus);
      fetchCompanies();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  // Product Modal Handlers
  const openAddProdModal = (presetCompanyId?: string) => {
    setEditingProd(null);
    const defaultCompanyId = presetCompanyId || (companies.length > 0 ? companies[0].id : "");

    setProdFormData({
      companyId: defaultCompanyId,
      name: "",
      code: "",
      description: "",
      status: "Active"
    });
    setProdFormError(null);
    setIsProdModalOpen(true);
  };

  const openEditProdModal = (prod: InsuranceProduct) => {
    setEditingProd(prod);
    setProdFormData({
      companyId: prod.companyId || (companies.length > 0 ? companies[0].id : ""),
      name: prod.name,
      code: prod.code || "",
      description: prod.description || "",
      status: prod.status || "Active"
    });
    setProdFormError(null);
    setIsProdModalOpen(true);
  };

  const handleProdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdFormError(null);

    if (!prodFormData.companyId) {
      setProdFormError("Please select an Insurance Company.");
      return;
    }

    if (!prodFormData.name.trim()) {
      setProdFormError("Product Name is required.");
      return;
    }

    setProdFormLoading(true);
    try {
      if (editingProd) {
        await api.updateInsuranceProduct(editingProd.id || editingProd._id!, {
          companyId: prodFormData.companyId,
          name: prodFormData.name.trim(),
          code: prodFormData.code.trim(),
          description: prodFormData.description.trim(),
          status: prodFormData.status
        });
      } else {
        await api.createInsuranceProduct({
          companyId: prodFormData.companyId,
          name: prodFormData.name.trim(),
          code: prodFormData.code.trim(),
          description: prodFormData.description.trim(),
          status: prodFormData.status
        });
      }
      setIsProdModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setProdFormError(err.message || "Failed to save product.");
    } finally {
      setProdFormLoading(false);
    }
  };

  const handleDeleteProd = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this insurance product?")) {
      try {
        await api.deleteInsuranceProduct(id);
        fetchProducts();
      } catch (err: any) {
        alert(`Failed to delete product: ${err.message}`);
      }
    }
  };

  const handleToggleProdStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      await api.toggleInsuranceProductStatus(id, newStatus);
      fetchProducts();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  // Filtered products
  const filteredProducts = products.filter(p => {
    const matchesCompany = selectedProdCompanyFilter === "All" || p.companyId === selectedProdCompanyFilter;
    const matchesStatus = selectedProdStatusFilter === "All" || p.status === selectedProdStatusFilter;

    const q = prodSearchTerm.toLowerCase().trim();
    const matchesSearch = q === "" ||
      p.name.toLowerCase().includes(q) ||
      (p.code && p.code.toLowerCase().includes(q)) ||
      (p.companyName && p.companyName.toLowerCase().includes(q));

    return matchesCompany && matchesStatus && matchesSearch;
  });

  // Filtered companies
  const filteredCompanies = companies.filter(c => {
    const q = searchTerm.toLowerCase().trim();
    return c.name.toLowerCase().includes(q) || (c.code && c.code.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Insurance Master Management</h2>
              <p className="text-xs text-slate-500 font-medium">Configure insurance companies and linked products in MongoDB.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchCompanies(); fetchProducts(); }}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${(loading || loadingProducts) ? "animate-spin" : ""}`} />
            </button>

            {activeTab === "COMPANIES" && (
              <button
                onClick={openAddModal}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm cursor-pointer transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Insurance Company</span>
              </button>
            )}
            {activeTab === "PRODUCTS" && (
              <button
                onClick={() => openAddProdModal()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm cursor-pointer transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Insurance Product</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation - Exactly 2 Tabs */}
        <div className="flex border-b border-slate-200 gap-6 pt-2">
          <button
            onClick={() => setActiveTab("COMPANIES")}
            className={`pb-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === "COMPANIES"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Insurance Companies ({companies.length})
          </button>
          <button
            onClick={() => setActiveTab("PRODUCTS")}
            className={`pb-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === "PRODUCTS"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Box className="w-4 h-4" />
            Insurance Products ({products.length})
          </button>
        </div>
      </div>

      {/* TAB 1: COMPANIES */}
      {activeTab === "COMPANIES" && (
        <>
          {/* Quick Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Providers</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{companies.length}</div>
              </div>
              <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Providers</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">
                  {companies.filter(c => c.status === "Active").length}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Linked Products</div>
                <div className="text-2xl font-black text-indigo-600 mt-1">
                  {products.length}
                </div>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Box className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search company by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="text-xs font-semibold text-slate-500">
              Showing {filteredCompanies.length} of {companies.length} Companies
            </div>
          </div>

          {/* Companies Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5 border-r border-slate-200/60">Company Name</th>
                    <th className="px-5 py-3.5 border-r border-slate-200/60">Company Code</th>
                    <th className="px-5 py-3.5 border-r border-slate-200/60">Products</th>
                    <th className="px-5 py-3.5 border-r border-slate-200/60">New Business Payout</th>
                    <th className="px-5 py-3.5 border-r border-slate-200/60">Renewal Payout</th>
                    <th className="px-5 py-3.5 border-r border-slate-200/60">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-xs text-slate-400 font-medium">
                        Loading insurance companies...
                      </td>
                    </tr>
                  ) : filteredCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-xs text-slate-400 font-medium">
                        No insurance companies found. Click "+ Add Insurance Company" above to register your first company!
                      </td>
                    </tr>
                  ) : (
                    filteredCompanies.map((comp) => {
                      const linkedProdCount = products.filter(p => p.companyId === comp.id).length;

                      return (
                        <tr key={comp.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-5 py-3.5 font-bold text-slate-900 border-r border-slate-100 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span>{comp.name}</span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-xs font-bold text-indigo-600 border-r border-slate-100">
                            {comp.code || "—"}
                          </td>
                          <td className="px-5 py-3.5 border-r border-slate-100">
                            <span className="font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg text-[11px] border border-slate-200 inline-flex items-center gap-1">
                              <Box className="w-3 h-3 text-indigo-500" />
                              {linkedProdCount} Products
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono font-extrabold text-emerald-700 border-r border-slate-100">
                            {comp.newBusinessPayoutPercentage}%
                          </td>
                          <td className="px-5 py-3.5 font-mono font-extrabold text-sky-700 border-r border-slate-100">
                            {comp.renewalPayoutPercentage}%
                          </td>
                          <td className="px-5 py-3.5 border-r border-slate-100">
                            <button
                              onClick={() => handleToggleStatus(comp.id, comp.status || "Active")}
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border cursor-pointer transition ${
                                comp.status === "Active"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                              }`}
                              title="Click to toggle status"
                            >
                              {comp.status || "Active"}
                            </button>
                          </td>
                          <td className="px-5 py-3.5 text-right space-x-1.5">
                            <button
                              onClick={() => setViewingCompany(comp)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer border border-slate-200"
                              title="View Linked Products"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(comp)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer border border-slate-200"
                              title="Edit Company"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: PRODUCTS */}
      {activeTab === "PRODUCTS" && (
        <>
          {/* Quick Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Products</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{products.length}</div>
              </div>
              <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
                <Box className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Products</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">
                  {products.filter(p => p.status === "Active" || !p.status).length}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inactive Products</div>
                <div className="text-2xl font-black text-slate-400 mt-1">
                  {products.filter(p => p.status === "Inactive").length}
                </div>
              </div>
              <div className="p-3 bg-slate-100 text-slate-400 rounded-xl">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search, Filter & List Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search product name, code or company..."
                  value={prodSearchTerm}
                  onChange={(e) => setProdSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto text-xs">
                {/* Company Filter */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedProdCompanyFilter}
                    onChange={(e) => setSelectedProdCompanyFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Insurance Companies</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
                  <select
                    value={selectedProdStatusFilter}
                    onChange={(e) => setSelectedProdStatusFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <span className="text-slate-400 font-semibold text-[11px] whitespace-nowrap ml-auto md:ml-0">
                  Showing {filteredProducts.length} of {products.length} Products
                </span>
              </div>
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 border-r border-slate-200">Product Name</th>
                    <th className="px-5 py-3 border-r border-slate-200">Product Code</th>
                    <th className="px-5 py-3 border-r border-slate-200">Insurance Company</th>
                    <th className="px-5 py-3 border-r border-slate-200">Description</th>
                    <th className="px-5 py-3 border-r border-slate-200">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {loadingProducts ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 font-bold">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                        Loading insurance products...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                        <Box className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        No insurance products found.
                        <button
                          onClick={() => openAddProdModal()}
                          className="mt-3 block mx-auto px-3.5 py-1.5 bg-indigo-600 text-white font-bold rounded-lg text-xs hover:bg-indigo-700 transition cursor-pointer"
                        >
                          + Add Insurance Product
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      return (
                        <tr key={p.id || p._id} className="hover:bg-slate-50/80 transition">
                          <td className="px-5 py-3.5 font-bold text-slate-900 border-r border-slate-100">
                            {p.name}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-indigo-600 font-bold border-r border-slate-100">
                            {p.code || "—"}
                          </td>
                          <td className="px-5 py-3.5 border-r border-slate-100">
                            <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {p.companyName || "—"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 border-r border-slate-100">
                            {p.description || "—"}
                          </td>
                          <td className="px-5 py-3.5 border-r border-slate-100">
                            <button
                              onClick={() => handleToggleProdStatus(p.id || p._id!, p.status || "Active")}
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border cursor-pointer transition ${
                                p.status === "Active" || !p.status
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                              }`}
                              title="Click to toggle status"
                            >
                              {p.status || "Active"}
                            </button>
                          </td>
                          <td className="px-5 py-3.5 text-right space-x-1.5">
                            <button
                              onClick={() => openEditProdModal(p)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer border border-slate-200"
                              title="Edit Product"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProd(p.id || p._id!)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer border border-slate-200"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Centered Modal: Company Details & Linked Products */}
      <AnimatePresence>
        {viewingCompany && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-500/30">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg tracking-tight">{viewingCompany.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">Company Code: {viewingCompany.code || "N/A"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingCompany(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                {/* Company Details Summary Grid */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Company Status</div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border inline-block ${
                      viewingCompany.status === "Active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-200 text-slate-600 border-slate-300"
                    }`}>
                      {viewingCompany.status}
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">New Business Payout</div>
                    <div className="text-base font-black text-emerald-600 font-mono">{viewingCompany.newBusinessPayoutPercentage}%</div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Renewal Payout</div>
                    <div className="text-base font-black text-sky-600 font-mono">{viewingCompany.renewalPayoutPercentage}%</div>
                  </div>
                </div>

                {/* Linked Products Section Header */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                      <Box className="w-4 h-4 text-indigo-600" />
                      Linked Insurance Products ({products.filter(p => p.companyId === viewingCompany.id).length})
                    </h4>
                    <p className="text-slate-500 text-[11px]">Products registered under {viewingCompany.name}</p>
                  </div>
                  <button
                    onClick={() => openAddProdModal(viewingCompany.id)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Product</span>
                  </button>
                </div>

                {/* Linked Products Grid */}
                {products.filter(p => p.companyId === viewingCompany.id).length === 0 ? (
                  <div className="py-12 text-center text-slate-400 bg-slate-50/80 rounded-2xl border border-dashed border-slate-300 p-8 space-y-3">
                    <p className="font-semibold text-slate-600">No products linked to {viewingCompany.name} yet.</p>
                    <button
                      onClick={() => openAddProdModal(viewingCompany.id)}
                      className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold hover:bg-indigo-100 cursor-pointer transition inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Product to {viewingCompany.name}</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {products.filter(p => p.companyId === viewingCompany.id).map((prod) => (
                      <div
                        key={prod.id || prod._id}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between gap-3 hover:border-indigo-300 transition"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                              <Box className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span>{prod.name}</span>
                            </div>
                            {prod.code && (
                              <span className="font-mono text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200">
                                {prod.code}
                              </span>
                            )}
                          </div>
                          {prod.description && (
                            <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2">{prod.description}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            prod.status === "Active" || !prod.status
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}>
                            {prod.status || "Active"}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openEditProdModal(prod)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer border border-slate-200"
                              title="Edit Product"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProd(prod.id || prod._id!)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer border border-slate-200"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Add/Edit Company */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">
                    {editingCompany ? "Edit Insurance Company" : "Add Insurance Company"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Life"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company Code</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">New Business Payout (%) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      value={formData.newBusinessPayoutPercentage}
                      onChange={(e) => setFormData(prev => ({ ...prev, newBusinessPayoutPercentage: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Renewal Payout (%) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      value={formData.renewalPayoutPercentage}
                      onChange={(e) => setFormData(prev => ({ ...prev, renewalPayoutPercentage: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {formLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingCompany ? "Update Company" : "Save Company"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD / EDIT INSURANCE PRODUCT MODAL */}
      <AnimatePresence>
        {isProdModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">
                    {editingProd ? "Edit Insurance Product" : "Add Insurance Product"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsProdModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleProdSubmit} className="p-6 space-y-4 text-xs">
                {prodFormError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{prodFormError}</span>
                  </div>
                )}

                {/* Insurance Company Select */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Insurance Company *
                  </label>
                  <select
                    required
                    value={prodFormData.companyId}
                    onChange={(e) => setProdFormData(prev => ({ ...prev, companyId: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Insurance Company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Click 2 Protect Super"
                    value={prodFormData.name}
                    onChange={(e) => setProdFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Product Code / Slug</label>
                  <input
                    type="text"
                    placeholder="e.g. C2PS"
                    value={prodFormData.code}
                    onChange={(e) => setProdFormData(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Optional description of this insurance product..."
                    value={prodFormData.description}
                    onChange={(e) => setProdFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={prodFormData.status}
                    onChange={(e) => setProdFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsProdModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={prodFormLoading}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {prodFormLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingProd ? "Update Product" : "Save Product"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
