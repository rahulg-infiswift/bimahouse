"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { canAccessPolicies, fetchUserRole, UserRole } from "../lib/roles";

const SUPPORT_EMAIL = "support@bimahouse.com";

type SupportForm = {
  topic: "policy" | "payment" | "account" | "other";
  policyId: string;
  subject: string;
  message: string;
};

export default function SupportPage() {
  const { getToken, isSignedIn } = useAuth();
  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
    []
  );

  const [role, setRole] = useState<UserRole | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [form, setForm] = useState<SupportForm>({
    topic: "policy",
    policyId: "",
    subject: "",
    message: "",
  });
  const [error, setError] = useState<string>("");

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
      if (!active) return;
      setRole(nextRole);
      try {
        const res = await fetch(`${apiBase}/v1/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as { primary_email?: string };
          setUserEmail(data.primary_email ?? "");
        }
      } catch {
        // ignore
      }
    }
    void loadRole();
    return () => {
      active = false;
    };
  }, [apiBase, getToken, isSignedIn]);

  function buildMailtoLink() {
    const subject = form.subject.trim() || "Support request";
    const messageLines = [
      userEmail ? `User Email: ${userEmail}` : null,
      role ? `User Role: ${role}` : null,
      `Topic: ${form.topic}`,
      form.policyId ? `Policy ID: ${form.policyId}` : null,
      "",
      form.message.trim(),
    ].filter(Boolean) as string[];

    const body = messageLines.join("\n");
    const params = new URLSearchParams({
      subject,
      body,
    });
    return `mailto:${SUPPORT_EMAIL}?${params.toString()}`;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.subject.trim()) {
      setError("Please add a short subject for the issue.");
      return;
    }
    if (!form.message.trim()) {
      setError("Please describe the issue before submitting.");
      return;
    }

    const mailto = buildMailtoLink();
    window.location.href = mailto;
  }

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Please sign in</h2>
            <p className="text-sm text-slate-600">Sign in to contact support.</p>
          </div>
        </div>
      </main>
    );
  }

  if (role && !canAccessPolicies(role)) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Access pending</h2>
            <p className="text-sm text-slate-600">Your account does not have access to support yet.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-8 shadow-sm mb-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white shadow-sm">
              Support
            </span>
            <h1 className="mt-4 text-3xl font-semibold text-slate-900">Partner Support</h1>
            <p className="mt-2 text-sm text-slate-600">
              Raise an issue about policy uploads, payments, or account access. Our team will respond quickly.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Issue type</span>
              <select
                value={form.topic}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, topic: e.target.value as SupportForm["topic"] }))
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="policy">Policy</option>
                <option value="payment">Payment</option>
                <option value="account">Account</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Policy ID (optional)</span>
              <input
                value={form.policyId}
                onChange={(e) => setForm((prev) => ({ ...prev, policyId: e.target.value }))}
                placeholder="BHP-0001 or policy UUID"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
          </div>

          <label className="mt-6 block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</span>
            <input
              value={form.subject}
              onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
              placeholder="Short summary of the issue"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="mt-6 block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Details</span>
            <textarea
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              placeholder="Please include as much detail as possible."
              rows={6}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              This will open your email client to send a message to {SUPPORT_EMAIL}.
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition-colors"
            >
              Send Support Email
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
