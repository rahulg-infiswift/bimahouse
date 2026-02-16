"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, Download, FileText, RefreshCw, ShieldCheck } from "lucide-react";
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
      a.download = `${policyId}.${format}`;
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
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Link href="/policies" className="inline-flex items-center gap-1 text-[#0B5CAD] hover:text-[#0A4F95]">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {isEmployeeRole(role) ? "All Policies" : "My Policies"}
                </Link>
                <span>/</span>
                <span>Details</span>
              </div>

              <h1 className="mt-4 inline-flex items-center gap-2 text-3xl font-semibold text-heading">
                <FileText className="h-7 w-7 text-[#0B5CAD]" />
                Policy Details
              </h1>

              {policy ? (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-medium text-heading">{policy.original_filename}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500">{new Date(policy.created_at).toLocaleDateString()}</span>
                </div>
              ) : busy ? (
                <p className="mt-2 text-sm text-slate-500">Loading…</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={loadPolicy}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
                {busy ? "Refreshing…" : "Refresh"}
              </button>

              <button
                onClick={() => download("json")}
                disabled={!policy?.extracted_json}
                className="rounded-sm border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                JSON
              </button>

              <button
                onClick={() => download("csv")}
                disabled={!policy?.extracted_json}
                className="rounded-sm border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                CSV
              </button>

              <button
                onClick={() => download("xlsx")}
                disabled={!policy?.extracted_json}
                className="inline-flex items-center gap-1.5 rounded-sm bg-[#0B5CAD] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-[#0A4F95] disabled:opacity-50 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Excel
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
          {!isSignedIn && !partnerToken && !employeeToken ? (
            <div className="text-sm text-slate-600">
              Please sign in to view this policy.
            </div>
          ) : policy ? (
            <PolicyViewer data={policy.extracted_json} />
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
