import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { InsuranceCompanyModel, InsuranceCategoryModel, InsuranceProductModel, AuditLog } from "../models";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "policy_master_jwt_secret_key_2026_mongodb";

// Auth & Permission Middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = decoded;
    next();
  });
}

function requireAdmin(req: any, res: any, next: any) {
  if (req.user.role !== "ADMIN" && req.user.role !== "TENANT_ADMIN" && req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Forbidden: Only Organization Admins can manage Insurance Companies" });
  }
  next();
}

// Safe ID query builder to prevent Mongoose CastError on custom string IDs (e.g., comp_123)
function getSafeIdQuery(id: string, tenantId?: string, role?: string) {
  const isObjectId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
  const conditions: any[] = [{ id: id }];
  if (isObjectId) {
    conditions.push({ _id: id });
  }
  const query: any = conditions.length === 1 ? { ...conditions[0] } : { $or: conditions };
  if (role && role !== "SUPER_ADMIN" && tenantId) {
    query.tenantId = tenantId;
  }
  return query;
}

// ==========================================
// 1. INSURANCE CATEGORIES API ENDPOINTS
// ==========================================

// GET /api/companies/categories - List all Insurance Categories (with optional companyId filter)
router.get("/categories", authenticateToken, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const { companyId } = req.query;
    const query: any = {};
    if (role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }
    if (companyId) {
      query.companyId = companyId;
    }
    const categories = await InsuranceCategoryModel.find(query).sort({ createdAt: -1 });
    res.json(categories);
  } catch (err: any) {
    console.error("Fetch Insurance Categories Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch insurance categories" });
  }
});

// GET /api/companies/categories/active - List ACTIVE Insurance Categories
router.get("/categories/active", authenticateToken, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const { companyId } = req.query;
    const query: any = { status: "Active" };
    if (role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }
    if (companyId) {
      query.companyId = companyId;
    }
    const categories = await InsuranceCategoryModel.find(query).sort({ name: 1 });
    res.json(categories);
  } catch (err: any) {
    console.error("Fetch Active Categories Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch active insurance categories" });
  }
});

// POST /api/companies/categories - Create a new Insurance Category (linked to parent Company)
router.post("/categories", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { companyId, name, code, description, status } = req.body;
    const { tenantId, uid, name: userName, role } = req.user;

    if (!companyId || typeof companyId !== "string" || !companyId.trim()) {
      return res.status(400).json({ error: "Insurance Company is required" });
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Category Name is required" });
    }

    // Verify parent company exists using safe query
    const companyQuery = getSafeIdQuery(companyId, tenantId, role);
    const parentCompany = await InsuranceCompanyModel.findOne(companyQuery);
    if (!parentCompany) {
      return res.status(404).json({ error: "Selected Insurance Company not found" });
    }

    const trimmedName = name.trim();
    // Scoped duplicate check for THIS company
    const existing = await InsuranceCategoryModel.findOne({
      companyId: parentCompany.id,
      tenantId: role === "SUPER_ADMIN" ? (tenantId || "default_tenant") : tenantId,
      name: { $regex: new RegExp(`^${trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, "i") }
    });

    if (existing) {
      return res.status(400).json({ error: `Category "${trimmedName}" already exists for ${parentCompany.name}.` });
    }

    const catId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newCategory = new InsuranceCategoryModel({
      id: catId,
      tenantId: tenantId || "default_tenant",
      companyId: parentCompany.id,
      companyName: parentCompany.name,
      name: trimmedName,
      code: (code || "").trim(),
      description: (description || "").trim(),
      status: status === "Inactive" ? "Inactive" : "Active",
      createdBy: uid,
      createdByName: userName || "Admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (err: any) {
    console.error("Create Category Error:", err);
    res.status(500).json({ error: err.message || "Failed to create category" });
  }
});

// PUT /api/companies/categories/:id - Update an Insurance Category
router.put("/categories/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { companyId, name, code, description, status } = req.body;
    const { tenantId, role } = req.user;

    const query = getSafeIdQuery(id, tenantId, role);
    const category = await InsuranceCategoryModel.findOne(query);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    let targetCompanyId = category.companyId;
    let targetCompanyName = category.companyName;

    if (companyId && companyId !== category.companyId) {
      const parentCompany = await InsuranceCompanyModel.findOne(getSafeIdQuery(companyId, tenantId, role));
      if (!parentCompany) {
        return res.status(404).json({ error: "Selected Insurance Company not found" });
      }
      targetCompanyId = parentCompany.id;
      targetCompanyName = parentCompany.name;
    }

    const targetName = name !== undefined ? name.trim() : category.name;
    if (!targetName) {
      return res.status(400).json({ error: "Category Name is required" });
    }

    // Scoped duplicate check
    if (name !== undefined || companyId !== undefined) {
      const existing = await InsuranceCategoryModel.findOne({
        id: { $ne: category.id },
        companyId: targetCompanyId,
        tenantId: category.tenantId,
        name: { $regex: new RegExp(`^${targetName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, "i") }
      });
      if (existing) {
        return res.status(400).json({ error: `Category "${targetName}" already exists for this company.` });
      }
    }

    category.companyId = targetCompanyId;
    category.companyName = targetCompanyName;
    category.name = targetName;
    if (code !== undefined) category.code = (code || "").trim();
    if (description !== undefined) category.description = (description || "").trim();
    if (status !== undefined) category.status = status === "Inactive" ? "Inactive" : "Active";

    category.updatedAt = new Date().toISOString();
    await category.save();
    res.json(category);
  } catch (err: any) {
    console.error("Update Category Error:", err);
    res.status(500).json({ error: err.message || "Failed to update category" });
  }
});

