export type UserRole =
  | "customer"
  | "partner"
  | "sales"
  | "arm_rm"
  | "manager"
  | "area_manager"
  | "zonal_head"
  | "admin";

export const ROLE_OPTIONS: UserRole[] = [
  "customer",
  "partner",
  "sales",
  "arm_rm",
  "manager",
  "area_manager",
  "zonal_head",
  "admin",
];

export const EMPLOYEE_ROLES = new Set<UserRole>([
  "sales",
  "arm_rm",
  "manager",
  "area_manager",
  "zonal_head",
  "admin",
]);

export function isEmployeeRole(role: UserRole | null): boolean {
  return role ? EMPLOYEE_ROLES.has(role) : false;
}

export function canAccessPolicies(role: UserRole | null): boolean {
  return role === "partner" || isEmployeeRole(role);
}

export function isAdminRole(role: UserRole | null): boolean {
  return role === "admin";
}

export async function fetchUserRole(
  apiBase: string,
  token: string
): Promise<UserRole | null> {
  const res = await fetch(`${apiBase}/v1/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { role?: UserRole };
  return data.role ?? null;
}
