import { useCurrentWorkspace, useWorkspaceMembers, useWorkspacePermissionOverrides } from "./queries";

export const DEFAULT_PERMISSIONS = [
  { label: "View all clients", key: "view_clients", roles: { admin: true, employee: true, client: false } },
  { label: "Edit content calendar", key: "edit_calendar", roles: { admin: true, employee: true, client: false } },
  { label: "Access Proposals", key: "access_proposals", roles: { admin: true, employee: false, client: false } },
  { label: "Approve proposals", key: "approve_proposals", roles: { admin: true, employee: false, client: false } },
  { label: "Access Quotations", key: "access_quotations", roles: { admin: true, employee: false, client: false } },
  { label: "Access Project Tracker", key: "access_deals", roles: { admin: true, employee: false, client: false } },
  { label: "Manage employees", key: "manage_employees", roles: { admin: true, employee: false, client: false } },
  { label: "Export reports", key: "export_reports", roles: { admin: true, employee: false, client: false } },
  { label: "View reports", key: "view_reports", roles: { admin: true, employee: true, client: false } },
  { label: "Delete content rows", key: "delete_content", roles: { admin: true, employee: true, client: false } },
  { label: "Mark posts as Posted", key: "mark_posted", roles: { admin: true, employee: true, client: false } },
];

export type PermMatrix = Record<string, Record<string, boolean>>;

/**
 * Hook to get the current user's permissions for the active workspace.
 */
export function usePermissions() {
  const { data: workspace } = useCurrentWorkspace();
  const { data: members = [] } = useWorkspaceMembers(workspace?.workspaceId);
  const { data: overrides = [] } = useWorkspacePermissionOverrides(workspace?.workspaceId);

  const role = workspace?.role; // 'admin', 'employee', 'client'

  // Parse DB permissions JSONB or fallback to defaults
  const wsPerms = workspace?.permissions as PermMatrix | undefined;

  // Per-user override for the current user, if any — overlaid on top of the role
  // default: only keys explicitly set here differ, everything else still tracks the role.
  const myOverride = overrides.find((o) => o.user_id === workspace?.userId)?.permissions;

  const hasPermission = (permKey: string): boolean => {
    if (!role) return false;

    // Per-user override takes precedence over both the role matrix and admin default.
    if (myOverride && myOverride[permKey] !== undefined) {
      return myOverride[permKey];
    }

    // TC06: Respect explicitly saved permMatrix even for admins
    if (wsPerms && wsPerms[permKey] && wsPerms[permKey][role] !== undefined) {
      return wsPerms[permKey][role];
    }

    // Default: admins have all permissions, others use DEFAULT_PERMISSIONS
    if (role === 'admin') return true;

    const defaultPerm = DEFAULT_PERMISSIONS.find((p) => p.key === permKey);
    if (defaultPerm) {
      return defaultPerm.roles[role as keyof typeof defaultPerm.roles] || false;
    }

    return false;
  };

  return { hasPermission, role };
}
