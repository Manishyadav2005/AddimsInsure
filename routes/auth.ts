import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { User, Tenant } from "../models";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "policy_master_jwt_secret_key_2026_mongodb";

// Helper to ensure initial SuperAdmin exists in database
async function ensureSuperAdmin() {
  if (mongoose.connection.readyState < 1) return;

  try {
    // Check whether a Super Admin already exists in the database
    const existingSuperAdmin = await User.findOne({ role: "SUPER_ADMIN" });

    if (!existingSuperAdmin) {
      const name = process.env.SUPER_ADMIN_NAME || "Super Admin";
      const email = (process.env.SUPER_ADMIN_EMAIL || process.env.SUPERADMIN_EMAIL || "policy@gmail.com").toLowerCase().trim();
      const rawPassword = process.env.SUPER_ADMIN_PASSWORD || process.env.SUPERADMIN_PASSWORD || "policy123";

      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      await User.create({
        name,
        email,
        password: hashedPassword,
        role: "SUPER_ADMIN",
        status: "Active",
        permissions: [
          "dashboard.view", "leads.view", "leads.edit", "customers.view", 
          "policies.view", "policies.edit", "callers.view", "callers.create", 
          "reports.view", "settings.view"
        ],
        isDemo: false
      });
      console.log(`[Auth Seed] Initial Super Admin created in DB: ${email}`);
    }
  } catch (err) {
    console.error("[Auth Seed Error]:", err);
  }
}

// Helper to resolve user's tenant subscription state
async function getTenantSubscription(user: any) {
  if (user.role === "SUPER_ADMIN") {
    return { status: "Active", validUntil: null, tenantName: "System Platform" };
  }
  let tenant = null;
  if (user.tenantId) {
    tenant = await Tenant.findById(user.tenantId);
  } else {
    tenant = await Tenant.findOne({ adminEmail: user.email.toLowerCase() });
  }

  if (!tenant) {
    return { status: "Active", validUntil: new Date(Date.now() + 365*24*60*60*1000), tenantName: "Standard Workspace" };
  }

  const isExpired = new Date(tenant.validUntil) < new Date();
  const effectiveStatus = isExpired ? "Expired" : tenant.status;
  return {
    status: effectiveStatus,
    validUntil: tenant.validUntil,
    tenantName: tenant.name,
    tenantId: tenant._id.toString()
  };
}

// AUTH: Register (Client Company Admin)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(400).json({ error: "This email is already registered. Please sign in." });
      return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name: name || email.split("@")[0],
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "ADMIN",
      status: "Active",
      permissions: [
        "dashboard.view", "leads.view", "leads.edit", "customers.view", 
        "policies.view", "policies.edit", "callers.view", "callers.create", 
        "reports.view", "settings.view"
      ]
    });

    // Create default tenant record (1-month trial)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    const newTenant = await Tenant.create({
      name: `${(name || email.split("@")[0])}'s Organization`,
      adminEmail: email.toLowerCase(),
      adminUserId: newUser._id.toString(),
      plan: "Basic",
      status: "Active",
      validUntil
    });

    newUser.tenantId = newTenant._id.toString();
    await newUser.save();

    const token = jwt.sign({ uid: newUser._id.toString(), email: newUser.email, role: "ADMIN" }, JWT_SECRET, { expiresIn: "30d" });
    res.json({
      token,
      user: {
        uid: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: "ADMIN",
        tenantId: newTenant._id.toString(),
        tenantName: newTenant.name,
        subscriptionStatus: "Active",
        validUntil: newTenant.validUntil,
        permissions: newUser.permissions,
        status: "Active",
        isDemo: false
      }
    });
  } catch (err: any) {
    console.error("Register Error:", err);
    res.status(500).json({ error: err.message || "Failed to register account in MongoDB" });
  }
});

