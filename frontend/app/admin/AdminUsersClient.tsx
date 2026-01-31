"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ROLE_OPTIONS, UserRole, isAdminRole, isEmployeeRole } from "../lib/roles";

type UserOut = {
  user_id: string;
  primary_email: string | null;
  email_verified: boolean;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

type AdminUsersClientProps = {
  initialRole: UserRole | null;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function roleTypeLabel(role: UserRole): string {
  if (role === "partner") return "Partner";
  if (role === "customer") return "Customer";
  if (isEmployeeRole(role)) return "Employee";
  return "Unknown";
}

export default function AdminUsersClient({ initialRole }: AdminUsersClientProps) {
  const { getToken, isSignedIn } = useAuth();
  const [currentRole, setCurrentRole] = useState<UserRole | null>(initialRole ?? null);
  const [users, setUsers] = useState<UserOut[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [roleEdits, setRoleEdits] = useState<Record<string, UserRole>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"all" | "employee" | "partner" | "customer">("all");

  useEffect(() => {
    let active = true;
    async function fetchRole() {
      if (!isSignedIn) {
        setCurrentRole(null);
        return;
      }
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${apiBase}/v1/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { role?: UserRole };
      if (active) setCurrentRole(data.role ?? null);
    }
    fetchRole();
    return () => {
      active = false;
    };
  }, [getToken, isSignedIn]);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Missing auth token.");
      const res = await fetch(`${apiBase}/v1/admin/users?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || "Failed to load users.");
      }
      const data = (await res.json()) as UserOut[];
      setUsers(data);
      setRoleEdits(
        data.reduce<Record<string, UserRole>>((acc, user) => {
          acc[user.user_id] = user.role;
          return acc;
        }, {})
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdminRole(currentRole)) {
      loadUsers();
    }
  }, [currentRole]);

  const filteredUsers = useMemo(() => {
    if (!query.trim()) return users;
    const lower = query.trim().toLowerCase();
    return users.filter((user) => {
      const email = user.primary_email?.toLowerCase() ?? "";
      return email.includes(lower) || user.user_id.toLowerCase().includes(lower);
    });
  }, [query, users]);

  const visibleUsers = useMemo(() => {
    if (activeType === "all") return filteredUsers;
    if (activeType === "partner") return filteredUsers.filter((user) => user.role === "partner");
    if (activeType === "customer") return filteredUsers.filter((user) => user.role === "customer");
    return filteredUsers.filter((user) => isEmployeeRole(user.role));
  }, [activeType, filteredUsers]);

  const stats = useMemo(() => {
    const total = users.length;
    const partners = users.filter((user) => user.role === "partner").length;
    const customers = users.filter((user) => user.role === "customer").length;
    const employees = users.filter((user) => isEmployeeRole(user.role)).length;
    return { total, partners, customers, employees };
  }, [users]);

  async function updateUserRole(userId: string) {
    const nextRole = roleEdits[userId];
    if (!nextRole) return;
    setUpdatingUserId(userId);
    setError(null);
    setNotice(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Missing auth token.");
      const res = await fetch(`${apiBase}/v1/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || "Failed to update role.");
      }
      setUsers((prev) =>
        prev.map((user) => (user.user_id === userId ? { ...user, role: nextRole } : user))
      );
      setNotice("Role updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role.");
    } finally {
      setUpdatingUserId(null);
    }
  }

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  if (!isSignedIn) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-800">Manage Users</h1>
          <p className="mt-3 text-sm text-slate-600">Please sign in to manage user access.</p>
        </div>
      </section>
    );
  }

  if (!isAdminRole(currentRole)) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-rose-700">Access restricted</h1>
          <p className="mt-3 text-sm text-rose-600">
            You need admin access to manage users.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-8">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white shadow-sm">
                Admin Console
              </span>
              <h1 className="mt-4 text-3xl font-semibold text-slate-900">Manage Users</h1>
              <p className="mt-2 text-sm text-slate-600">
                Assign roles, review access, and keep partner onboarding organized.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.total}</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">Partners</p>
                <p className="mt-1 text-2xl font-semibold text-blue-700">{stats.partners}</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Employees</p>
                <p className="mt-1 text-2xl font-semibold text-amber-700">{stats.employees}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Customers</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-700">{stats.customers}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Search users
              </label>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by email or user id"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "employee", "partner", "customer"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActiveType(type)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                    activeType === type
                      ? "bg-slate-900 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {type === "all" ? "All" : type === "employee" ? "Employees" : `${type[0].toUpperCase()}${type.slice(1)}`}
                </button>
              ))}
              <button
                type="button"
                onClick={loadUsers}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                disabled={loading}
              >
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Created
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      Loading users...
                    </td>
                  </tr>
                )}
                {!loading && visibleUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      No users found.
                    </td>
                  </tr>
                )}
                {visibleUsers.map((user, index) => (
                  <tr
                    key={user.user_id}
                    className={`transition ${index % 2 === 0 ? "bg-white" : "bg-slate-50/40"} hover:bg-blue-50/40`}
                  >
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {roleTypeLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-800">{user.primary_email ?? "—"}</div>
                      <div className="text-xs text-slate-500">
                        {user.email_verified ? "Verified" : "Unverified"} ·{" "}
                        <span className="font-mono text-slate-400">{user.user_id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={roleEdits[user.user_id] ?? user.role}
                        onChange={(event) =>
                          setRoleEdits((prev) => ({
                            ...prev,
                            [user.user_id]: event.target.value as UserRole,
                          }))
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {role.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => updateUserRole(user.user_id)}
                        disabled={updatingUserId === user.user_id}
                        className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {updatingUserId === user.user_id ? "Saving..." : "Save"}
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
