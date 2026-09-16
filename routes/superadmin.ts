import { Router } from "express";
import bcrypt from "bcryptjs";
import { User, Tenant, PolicyModel } from "../models";

const router = Router();

// GET /api/superadmin/stats - Overview metrics
router.get("/stats", async (req, res) => {
  try {
    const totalTenants = await Tenant.countDocuments();
    const activeTenants = await Tenant.countDocuments({ status: "Active" });
    const suspendedTenants = await Tenant.countDocuments({ status: "Suspended" });
    const expiredTenants = await Tenant.countDocuments({ status: "Expired" });

    // Check policies system-wide
    const totalPolicies = await PolicyModel.countDocuments();

    res.json({
      totalTenants,
      activeTenants,
      suspendedTenants,
      expiredTenants,
      totalPolicies
    });
  } catch (err: any) {
    console.error("SuperAdmin Stats Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch platform metrics" });
  }
});

// GET /api/superadmin/tenants - List all client companies
router.get("/tenants", async (req, res) => {
  try {
    const tenants = await Tenant.find().sort({ createdAt: -1 });
    res.json(tenants);
  } catch (err: any) {
    console.error("Fetch Tenants Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch client companies" });
  }
});

// POST /api/superadmin/tenants - Create new Client Company + Admin Account
router.post("/tenants", async (req, res) => {
  try {
    const { name, adminName, adminEmail, password, plan, monthsValid } = req.body;

    if (!name || !adminEmail || !password) {
      res.status(400).json({ error: "Company name, admin email, and password are required" });
      return;
    }

    const emailLower = adminEmail.toLowerCase().trim();
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      res.status(400).json({ error: `An account with email '${emailLower}' already exists.` });
      return;
    }

    const resolvedAdminName = (adminName || "").trim() || emailLower.split("@")[0];

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await User.create({
      name: resolvedAdminName,
      email: emailLower,
      password: hashedPassword,
      role: "TENANT_ADMIN"
    });

    const validUntil = new Date();
    const months = parseInt(monthsValid || "12", 10);
    validUntil.setMonth(validUntil.getMonth() + months);

    const newTenant = await Tenant.create({
      name,
      adminName: resolvedAdminName,
      adminEmail: emailLower,
      adminUserId: newAdmin._id.toString(),
      plan: plan || "Pro",
      status: "Active",
      validUntil
    });

    newAdmin.tenantId = newTenant._id.toString();
    await newAdmin.save();

    res.json({
      success: true,
      tenant: newTenant,
      adminUser: { uid: newAdmin._id.toString(), name: newAdmin.name, email: newAdmin.email, role: newAdmin.role }
    });
  } catch (err: any) {
    console.error("Create Tenant Error:", err);
    res.status(500).json({ error: err.message || "Failed to create client company" });
  }
});

// PUT /api/superadmin/tenants/:id - Update Subscription / Extension & Details
router.put("/tenants/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, adminName, adminEmail, status, plan, validUntil, addMonths } = req.body;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      res.status(404).json({ error: "Client company not found" });
      return;
    }

    const updateFields: any = {};
    if (name) updateFields.name = name;
    if (adminName !== undefined) {
      const trimmedAdminName = adminName.trim();
      updateFields.adminName = trimmedAdminName;
      await User.updateMany(
        { $or: [{ email: tenant.adminEmail }, { tenantId: tenant._id.toString(), role: "TENANT_ADMIN" }] },
        { name: trimmedAdminName }
      );
    }
    if (adminEmail && adminEmail.toLowerCase().trim() !== tenant.adminEmail) {
      const oldEmail = tenant.adminEmail;
      const newEmail = adminEmail.toLowerCase().trim();
      updateFields.adminEmail = newEmail;
      await User.updateOne({ email: oldEmail }, { email: newEmail });
    }
    if (status) updateFields.status = status;
    if (plan) updateFields.plan = plan;

    if (validUntil) {
      updateFields.validUntil = new Date(validUntil);
    } else if (addMonths) {
      const currentValid = new Date(tenant.validUntil) > new Date() ? new Date(tenant.validUntil) : new Date();
      currentValid.setMonth(currentValid.getMonth() + parseInt(addMonths, 10));
      updateFields.validUntil = currentValid;
      updateFields.status = "Active";
    }

    const updatedTenant = await Tenant.findByIdAndUpdate(id, { $set: updateFields }, { new: true });
    res.json({ success: true, tenant: updatedTenant });
  } catch (err: any) {
    console.error("Update Tenant Error:", err);
    res.status(500).json({ error: err.message || "Failed to update tenant subscription" });
  }
});

// DELETE /api/superadmin/tenants/:id - Remove Client Company
router.delete("/tenants/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findByIdAndDelete(id);
    if (tenant) {
      await User.deleteOne({ email: tenant.adminEmail });
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error("Delete Tenant Error:", err);
    res.status(500).json({ error: err.message || "Failed to delete tenant company" });
  }
});

export default router;
