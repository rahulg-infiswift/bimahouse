// frontend/app/upload/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Loader2,
  ShieldCheck,
  UploadCloud,
  Zap,
  XCircle,
} from "lucide-react";
import { SessionRole, canAccessPolicies } from "../lib/roles";
import { usePartnerSession } from "../lib/use-partner-session";
import { useEmployeeSession } from "../lib/use-employee-session";
import { fetchWithEmployeeRefresh, fetchWithPartnerRefresh } from "../lib/auth-refresh";

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
  const { employeeToken, employeeInfo, employeeReady } = useEmployeeSession();
  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || API_BASE_DEFAULT,
    []
  );

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [role, setRole] = useState<SessionRole | null>(null);
  const { partnerToken, partnerReady } = usePartnerSession();

  const [extractResp, setExtractResp] = useState<ExtractResponse | null>(null);
  const [job, setJob] = useState<JobStatusResp | null>(null);

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

    if (!isSignedIn && !partnerToken && !employeeToken) {
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
      // Clerk users use Clerk token; only use partner token if not signed in via Clerk
      const token = employeeToken ?? (isSignedIn ? (await getToken()) : partnerToken);
      if (!token) throw new Error("Could not retrieve auth token.");

      const form = new FormData();
      form.append("file", file);

      const res = await fetchWithAuth("/v1/partner/policies/extract", token, {
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  const getStatusIcon = () => {
    if (!job) return null;
    switch (job.status) {
      case "queued":
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-slate-100">
            <Clock3 className="h-5 w-5 text-slate-500" />
          </div>
        );
      case "running":
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-blue-100">
            <Loader2 className="h-5 w-5 animate-spin text-[#0B5CAD]" />
          </div>
        );
      case "done":
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-blue-100">
            <CheckCircle2 className="h-5 w-5 text-[#0B5CAD]" />
          </div>
        );
      case "failed":
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-red-100">
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
        );
    }
  };

  const getStatusLabel = () => {
    if (!job) return null;
    const labels: Record<string, { text: string; color: string }> = {
      queued: { text: "Queued", color: "bg-slate-100 text-slate-700" },
      running: { text: "Processing", color: "bg-blue-100 text-blue-700" },
      done: { text: "Completed", color: "bg-blue-100 text-blue-700" },
      failed: { text: "Failed", color: "bg-red-100 text-red-700" },
    };
    const { text, color } = labels[job.status] || labels.queued;
    return <span className={`rounded-sm px-2.5 py-1 text-xs font-medium ${color}`}>{text}</span>;
  };

  if (!partnerReady || !employeeReady) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto p-6">
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
        <div className="max-w-3xl mx-auto p-6">
          <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-heading">Please sign in</h2>
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
          <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-heading">Access pending</h2>
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
        <div className="mb-8 rounded-sm border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-blue-100/40 p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-sm bg-[#0B5CAD] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                <FileText className="h-3.5 w-3.5" />
                {role === "partner" ? "Partner Console" : "Admin Console"}
              </span>
              <h1 className="mt-4 text-3xl font-semibold text-heading">Upload Policy</h1>
              <p className="mt-2 text-sm text-slate-600">
                Upload a PDF document to extract policy details using AI.
              </p>
            </div>
            <Link
              href="/policies"
              className="inline-flex items-center gap-2 rounded-sm bg-[#0B5CAD] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-[#0A4F95] transition-colors"
            >
              View policies
              <ShieldCheck className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Upload Form */}
        <form onSubmit={onSubmit} className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
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
                className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed border-slate-200 transition-colors hover:border-blue-400 hover:bg-blue-50/50"
              >
                {file ? (
                  <>
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-sm bg-blue-100">
                      <FileText className="h-6 w-6 text-[#0B5CAD]" />
                    </div>
                    <span className="text-sm font-medium text-heading">{file.name}</span>
                    <span className="mt-1 text-xs text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </>
                ) : (
                  <>
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-sm bg-slate-100">
                      <UploadCloud className="h-6 w-6 text-slate-500" />
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
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-[#0B5CAD] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0A4F95] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Start Extraction
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 flex items-start gap-3 rounded-sm border border-red-100 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </form>

        {/* Job Status */}
        {extractResp && (
          <div className="mt-6 rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              {getStatusIcon()}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-semibold text-heading">Extraction Job</h2>
                  {getStatusLabel()}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-slate-400">Job:</span>
                    <code className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700">{extractResp.job_id.slice(0, 8)}...</code>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-slate-400">Policy:</span>
                    <code className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700">{extractResp.policy_id.slice(0, 8)}...</code>
                  </div>
                </div>

                {job?.error && (
                  <div className="mt-3 rounded-sm border border-red-100 bg-red-50 p-3">
                    <p className="text-sm text-red-700">{job.error}</p>
                  </div>
                )}

                {job?.status === "done" && (
                  <div className="mt-4">
                    <Link
                      href={`/policies/${extractResp.policy_id}`}
                      className="inline-flex items-center gap-2 rounded-sm bg-[#0B5CAD] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0A4F95]"
                    >
                      <Eye className="h-4 w-4" />
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
        <div className="mt-8 rounded-sm border border-blue-100 bg-gradient-to-br from-[#F8FBFF] to-[#EEF5FF] p-5">
          <h3 className="mb-2 text-sm font-semibold text-heading">Supported Documents</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#0B5CAD]" />
              Motor Insurance Policies (Private Car, Two-Wheeler)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#0B5CAD]" />
              Health Insurance Policies
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#0B5CAD]" />
              PDF format only (max 20MB)
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