// DELETE /api/companies/categories/:id - Delete an Insurance Category
router.delete("/categories/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { tenantId, role } = req.user;

    const query = getSafeIdQuery(id, tenantId, role);
    await InsuranceCategoryModel.deleteOne(query);
    res.json({ success: true, message: "Category deleted from MongoDB successfully" });
  } catch (err: any) {
    console.error("Delete Category Error:", err);
    res.status(500).json({ error: err.message || "Failed to delete category" });
  }
});

// POST /api/companies/categories/seed - Seed Standard Categories
router.post("/categories/seed", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { tenantId } = req.user;
    const defaultCats = [
      { name: "Life Insurance", code: "LIFE", description: "Individual & Group Life Policies" },
      { name: "Health Insurance", code: "HEALTH", description: "Individual, Family Floater & Mediclaim" },
      { name: "Motor Insurance", code: "MOTOR", description: "Car, Bike & Commercial Vehicle" },
      { name: "Home Insurance", code: "HOME", description: "Property, Building & Structure" },
      { name: "Travel Insurance", code: "TRAVEL", description: "Domestic & International Travel" },
      { name: "Term Insurance", code: "TERM", description: "Pure Term Life Protection Plan" },
      { name: "Retirement & Pension", code: "PENSION", description: "Annuity & Pension Investment" },
      { name: "Commercial & Business", code: "BIZ", description: "Fire, Marine, Cyber & Liability" }
    ];

    const inserted: any[] = [];
    for (const item of defaultCats) {
      const existing = await InsuranceCategoryModel.findOne({
        tenantId: tenantId || "default_tenant",
        name: item.name
      });
      if (!existing) {
        const cat = new InsuranceCategoryModel({
          id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          tenantId: tenantId || "default_tenant",
          name: item.name,
          code: item.code,
          description: item.description,
          status: "Active"
        });
        await cat.save();
        inserted.push(cat);
      }
    }
    res.json({ success: true, message: "Standard Insurance Categories seeded successfully", insertedCount: inserted.length });
  } catch (err: any) {
    console.error("Seed Categories Error:", err);
    res.status(500).json({ error: err.message || "Failed to seed categories" });
  }
});

