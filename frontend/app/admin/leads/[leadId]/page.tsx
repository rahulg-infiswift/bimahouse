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
  verification_status: string;
};

type LeadDetail = {
  lead_id: string;
  full_name: string;
  email: string;
  phone?: string;
  status: string;
  clerk_user_id?: string | null;
  email_verified: boolean;
  profile?: Record<string, any> | null;
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

export default function AdminLeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = String((params as any)?.leadId || "");
  const { getToken } = useAuth();

  const [data, setData] = useState<LeadDetail | null>(null);
  const [profileJson, setProfileJson] = useState<string>("{}");
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
      setProfileJson(JSON.stringify(d.profile || {}, null, 2));
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (leadId) load();
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
      const profile = JSON.parse(profileJson);

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

      // Recommended backend endpoint:
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
              Manage Leads
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
              <div className="text-xs text-gray-500">IDs</div>
              <div className="mt-2 text-sm">
                <div className="text-xs text-gray-500">Lead ID</div>
                <div className="font-mono text-xs break-all">{data.lead_id}</div>
              </div>

              <div className="mt-3 text-sm">
                <div className="text-xs text-gray-500">Clerk user</div>
                <div className="font-mono text-xs break-all">{data.clerk_user_id || "—"}</div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-xs text-gray-500">Actions</div>

              <label className="mt-2 grid gap-1">
                <span className="text-sm">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm"
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
                Save Status + Profile
              </button>

              <div className="mt-2 text-xs text-gray-600">
                Tip: set <b>submitted</b> after KYC is complete.
              </div>
            </div>
          </div>

          {/* Profile JSON */}
          <div className="mt-6 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">KYC Profile</div>
                <div className="text-xs text-gray-600 mt-1">
                  v1 uses a JSON blob. Later we can convert this into a proper form UI.
                </div>
              </div>
              <button
                onClick={saveProfileAndStatus}
                disabled={busy}
                className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              >
                Save
              </button>
            </div>

            <textarea
              className="mt-3 w-full min-h-[260px] border rounded-md p-3 font-mono text-xs"
              value={profileJson}
              onChange={(e) => setProfileJson(e.target.value)}
            />
          </div>

          {/* Documents */}
          <div className="mt-6 rounded-lg border p-4">
            <div className="font-medium">Documents</div>
            <div className="text-xs text-gray-600 mt-1">
              Upload documents collected from partner and track verification status.
            </div>

            <div className="mt-4 grid gap-3">
              {DOC_TYPES.map((d) => (
                <div key={d.key} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border rounded-md p-3">
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
                    <div className="col-span-5">File</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Uploaded</div>
                  </div>
                  <div className="divide-y">
                    {data.documents.map((doc) => (
                      <div key={doc.doc_id} className="grid grid-cols-12 gap-2 px-3 py-2 text-xs">
                        <div className="col-span-3">{doc.doc_type}</div>
                        <div className="col-span-5 break-all">{doc.original_filename}</div>
                        <div className="col-span-2">
                          <span className="rounded-full border px-2 py-1">{doc.verification_status}</span>
                        </div>
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
