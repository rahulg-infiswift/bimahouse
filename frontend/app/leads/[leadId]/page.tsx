"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { FileUp } from "lucide-react";
import { SessionRole, isEmployeeRole } from "../../lib/roles";
import { useEmployeeSession } from "../../lib/use-employee-session";
import { fetchWithEmployeeRefresh } from "../../lib/auth-refresh";
import PospApplicationForm, {
  emptyPospApplicationFields,
  PospApplicationFields,
} from "../../components/PospApplicationForm";

type LeadDoc = {
  doc_id: string;
  doc_type: string;
  original_filename: string;
  uploaded_at: string;
};

type LeadDetail = {
  application_id: string;
  display_id: string;  // Human-readable ID (BHL for leads, BHP for partners)
  lead_display_id: string;  // Always BHL-XXXX
  partner_display_id?: string | null;  // BHP-XXXX when approved
  full_name: string;
  email: string;
  phone?: string;
  status: string;
  clerk_user_id?: string | null;
  email_verified: boolean;
  date_of_birth?: string | null;
  gender?: string | null;
  pan_number?: string | null;
  aadhaar_number?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  business_location?: string | null;
  current_insurance_experience?: string | null;
  preferred_products?: string | null;
  bank_name?: string | null;
  branch_name?: string | null;
  account_holder_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
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

const STATUSES = ["submitted", "in_review", "approved", "rejected"] as const;

export default function AdminLeadDetailPage() {
  const params = useParams<{ leadId: string }>();
  const router = useRouter();
  const leadId = params?.leadId || "";
  const { getToken, isSignedIn } = useAuth();
  const { employeeToken, employeeInfo, employeeReady } = useEmployeeSession();

  const [role, setRole] = useState<SessionRole | null>(null);
  const [data, setData] = useState<LeadDetail | null>(null);
  const [profile, setProfile] = useState<PospApplicationFields>(emptyPospApplicationFields);
  const [status, setStatus] = useState<string>("submitted");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }

  async function authHeaders() {
    const token = employeeToken ?? (await getToken());
    return { Authorization: `Bearer ${token}`, token };
  }

  useEffect(() => {
    let active = true;
    async function loadRole() {
      if (!employeeReady) return;
      if (employeeToken && employeeInfo?.role) {
        if (active) setRole(employeeInfo.role as SessionRole);
        return;
      }
      if (!isSignedIn) {
        setRole(null);
        return;
      }
      if (active) setRole("customer");
    }
    void loadRole();
    return () => {
      active = false;
    };
  }, [employeeInfo?.role, employeeReady, employeeToken, getToken, isSignedIn]);

  async function load() {
    if (!leadId) return;
    if (!isSignedIn && !employeeToken) return;
    if (role && !isEmployeeRole(role)) return;
    setLoading(true);
    setErr(null);
    setOk(null);
    try {
      const headers = await authHeaders();
      const resp = await fetchWithEmployeeRefresh(API, `${API}/v1/posp-applications/${leadId}`, headers.token, {
        headers: { Authorization: headers.Authorization },
      });
      if (!resp.ok) throw new Error(`Load failed: ${resp.status} ${await resp.text()}`);
      const d: LeadDetail = await resp.json();
      setData(d);
      setStatus(d.status);
      setProfile({
        ...emptyPospApplicationFields,
        date_of_birth: d.date_of_birth || "",
        gender: d.gender || "",
        pan_number: d.pan_number || "",
        aadhaar_number: d.aadhaar_number || "",
        address_line1: d.address_line1 || "",
        address_line2: d.address_line2 || "",
        city: d.city || "",
        state: d.state || "",
        pincode: d.pincode || "",
        business_location: d.business_location || "",
        current_insurance_experience: d.current_insurance_experience || "",
        preferred_products: d.preferred_products || "",
        bank_name: d.bank_name || "",
        branch_name: d.branch_name || "",
        account_holder_name: d.account_holder_name || "",
        account_number: d.account_number || "",
        ifsc_code: d.ifsc_code || "",
      });
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to load"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeToken, leadId, isSignedIn, role]);

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
      const headers = await authHeaders();
      const requestHeaders = {
        Authorization: headers.Authorization,
        "Content-Type": "application/json",
      };
      const resp = await fetchWithEmployeeRefresh(API, `${API}/v1/posp-applications/${leadId}`, headers.token, {
        method: "PATCH",
        headers: requestHeaders,
        body: JSON.stringify({
          ...profile,
          status,
        }),
      });

      if (!resp.ok) throw new Error(`Save failed: ${resp.status} ${await resp.text()}`);
      setOk("Saved.");
      await load();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Save failed (invalid JSON?)"));
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
      // POST /v1/posp-applications/{application_id}/documents?doc_type=...
      const headers = await authHeaders();
      const resp = await fetchWithEmployeeRefresh(
        API,
        `${API}/v1/posp-applications/${leadId}/documents?doc_type=${encodeURIComponent(docType)}`,
        headers.token,
        {
          method: "POST",
          headers: { Authorization: headers.Authorization },
          body: form,
        }
      );

      if (!resp.ok) throw new Error(`Upload failed: ${resp.status} ${await resp.text()}`);
      setOk("Uploaded document.");
      await load();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Upload failed"));
    } finally {
      setBusy(false);
    }
  }

  if (!isSignedIn && !employeeToken) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-600">Please sign in to view partner leads.</p>
        </div>
      </div>
    );
  }

  if (role && !isEmployeeRole(role)) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-600">Your account does not have access to partner leads.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="mb-8 rounded-sm border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-blue-100/40 p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-sm bg-[#0B5CAD] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white shadow-sm">
              Admin Console
            </span>
            <div className="mt-3 text-sm text-slate-500">
              <Link href="/leads" className="text-[#0B5CAD] hover:text-[#0A4F95]">
                Partner Leads
              </Link>{" "}
              / Details
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-heading">Lead Details</h1>
            {data?.lead_display_id && (
              <p className="mt-2 text-sm text-slate-600">
                Lead ID: <span className="font-mono text-slate-700">{data.lead_display_id}</span>
              </p>
            )}
          </div>
          <button
            onClick={() => router.back()}
            className="self-start rounded-sm bg-[#0B5CAD] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-[#0A4F95] lg:self-start"
          >
            Back
          </button>

        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-600">Loading…</div>
      ) : err ? (
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-700 whitespace-pre-wrap">
          {err}
        </div>
      ) : !data ? (
        <div className="text-sm text-slate-600">Not found.</div>
      ) : (
        <>
          {ok && (
            <div className="mb-6 rounded-sm border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              {ok}
            </div>
          )}

          {/* Top summary cards */}
          <div className="grid gap-4 lg:grid-cols-3 mb-6">
            {/* Partner Info */}
            <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Partner</div>
              <div className="mt-2 text-lg font-semibold text-heading">{data.full_name}</div>
              <div className="mt-1 text-sm text-slate-600">{data.email}</div>
              {data.phone && <div className="text-sm text-slate-600">{data.phone}</div>}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-sm bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#0B5CAD]">
                  {data.status}
                </span>
                <span
                  className={`rounded-sm px-2.5 py-1 text-xs font-medium ${
                    data.email_verified
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {data.email_verified ? "Email verified" : "Email not verified"}
                </span>
              </div>
            </div>

            {/* IDs */}
            <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Lead ID</div>
              <div className="mt-2 text-xl font-bold text-heading">{data.lead_display_id}</div>
              {data.partner_display_id && (
                <div className="mt-4">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Partner ID</div>
                  <div className="mt-1 text-xl font-bold text-[#0B5CAD]">{data.partner_display_id}</div>
                </div>
              )}
            </div>

            {/* Status Actions */}
            <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</div>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-2 w-full rounded-sm border border-slate-200 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-2 focus:ring-blue-200"
                disabled={busy}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <button
                onClick={saveProfileAndStatus}
                disabled={busy}
                className="mt-3 w-full rounded-sm bg-[#0B5CAD] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0A4F95] disabled:opacity-50"
              >
                Save Status
              </button>

              <p className="mt-2 text-xs text-slate-500">
                Use <span className="font-medium">in_review</span> while reviewing submitted details.
              </p>
            </div>
          </div>

          {/* Partner Details Form */}
          <div className="mb-6 rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-heading">Partner Profile</h2>
            <p className="text-sm text-slate-500 mt-1">
              Personal information, address, and bank details for POSP onboarding.
            </p>

            <PospApplicationForm value={profile} onChange={setProfile} disabled={busy} compact={false} />

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={saveProfileAndStatus}
                disabled={busy}
                className="rounded-sm bg-[#0B5CAD] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0A4F95] disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Documents */}
          <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-heading">Documents</h2>
            <p className="text-sm text-slate-500 mt-1">
              Upload documents collected from the partner.
            </p>
            <div className="mt-4 rounded-sm border border-slate-200 bg-slate-50/60 p-4">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-heading">
                <FileUp className="h-4 w-4 text-[#0B5CAD]" />
                Document Attachments
              </h3>
              <p className="mt-1 text-xs text-slate-500">Upload clear scans/photos for verification.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {DOC_TYPES.map((d) => (
                  <label key={d.key} className="block">
                    <span className="text-xs font-medium text-slate-600">
                      {d.label} <span className="text-slate-500">(Uploaded: {docsByType[d.key] || 0})</span>
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      disabled={busy}
                      className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:cursor-pointer file:rounded-sm file:border-0 file:bg-[#0B5CAD] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#0A4F95]"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadDoc(d.key, f);
                      }}
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Uploaded files list */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-heading">Uploaded Files</h3>
              {data.documents.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No documents uploaded yet.</p>
              ) : (
                <div className="mt-3 overflow-hidden rounded-sm border border-slate-200">
                  <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600 uppercase tracking-wide">
                    <div className="col-span-3">Type</div>
                    <div className="col-span-6">File</div>
                    <div className="col-span-3">Uploaded</div>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {data.documents.map((doc) => (
                      <div key={doc.doc_id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm">
                        <div className="col-span-3 text-slate-700">{doc.doc_type}</div>
                        <div className="col-span-6 break-all text-heading">{doc.original_filename}</div>
                        <div className="col-span-3 text-slate-500 text-xs">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
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
