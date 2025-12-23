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
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-sm text-gray-600 hover:text-gray-900">
              ← Back
            </button>
            <Link href="/policies" className="text-sm text-gray-600 hover:text-gray-900">
              Policies
            </Link>
          </div>

          <h1 className="mt-3 text-2xl font-semibold">Policy Details</h1>

          <p className="mt-1 text-sm text-gray-600">
            {policy ? (
              <>
                <span className="font-medium text-gray-900">{policy.original_filename}</span> ·{" "}
                <span className="text-gray-500">{new Date(policy.created_at).toLocaleString()}</span> ·{" "}
                <span className="text-gray-500">schema: {policy.schema_version}</span>
              </>
            ) : busy ? (
              "Loading…"
            ) : (
              "—"
            )}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={loadPolicy}
            disabled={busy}
            className="rounded-full border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {busy ? "Refreshing…" : "Refresh"}
          </button>

          <button
            onClick={() => download("json")}
            disabled={!policy?.extracted_json}
            className="rounded-full border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Download JSON
          </button>

          <button
            onClick={() => download("csv")}
            disabled={!policy?.extracted_json}
            className="rounded-full border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Download CSV
          </button>

          <button
            onClick={() => download("xlsx")}
            disabled={!policy?.extracted_json}
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Download Excel
          </button>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6">
        {!isSignedIn ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600 shadow-sm">
            Please sign in to view this policy.
          </div>
        ) : policy ? (
          <PolicyViewer data={policy.extracted_json} />
        ) : (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600 shadow-sm">
            Loading…
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        Policy ID: <code className="rounded bg-gray-100 px-1 py-0.5">{policyId}</code>
      </div>
    </main>
  );
}
