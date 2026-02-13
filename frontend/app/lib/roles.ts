export type UserRole = "customer";
export type PartnerRole = "partner";
export type EmployeeRole = "sales" | "arm_rm" | "manager" | "area_manager" | "zonal_head" | "admin";
export type SessionRole = UserRole | PartnerRole | EmployeeRole;

export const ROLE_OPTIONS: SessionRole[] = [
  "customer",
  "partner",
  "sales",
  "arm_rm",
  "manager",
  "area_manager",
  "zonal_head",
  "admin",
];

export const EMPLOYEE_ROLES = new Set<EmployeeRole>([
  "sales",
  "arm_rm",
  "manager",
  "area_manager",
  "zonal_head",
  "admin",
]);

export function isEmployeeRole(role: SessionRole | null): boolean {
  return role ? (EMPLOYEE_ROLES as Set<string>).has(role) : false;
}

export function canAccessPolicies(role: SessionRole | null): boolean {
  return role === "partner" || isEmployeeRole(role);
}

export function isAdminRole(role: SessionRole | null): boolean {
  return role === "admin";
}
