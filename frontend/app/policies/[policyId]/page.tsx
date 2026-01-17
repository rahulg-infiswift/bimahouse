"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import PolicyViewer from "./PolicyViewer";

type PolicyResp = {
  policy_id: string;
  original_filename: string;
  created_at: string;
  schema_version: string;
  extracted_json: any | null;
};

const API_BASE_DEFAULT = "http://localhost:8000";

export default function PolicyDetailsPage() {
  const params = useParams();
  const policyId = (params?.policyId as string) || "";

  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || API_BASE_DEFAULT,
    []
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [policy, setPolicy] = useState<PolicyResp | null>(null);

  async function fetchWithAuth(path: string, token: string, init?: RequestInit) {
    return fetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async function loadPolicy() {
    setError("");
    if (!isSignedIn || !policyId) {
      setPolicy(null);
      return;
    }

    setBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Could not retrieve Clerk token.");

      const res = await fetchWithAuth(`/v1/policies/${policyId}`, token);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Get policy failed: ${res.status} ${t}`);
      }

      const data = (await res.json()) as PolicyResp;
      setPolicy(data);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function download(format: "json" | "csv" | "xlsx") {
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Could not retrieve Clerk token.");
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
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    if (!policyId) return;
    loadPolicy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, policyId]);

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/policies" className="text-blue-600 hover:text-blue-700">
              My Policies
            </Link>
            <span>/</span>
            <span>Details</span>
          </div>

          <h1 className="mt-2 text-2xl font-bold text-slate-900">Policy Details</h1>

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
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {busy ? "Refreshing…" : "Refresh"}
          </button>

          <button
            onClick={() => download("json")}
            disabled={!policy?.extracted_json}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            JSON
          </button>

          <button
            onClick={() => download("csv")}
            disabled={!policy?.extracted_json}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            CSV
          </button>

          <button
            onClick={() => download("xlsx")}
            disabled={!policy?.extracted_json}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Excel
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        {!isSignedIn ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Please sign in to view this policy.
          </div>
        ) : policy ? (
          <PolicyViewer data={policy.extracted_json} />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            {busy ? "Loading policy data…" : "No policy data available."}
          </div>
        )}
      </div>

      <div className="mt-6 text-xs text-slate-400">
        Policy ID: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{policyId}</code>
      </div>
    </main>
  );
}
