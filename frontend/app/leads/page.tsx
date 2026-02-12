// frontend/app/leads/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { AlertCircle, Plus, RefreshCw, Search, Users } from "lucide-react";
import { fetchUserRole, isEmployeeRole, UserRole } from "../lib/roles";
import { useEmployeeSession } from "../lib/use-employee-session";

type LeadSummary = {
  submitted: number;
  in_review: number;
  approved: number;
  rejected: number;
};

type LeadListItem = {
  application_id: string;
  display_id: string;
  lead_display_id: string;
  partner_display_id?: string | null;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  created_via?: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const statusConfig: Record<string, { bg: string; text: string; icon: string }> = {
  submitted: { bg: "bg-blue-50", text: "text-blue-700", icon: "📤" },
  in_review: { bg: "bg-sky-50", text: "text-sky-700", icon: "👁" },
  approved: { bg: "bg-blue-50", text: "text-[#0B5CAD]", icon: "✓" },
  rejected: { bg: "bg-slate-100", text: "text-slate-700", icon: "✗" },
};

export default function AdminLeadsPage() {
  const { getToken, isSignedIn } = useAuth();
  const { employeeToken, employeeInfo, employeeReady } = useEmployeeSession();

  const [role, setRole] = useState<UserRole | null>(null);
  const [summary, setSummary] = useState<LeadSummary | null>(null);
  const [items, setItems] = useState<LeadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState<string>("all");

  const [otpByLead, setOtpByLead] = useState<Record<string, string>>({});
  const [busyLead, setBusyLead] = useState<string | null>(null);

  async function authHeaders() {
    const token = employeeToken ?? (await getToken());
    return { Authorization: `Bearer ${token}` };
  }

  useEffect(() => {
    let active = true;
    async function loadRole() {
      if (!employeeReady) return;
      if (employeeToken && employeeInfo?.role) {
        if (active) setRole(employeeInfo.role as UserRole);
        return;
      }
      if (!isSignedIn) {
        setRole(null);
        return;
      }
      const token = await getToken();
      if (!token) return;
      const nextRole = await fetchUserRole(API, token);
      if (active) setRole(nextRole);
    }
    void loadRole();
    return () => {
      active = false;
    };
  }, [employeeInfo?.role, employeeReady, employeeToken, getToken, isSignedIn]);

  async function load() {
    const hasSession = isSignedIn || Boolean(employeeToken);
    if (!hasSession) {
      setLoading(false);
      return;
    }
    if (role && !isEmployeeRole(role)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const headers = await authHeaders();

      const [s, l] = await Promise.all([
        fetch(`${API}/v1/posp-applications/summary`, { headers }),
        fetch(`${API}/v1/posp-applications`, { headers }),
      ]);

      if (!s.ok) throw new Error(`Summary failed: ${s.status} ${await s.text()}`);
      if (!l.ok) throw new Error(`List failed: ${l.status} ${await l.text()}`);

      setSummary(await s.json());
      setItems(await l.json());
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeToken, isSignedIn, role]);

  const statusCounts = useMemo(() => {
    const submitted = summary?.submitted ?? 0;
    const inReview = summary?.in_review ?? 0;
    const approved = summary?.approved ?? 0;
    const rejected = summary?.rejected ?? 0;
    return {
      all: submitted + inReview + approved + rejected,
      submitted,
      in_review: inReview,
      approved,
      rejected,
    };
  }, [summary]);

  const visibleItems = useMemo(() => {
    const statusFiltered = activeStatus === "all" ? items : items.filter((item) => item.status === activeStatus);
    if (!query.trim()) return statusFiltered;
    const needle = query.trim().toLowerCase();
    return statusFiltered.filter((item) => {
      const email = item.email.toLowerCase();
      const name = item.full_name.toLowerCase();
      const phone = item.phone.toLowerCase();
      const leadId = item.lead_display_id.toLowerCase();
      const partnerId = (item.partner_display_id || "").toLowerCase();
      return (
        email.includes(needle) ||
        name.includes(needle) ||
        phone.includes(needle) ||
        leadId.includes(needle) ||
        partnerId.includes(needle)
      );
    });
  }, [activeStatus, items, query]);

  async function sendOtp(leadId: string) {
    setErr(null);
    setBusyLead(leadId);
    try {
      const headers = await authHeaders();
      const resp = await fetch(`${API}/v1/posp-applications/${leadId}/send-otp`, {
        method: "POST",
        headers,
      });
      if (!resp.ok) throw new Error(`Send OTP failed: ${resp.status} ${await resp.text()}`);
      await load();
      alert("OTP sent to lead email.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Send OTP failed");
    } finally {
      setBusyLead(null);
    }
  }

  async function verifyOtp(leadId: string) {
    setErr(null);
    setBusyLead(leadId);
    try {
      const otp = (otpByLead[leadId] || "").trim();
      if (!otp) throw new Error("Enter OTP first");

      const headers = {
        ...(await authHeaders()),
        "Content-Type": "application/json",
      };

      const resp = await fetch(`${API}/v1/posp-applications/${leadId}/verify-otp`, {
        method: "POST",
        headers,
        body: JSON.stringify({ otp }),
      });

      if (!resp.ok) throw new Error(`Verify OTP failed: ${resp.status} ${await resp.text()}`);

      setOtpByLead((prev) => ({ ...prev, [leadId]: "" }));
      await load();
      alert("Email verified.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Verify OTP failed");
    } finally {
      setBusyLead(null);
    }
  }

  const hasSession = isSignedIn || Boolean(employeeToken);
  if (!hasSession) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-600">Please sign in to view partner leads.</p>
        </div>
      </div>
    );
  }

  if (role && !isEmployeeRole(role)) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-600">Your account does not have access to partner leads.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 rounded-sm border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-blue-100/40 p-8 shadow-sm">
          <div>
            <span className="inline-flex items-center gap-2 rounded-sm bg-[#0B5CAD] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white shadow-sm">
              <Users className="h-3.5 w-3.5" />
              Admin Console
            </span>
            <div className="mt-4 flex items-center justify-between gap-3">
              <h1 className="text-3xl font-semibold text-heading">Manage Partner Leads</h1>
              <Link
                href="/become-partner?source=sales"
                className="inline-flex items-center gap-1.5 rounded-sm bg-[#0B5CAD] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#0A4F95]"
              >
                <Plus className="h-3.5 w-3.5" />
                Open POSP Form
              </Link>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Create, verify, and advance partner lead applications.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex-1">
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Search className="h-3.5 w-3.5 text-[#0B5CAD]" />
                  Search leads
                </label>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, email, phone, or lead ID"
                  className="mt-2 w-full rounded-sm border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(["all", "submitted", "in_review", "approved", "rejected"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setActiveStatus(status)}
                    className={`inline-flex h-10 items-center rounded-sm px-3 text-[11px] font-semibold uppercase tracking-wide transition ${
                      activeStatus === status
                        ? "bg-[#0B5CAD] text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {status === "all" ? "All" : status.replace("_", " ")} ({statusCounts[status]})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {err && (
          <div className="mb-6 flex items-start gap-3 rounded-sm border border-red-100 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <p className="text-sm text-red-700 whitespace-pre-wrap">{err}</p>
          </div>
        )}

        {/* Leads List */}
        <div className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-gradient-to-r from-[#EFF6FF] via-[#F8FBFF] to-white px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-heading">
                <Users className="h-4 w-4 text-[#0B5CAD]" />
                Recent Leads
              </span>
              <span className="rounded-sm bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                {visibleItems.length}
              </span>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <svg className="h-8 w-8 text-blue-600 animate-spin mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-slate-600">Loading leads...</p>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-4">
                <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">No leads yet</p>
              <p className="text-sm text-slate-500">Click &quot;Open POSP Form&quot; to submit a new application.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {visibleItems.map((r, idx) => {
                const config = statusConfig[r.status] || statusConfig.submitted;
                return (
                  <div
                    key={r.application_id}
                    className={`px-5 py-4 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"} hover:bg-blue-50/40`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-mono font-medium text-blue-700 ring-1 ring-blue-100">
                            {r.lead_display_id}
                          </span>
                          {r.partner_display_id && (
                            <span className="rounded bg-cyan-50 px-1.5 py-0.5 text-xs font-mono font-medium text-cyan-700 ring-1 ring-cyan-100">
                              {r.partner_display_id}
                            </span>
                          )}
                          <span className="font-medium text-slate-900">{r.full_name}</span>
                        </div>
                        <div className="text-sm text-slate-600 truncate">
                          {r.email}
                          {r.phone && <span className="text-slate-400"> • {r.phone}</span>}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text}`}>
                            {r.status.replace("_", " ")}
                          </span>
                          {r.created_via && (
                            <span className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-1 text-xs font-medium ring-1 ring-blue-100">
                              {r.created_via === "self_serve" ? "self-serve" : "sales-assisted"}
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              r.email_verified
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {r.email_verified ? "✓ Email verified" : "⚠ Not verified"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                        {/* Only show verification controls for unverified leads */}
                        {!r.email_verified && (
                          <div className="flex items-center gap-2 rounded-sm border border-blue-200 bg-blue-50 px-3 py-2">
                            <span className="text-xs text-blue-700 font-medium">Verify email:</span>
                            <button
                              onClick={() => sendOtp(r.application_id)}
                              disabled={busyLead === r.application_id}
                              className="inline-flex items-center gap-1 rounded-sm bg-[#0B5CAD] px-2 py-1 text-xs font-medium text-white hover:bg-[#0A4F95] disabled:opacity-60 transition-colors"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Send OTP
                            </button>
                            <input
                              placeholder="OTP"
                              value={otpByLead[r.application_id] || ""}
                              onChange={(e) => setOtpByLead((prev) => ({ ...prev, [r.application_id]: e.target.value }))}
                              className="w-16 rounded-sm border border-blue-200 bg-white px-2 py-1 text-xs text-center font-mono focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-blue-200 transition-all"
                            />
                            <button
                              onClick={() => verifyOtp(r.application_id)}
                              disabled={busyLead === r.application_id || !otpByLead[r.application_id]}
                              className="rounded-sm bg-[#0B5CAD] px-2 py-1 text-xs font-medium text-white hover:bg-[#0A4F95] disabled:opacity-60 transition-colors"
                            >
                              Verify
                            </button>
                          </div>
                        )}

                        <Link
                          href={`/leads/${r.application_id}`}
                          className="inline-flex items-center gap-1.5 rounded-sm bg-[#0B5CAD] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0A4F95] transition-colors"
                        >
                          Open
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
