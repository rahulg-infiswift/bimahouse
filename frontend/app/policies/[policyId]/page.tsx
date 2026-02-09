"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import PolicyViewer from "./PolicyViewer";
import { canAccessPolicies, fetchUserRole, isEmployeeRole, UserRole } from "../../lib/roles";
import { usePartnerSession } from "../../lib/use-partner-session";

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

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || API_BASE_DEFAULT,
    []
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [policy, setPolicy] = useState<PolicyResp | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);

  async function fetchWithAuth(path: string, token: string, init?: RequestInit) {
    return fetch(`${apiBase}${path}`, {
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
      if (!partnerReady) return;
      if (!isSignedIn && !partnerToken) {
        setRole(null);
        return;
      }
      // Clerk users (including employees) use Clerk token to fetch their role
      if (isSignedIn) {
        const token = await getToken();
        if (!token) return;
        const nextRole = await fetchUserRole(apiBase, token);
        if (active) setRole(nextRole);
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
  }, [apiBase, getToken, isSignedIn, partnerToken, partnerReady]);

  async function loadPolicy() {
    setError("");
    if (!partnerReady) return;
    if ((!isSignedIn && !partnerToken) || !policyId) {
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
      const token = isSignedIn ? (await getToken()) : partnerToken;
      if (!token) throw new Error("Could not retrieve auth token.");

      const res = await fetchWithAuth(`/v1/policies/${policyId}`, token);
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
      const token = isSignedIn ? (await getToken()) : partnerToken;
      if (!token) throw new Error("Could not retrieve auth token.");
      if (!policyId) throw new Error("Missing policyId.");

      const res = await fetchWithAuth(`/v1/policies/${policyId}/download?format=${format}`, token);
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
  }, [isSignedIn, policyId, role, partnerToken, partnerReady]);

  if (!partnerReady) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-5xl mx-auto p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">Loading session...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!isSignedIn && !partnerToken) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-5xl mx-auto p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Please sign in</h2>
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
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Access pending</h2>
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
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-8 shadow-sm mb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Link href="/policies" className="text-blue-600 hover:text-blue-700">
                  {isEmployeeRole(role) ? "All Policies" : "My Policies"}
                </Link>
                <span>/</span>
                <span>Details</span>
              </div>

              <h1 className="mt-4 text-3xl font-semibold text-slate-900">Policy Details</h1>

              {policy ? (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-medium text-slate-900">{policy.original_filename}</span>
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
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {busy ? "Refreshing…" : "Refresh"}
              </button>

              <button
                onClick={() => download("json")}
                disabled={!policy?.extracted_json}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                JSON
              </button>

              <button
                onClick={() => download("csv")}
                disabled={!policy?.extracted_json}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                CSV
              </button>

              <button
                onClick={() => download("xlsx")}
                disabled={!policy?.extracted_json}
                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
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

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {!isSignedIn && !partnerToken ? (
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

        <div className="mt-6 text-xs text-slate-400">
          Policy ID: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{policyId}</code>
        </div>
      </div>
    </main>
  );
}