// ==========================================
// 1B. INSURANCE PRODUCTS API ENDPOINTS
// ==========================================

// GET /api/companies/products - List all Insurance Products
router.get("/products", authenticateToken, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const { companyId, categoryId, status } = req.query;
    const query: any = {};
    if (role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }
    if (companyId) {
      query.companyId = companyId;
    }
    if (categoryId) {
      query.categoryId = categoryId;
    }
    if (status && status !== "All") {
      query.status = status;
    }
    const products = await InsuranceProductModel.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (err: any) {
    console.error("Fetch Insurance Products Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch insurance products" });
  }
});

// GET /api/companies/products/active - List ACTIVE Insurance Products
router.get("/products/active", authenticateToken, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const { companyId, categoryId } = req.query;
    const query: any = { status: "Active" };
    if (role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }
    if (companyId) {
      query.companyId = companyId;
    }
    if (categoryId) {
      query.categoryId = categoryId;
    }
    const products = await InsuranceProductModel.find(query).sort({ name: 1 });
    res.json(products);
  } catch (err: any) {
    console.error("Fetch Active Products Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch active insurance products" });
  }
});

// POST /api/companies/products - Create a new Insurance Product
router.post("/products", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { companyId, categoryId, name, code, description, status } = req.body;
    const { tenantId, uid, name: userName, role } = req.user;

    if (!companyId || typeof companyId !== "string" || !companyId.trim()) {
      return res.status(400).json({ error: "Insurance Company is required" });
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Product Name is required" });
    }

    // Verify parent company exists
    const companyQuery = getSafeIdQuery(companyId, tenantId, role);
    const parentCompany = await InsuranceCompanyModel.findOne(companyQuery);
    if (!parentCompany) {
      return res.status(404).json({ error: "Selected Insurance Company not found" });
    }

    let catId = categoryId || "general";
    let catName = "General";
    if (categoryId && typeof categoryId === "string" && categoryId.trim()) {
      const parentCategory = await InsuranceCategoryModel.findOne(getSafeIdQuery(categoryId, tenantId, role));
      if (parentCategory) {
        catId = parentCategory.id;
        catName = parentCategory.name;
      }
    }

    const trimmedName = name.trim();
    // Scoped duplicate check for THIS company
    const existing = await InsuranceProductModel.findOne({
      companyId: parentCompany.id,
      tenantId: role === "SUPER_ADMIN" ? (tenantId || "default_tenant") : tenantId,
      name: { $regex: new RegExp(`^${trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, "i") }
    });

    if (existing) {
      return res.status(400).json({ error: `Product "${trimmedName}" already exists for ${parentCompany.name}.` });
    }

    const prodId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newProduct = new InsuranceProductModel({
      id: prodId,
      tenantId: tenantId || "default_tenant",
      companyId: parentCompany.id,
      companyName: parentCompany.name,
      categoryId: catId,
      categoryName: catName,
      name: trimmedName,
      code: (code || "").trim(),
      description: (description || "").trim(),
      status: status === "Inactive" ? "Inactive" : "Active",
      createdBy: uid,
      createdByName: userName || "Admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (err: any) {
    console.error("Create Product Error:", err);
    res.status(500).json({ error: err.message || "Failed to create product" });
  }
});

// PUT /api/companies/products/:id - Update an Insurance Product
router.put("/products/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { companyId, categoryId, name, code, description, status } = req.body;
    const { tenantId, role } = req.user;

    const query = getSafeIdQuery(id, tenantId, role);
    const product = await InsuranceProductModel.findOne(query);
    if (!product) {
      return res.status(404).json({ error: "Insurance Product not found" });
    }

    let targetCompanyId = product.companyId;
    let targetCompanyName = product.companyName;
    let targetCategoryId = product.categoryId;
    let targetCategoryName = product.categoryName;

    if (companyId && companyId !== product.companyId) {
      const parentCompany = await InsuranceCompanyModel.findOne(getSafeIdQuery(companyId, tenantId, role));
      if (!parentCompany) {
        return res.status(404).json({ error: "Selected Insurance Company not found" });
      }
      targetCompanyId = parentCompany.id;
      targetCompanyName = parentCompany.name;
    }

    if (categoryId && categoryId !== product.categoryId) {
      const parentCategory = await InsuranceCategoryModel.findOne(getSafeIdQuery(categoryId, tenantId, role));
      if (parentCategory) {
        targetCategoryId = parentCategory.id;
        targetCategoryName = parentCategory.name;
      }
    }

    const targetName = name !== undefined ? name.trim() : product.name;
    if (!targetName) {
      return res.status(400).json({ error: "Product Name is required" });
    }

    // Scoped duplicate check
    if (name !== undefined || companyId !== undefined) {
      const existing = await InsuranceProductModel.findOne({
        id: { $ne: product.id },
        companyId: targetCompanyId,
        tenantId: product.tenantId,
        name: { $regex: new RegExp(`^${targetName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, "i") }
      });
      if (existing) {
        return res.status(400).json({ error: `Product "${targetName}" already exists for this company.` });
      }
    }

    product.companyId = targetCompanyId;
    product.companyName = targetCompanyName;
    product.categoryId = targetCategoryId;
    product.categoryName = targetCategoryName;
    product.name = targetName;
    if (code !== undefined) product.code = (code || "").trim();
    if (description !== undefined) product.description = (description || "").trim();
    if (status !== undefined) product.status = status === "Inactive" ? "Inactive" : "Active";

    product.updatedAt = new Date().toISOString();
    await product.save();
    res.json(product);
  } catch (err: any) {
    console.error("Update Product Error:", err);
    res.status(500).json({ error: err.message || "Failed to update product" });
  }
});

