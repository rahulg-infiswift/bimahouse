// frontend/app/admin/leads/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

type LeadSummary = {
  in_progress: number;
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
  email_verified: boolean;
  created_at: string;
  updated_at: string;
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const statusConfig: Record<string, { bg: string; text: string; icon: string }> = {
  in_progress: { bg: "bg-blue-100", text: "text-blue-700", icon: "📝" },
  submitted: { bg: "bg-purple-100", text: "text-purple-700", icon: "📤" },
  in_review: { bg: "bg-amber-100", text: "text-amber-700", icon: "👁" },
  approved: { bg: "bg-emerald-100", text: "text-emerald-700", icon: "✓" },
  rejected: { bg: "bg-red-100", text: "text-red-700", icon: "✗" },
};

export default function AdminLeadsPage() {
  const { getToken } = useAuth();

  const [summary, setSummary] = useState<LeadSummary | null>(null);
  const [items, setItems] = useState<LeadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [modalErr, setModalErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [otpByLead, setOtpByLead] = useState<Record<string, string>>({});
  const [busyLead, setBusyLead] = useState<string | null>(null);

  async function authHeaders() {
    const token = await getToken();
    return { Authorization: `Bearer ${token}` };
  }

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const headers = await authHeaders();

      const [s, l] = await Promise.all([
        fetch(`${API}/v1/admin/leads/summary`, { headers }),
        fetch(`${API}/v1/admin/leads`, { headers }),
      ]);

      if (!s.ok) throw new Error(`Summary failed: ${s.status} ${await s.text()}`);
      if (!l.ok) throw new Error(`List failed: ${l.status} ${await l.text()}`);

      setSummary(await s.json());
      setItems(await l.json());
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = useMemo(() => {
    if (!summary) return [];
    return [
      { key: "in_progress", label: "In Progress", value: summary.in_progress, color: "slate" },
      { key: "submitted", label: "Submitted", value: summary.submitted, color: "blue" },
      { key: "in_review", label: "In Review", value: summary.in_review, color: "amber" },
      { key: "approved", label: "Approved", value: summary.approved, color: "emerald" },
      { key: "rejected", label: "Rejected", value: summary.rejected, color: "red" },
    ];
  }, [summary]);

  async function createLead() {
    setModalErr(null);
    
    // Validation
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    
    if (!trimmedName) {
      setModalErr("Full name is required");
      return;
    }
    if (!trimmedEmail) {
      setModalErr("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setModalErr("Please enter a valid email address");
      return;
    }
    if (!trimmedPhone) {
      setModalErr("Phone number is required");
      return;
    }
    
    setCreating(true);
    try {
      const headers = {
        ...(await authHeaders()),
        "Content-Type": "application/json",
      };

      const resp = await fetch(`${API}/v1/admin/leads`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          full_name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
        }),
      });

      if (!resp.ok) throw new Error(`Create failed: ${resp.status} ${await resp.text()}`);
      setShowModal(false);
      setFullName("");
      setEmail("");
      setPhone("");
      setModalErr(null);
      await load();
    } catch (e: any) {
      setModalErr(e?.message || "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function sendOtp(leadId: string) {
    setErr(null);
    setBusyLead(leadId);
    try {
      const headers = await authHeaders();
      const resp = await fetch(`${API}/v1/admin/leads/${leadId}/send-otp`, {
        method: "POST",
        headers,
      });
      if (!resp.ok) throw new Error(`Send OTP failed: ${resp.status} ${await resp.text()}`);
      await load();
      alert("OTP sent to lead email.");
    } catch (e: any) {
      setErr(e?.message || "Send OTP failed");
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

      const resp = await fetch(`${API}/v1/admin/leads/${leadId}/verify-otp`, {
        method: "POST",
        headers,
        body: JSON.stringify({ otp }),
      });

      if (!resp.ok) throw new Error(`Verify OTP failed: ${resp.status} ${await resp.text()}`);

      setOtpByLead((prev) => ({ ...prev, [leadId]: "" }));
      await load();
      alert("Email verified.");
    } catch (e: any) {
      setErr(e?.message || "Verify OTP failed");
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

  return (
    <div className="py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Partner Leads</h1>
            <p className="mt-1 text-sm text-slate-600">
              Create and manage partner lead applications.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 hover:from-blue-700 hover:to-blue-800 transition-all"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add New Partner
          </button>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {cards.map((c) => {
            const colors = getCardColorClasses(c.color);
            return (
              <div
                key={c.key}
                className={`rounded-xl border ${colors.border} ${colors.bg} p-4 transition-all hover:shadow-sm`}
              >
                <div className={`text-xs font-medium ${colors.text} mb-1`}>{c.label}</div>
                <div className={`text-2xl font-bold ${colors.value}`}>{c.value}</div>
              </div>
            );
          })}
        </div>

        {/* Leads List */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">Recent Leads</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                {items.length}
              </span>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-60 transition-colors"
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
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-4">
                <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">No leads yet</p>
              <p className="text-sm text-slate-500">Click "Add New Partner" to create one.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((r) => {
                const config = statusConfig[r.status] || statusConfig.in_progress;
                return (
                  <div
                    key={r.lead_id}
                    className="px-5 py-4 hover:bg-slate-50 transition-colors"
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
                          href={`/admin/leads/${r.lead_id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
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

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Add New Partner</h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setModalErr(null);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Error */}
              {modalErr && (
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 p-3">
                  <svg className="h-4 w-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-700">{modalErr}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <button
                  onClick={createLead}
                  disabled={creating}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 transition-all"
                >
                  {creating ? "Creating..." : "Create Lead"}
                </button>

                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  <strong>Next steps:</strong> After creating, use <span className="font-medium">Send OTP</span> and verify using the OTP shared by the partner.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
