// frontend/app/admin/leads/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

type LeadSummary = {
  invited: number;
  in_progress: number;
  submitted: number;
  in_review: number;
  approved: number;
  rejected: number;
};

type LeadListItem = {
  lead_id: string;
  display_id: string;  // Human-readable ID (BHL for leads, BHP for partners)
  lead_display_id: string;  // Always BHL-XXXX
  partner_display_id?: string | null;  // BHP-XXXX when approved
  full_name: string;
  email: string;
  phone: string;
  status: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function AdminLeadsPage() {
  const { getToken } = useAuth();

  const [summary, setSummary] = useState<LeadSummary | null>(null);
  const [items, setItems] = useState<LeadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // per-lead otp inputs
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
      { k: "Invited", v: summary.invited },
      { k: "In progress", v: summary.in_progress },
      { k: "Submitted", v: summary.submitted },
      { k: "In review", v: summary.in_review },
      { k: "Approved", v: summary.approved },
      { k: "Rejected", v: summary.rejected },
    ];
  }, [summary]);

  async function createLead() {
    setErr(null);
    try {
      const headers = {
        ...(await authHeaders()),
        "Content-Type": "application/json",
      };

      const resp = await fetch(`${API}/v1/admin/leads`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone: phone || undefined,
        }),
      });

      if (!resp.ok) throw new Error(`Create failed: ${resp.status} ${await resp.text()}`);
      setShowModal(false);
      setFullName("");
      setEmail("");
      setPhone("");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Create failed");
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Manage Leads</h1>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-md bg-black text-white px-4 py-2"
        >
          Add New Partner
        </button>
      </div>

      {err && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-800 text-sm whitespace-pre-wrap">
          {err}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div key={c.k} className="rounded-lg border p-4">
            <div className="text-xs text-gray-500">{c.k}</div>
            <div className="text-2xl font-semibold">{c.v}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 text-sm font-medium">Recent Leads</div>

        {loading ? (
          <div className="p-4 text-sm text-gray-600">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">No leads yet.</div>
        ) : (
          <div className="divide-y">
            {items.map((r) => (
              <div key={r.lead_id} className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{r.lead_display_id}</span>
                    {r.partner_display_id && (
                      <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">{r.partner_display_id}</span>
                    )}
                    <span className="font-medium">{r.full_name}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {r.email}
                    {r.phone ? ` • ${r.phone}` : ""}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs rounded-full border px-2 py-1">{r.status}</span>
                    <span
                      className={`text-xs rounded-full border px-2 py-1 ${
                        r.email_verified ? "bg-green-50 border-green-200 text-green-800" : "bg-yellow-50 border-yellow-200 text-yellow-800"
                      }`}
                    >
                      {r.email_verified ? "Email verified" : "Email not verified"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => sendOtp(r.lead_id)}
                    disabled={busyLead === r.lead_id}
                    className="rounded-md border px-3 py-2 text-sm"
                  >
                    Send OTP
                  </button>

                  <input
                    placeholder="Enter OTP"
                    value={otpByLead[r.lead_id] || ""}
                    onChange={(e) => setOtpByLead((prev) => ({ ...prev, [r.lead_id]: e.target.value }))}
                    className="border rounded-md px-3 py-2 text-sm w-[140px]"
                  />

                  <button
                    onClick={() => verifyOtp(r.lead_id)}
                    disabled={busyLead === r.lead_id}
                    className="rounded-md bg-black text-white px-3 py-2 text-sm"
                  >
                    Verify
                  </button>

                  <Link className="text-sm underline ml-2" href={`/admin/leads/${r.lead_id}`}>
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add New Partner</h2>
              <button onClick={() => setShowModal(false)} className="text-sm underline">
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1">
                <span className="text-sm">Full name</span>
                <input
                  className="border rounded-md px-3 py-2"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm">Email</span>
                <input
                  className="border rounded-md px-3 py-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm">Phone</span>
                <input
                  className="border rounded-md px-3 py-2"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>

              <button onClick={createLead} className="rounded-md bg-black text-white px-4 py-2">
                Create Lead
              </button>

              <div className="text-xs text-gray-600">
                After creating, use <b>Send OTP</b> and then verify using OTP shared by the partner.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