// AUTH: Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const inputEmail = email.toLowerCase().trim();

    // Ensure database initial seed
    if (mongoose.connection.readyState >= 1) {
      await ensureSuperAdmin().catch(() => {});
    }

    // 1. Database User Authentication
    if (mongoose.connection.readyState >= 1) {
      const user = await User.findOne({ email: inputEmail });
      if (user) {
        // Check Account Status
        if (user.status === "Inactive") {
          res.status(403).json({ error: "Account has been deactivated. Please contact your administrator." });
          return;
        }

        const match = await bcrypt.compare(password, user.password || "");
        if (match) {
          // Normalize role
          const normalizedRole = user.role === "TENANT_ADMIN" ? "ADMIN" : user.role === "AGENT" ? "CALLER" : user.role;
          const sub = await getTenantSubscription(user);

          const token = jwt.sign(
            { 
              uid: user._id.toString(), 
              email: user.email, 
              role: normalizedRole, 
              tenantId: user.tenantId || sub.tenantId,
              teamLeaderId: user.teamLeaderId,
              permissions: user.permissions || []
            }, 
            JWT_SECRET, 
            { expiresIn: "30d" }
          );

          res.json({
            token,
            user: {
              uid: user._id.toString(),
              name: user.name || user.email.split("@")[0],
              email: user.email,
              role: normalizedRole,
              tenantId: user.tenantId || sub.tenantId,
              teamLeaderId: user.teamLeaderId,
              tenantName: sub.tenantName,
              subscriptionStatus: sub.status,
              validUntil: sub.validUntil,
              permissions: user.permissions && user.permissions.length > 0 
                ? user.permissions 
                : ["dashboard.view", "leads.view", "leads.edit", "customers.view", "policies.view", "callers.view", "callers.create", "reports.view", "settings.view"],
              status: user.status || "Active",
              isDemo: user.isDemo || false
            }
          });
          return;
        }
      }
    }

    // 2. Direct SuperAdmin .env Fallback Check if not found or DB offline
    const superEmail = (process.env.SUPER_ADMIN_EMAIL || process.env.SUPERADMIN_EMAIL || "policy@gmail.com").toLowerCase().trim();
    const superPassword = process.env.SUPER_ADMIN_PASSWORD || process.env.SUPERADMIN_PASSWORD || "policy123";

    if (inputEmail === superEmail && password === superPassword) {
      const token = jwt.sign({ uid: "superadmin-master-id", email: superEmail, role: "SUPER_ADMIN" }, JWT_SECRET, { expiresIn: "30d" });
      res.json({
        token,
        user: {
          uid: "superadmin-master-id",
          name: process.env.SUPER_ADMIN_NAME || "Super Admin",
          email: superEmail,
          role: "SUPER_ADMIN",
          subscriptionStatus: "Active",
          tenantName: "System Platform",
          permissions: [
            "dashboard.view", "leads.view", "leads.edit", "customers.view", 
            "policies.view", "policies.edit", "callers.view", "callers.create", 
            "reports.view", "settings.view"
          ],
          status: "Active",
          isDemo: false
        }
      });
      return;
    }

    res.status(400).json({ error: "Invalid email or password" });
  } catch (err: any) {
    console.error("Login Error:", err);
    res.status(400).json({ error: err.message || "Failed to login" });
  }
});

// AUTH: Instant Demo Login
router.post("/demo", async (req, res) => {
  try {
    const demoEmail = "demo@policymaster.com";
    let user = await User.findOne({ email: demoEmail });
    if (!user) {
      const hashedPassword = await bcrypt.hash("DemoPassword123!", 10);
      user = await User.create({
        email: demoEmail,
        password: hashedPassword,
        role: "TENANT_ADMIN",
        isDemo: true
      });
    }

    const token = jwt.sign({ uid: user._id.toString(), email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
    res.json({
      token,
      user: {
        uid: user._id.toString(),
        email: user.email,
        role: user.role,
        subscriptionStatus: "Active",
        isDemo: true
      }
    });
  } catch (err: any) {
    console.error("Demo Auth Error:", err);
    res.status(500).json({ error: err.message || "Failed to start demo session via MongoDB" });
  }
});

export default router;
