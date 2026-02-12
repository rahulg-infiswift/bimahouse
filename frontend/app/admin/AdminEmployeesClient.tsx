"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { UserRole, isAdminRole } from "../lib/roles";
import { useEmployeeSession } from "../lib/use-employee-session";
import Link from "next/link";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const EMPLOYEE_ROLE_OPTIONS: UserRole[] = ["sales", "arm_rm", "manager", "area_manager", "zonal_head", "admin"];

type EmployeeOut = {
  employee_id: string;
  primary_email: string | null;
  phone: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type AdminEmployeesClientProps = {
  initialRole: UserRole | null;
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function AdminEmployeesClient({ initialRole }: AdminEmployeesClientProps) {
  const { getToken, isSignedIn } = useAuth();
  const { employeeToken, employeeInfo, employeeReady } = useEmployeeSession();

  const [currentRole, setCurrentRole] = useState<UserRole | null>(initialRole ?? null);
  const [employees, setEmployees] = useState<EmployeeOut[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [roleEdits, setRoleEdits] = useState<Record<string, UserRole>>({});
  const [updatingEmployeeId, setUpdatingEmployeeId] = useState<string | null>(null);

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    if (employeeToken) return employeeToken;
    return getToken();
  }, [employeeToken, getToken]);

  useEffect(() => {
    let active = true;
    async function fetchRole() {
      if (!employeeReady) return;
      if (employeeToken && employeeInfo?.role) {
        if (active) setCurrentRole(employeeInfo.role as UserRole);
        return;
      }
      if (!isSignedIn) {
        setCurrentRole(null);
        return;
      }
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`${apiBase}/v1/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { role?: UserRole };
      if (active) setCurrentRole(data.role ?? null);
    }
    void fetchRole();
    return () => {
      active = false;
    };
  }, [employeeInfo?.role, employeeReady, employeeToken, getAuthToken, isSignedIn]);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Missing auth token.");
      const res = await fetch(`${apiBase}/v1/admin/employees?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || "Failed to load employees.");
      }
      const data = (await res.json()) as EmployeeOut[];
      setEmployees(data);
      setRoleEdits(
        data.reduce<Record<string, UserRole>>((acc, employee) => {
          acc[employee.employee_id] = employee.role;
          return acc;
        }, {})
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employees.");
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    if (isAdminRole(currentRole)) {
      void loadEmployees();
    }
  }, [currentRole, loadEmployees]);

  const visibleEmployees = useMemo(() => {
    if (!query.trim()) return employees;
    const lower = query.trim().toLowerCase();
    return employees.filter((employee) => {
      const email = employee.primary_email?.toLowerCase() ?? "";
      return (
        email.includes(lower) ||
        employee.employee_id.toLowerCase().includes(lower) ||
        employee.phone.toLowerCase().includes(lower)
      );
    });
  }, [employees, query]);

  async function updateEmployeeRole(employeeId: string) {
    const nextRole = roleEdits[employeeId];
    if (!nextRole) return;
    setUpdatingEmployeeId(employeeId);
    setError(null);
    setNotice(null);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Missing auth token.");
      const res = await fetch(`${apiBase}/v1/admin/employees/${employeeId}/role`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || "Failed to update employee role.");
      }
      setEmployees((prev) => prev.map((e) => (e.employee_id === employeeId ? { ...e, role: nextRole } : e)));
      setNotice("Employee role updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update employee role.");
    } finally {
      setUpdatingEmployeeId(null);
    }
  }

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const hasSession = isSignedIn || Boolean(employeeToken);
  if (!hasSession) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-800">Manage Employees</h1>
          <p className="mt-3 text-sm text-slate-600">Please sign in to manage employee access.</p>
        </div>
      </section>
    );
  }

  if (!isAdminRole(currentRole)) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-rose-700">Access restricted</h1>
          <p className="mt-3 text-sm text-rose-600">You need admin access to manage employees.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Manage Employees</h1>
        <p className="mt-2 text-sm text-slate-600">Manage internal employee roles and access.</p>
        <div className="mt-3">
          <Link href="/admin" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Go to user management
          </Link>
        </div>

        <div className="mt-6">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by email, employee id, or phone"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3">
            <span className="text-sm font-semibold text-slate-700">Employees ({visibleEmployees.length})</span>
            <button
              onClick={loadEmployees}
              disabled={loading}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && visibleEmployees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      No employees found.
                    </td>
                  </tr>
                )}
                {visibleEmployees.map((employee) => (
                  <tr key={employee.employee_id} className="hover:bg-blue-50/40">
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-800">{employee.primary_email ?? "—"}</div>
                      <div className="text-xs text-slate-500 font-mono">{employee.employee_id}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{employee.phone}</td>
                    <td className="px-4 py-4">
                      <select
                        value={roleEdits[employee.employee_id] ?? employee.role}
                        onChange={(event) =>
                          setRoleEdits((prev) => ({ ...prev, [employee.employee_id]: event.target.value as UserRole }))
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      >
                        {EMPLOYEE_ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {role.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">{formatDate(employee.created_at)}</td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => updateEmployeeRole(employee.employee_id)}
                        disabled={updatingEmployeeId === employee.employee_id}
                        className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
                      >
                        {updatingEmployeeId === employee.employee_id ? "Saving..." : "Save"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {notice && (
        <div className="fixed bottom-6 right-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-lg">
          {notice}
        </div>
      )}
    </section>
  );
}
