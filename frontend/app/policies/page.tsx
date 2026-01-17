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

      const filenameParts = ["policies"];
      if (startDate) filenameParts.push(`from_${startDate}`);
      if (endDate) filenameParts.push(`to_${endDate}`);
      if (!startDate && !endDate) {
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

  const extractedCount = items.filter((p) => p.has_extracted_json).length;

  return (
    <main className="py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Policies</h1>
            <p className="mt-1 text-sm text-slate-600">
              Your uploaded policies and extracted results.
            </p>
          </div>

          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 hover:from-blue-700 hover:to-blue-800 transition-all"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Upload New
          </Link>
        </div>

        {/* Filters Card */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="startDate" className="text-xs font-medium text-slate-600">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                max={endDate || new Date().toISOString().split("T")[0]}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="endDate" className="text-xs font-medium text-slate-600">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                min={startDate || undefined}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <button
              onClick={loadPolicies}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {busy ? "Loading…" : "Apply Filter"}
            </button>

            {(startDate || endDate) && (
              <button
                onClick={clearFilters}
                className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Clear
              </button>
            )}

            <div className="ml-auto">
              <button
                onClick={downloadAllExcel}
                disabled={downloading || extractedCount === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                title={extractedCount === 0 ? "No extracted policies to download" : `Download ${extractedCount} policies as Excel`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {downloading ? "Downloading…" : `Download Excel (${extractedCount})`}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 border border-red-100 p-4">
            <svg className="h-5 w-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Policies List */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">
                {items.length} {items.length === 1 ? "policy" : "policies"}
              </span>
              {extractedCount > 0 && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  {extractedCount} extracted
                </span>
              )}
            </div>
            <button
              onClick={loadPolicies}
              disabled={busy}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-60 transition-colors"
            >
              <svg className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {/* Content */}
          {!isSignedIn ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-4">
                <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-sm text-slate-600">Please sign in to view your policies.</p>
            </div>
          ) : busy && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <svg className="h-8 w-8 text-blue-600 animate-spin mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-slate-600">Loading policies...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-4">
                <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">No policies found</p>
              <p className="text-sm text-slate-500">
                {startDate || endDate ? "Try adjusting your date filters." : "Upload a PDF to get started."}
              </p>
              {!startDate && !endDate && (
                <Link
                  href="/upload"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload First Policy
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((p) => {
                const id = p.policy_id;
                const hasId = typeof id === "string" && id.length > 0;

                return (
                  <div
                    key={id || `${p.original_filename}-${p.created_at}`}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        p.has_extracted_json ? "bg-emerald-100" : "bg-amber-100"
                      }`}>
                        <svg
                          className={`h-5 w-5 ${p.has_extracted_json ? "text-emerald-600" : "text-amber-600"}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        {hasId ? (
                          <Link
                            href={`/policies/${id}`}
                            className="block truncate font-medium text-slate-900 hover:text-blue-600 transition-colors"
                          >
                            {p.original_filename}
                          </Link>
                        ) : (
                          <div className="truncate font-medium text-slate-900">
                            {p.original_filename}
                          </div>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(p.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          p.has_extracted_json
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {p.has_extracted_json ? "Extracted" : "Pending"}
                      </span>
                      {hasId && (
                        <Link
                          href={`/policies/${id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                        >
                          View
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
