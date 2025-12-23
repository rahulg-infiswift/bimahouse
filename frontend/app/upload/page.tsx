// frontend/app/upload/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

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

  async function pollJob(token: string, jobId: string) {
    // Poll until done/failed (simple Phase-1 polling)
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

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Upload Policy</h1>
        <Link className="text-sm text-gray-600 hover:text-gray-900" href="/policies">
          View policies →
        </Link>
      </div>

      <form onSubmit={onSubmit} className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-gray-700">
          Policy PDF
        </label>

        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-2 block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-gray-200"
        />

        <button
          type="submit"
          disabled={busy}
          className="mt-5 inline-flex items-center rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? "Extracting…" : "Start extraction"}
        </button>

        {error ? (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        ) : null}
      </form>

      {extractResp ? (
        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-medium">Submitted</h2>
          <div className="mt-2 text-sm text-gray-700">
            <div>
              <span className="text-gray-500">Job ID:</span>{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5">{extractResp.job_id}</code>
            </div>
            <div className="mt-1">
              <span className="text-gray-500">Policy ID:</span>{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5">{extractResp.policy_id}</code>
            </div>
          </div>

          {job ? (
            <div className="mt-4 text-sm">
              <div>
                <span className="text-gray-500">Status:</span>{" "}
                <span className="font-medium">{job.status}</span>
              </div>
              {job.error ? (
                <div className="mt-1 text-red-600">
                  <span className="text-gray-500">Error:</span> {job.error}
                </div>
              ) : null}
              {job.status === "done" ? (
                <div className="mt-4">
                  <Link
                    className="inline-flex items-center rounded-full bg-[#6c47ff] px-4 py-2 text-sm font-medium text-white"
                    href="/policies"
                  >
                    Go to Policies
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