// PATCH /api/companies/products/:id/status - Toggle status
router.patch("/products/:id/status", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { tenantId, role } = req.user;

    if (!status || (status !== "Active" && status !== "Inactive")) {
      return res.status(400).json({ error: "Valid status ('Active' or 'Inactive') is required" });
    }

    const query = getSafeIdQuery(id, tenantId, role);
    const product = await InsuranceProductModel.findOne(query);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    product.status = status;
    product.updatedAt = new Date().toISOString();
    await product.save();

    res.json(product);
  } catch (err: any) {
    console.error("Toggle Product Status Error:", err);
    res.status(500).json({ error: err.message || "Failed to update product status" });
  }
});

// DELETE /api/companies/products/:id - Delete an Insurance Product
router.delete("/products/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { tenantId, uid, name: userName, role } = req.user;

    const query = getSafeIdQuery(id, tenantId, role);
    const product = await InsuranceProductModel.findOne(query);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    await InsuranceProductModel.deleteOne({ id: product.id });

    // Audit Log
    try {
      await AuditLog.create({
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tenantId: tenantId || "default_tenant",
        action: "INSURANCE_PRODUCT_DELETED",
        actorUserId: uid,
        actorName: userName || "Admin",
        targetUserId: product.id,
        targetUserName: product.name,
        details: `Deleted Insurance Product "${product.name}" (${product.companyName} → ${product.categoryName})`,
        timestamp: new Date().toISOString()
      });
    } catch (auditErr) {
      console.warn("Audit Log for Product deletion failed:", auditErr);
    }

    res.json({ success: true, message: `Insurance Product "${product.name}" deleted successfully` });
  } catch (err: any) {
    console.error("Delete Product Error:", err);
    res.status(500).json({ error: err.message || "Failed to delete product" });
  }
});

// ==========================================
// 2. INSURANCE COMPANY API ENDPOINTS
// ==========================================

