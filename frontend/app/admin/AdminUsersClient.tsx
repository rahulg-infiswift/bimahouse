"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { SessionRole, UserRole, isAdminRole } from "../lib/roles";
import { useEmployeeSession } from "../lib/use-employee-session";
import { AlertCircle, CheckCircle2, RefreshCw, Search, ShieldUser, Users } from "lucide-react";

type UserOut = {
  user_id: string;
  primary_email: string | null;
  email_verified: boolean;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

type AdminUsersClientProps = {
  initialRole: SessionRole | null;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const USER_ROLE_OPTIONS: UserRole[] = ["customer"];

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function AdminUsersClient({ initialRole }: AdminUsersClientProps) {
  const { getToken, isSignedIn } = useAuth();
  const { employeeToken, employeeInfo, employeeReady } = useEmployeeSession();
  const [currentRole, setCurrentRole] = useState<SessionRole | null>(initialRole ?? null);
  const [users, setUsers] = useState<UserOut[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [roleEdits, setRoleEdits] = useState<Record<string, UserRole>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    if (employeeToken) return employeeToken;
    return getToken();
  }, [employeeToken, getToken]);

  useEffect(() => {
    let active = true;
    async function fetchRole() {
      if (!employeeReady) return;
      if (employeeToken && employeeInfo?.role) {
        if (active) setCurrentRole(employeeInfo.role as SessionRole);
        return;
      }
      if (!isSignedIn) {
        setCurrentRole(null);
        return;
      }
      // Clerk-authenticated users are customer-only for UI role handling.
      if (active) setCurrentRole("customer");
    }
    fetchRole();
    return () => {
      active = false;
    };
  }, [employeeInfo?.role, employeeReady, employeeToken, getAuthToken, isSignedIn]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const token = await getAuthToken();
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
  }, [getAuthToken]);

  useEffect(() => {
    if (isAdminRole(currentRole)) {
      loadUsers();
    }
  }, [currentRole, loadUsers]);

  const filteredUsers = useMemo(() => {
    if (!query.trim()) return users;
    const lower = query.trim().toLowerCase();
    return users.filter((user) => {
      const email = user.primary_email?.toLowerCase() ?? "";
      return email.includes(lower) || user.user_id.toLowerCase().includes(lower);
    });
  }, [query, users]);

  const visibleUsers = filteredUsers;

  async function updateUserRole(userId: string) {
    const nextRole = roleEdits[userId];
    if (!nextRole) return;
    setUpdatingUserId(userId);
    setError(null);
    setNotice(null);
    try {
      const token = await getAuthToken();
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

  const hasSession = isSignedIn || Boolean(employeeToken);
  if (!hasSession) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-sm border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-heading">Manage Users</h1>
          <p className="mt-3 text-sm text-slate-600">Please sign in to manage user access.</p>
        </div>
      </section>
    );
  }

  if (!isAdminRole(currentRole)) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-sm border border-rose-200 bg-rose-50 p-8 shadow-sm">
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
        <div className="rounded-sm border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-blue-100/40 p-8 shadow-sm">
          <div className="flex flex-col gap-6">
            <div>
              <span className="inline-flex items-center gap-2 rounded-sm bg-[#0B5CAD] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                <ShieldUser className="h-3.5 w-3.5" />
                Admin Console
              </span>
              <h1 className="mt-4 text-3xl font-semibold text-heading">Manage Users</h1>
              <p className="mt-2 text-sm text-slate-600">
                Assign roles for customer accounts.
              </p>
            </div>
          </div>

          <div className="mt-8">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Search className="h-3.5 w-3.5 text-[#0B5CAD]" />
              Search users
            </label>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by email or user id"
              className="mt-2 w-full rounded-sm border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-sm border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-gradient-to-r from-[#EFF6FF] via-[#F8FBFF] to-white px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <Users className="h-4 w-4 text-[#0B5CAD]" />
                Users
              </span>
              <span className="rounded-sm bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                {visibleUsers.length}
              </span>
            </div>
            <button
              onClick={loadUsers}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-blue-50/70">
                <tr>
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
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      Loading users...
                    </td>
                  </tr>
                )}
                {!loading && visibleUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
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
                      <div className="font-medium text-slate-800">{user.primary_email ?? "—"}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs">
                        <span
                          className={`rounded-full px-2.5 py-1 font-medium ${
                            user.email_verified ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {user.email_verified ? "Verified" : "Unverified"}
                        </span>
                        <span className="text-slate-400">·</span>
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
                        className="rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        {USER_ROLE_OPTIONS.map((role) => (
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
                        className="rounded-sm bg-[#0B5CAD] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0A4F95] disabled:cursor-not-allowed disabled:bg-slate-300"
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
        <div className="fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-sm border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 shadow-lg">
          <CheckCircle2 className="h-4 w-4" />
          {notice}
        </div>
      )}
    </section>
  );
}
