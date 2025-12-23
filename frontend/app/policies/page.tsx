// frontend/app/policies/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";

type PolicyListItem = {
  policy_id: string;
  original_filename: string;
  created_at: string;
  has_extracted_json: boolean;
  schema_version: string;
};

type PoliciesResp = {
  items: PolicyListItem[];
};

const API_BASE_DEFAULT = "http://localhost:8000";

export default function PoliciesPage() {
  const { getToken, isSignedIn } = useAuth();

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || API_BASE_DEFAULT,
    []
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [items, setItems] = useState<PolicyListItem[]>([]);

  async function fetchWithAuth(path: string, token: string, init?: RequestInit) {
    return fetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async function loadPolicies() {
    setError("");
    if (!isSignedIn) {
      setItems([]);
      return;
    }

    setBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Could not retrieve Clerk token.");

      const res = await fetchWithAuth("/v1/policies", token);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`List policies failed: ${res.status} ${t}`);
      }

      const data = (await res.json()) as PoliciesResp;
      const normalized = Array.isArray(data.items) ? data.items : [];
      setItems(normalized);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function download(policyId: string, format: "json" | "csv" | "xlsx") {
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Could not retrieve Clerk token.");
      if (!policyId) throw new Error("Missing policy_id for download.");

      const res = await fetchWithAuth(
        `/v1/policies/${policyId}/download?format=${format}`,
        token
      );

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
    loadPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Policies</h1>
          <p className="mt-1 text-sm text-gray-600">
            Your uploaded policies and extracted results.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/upload"
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Upload
          </Link>

          <button
            onClick={loadPolicies}
            disabled={busy}
            className="rounded-full border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {busy ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="border-b bg-gray-50 px-4 py-3 text-xs font-medium text-gray-600">
          Recent (max 50)
        </div>

        {!isSignedIn ? (
          <div className="px-4 py-6 text-sm text-gray-600">
            Please sign in to view your policies.
          </div>
        ) : busy && items.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-600">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-600">
            No policies yet. Upload a PDF to get started.
          </div>
        ) : (
          <div className="divide-y">
            {items.map((p) => {
              const id = p.policy_id; // important: must be policy_id
              const hasId = typeof id === "string" && id.length > 0;

              return (
                <div key={id || `${p.original_filename}-${p.created_at}`} className="px-4 py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      {hasId ? (
                        <Link
                          href={`/policies/${id}`}
                          className="block truncate font-medium text-gray-900 hover:underline"
                        >
                          {p.original_filename}
                        </Link>
                      ) : (
                        <div className="truncate font-medium text-gray-900">
                          {p.original_filename}
                        </div>
                      )}

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span>{new Date(p.created_at).toLocaleString()}</span>
                        <span>schema: {p.schema_version}</span>
                        <span
                          className={
                            p.has_extracted_json
                              ? "rounded-full bg-green-50 px-2 py-0.5 text-green-700"
                              : "rounded-full bg-yellow-50 px-2 py-0.5 text-yellow-700"
                          }
                        >
                          {p.has_extracted_json ? "Extracted" : "Pending"}
                        </span>
                        {hasId ? (
                          <span className="rounded bg-gray-100 px-2 py-0.5 font-mono">
                            {id}
                          </span>
                        ) : (
                          <span className="text-red-600">missing policy_id</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {hasId ? (
                        <Link
                          href={`/policies/${id}`}
                          className="rounded-full border px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          View
                        </Link>
                      ) : null}

                      <button
                        onClick={() => hasId && download(id, "json")}
                        disabled={!hasId || !p.has_extracted_json}
                        className="rounded-full border px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        title={!p.has_extracted_json ? "Extraction not completed yet" : "Download JSON"}
                      >
                        JSON
                      </button>

                      <button
                        onClick={() => hasId && download(id, "csv")}
                        disabled={!hasId || !p.has_extracted_json}
                        className="rounded-full border px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        title={!p.has_extracted_json ? "Extraction not completed yet" : "Download CSV"}
                      >
                        CSV
                      </button>

                      <button
                        onClick={() => hasId && download(id, "xlsx")}
                        disabled={!hasId || !p.has_extracted_json}
                        className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                        title={!p.has_extracted_json ? "Extraction not completed yet" : "Download Excel"}
                      >
                        Excel
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