// GET /api/companies - List all Insurance Companies for authenticated tenant (with categoryCount)
router.get("/", authenticateToken, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const query: any = {};
    if (role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }
    const companies = await InsuranceCompanyModel.find(query).sort({ createdAt: -1 });
    const companyIds = companies.map(c => c.id);

    const categoryCounts = await InsuranceCategoryModel.aggregate([
      { $match: { companyId: { $in: companyIds } } },
      { $group: { _id: "$companyId", count: { $sum: 1 } } }
    ]);
    const countMap = new Map(categoryCounts.map(item => [item._id, item.count]));

    const result = companies.map(c => {
      const obj = c.toObject();
      (obj as any).categoryCount = countMap.get(c.id) || 0;
      return obj;
    });

    res.json(result);
  } catch (err: any) {
    console.error("Fetch Insurance Companies Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch insurance companies" });
  }
});

// GET /api/companies/active - List ACTIVE Insurance Companies for authenticated tenant
router.get("/active", authenticateToken, async (req: any, res: any) => {
  try {
    const { tenantId, role } = req.user;
    const query: any = { status: "Active" };
    if (role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }
    const activeCompanies = await InsuranceCompanyModel.find(query).sort({ name: 1 });
    res.json(activeCompanies);
  } catch (err: any) {
    console.error("Fetch Active Insurance Companies Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch active insurance companies" });
  }
});

