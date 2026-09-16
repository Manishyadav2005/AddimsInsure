import { UserSession } from "./api";
import { PermissionKey } from "../types";

/**
 * Checks if a logged-in user has permission for a specific feature or action.
 * Admins, Super Admins, and Tenant Admins ALWAYS return true (unrestricted full access).
 */
export function hasPermission(
  user: UserSession | null | undefined,
  permission: PermissionKey | PermissionKey[]
): boolean {
  if (!user) return false;

  // ADMIN, SUPER_ADMIN, and TENANT_ADMIN have full access to EVERYTHING
  const role = (user.role || "").toUpperCase();
  if (role === "ADMIN" || role === "SUPER_ADMIN" || role === "TENANT_ADMIN") {
    return true;
  }

  const userPerms = Array.isArray(user.permissions) ? user.permissions : [];

  if (Array.isArray(permission)) {
    return permission.some(p => userPerms.includes(p as any));
  }

  return userPerms.includes(permission as any);
}
