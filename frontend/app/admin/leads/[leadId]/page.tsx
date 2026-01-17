"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

type LeadDoc = {
  doc_id: string;
  doc_type: string;
  original_filename: string;
  uploaded_at: string;
};

type PartnerProfile = {
  // Personal Details
  date_of_birth?: string;
  gender?: string;
  father_name?: string;
  
  // Address
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  
  // Bank Details
  bank_name?: string;
  account_holder_name?: string;
  account_number?: string;
  ifsc_code?: string;
  branch_name?: string;
  
  // Other
  pan_number?: string;
  aadhaar_number?: string;
};

type LeadDetail = {
  lead_id: string;
  display_id: string;  // Human-readable ID (BHL for leads, BHP for partners)
  lead_display_id: string;  // Always BHL-XXXX
  partner_display_id?: string | null;  // BHP-XXXX when approved
  full_name: string;
  email: string;
  phone?: string;
  status: string;
  clerk_user_id?: string | null;
  email_verified: boolean;
  profile?: PartnerProfile | null;
  documents: LeadDoc[];
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const DOC_TYPES = [
  { key: "aadhaar", label: "Aadhaar Card" },
  { key: "pan", label: "PAN Card" },
  { key: "marksheet_10", label: "10th Marksheet" },
  { key: "cancelled_cheque", label: "Cancelled Cheque" },
  { key: "photo", label: "Photo" },
  { key: "other", label: "Other" },
];

const STATUSES = ["invited", "in_progress", "submitted", "in_review", "approved", "rejected"] as const;

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const emptyProfile: PartnerProfile = {
  date_of_birth: "",
  gender: "",
  father_name: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  pincode: "",
  bank_name: "",
  account_holder_name: "",
  account_number: "",
  ifsc_code: "",
  branch_name: "",
  pan_number: "",
  aadhaar_number: "",
};

export default function AdminLeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = String((params as any)?.leadId || "");
  const { getToken } = useAuth();

  const [data, setData] = useState<LeadDetail | null>(null);
  const [profile, setProfile] = useState<PartnerProfile>(emptyProfile);
  const [status, setStatus] = useState<string>("invited");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function authHeaders() {
    const token = await getToken();
    return { Authorization: `Bearer ${token}` };
  }

  async function load() {
    if (!leadId) return;
    setLoading(true);
    setErr(null);
    setOk(null);
    try {
      const resp = await fetch(`${API}/v1/admin/leads/${leadId}`, {
        headers: await authHeaders(),
      });
      if (!resp.ok) throw new Error(`Load failed: ${resp.status} ${await resp.text()}`);
      const d: LeadDetail = await resp.json();
      setData(d);
      setStatus(d.status);
      setProfile({ ...emptyProfile, ...(d.profile || {}) });
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const docsByType = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of data?.documents || []) {
      m[d.doc_type] = (m[d.doc_type] || 0) + 1;
    }
    return m;
  }, [data]);

  async function saveProfileAndStatus() {
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const resp = await fetch(`${API}/v1/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { ...(await authHeaders()), "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          status,
        }),
      });

      if (!resp.ok) throw new Error(`Save failed: ${resp.status} ${await resp.text()}`);
      setOk("Saved.");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Save failed (invalid JSON?)");
    } finally {
      setBusy(false);
    }
  }

  async function uploadDoc(docType: string, file: File) {
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const form = new FormData();
      form.append("file", file);

      // Backend endpoint expected:
      // POST /v1/admin/leads/{lead_id}/documents?doc_type=...
      const resp = await fetch(
        `${API}/v1/admin/leads/${leadId}/documents?doc_type=${encodeURIComponent(docType)}`,
        {
          method: "POST",
          headers: await authHeaders(),
          body: form,
        }
      );

      if (!resp.ok) throw new Error(`Upload failed: ${resp.status} ${await resp.text()}`);
      setOk("Uploaded document.");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">
            <Link href="/admin/leads" className="underline">
              Manage Partner Leads
            </Link>{" "}
            / Lead
          </div>
          <h1 className="text-2xl font-semibold mt-1">Lead Details</h1>
        </div>

        <button onClick={() => router.back()} className="rounded-md border px-3 py-2 text-sm">
          Back
        </button>
      </div>

      {loading ? (
        <div className="mt-6 text-sm text-gray-600">Loading…</div>
      ) : err ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-red-800 text-sm whitespace-pre-wrap">
          {err}
        </div>
      ) : !data ? (
        <div className="mt-6 text-sm text-gray-600">Not found.</div>
      ) : (
        <>
          {ok && (
            <div className="mt-6 rounded-md border border-green-200 bg-green-50 p-3 text-green-800 text-sm">
              {ok}
            </div>
          )}

          {/* Top summary */}
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="text-xs text-gray-500">Partner</div>
              <div className="mt-1 font-medium">{data.full_name}</div>
              <div className="mt-1 text-sm text-gray-700">{data.email}</div>
              {data.phone ? <div className="text-sm text-gray-700">{data.phone}</div> : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs rounded-full border px-2 py-1">{data.status}</span>
                <span
                  className={`text-xs rounded-full border px-2 py-1 ${
                    data.email_verified
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-yellow-50 border-yellow-200 text-yellow-800"
                  }`}
                >
                  {data.email_verified ? "Email verified" : "Email not verified"}
                </span>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-xs text-gray-500">Lead ID</div>
              <div className="mt-2">
                <div className="font-medium text-xl">{data.lead_display_id}</div>
              </div>
              {data.partner_display_id && (
                <div className="mt-3">
                  <div className="text-xs text-gray-500">Partner ID</div>
                  <div className="font-medium text-xl text-green-700">{data.partner_display_id}</div>
                </div>
              )}
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-xs text-gray-500">Actions</div>

              <label className="mt-2 grid gap-1">
                <span className="text-sm">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm"
                  disabled={busy}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <button
                onClick={saveProfileAndStatus}
                disabled={busy}
                className="mt-3 w-full rounded-md bg-black text-white px-4 py-2 text-sm disabled:opacity-50"
              >
                Save Status
              </button>

              <div className="mt-2 text-xs text-gray-600">
                Use <b>in_progress</b> while collecting docs. Set <b>submitted</b> when complete.
              </div>
            </div>
          </div>

          {/* Partner Details Form */}
          <div className="mt-6 rounded-lg border p-4">
            <div className="font-medium">Partner Details</div>
            <div className="text-xs text-gray-600 mt-1">
              Enter partner's personal information, address, and bank details.
            </div>

            <div className="mt-4 grid gap-6">
              {/* Personal Details */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-3">Personal Details</div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="grid gap-1">
                    <span className="text-xs text-gray-600">Date of Birth</span>
                    <input
                      type="date"
                      value={profile.date_of_birth || ""}
                      onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                      className="border rounded-md px-3 py-2 text-sm"
                      disabled={busy}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-gray-600">Gender</span>
                    <select
                      value={profile.gender || ""}
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      className="border rounded-md px-3 py-2 text-sm"
                      disabled={busy}
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-gray-600">Father's Name</span>
                    <input
                      type="text"
                      value={profile.father_name || ""}
                      onChange={(e) => setProfile({ ...profile, father_name: e.target.value })}
                      className="border rounded-md px-3 py-2 text-sm"
                      placeholder="Father's full name"
                      disabled={busy}
                    />
                  </label>
                </div>
              </div>

              {/* ID Numbers */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-3">Identity Documents</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs text-gray-600">PAN Number</span>
                    <input
                      type="text"
                      value={profile.pan_number || ""}
                      onChange={(e) => setProfile({ ...profile, pan_number: e.target.value.toUpperCase() })}
                      className="border rounded-md px-3 py-2 text-sm uppercase"
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      disabled={busy}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-gray-600">Aadhaar Number</span>
                    <input
                      type="text"
                      value={profile.aadhaar_number || ""}
                      onChange={(e) => setProfile({ ...profile, aadhaar_number: e.target.value.replace(/\D/g, "") })}
                      className="border rounded-md px-3 py-2 text-sm"
                      placeholder="1234 5678 9012"
                      maxLength={12}
                      disabled={busy}
                    />
                  </label>
                </div>
              </div>

              {/* Address */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-3">Address</div>
                <div className="grid gap-3">
                  <label className="grid gap-1">
                    <span className="text-xs text-gray-600">Address Line 1</span>
                    <input
                      type="text"
                      value={profile.address_line1 || ""}
                      onChange={(e) => setProfile({ ...profile, address_line1: e.target.value })}
                      className="border rounded-md px-3 py-2 text-sm"
                      placeholder="House/Flat No., Building Name, Street"
                      disabled={busy}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-gray-600">Address Line 2</span>
                    <input
                      type="text"
                      value={profile.address_line2 || ""}
                      onChange={(e) => setProfile({ ...profile, address_line2: e.target.value })}
                      className="border rounded-md px-3 py-2 text-sm"
                      placeholder="Landmark, Area (optional)"
                      disabled={busy}
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="grid gap-1">
                      <span className="text-xs text-gray-600">City</span>
                      <input
                        type="text"
                        value={profile.city || ""}
                        onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                        className="border rounded-md px-3 py-2 text-sm"
                        placeholder="City"
                        disabled={busy}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs text-gray-600">State</span>
                      <select
                        value={profile.state || ""}
                        onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                        className="border rounded-md px-3 py-2 text-sm"
                        disabled={busy}
                      >
                        <option value="">Select State</option>
                        {INDIAN_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs text-gray-600">Pincode</span>
                      <input
                        type="text"
                        value={profile.pincode || ""}
                        onChange={(e) => setProfile({ ...profile, pincode: e.target.value.replace(/\D/g, "") })}
                        className="border rounded-md px-3 py-2 text-sm"
                        placeholder="6-digit PIN"
                        maxLength={6}
                        disabled={busy}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-3">Bank Details</div>
                <div className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-xs text-gray-600">Bank Name</span>
                      <input
                        type="text"
                        value={profile.bank_name || ""}
                        onChange={(e) => setProfile({ ...profile, bank_name: e.target.value })}
                        className="border rounded-md px-3 py-2 text-sm"
                        placeholder="e.g., State Bank of India"
                        disabled={busy}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs text-gray-600">Branch Name</span>
                      <input
                        type="text"
                        value={profile.branch_name || ""}
                        onChange={(e) => setProfile({ ...profile, branch_name: e.target.value })}
                        className="border rounded-md px-3 py-2 text-sm"
                        placeholder="Branch name"
                        disabled={busy}
                      />
                    </label>
                  </div>
                  <label className="grid gap-1">
                    <span className="text-xs text-gray-600">Account Holder Name</span>
                    <input
                      type="text"
                      value={profile.account_holder_name || ""}
                      onChange={(e) => setProfile({ ...profile, account_holder_name: e.target.value })}
                      className="border rounded-md px-3 py-2 text-sm"
                      placeholder="Name as per bank records"
                      disabled={busy}
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-xs text-gray-600">Account Number</span>
                      <input
                        type="text"
                        value={profile.account_number || ""}
                        onChange={(e) => setProfile({ ...profile, account_number: e.target.value.replace(/\D/g, "") })}
                        className="border rounded-md px-3 py-2 text-sm"
                        placeholder="Account number"
                        disabled={busy}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs text-gray-600">IFSC Code</span>
                      <input
                        type="text"
                        value={profile.ifsc_code || ""}
                        onChange={(e) => setProfile({ ...profile, ifsc_code: e.target.value.toUpperCase() })}
                        className="border rounded-md px-3 py-2 text-sm uppercase"
                        placeholder="e.g., SBIN0001234"
                        maxLength={11}
                        disabled={busy}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={saveProfileAndStatus}
                  disabled={busy}
                  className="rounded-md bg-black text-white px-6 py-2 text-sm disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save Partner Details"}
                </button>
              </div>
            </div>
          </div>


          {/* Documents */}
          <div className="mt-6 rounded-lg border p-4">
            <div className="font-medium">Documents</div>
            <div className="text-xs text-gray-600 mt-1">
              Admin uploads documents collected from the partner. No per-document status is tracked.
            </div>

            <div className="mt-4 grid gap-3">
              {DOC_TYPES.map((d) => (
                <div
                  key={d.key}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border rounded-md p-3"
                >
                  <div>
                    <div className="text-sm">{d.label}</div>
                    <div className="text-xs text-gray-600">Uploaded: {docsByType[d.key] || 0}</div>
                  </div>

                  <input
                    type="file"
                    disabled={busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadDoc(d.key, f);
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6">
              <div className="text-sm font-medium">Uploaded files</div>
              {data.documents.length === 0 ? (
                <div className="mt-2 text-sm text-gray-600">No documents uploaded yet.</div>
              ) : (
                <div className="mt-3 rounded-md border overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 bg-gray-50 px-3 py-2 text-xs font-medium">
                    <div className="col-span-3">Type</div>
                    <div className="col-span-7">File</div>
                    <div className="col-span-2">Uploaded</div>
                  </div>
                  <div className="divide-y">
                    {data.documents.map((doc) => (
                      <div key={doc.doc_id} className="grid grid-cols-12 gap-2 px-3 py-2 text-xs">
                        <div className="col-span-3">{doc.doc_type}</div>
                        <div className="col-span-7 break-all">{doc.original_filename}</div>
                        <div className="col-span-2 text-gray-600">
                          {new Date(doc.uploaded_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
