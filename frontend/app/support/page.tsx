"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { AlertCircle, Headset, Mail, MessageSquareText, Send, ShieldCheck } from "lucide-react";
import { canAccessPolicies, fetchUserRole, UserRole } from "../lib/roles";
import { usePartnerSession } from "../lib/use-partner-session";

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
  const { partnerToken, partnerReady } = usePartnerSession();
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
        return;
      }
      // Only use partner token if not signed in via Clerk
      if (partnerToken) {
        if (active) setRole("partner");
        setUserEmail("");
        return;
      }
    }
    void loadRole();
    return () => {
      active = false;
    };
  }, [apiBase, getToken, isSignedIn, partnerToken, partnerReady]);

  if (!partnerReady) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">Loading session...</p>
          </div>
        </div>
      </main>
    );
  }

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

  if (!isSignedIn && !partnerToken) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-[#0B1F3B]">Please sign in</h2>
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
          <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-[#0B1F3B]">Access pending</h2>
            <p className="text-sm text-slate-600">Your account does not have access to support yet.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 rounded-sm border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-blue-100/40 p-8 shadow-sm">
          <div>
            <span className="inline-flex items-center gap-2 rounded-sm bg-[#0B5CAD] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
              <Headset className="h-3.5 w-3.5" />
              Support
            </span>
            <h1 className="mt-4 text-3xl font-semibold text-[#0B1F3B]">Partner Support</h1>
            <p className="mt-2 text-sm text-slate-600">
              Raise an issue about policy uploads, payments, or account access. Our team will respond quickly.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-[#0B5CAD]" />
                Issue type
              </span>
              <select
                value={form.topic}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, topic: e.target.value as SupportForm["topic"] }))
                }
                className="mt-2 w-full rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                className="mt-2 w-full rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
          </div>

          <label className="mt-6 block">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <MessageSquareText className="h-3.5 w-3.5 text-[#0B5CAD]" />
              Subject
            </span>
            <input
              value={form.subject}
              onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
              placeholder="Short summary of the issue"
              className="mt-2 w-full rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="mt-6 block">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <MessageSquareText className="h-3.5 w-3.5 text-[#0B5CAD]" />
              Details
            </span>
            <textarea
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              placeholder="Please include as much detail as possible."
              rows={6}
              className="mt-2 w-full rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-sm border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Mail className="h-3.5 w-3.5" />
              This will open your email client to send a message to {SUPPORT_EMAIL}.
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-sm bg-[#0B5CAD] px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-[#0A4F95] transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              Send Support Email
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