// POST /api/companies - Create a new Insurance Company
router.post("/", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { name, code, newBusinessPayoutPercentage, renewalPayoutPercentage, status } = req.body;
    const { tenantId, uid, name: userName, role } = req.user;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Company Name is required" });
    }

    const nbPct = Number(newBusinessPayoutPercentage ?? 0);
    const renPct = Number(renewalPayoutPercentage ?? 0);

    if (isNaN(nbPct) || nbPct < 0 || nbPct > 100) {
      return res.status(400).json({ error: "New Business Payout % must be between 0 and 100" });
    }
    if (isNaN(renPct) || renPct < 0 || renPct > 100) {
      return res.status(400).json({ error: "Renewal Payout % must be between 0 and 100" });
    }

    const trimmedName = name.trim();
    // Check for duplicate company name within the same organization
    const existing = await InsuranceCompanyModel.findOne({
      tenantId: role === "SUPER_ADMIN" ? (tenantId || "default_tenant") : tenantId,
      name: { $regex: new RegExp(`^${trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, "i") }
    });

    if (existing) {
      return res.status(400).json({ error: `An insurance company named "${trimmedName}" already exists.` });
    }

    const companyId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newCompany = new InsuranceCompanyModel({
      id: companyId,
      tenantId: tenantId || "default_tenant",
      name: trimmedName,
      code: (code || "").trim(),
      newBusinessPayoutPercentage: nbPct,
      renewalPayoutPercentage: renPct,
      status: status === "Inactive" ? "Inactive" : "Active",
      createdBy: uid,
      createdByName: userName || "Admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await newCompany.save();

    // Log to Audit Log if model exists
    try {
      await AuditLog.create({
        id: `audit_${Date.now()}`,
        userId: uid,
        userName: userName || "Admin",
        userRole: req.user.role,
        tenantId: tenantId,
        action: "INSURANCE_COMPANY_CREATED",
        resource: "InsuranceCompany",
        details: `Created Insurance Company "${trimmedName}" (New Business: ${nbPct}%, Renewal: ${renPct}%)`,
        timestamp: new Date().toISOString()
      });
    } catch (auditErr) {
      // Non-blocking audit error
    }

    res.status(201).json(newCompany);
  } catch (err: any) {
    console.error("Create Insurance Company Error:", err);
    res.status(500).json({ error: err.message || "Failed to create insurance company" });
  }
});

// GET /api/companies/:id/categories - List categories belonging to specific company
router.get("/:id/categories", authenticateToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { tenantId, role } = req.user;
    const query: any = { companyId: id };
    if (role !== "SUPER_ADMIN") {
      query.tenantId = tenantId;
    }
    const categories = await InsuranceCategoryModel.find(query).sort({ createdAt: -1 });
    res.json(categories);
  } catch (err: any) {
    console.error("Fetch Company Categories Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch categories for company" });
  }
});

// GET /api/companies/:id - Get a single Insurance Company by ID
router.get("/:id", authenticateToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { tenantId, role } = req.user;

    const query = getSafeIdQuery(id, tenantId, role);
    const company = await InsuranceCompanyModel.findOne(query);
    if (!company) {
      return res.status(404).json({ error: "Insurance Company not found" });
    }

    res.json(company);
  } catch (err: any) {
    console.error("Fetch Single Company Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch insurance company" });
  }
});

// PUT /api/companies/:id - Update an Insurance Company
router.put("/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { name, code, newBusinessPayoutPercentage, renewalPayoutPercentage, status } = req.body;
    const { tenantId, role } = req.user;

    const query = getSafeIdQuery(id, tenantId, role);
    const company = await InsuranceCompanyModel.findOne(query);
    if (!company) {
      return res.status(404).json({ error: "Insurance Company not found" });
    }

    if (name !== undefined) {
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "Company Name is required" });
      }
      const trimmedName = name.trim();
      // Duplicate check (excluding current record)
      const existing = await InsuranceCompanyModel.findOne({
        id: { $ne: id },
        tenantId: company.tenantId,
        name: { $regex: new RegExp(`^${trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, "i") }
      });
      if (existing) {
        return res.status(400).json({ error: `An insurance company named "${trimmedName}" already exists.` });
      }
      company.name = trimmedName;
    }

    if (code !== undefined) company.code = (code || "").trim();

    if (newBusinessPayoutPercentage !== undefined) {
      const nbPct = Number(newBusinessPayoutPercentage);
      if (isNaN(nbPct) || nbPct < 0 || nbPct > 100) {
        return res.status(400).json({ error: "New Business Payout % must be between 0 and 100" });
      }
      company.newBusinessPayoutPercentage = nbPct;
    }

    if (renewalPayoutPercentage !== undefined) {
      const renPct = Number(renewalPayoutPercentage);
      if (isNaN(renPct) || renPct < 0 || renPct > 100) {
        return res.status(400).json({ error: "Renewal Payout % must be between 0 and 100" });
      }
      company.renewalPayoutPercentage = renPct;
    }

    if (status !== undefined) {
      company.status = status === "Inactive" ? "Inactive" : "Active";
    }

    company.updatedAt = new Date().toISOString();

    await company.save();

    res.json(company);
  } catch (err: any) {
    console.error("Update Company Error:", err);
    res.status(500).json({ error: err.message || "Failed to update insurance company" });
  }
});

// PATCH /api/companies/:id/status - Toggle Status
router.patch("/:id/status", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { tenantId, role } = req.user;

    const query = getSafeIdQuery(id, tenantId, role);
    const company = await InsuranceCompanyModel.findOne(query);
    if (!company) {
      return res.status(404).json({ error: "Insurance Company not found" });
    }

    company.status = status === "Inactive" ? "Inactive" : "Active";
    company.updatedAt = new Date().toISOString();

    await company.save();

    res.json(company);
  } catch (err: any) {
    console.error("Toggle Company Status Error:", err);
    res.status(500).json({ error: err.message || "Failed to update status" });
  }
});

// DELETE /api/companies/:id - Delete an Insurance Company
router.delete("/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { tenantId, role } = req.user;

    const query = getSafeIdQuery(id, tenantId, role);
    const company = await InsuranceCompanyModel.findOne(query);
    if (!company) {
      return res.status(404).json({ error: "Insurance Company not found" });
    }

    await InsuranceCompanyModel.deleteOne(query);
    res.json({ success: true, message: "Insurance Company deleted successfully" });
  } catch (err: any) {
    console.error("Delete Company Error:", err);
    res.status(500).json({ error: err.message || "Failed to delete insurance company" });
  }
});

export default router;
