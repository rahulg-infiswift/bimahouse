// frontend/app/leads/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { fetchUserRole, isEmployeeRole, UserRole } from "../lib/roles";

type LeadSummary = {
  submitted: number;
  in_review: number;
  approved: number;
  rejected: number;
};

type LeadListItem = {
  lead_id: string;
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
  submitted: { bg: "bg-purple-100", text: "text-purple-700", icon: "📤" },
  in_review: { bg: "bg-amber-100", text: "text-amber-700", icon: "👁" },
  approved: { bg: "bg-emerald-100", text: "text-emerald-700", icon: "✓" },
  rejected: { bg: "bg-red-100", text: "text-red-700", icon: "✗" },
};

export default function AdminLeadsPage() {
  const { getToken, isSignedIn } = useAuth();

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
    const token = await getToken();
    return { Authorization: `Bearer ${token}` };
  }

  useEffect(() => {
    let active = true;
    async function loadRole() {
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
  }, [getToken, isSignedIn]);

  async function load() {
    if (!isSignedIn) {
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
        fetch(`${API}/v1/leads/summary`, { headers }),
        fetch(`${API}/v1/leads`, { headers }),
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
  }, [isSignedIn, role]);

  const cards = useMemo(() => {
    if (!summary) return [];
    return [
      { key: "submitted", label: "Submitted", value: summary.submitted, color: "blue" },
      { key: "in_review", label: "In Review", value: summary.in_review, color: "amber" },
      { key: "approved", label: "Approved", value: summary.approved, color: "emerald" },
      { key: "rejected", label: "Rejected", value: summary.rejected, color: "red" },
    ];
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
      const resp = await fetch(`${API}/v1/leads/${leadId}/send-otp`, {
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

      const resp = await fetch(`${API}/v1/leads/${leadId}/verify-otp`, {
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

  const getCardColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; value: string }> = {
      slate: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600", value: "text-slate-900" },
      blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-600", value: "text-blue-900" },
      purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-600", value: "text-purple-900" },
      amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-600", value: "text-amber-900" },
      emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-600", value: "text-emerald-900" },
      red: { bg: "bg-red-50", border: "border-red-200", text: "text-red-600", value: "text-red-900" },
    };
    return colors[color] || colors.slate;
  };

  if (!isSignedIn) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-600">Please sign in to view partner leads.</p>
        </div>
      </div>
    );
  }

  if (role && !isEmployeeRole(role)) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-600">Your account does not have access to partner leads.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-8 shadow-sm mb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white shadow-sm">
                Operations
              </span>
              <h1 className="mt-4 text-3xl font-semibold text-slate-900">Manage Partner Leads</h1>
              <p className="mt-2 text-sm text-slate-600">
                Create, verify, and advance partner lead applications.
              </p>
            </div>
            <Link
              href="/become-partner?source=sales"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 hover:from-blue-700 hover:to-blue-800 transition-all"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Open PoSP Form
            </Link>
          </div>
          <div className="mt-8 flex flex-col gap-6">
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:overflow-visible sm:pb-0 sm:snap-none">
              {cards.map((c) => {
                const colors = getCardColorClasses(c.color);
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setActiveStatus(c.key)}
                    className={`min-w-[150px] snap-start rounded-2xl border ${colors.border} ${colors.bg} p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:min-w-0 sm:snap-none ${
                      activeStatus === c.key ? "ring-2 ring-blue-500/40" : ""
                    }`}
                  >
                    <div className={`text-[11px] font-semibold uppercase tracking-wide ${colors.text} mb-1`}>{c.label}</div>
                    <div className={`text-xl font-bold ${colors.value}`}>{c.value}</div>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Search leads
                </label>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, email, phone, or lead ID"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(["all", "submitted", "in_review", "approved", "rejected"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setActiveStatus(status)}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                      activeStatus === status
                        ? "bg-slate-900 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {status === "all" ? "All" : status.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {err && (
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 border border-red-100 p-4">
            <svg className="h-5 w-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700 whitespace-pre-wrap">{err}</p>
          </div>
        )}

        {/* Leads List */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-700">Recent Leads</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                {visibleItems.length}
              </span>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-colors"
            >
              <svg className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
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
              <p className="text-sm text-slate-500">Click &quot;Open PoSP Form&quot; to submit a new application.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {visibleItems.map((r, idx) => {
                const config = statusConfig[r.status] || statusConfig.submitted;
                return (
                  <div
                    key={r.lead_id}
                    className={`px-5 py-4 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"} hover:bg-blue-50/40`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono font-medium text-slate-600">
                            {r.lead_display_id}
                          </span>
                          {r.partner_display_id && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-mono font-medium text-emerald-700">
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
                            <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 text-xs font-medium">
                              {r.created_via === "self_serve" ? "self-serve" : "sales-assisted"}
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              r.email_verified
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {r.email_verified ? "✓ Email verified" : "⚠ Not verified"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                        {/* Only show verification controls for unverified leads */}
                        {!r.email_verified && (
                          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                            <span className="text-xs text-amber-700 font-medium">Verify email:</span>
                            <button
                              onClick={() => sendOtp(r.lead_id)}
                              disabled={busyLead === r.lead_id}
                              className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60 transition-colors"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Send OTP
                            </button>
                            <input
                              placeholder="OTP"
                              value={otpByLead[r.lead_id] || ""}
                              onChange={(e) => setOtpByLead((prev) => ({ ...prev, [r.lead_id]: e.target.value }))}
                              className="w-16 rounded-md border border-amber-300 bg-white px-2 py-1 text-xs text-center font-mono focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all"
                            />
                            <button
                              onClick={() => verifyOtp(r.lead_id)}
                              disabled={busyLead === r.lead_id || !otpByLead[r.lead_id]}
                              className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
                            >
                              Verify
                            </button>
                          </div>
                        )}

                        <Link
                          href={`/leads/${r.lead_id}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
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
