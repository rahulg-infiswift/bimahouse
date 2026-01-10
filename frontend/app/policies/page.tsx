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
  
  // Date filter state
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [downloading, setDownloading] = useState(false);

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

      // Build query params for date filters
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      const queryString = params.toString();
      const url = `/v1/policies${queryString ? `?${queryString}` : ""}`;

      const res = await fetchWithAuth(url, token);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`List policies failed: ${res.status} ${t}`);
      }

      const data = (await res.json()) as PoliciesResp;
      const normalized = Array.isArray(data.items) ? data.items : [];
      setItems(normalized);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function downloadAllExcel() {
    setError("");
    setDownloading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Could not retrieve Clerk token.");

      // Build query params for date filters
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      const queryString = params.toString();
      const url = `/v1/policies/download/bulk${queryString ? `?${queryString}` : ""}`;

      const res = await fetchWithAuth(url, token);

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Download failed: ${res.status} ${t}`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      // Generate filename based on date filters
      const filenameParts = ["policies"];
      if (startDate) filenameParts.push(`from_${startDate}`);
      if (endDate) filenameParts.push(`to_${endDate}`);
      if (!startDate && !endDate) {
        // Add today's date if no filters
        filenameParts.push(new Date().toISOString().split("T")[0]);
      }
      const filename = filenameParts.join("_") + ".xlsx";

      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setDownloading(false);
    }
  }

  function clearFilters() {
    setStartDate("");
    setEndDate("");
  }

  useEffect(() => {
    loadPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Count extracted policies for display
  const extractedCount = items.filter((p) => p.has_extracted_json).length;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Policies</h1>
          <p className="mt-1 text-sm text-gray-600">
            Your uploaded policies and extracted results.
          </p>
        </div>

        <Link
          href="/upload"
          className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Upload
        </Link>
      </div>

      {/* Date Filters */}
      <div className="mt-6 flex flex-wrap items-end gap-4 rounded-xl border bg-gray-50 p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="startDate" className="text-xs font-medium text-gray-600">
            Start Date
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            max={endDate || new Date().toISOString().split("T")[0]}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="endDate" className="text-xs font-medium text-gray-600">
            End Date
          </label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            min={startDate || undefined}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <button
          onClick={loadPolicies}
          disabled={busy}
          className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {busy ? "Loading…" : "Apply Filter"}
        </button>

        {(startDate || endDate) && (
          <button
            onClick={clearFilters}
            className="rounded-full px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}

        <div className="ml-auto">
          <button
            onClick={downloadAllExcel}
            disabled={downloading || extractedCount === 0}
            className="rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            title={extractedCount === 0 ? "No extracted policies to download" : `Download ${extractedCount} policies as Excel`}
          >
            {downloading ? "Downloading…" : `Download Excel (${extractedCount})`}
          </button>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
          <span className="text-xs font-medium text-gray-600">
            {items.length} policies found
          </span>
          <button
            onClick={loadPolicies}
            disabled={busy}
            className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-60"
          >
            {busy ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {!isSignedIn ? (
          <div className="px-4 py-6 text-sm text-gray-600">
            Please sign in to view your policies.
          </div>
        ) : busy && items.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-600">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-600">
            No policies found. {startDate || endDate ? "Try adjusting your date filters." : "Upload a PDF to get started."}
          </div>
        ) : (
          <div className="divide-y">
            {items.map((p) => {
              const id = p.policy_id;
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
