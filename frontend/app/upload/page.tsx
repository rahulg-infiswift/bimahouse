// frontend/app/upload/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { canAccessPolicies, fetchUserRole, UserRole } from "../lib/roles";

type ExtractResponse = { job_id: string; policy_id: string };
type JobStatusResp = {
  job_id: string;
  status: "queued" | "running" | "done" | "failed";
  policy_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

const API_BASE_DEFAULT = "http://localhost:8000";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function UploadPage() {
  const { getToken, isSignedIn } = useAuth();
  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || API_BASE_DEFAULT,
    []
  );

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [role, setRole] = useState<UserRole | null>(null);

  const [extractResp, setExtractResp] = useState<ExtractResponse | null>(null);
  const [job, setJob] = useState<JobStatusResp | null>(null);

  async function fetchWithAuth(path: string, token: string, init?: RequestInit) {
    const res = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });
    return res;
  }

  useEffect(() => {
    let active = true;
    async function loadRole() {
      if (!isSignedIn) {
        setRole(null);
        return;
      }
      const token = await getToken();
      if (!token) return;
      const nextRole = await fetchUserRole(apiBase, token);
      if (active) setRole(nextRole);
    }
    void loadRole();
    return () => {
      active = false;
    };
  }, [apiBase, getToken, isSignedIn]);

  async function pollJob(token: string, jobId: string) {
    for (let i = 0; i < 60; i++) {
      const res = await fetchWithAuth(`/v1/jobs/${jobId}`, token);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Job status failed: ${res.status} ${t}`);
      }
      const data = (await res.json()) as JobStatusResp;
      setJob(data);

      if (data.status === "done" || data.status === "failed") return data;
      await sleep(1500);
    }
    throw new Error("Job polling timed out. Please check job status on Policies page.");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setExtractResp(null);
    setJob(null);

    if (!isSignedIn) {
      setError("Please sign in first.");
      return;
    }
    if (role && !canAccessPolicies(role)) {
      setError("Your account does not have access to upload policies yet.");
      return;
    }
    if (!file) {
      setError("Please choose a PDF file.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported.");
      return;
    }

    setBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Could not retrieve Clerk token.");

      const form = new FormData();
      form.append("file", file);

      const res = await fetchWithAuth("/v1/policies/extract", token, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Extract request failed: ${res.status} ${t}`);
      }

      const data = (await res.json()) as ExtractResponse;
      setExtractResp(data);

      await pollJob(token, data.job_id);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  const getStatusIcon = () => {
    if (!job) return null;
    switch (job.status) {
      case "queued":
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case "running":
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <svg className="h-5 w-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        );
      case "done":
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case "failed":
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
    }
  };

  const getStatusLabel = () => {
    if (!job) return null;
    const labels: Record<string, { text: string; color: string }> = {
      queued: { text: "Queued", color: "bg-slate-100 text-slate-700" },
      running: { text: "Processing", color: "bg-blue-100 text-blue-700" },
      done: { text: "Completed", color: "bg-emerald-100 text-emerald-700" },
      failed: { text: "Failed", color: "bg-red-100 text-red-700" },
    };
    const { text, color } = labels[job.status] || labels.queued;
    return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>{text}</span>;
  };

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Please sign in</h2>
            <p className="text-sm text-slate-600">Sign in to upload policies.</p>
          </div>
        </div>
      </main>
    );
  }

  if (role && !canAccessPolicies(role)) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Access pending</h2>
            <p className="text-sm text-slate-600">Your account does not have access to upload policies yet.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-8 shadow-sm mb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white shadow-sm">
                Policies
              </span>
              <h1 className="mt-4 text-3xl font-semibold text-slate-900">Upload Policy</h1>
              <p className="mt-2 text-sm text-slate-600">
                Upload a PDF document to extract policy details using AI.
              </p>
            </div>
            <Link
              href="/policies"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50 transition-colors"
            >
              View policies
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Upload Form */}
        <form onSubmit={onSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Policy PDF
            </label>
            <div className="relative">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
              >
                {file ? (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 mb-3">
                      <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-slate-900">{file.name}</span>
                    <span className="mt-1 text-xs text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
                      <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-slate-700">Click to upload PDF</span>
                    <span className="mt-1 text-xs text-slate-500">Max file size: 20MB</span>
                  </>
                )}
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || !file}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Extracting...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Start Extraction
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-red-50 border border-red-100 p-4">
              <svg className="h-5 w-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </form>

        {/* Job Status */}
        {extractResp && (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              {getStatusIcon()}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-semibold text-slate-900">Extraction Job</h2>
                  {getStatusLabel()}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-slate-400">Job:</span>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700">{extractResp.job_id.slice(0, 8)}...</code>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-slate-400">Policy:</span>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700">{extractResp.policy_id.slice(0, 8)}...</code>
                  </div>
                </div>

                {job?.error && (
                  <div className="mt-3 rounded-lg bg-red-50 border border-red-100 p-3">
                    <p className="text-sm text-red-700">{job.error}</p>
                  </div>
                )}

                {job?.status === "done" && (
                  <div className="mt-4">
                    <Link
                      href={`/policies/${extractResp.policy_id}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Extracted Policy
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Progress indicator for running state */}
            {job?.status === "running" && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: "60%" }}></div>
                  </div>
                  <span className="text-xs text-slate-500">Processing...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Supported Documents</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Motor Insurance Policies (Private Car, Two-Wheeler)
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Health Insurance Policies
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              PDF format only (max 20MB)
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
