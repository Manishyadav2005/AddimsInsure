import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "policy_master_jwt_secret_key_2026_mongodb";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: string;
    tenantId?: string;
    permissions?: string[];
  };
}

/**
 * Checks if a user object has Admin privileges or a required permission key
 */
export function userHasPermission(user: any, requiredPermission: string | string[]): boolean {
  if (!user) return false;

  // ADMIN, SUPER_ADMIN, and TENANT_ADMIN always have full access to everything
  const role = (user.role || "").toUpperCase();
  if (role === "ADMIN" || role === "SUPER_ADMIN" || role === "TENANT_ADMIN") {
    return true;
  }

  const perms: string[] = Array.isArray(user.permissions) ? user.permissions : [];

  if (Array.isArray(requiredPermission)) {
    return requiredPermission.some(p => perms.includes(p));
  }

  return perms.includes(requiredPermission);
}

/**
 * Centralized backend middleware to enforce authentication and action permissions.
 * Rejects unauthorized calls with 401/403 HTTP status before business logic executes.
 */
export function requirePermission(...requiredPermissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Missing authentication token" });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;

      // Admin role bypass — Full access granted automatically
      const role = (decoded.role || "").toUpperCase();
      if (role === "ADMIN" || role === "SUPER_ADMIN" || role === "TENANT_ADMIN") {
        return next();
      }

      if (requiredPermissions.length === 0) {
        return next();
      }

      // Check permission match
      const userPerms: string[] = Array.isArray(decoded.permissions) ? decoded.permissions : [];
      const hasAnyRequired = requiredPermissions.some(p => userPerms.includes(p));

      if (!hasAnyRequired) {
        return res.status(403).json({
          error: `Forbidden: You do not have the required permission (${requiredPermissions.join(" or ")})`
        });
      }

      next();
    } catch {
      return res.status(401).json({ error: "Unauthorized: Invalid or expired authentication token" });
    }
  };
}
