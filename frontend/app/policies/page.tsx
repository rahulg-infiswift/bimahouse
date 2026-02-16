// frontend/app/policies/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  AlertCircle,
  CalendarDays,
  Clock3,
  Download,
  FileSearch,
  Filter,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { SessionRole, canAccessPolicies, isEmployeeRole } from "../lib/roles";
import { usePartnerSession } from "../lib/use-partner-session";
import { useEmployeeSession } from "../lib/use-employee-session";
import { fetchWithEmployeeRefresh, fetchWithPartnerRefresh } from "../lib/auth-refresh";

type PolicyListItem = {
  policy_id: string;
  original_filename: string;
  created_at: string;
  has_extracted_json: boolean;
  schema_version: string;
  partner_name?: string | null;
  partner_display_id?: string | null;
};

type PoliciesResp = {
  items: PolicyListItem[];
};

const API_BASE_DEFAULT = "http://localhost:8000";

export default function PoliciesPage() {
  const { getToken, isSignedIn } = useAuth();
  const { employeeToken, employeeInfo, employeeReady } = useEmployeeSession();

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || API_BASE_DEFAULT,
    []
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [items, setItems] = useState<PolicyListItem[]>([]);
  const [role, setRole] = useState<SessionRole | null>(null);
  const { partnerToken, partnerReady } = usePartnerSession();
  
  // Date filter state
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const isEmployeeSession = Boolean(employeeToken) || isEmployeeRole(role);

  async function fetchWithAuth(path: string, token: string, init?: RequestInit) {
    const url = `${apiBase}${path}`;
    if (employeeToken) {
      return fetchWithEmployeeRefresh(apiBase, url, token, init);
    }
    if (partnerToken) {
      return fetchWithPartnerRefresh(apiBase, url, token, init);
    }
    return fetch(url, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });
  }

  useEffect(() => {
    let active = true;
    async function loadRole() {
      if (!partnerReady || !employeeReady) return;
      if (employeeToken && employeeInfo?.role) {
        if (active) setRole(employeeInfo.role as SessionRole);
        return;
      }
      if (!isSignedIn && !partnerToken) {
        setRole(null);
        return;
      }
      // Clerk users (including employees) use Clerk token to fetch their role
      if (isSignedIn) {
        if (active) setRole("customer");
        return;
      }
      // Only use partner token if not signed in via Clerk
      if (partnerToken) {
        if (active) setRole("partner");
        return;
      }
    }
    void loadRole();
    return () => {
      active = false;
    };
  }, [apiBase, employeeInfo?.role, employeeReady, employeeToken, getToken, isSignedIn, partnerToken, partnerReady]);

  async function loadPolicies() {
    setError("");
    if (!partnerReady || !employeeReady) return;
    if (!isSignedIn && !partnerToken && !employeeToken) {
      setItems([]);
      return;
    }
    if (role && !canAccessPolicies(role)) {
      setItems([]);
      return;
    }

    setBusy(true);
    try {
      // Clerk users (including employees) use Clerk token; only use partner token if not signed in via Clerk
      const authToken = employeeToken ?? (isSignedIn ? (await getToken()) : partnerToken);
      if (!authToken) throw new Error("Could not retrieve auth token.");
      const policyBasePath = isEmployeeSession ? "/v1/admin/policies" : "/v1/partner/policies";

      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      const queryString = params.toString();
      const url = `${policyBasePath}${queryString ? `?${queryString}` : ""}`;

      const res = await fetchWithAuth(url, authToken);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`List policies failed: ${res.status} ${t}`);
      }

      const data = (await res.json()) as PoliciesResp;
      const normalized = Array.isArray(data.items) ? data.items : [];
      setItems(normalized);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function downloadAllExcel() {
    setError("");
    setDownloading(true);
    try {
      // Clerk users (including employees) use Clerk token; only use partner token if not signed in via Clerk
      const authToken = employeeToken ?? (isSignedIn ? (await getToken()) : partnerToken);
      if (!authToken) throw new Error("Could not retrieve auth token.");
      const policyBasePath = isEmployeeSession ? "/v1/admin/policies" : "/v1/partner/policies";

      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      const queryString = params.toString();
      const url = `${policyBasePath}/download/bulk${queryString ? `?${queryString}` : ""}`;

      const res = await fetchWithAuth(url, authToken);

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Download failed: ${res.status} ${t}`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const filenameParts = ["policies"];
      if (startDate) filenameParts.push(`from_${startDate}`);
      if (endDate) filenameParts.push(`to_${endDate}`);
      if (!startDate && !endDate) {
        filenameParts.push(new Date().toISOString().split("T")[0]);
      }
      const filename = filenameParts.join("_") + ".xlsx";

      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setDownloading(false);
    }
  }

  function clearFilters() {
    setStartDate("");
    setEndDate("");
  }

  useEffect(() => {
    loadPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeToken, employeeReady, isSignedIn, role, partnerToken, partnerReady]);

  if (!partnerReady || !employeeReady) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto p-6">
          <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">Loading session...</p>
          </div>
        </div>
      </main>
    );
  }

  const extractedCount = items.filter((p) => p.has_extracted_json).length;

  if (!isSignedIn && !partnerToken && !employeeToken) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto p-6">
          <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-heading">Please sign in</h2>
            <p className="text-sm text-slate-600">Sign in to view policies.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/partner/login"
                className="rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-heading hover:bg-slate-50"
              >
                Partner Login
              </Link>
              <Link
                href="/employee/login"
                className="rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-heading hover:bg-slate-50"
              >
                Employee Login
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (role && !canAccessPolicies(role)) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto p-6">
          <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-heading">Access pending</h2>
            <p className="text-sm text-slate-600">Your account does not have access to policies yet.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 rounded-sm border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-blue-100/40 p-8 shadow-sm">
          <div>
            <span className="inline-flex items-center gap-2 rounded-sm bg-[#0B5CAD] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
              <ShieldCheck className="h-3.5 w-3.5" />
              {isEmployeeRole(role) ? "Admin Console" : "Partner Console"}
            </span>
            <div className="mt-4 flex items-center justify-between gap-3">
              <h1 className="text-3xl font-semibold text-heading">
                {isEmployeeRole(role) ? "All Policies" : "My Policies"}
              </h1>
              {!isEmployeeRole(role) && (
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-1.5 rounded-sm bg-[#0B5CAD] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#0A4F95]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Upload New
                </Link>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {isEmployeeRole(role)
                ? "Browse and review all partner-uploaded policies."
                : "Your uploaded policies and extracted results."}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="startDate" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  max={endDate || new Date().toISOString().split("T")[0]}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="endDate" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  min={startDate || undefined}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>

              <button
                onClick={loadPolicies}
                disabled={busy}
                className="inline-flex h-[38px] items-center gap-2 rounded-sm bg-[#0B5CAD] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#0A4F95] disabled:opacity-60"
              >
                <Filter className="h-4 w-4" />
                {busy ? "Loading…" : "Apply Filter"}
              </button>

              {(startDate || endDate) && (
                <button
                  onClick={clearFilters}
                  className="rounded-sm px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              onClick={downloadAllExcel}
              disabled={downloading || extractedCount === 0}
              className="inline-flex items-center gap-2 rounded-sm bg-[#0B5CAD] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-[#0A4F95] disabled:opacity-50 transition-colors"
              title={extractedCount === 0 ? "No extracted policies to download" : `Download ${extractedCount} policies as Excel`}
            >
              <Download className="h-4 w-4" />
              {downloading ? "Downloading…" : `Download Excel (${extractedCount})`}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-sm bg-red-50 border border-red-100 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Policies List */}
        <div className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-blue-100 bg-gradient-to-r from-[#EFF6FF] via-[#F8FBFF] to-white px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-heading">
                {items.length} {items.length === 1 ? "policy" : "policies"}
              </span>
              {extractedCount > 0 && (
                <span className="rounded-sm border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-[#0B5CAD]">
                  {extractedCount} extracted
                </span>
              )}
            </div>
            <button
              onClick={loadPolicies}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Content */}
          {!isSignedIn && !partnerToken && !employeeToken ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-4">
                <UserRound className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm text-slate-600">Please sign in to view policies.</p>
            </div>
          ) : busy && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <RefreshCw className="mb-4 h-8 w-8 animate-spin text-[#0B5CAD]" />
              <p className="text-sm text-slate-600">Loading policies...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-4">
                <FileSearch className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">No policies found</p>
              <p className="text-sm text-slate-500">
                {startDate || endDate ? "Try adjusting your date filters." : "Upload a PDF to get started."}
              </p>
              {!startDate && !endDate && (
                <Link
                  href="/upload"
                  className="mt-4 inline-flex items-center gap-2 rounded-sm bg-[#0B5CAD] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A4F95] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Upload First Policy
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((p, idx) => {
                const id = p.policy_id;
                const hasId = typeof id === "string" && id.length > 0;
                const isExtracted = p.has_extracted_json;

                return (
                  <div
                    key={id || `${p.original_filename}-${p.created_at}`}
                    className={`group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-l-2 px-5 py-4 transition-all ${
                      isExtracted ? "border-l-[#0B5CAD]" : "border-l-[#93C5FD]"
                    } ${idx % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"} hover:bg-[#F3F8FF]`}
                  >
                    <div className="min-w-0">
                      {hasId ? (
                        <Link
                          href={`/policies/${id}`}
                          className="block truncate font-semibold text-heading transition-colors group-hover:text-[#0B5CAD]"
                        >
                          {p.original_filename}
                        </Link>
                      ) : (
                        <div className="truncate font-medium text-heading">
                          {p.original_filename}
                        </div>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        {isEmployeeSession && (p.partner_name || p.partner_display_id) && (
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-slate-600">
                              {p.partner_name || "Partner"}
                              {p.partner_display_id ? ` (${p.partner_display_id})` : ""}
                            </span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                      <span
                        className={`rounded-sm px-2.5 py-1 text-xs font-medium ${
                          isExtracted
                            ? "border border-[#BFDBFE] bg-[#EFF6FF] text-[#0B5CAD]"
                            : "border border-[#DBEAFE] bg-white text-[#0B5CAD]"
                        }`}
                      >
                        {isExtracted ? "Extracted" : "Pending"}
                      </span>
                      {hasId && (
                        <Link
                          href={`/policies/${id}`}
                          className="inline-flex items-center gap-1.5 rounded-sm bg-[#0B5CAD] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#0A4F95]"
                        >
                          View
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
