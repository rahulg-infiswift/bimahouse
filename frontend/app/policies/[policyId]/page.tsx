"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, Download, Eye, RefreshCw, ShieldCheck, Table } from "lucide-react";
import PolicyViewer from "./PolicyViewer";
import { SessionRole, canAccessPolicies, isEmployeeRole } from "../../lib/roles";
import { usePartnerSession } from "../../lib/use-partner-session";
import { useEmployeeSession } from "../../lib/use-employee-session";
import { fetchWithEmployeeRefresh, fetchWithPartnerRefresh } from "../../lib/auth-refresh";

type PolicyResp = {
  policy_id: string;
  original_filename: string;
  created_at: string;
  schema_version: string;
  extracted_json: unknown;
};

const API_BASE_DEFAULT = "http://localhost:8000";

export default function PolicyDetailsPage() {
  const params = useParams();
  const policyId = (params?.policyId as string) || "";

  const { getToken, isSignedIn } = useAuth();
  const { partnerToken, partnerReady } = usePartnerSession();
  const { employeeToken, employeeInfo, employeeReady } = useEmployeeSession();

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || API_BASE_DEFAULT,
    []
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [policy, setPolicy] = useState<PolicyResp | null>(null);
  const [role, setRole] = useState<SessionRole | null>(null);
  const [viewMode, setViewMode] = useState<"data" | "pdf">("pdf");
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

  async function loadPolicy() {
    setError("");
    if (!partnerReady || !employeeReady) return;
    if ((!isSignedIn && !partnerToken && !employeeToken) || !policyId) {
      setPolicy(null);
      return;
    }
    if (role && !canAccessPolicies(role)) {
      setPolicy(null);
      return;
    }

    setBusy(true);
    try {
      // Clerk users use Clerk token; only use partner token if not signed in via Clerk
      const token = employeeToken ?? (isSignedIn ? (await getToken()) : partnerToken);
      if (!token) throw new Error("Could not retrieve auth token.");
      const policyBasePath = isEmployeeSession ? "/v1/admin/policies" : "/v1/partner/policies";

      const res = await fetchWithAuth(`${policyBasePath}/${policyId}`, token);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Get policy failed: ${res.status} ${t}`);
      }

      const data = (await res.json()) as PolicyResp;
      setPolicy(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function download(format: "json" | "csv" | "xlsx") {
    setError("");
    try {
      // Clerk users use Clerk token; only use partner token if not signed in via Clerk
      const token = employeeToken ?? (isSignedIn ? (await getToken()) : partnerToken);
      if (!token) throw new Error("Could not retrieve auth token.");
      if (!policyId) throw new Error("Missing policyId.");
      const policyBasePath = isEmployeeSession ? "/v1/admin/policies" : "/v1/partner/policies";

      const res = await fetchWithAuth(`${policyBasePath}/${policyId}/download?format=${format}`, token);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Download failed: ${res.status} ${t}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      const baseName = policy?.original_filename?.replace(/\.pdf$/i, "") || policyId;
      a.download = `${baseName}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    if (!policyId) return;
    loadPolicy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeToken, employeeReady, isSignedIn, policyId, role, partnerToken, partnerReady]);

  if (!partnerReady || !employeeReady) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-5xl mx-auto p-6">
          <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">Loading session...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!isSignedIn && !partnerToken && !employeeToken) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-5xl mx-auto p-6">
          <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-heading">Please sign in</h2>
            <p className="text-sm text-slate-600">Sign in to view policy details.</p>
          </div>
        </div>
      </main>
    );
  }

  if (role && !canAccessPolicies(role)) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-5xl mx-auto p-6">
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
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 rounded-sm border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-blue-100/40 p-8 shadow-sm">
          <div>
            <Link
              href="/policies"
              className="inline-flex items-center gap-1.5 rounded-sm bg-[#0B5CAD] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#0A4F95] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {isEmployeeRole(role) ? "All Policies" : "My Policies"}
            </Link>
            <div className="mt-4 flex items-center justify-between gap-3">
              <h1 className="text-3xl font-semibold text-heading">Policy Details</h1>
              <button
                onClick={() => download("xlsx")}
                disabled={!policy?.extracted_json}
                className="inline-flex items-center gap-2 rounded-sm bg-[#0B5CAD] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-[#0A4F95] disabled:opacity-50 transition-colors"
              >
                <Download className="h-4 w-4" />
                Excel
              </button>
            </div>
            {policy ? (
              <p className="mt-2 text-sm text-slate-600">
                {policy.original_filename} &middot; {new Date(policy.created_at).toLocaleDateString()}
              </p>
            ) : busy ? (
              <p className="mt-2 text-sm text-slate-600">Loading…</p>
            ) : null}
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-sm bg-red-50 border border-red-100 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* View toggle + refresh */}
        {policy && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex gap-1 rounded-sm border border-slate-200 bg-white p-1 shadow-sm w-fit">
              <button
                onClick={() => setViewMode("pdf")}
                className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === "pdf"
                    ? "bg-[#0B5CAD] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                View PDF
              </button>
              <button
                onClick={() => setViewMode("data")}
                className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === "data"
                    ? "bg-[#0B5CAD] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Table className="h-3.5 w-3.5" />
                Extracted Data
              </button>
            </div>
            <button
              onClick={loadPolicy}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
              {busy ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        )}

        <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
          {!isSignedIn && !partnerToken && !employeeToken ? (
            <div className="text-sm text-slate-600">
              Please sign in to view this policy.
            </div>
          ) : policy ? (
            viewMode === "pdf" ? (
              <PdfViewer
                policyId={policyId}
                pdfPath={`${isEmployeeSession ? "/v1/admin/policies" : "/v1/partner/policies"}/${policyId}/pdf`}
                token={employeeToken || partnerToken || ""}
                fetchWithAuth={fetchWithAuth}
              />
            ) : (
              <PolicyViewer data={policy.extracted_json} />
            )
          ) : (
            <div className="text-sm text-slate-500">
              {busy ? "Loading policy data…" : "No policy data available."}
            </div>
          )}
        </div>

        <div className="mt-6 inline-flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
          Policy ID: <code className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-slate-600">{policyId}</code>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Inline PDF viewer
// ---------------------------------------------------------------------------

function PdfViewer({
  policyId,
  pdfPath,
  token,
  fetchWithAuth,
}: {
  policyId: string;
  pdfPath: string;
  token: string;
  fetchWithAuth: (path: string, token: string, init?: RequestInit) => Promise<Response>;
}) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let revoke: string | null = null;

    async function loadPdf() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithAuth(pdfPath, token);
        if (!res.ok) throw new Error(`Failed to load PDF (${res.status})`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        revoke = url;
        setPdfUrl(url);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load PDF");
      } finally {
        setLoading(false);
      }
    }

    loadPdf();

    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyId, pdfPath, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-slate-500">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        Loading PDF…
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-sm text-red-600">{error}</div>
    );
  }

  if (!pdfUrl) return null;

  return (
    <iframe
      src={pdfUrl}
      title="Policy PDF"
      className="h-[80vh] w-full rounded-sm border-0"
    />
  );
}
