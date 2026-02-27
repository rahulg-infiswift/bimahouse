"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { usePartnerSession } from "../lib/use-partner-session";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bike,
  Briefcase,
  Car,
  Clock3,
  FileText,
  Handshake,
  Headset,
  HeartPulse,
  Home,
  Plane,
  RefreshCw,
  Store,
  Building2,
  Upload,
} from "lucide-react";

type PartnerPolicyItem = {
  policy_id: string;
  original_filename: string;
  created_at: string;
  has_extracted_json: boolean;
};

type InsuranceLine = "car" | "bike";

type QuoteForm = {
  registrationNo: string;
  mobile: string;
  email: string;
  agreeTerms: boolean;
  agreeWhatsApp: boolean;
};

const INSURANCE_LINES = [
  { key: "car", label: "Car", icon: Car, enabled: true },
  { key: "bike", label: "Bike", icon: Bike, enabled: true },
  { key: "health", label: "Health", icon: HeartPulse, enabled: false },
  { key: "travel", label: "Travel", icon: Plane, enabled: false },
  { key: "home", label: "Home", icon: Home, enabled: false },
  { key: "sme", label: "SME", icon: Store, enabled: false },
  { key: "corporate", label: "Corporate", icon: Building2, enabled: false },
  { key: "renewal", label: "Renewal", icon: RefreshCw, enabled: false },
] as const;

export default function PartnerHome() {
  const router = useRouter();
  const { user } = useUser();
  const { partnerInfo, partnerToken } = usePartnerSession();
  const [totalPolicies, setTotalPolicies] = useState<number | null>(null);
  const [recentPolicies, setRecentPolicies] = useState<PartnerPolicyItem[]>([]);
  const [activeLine, setActiveLine] = useState<InsuranceLine>("car");
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState<QuoteForm>({
    registrationNo: "",
    mobile: "",
    email: "",
    agreeTerms: true,
    agreeWhatsApp: true,
  });

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
    []
  );

  const displayName = partnerInfo?.full_name?.trim() || user?.fullName || user?.firstName || "Partner";

  useEffect(() => {
    let active = true;
    async function loadPartnerPolicyCount() {
      if (!partnerToken) {
        if (active) setTotalPolicies(0);
        return;
      }
      try {
        const res = await fetch(`${apiBase}/v1/partner/policies`, {
          headers: { Authorization: `Bearer ${partnerToken}` },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load policy count.");
        const data = (await res.json()) as { items?: PartnerPolicyItem[] };
        const items = Array.isArray(data.items) ? data.items : [];
        if (active) {
          setTotalPolicies(items.length);
          setRecentPolicies(items.slice(0, 5));
        }
      } catch {
        if (active) {
          setTotalPolicies(0);
          setRecentPolicies([]);
        }
      }
    }
    void loadPartnerPolicyCount();
    return () => {
      active = false;
    };
  }, [apiBase, partnerToken]);

  const registrationLabel = activeLine === "car" ? "Car registration no." : "Bike registration no.";

  const onQuoteSubmit = (e: FormEvent) => {
    e.preventDefault();
    setQuoteError(null);

    const registrationNo = quoteForm.registrationNo.trim().toUpperCase();
    const mobile = quoteForm.mobile.trim();
    const email = quoteForm.email.trim();

    if (!registrationNo) {
      setQuoteError("Enter registration number.");
      return;
    }
    if (!/^\d{10}$/.test(mobile)) {
      setQuoteError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setQuoteError("Enter a valid email address.");
      return;
    }
    if (!quoteForm.agreeTerms) {
      setQuoteError("Accept terms and conditions to continue.");
      return;
    }

    const params = new URLSearchParams({
      line: activeLine,
      reg: registrationNo,
      mobile,
      email,
    });
    router.push(`/partner/quotes?${params.toString()}`);
  };

  return (
    <div className="px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-sm border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-blue-100/30 p-8 shadow-sm">
          <div>
            <span className="inline-flex items-center gap-2 rounded-sm bg-[#0B5CAD] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
              <Handshake className="h-3.5 w-3.5" />
              Partner Console
            </span>
            <h1 className="mt-4 text-3xl font-semibold text-heading">
              Welcome back, <span className="text-[#0B5CAD]">{displayName}</span>
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Track policies, upload new documents, and manage your partner operations.
            </p>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-3 py-3 sm:px-4">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {INSURANCE_LINES.map((line) => {
                const Icon = line.icon;
                const isActive = line.key === activeLine;
                return (
                  <button
                    key={line.key}
                    type="button"
                    onClick={() => line.enabled && setActiveLine(line.key as InsuranceLine)}
                    className={`rounded-xl border px-2 py-2 text-center transition ${
                      isActive
                        ? "border-[#0B5CAD] bg-blue-50 text-[#0B5CAD]"
                        : line.enabled
                          ? "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
                          : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
                    }`}
                  >
                    <Icon className="mx-auto h-5 w-5" />
                    <p className="mt-1 text-xs font-medium">{line.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={onQuoteSubmit} className="bg-slate-50 px-4 py-5 sm:px-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{registrationLabel}</span>
                <input
                  type="text"
                  value={quoteForm.registrationNo}
                  onChange={(e) =>
                    setQuoteForm((prev) => ({ ...prev, registrationNo: e.target.value.toUpperCase() }))
                  }
                  placeholder="E.g. MH01DF5698"
                  className="mt-2 w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B5CAD] focus:outline-none focus:ring-0"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Mobile number</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={quoteForm.mobile}
                  onChange={(e) =>
                    setQuoteForm((prev) => ({ ...prev, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))
                  }
                  placeholder="Enter mobile no."
                  className="mt-2 w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B5CAD] focus:outline-none focus:ring-0"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  value={quoteForm.email}
                  onChange={(e) => setQuoteForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                  className="mt-2 w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B5CAD] focus:outline-none focus:ring-0"
                />
              </label>

              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  className="rounded-full bg-[#0B5CAD] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#0A4F95]"
                >
                  Get quote
                </button>
                <Link href="/partner/quotes" className="text-center text-sm font-medium text-[#0B5CAD] underline">
                  Recent Quote
                </Link>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={quoteForm.agreeTerms}
                  onChange={(e) => setQuoteForm((prev) => ({ ...prev, agreeTerms: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-[#0B5CAD] focus:ring-blue-500"
                />
                I agree to the terms & conditions
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={quoteForm.agreeWhatsApp}
                  onChange={(e) => setQuoteForm((prev) => ({ ...prev, agreeWhatsApp: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-[#0B5CAD] focus:ring-blue-500"
                />
                I want quote and policy details on WhatsApp
              </label>
            </div>

            {quoteError && <p className="mt-3 text-sm font-medium text-rose-600">{quoteError}</p>}
          </form>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/policies"
            className="group rounded-sm border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-blue-50 text-[#0B5CAD]">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-heading">My Policies</h3>
                <p className="mt-1 text-sm text-slate-600">Review all uploaded policies and statuses.</p>
                <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#0B5CAD]">
                  View policies
                  <ArrowRight className="h-3.5 w-3.5" />
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/upload"
            className="group rounded-sm border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-blue-50 text-[#0B5CAD]">
                <Upload className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-heading">Upload Policy</h3>
                <p className="mt-1 text-sm text-slate-600">Add a new customer policy document.</p>
                <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#0B5CAD]">
                  Start upload
                  <ArrowRight className="h-3.5 w-3.5" />
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/support"
            className="group rounded-sm border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-blue-50 text-[#0B5CAD]">
                <Headset className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-heading">Support</h3>
                <p className="mt-1 text-sm text-slate-600">Connect with the Bima House team for help.</p>
                <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#0B5CAD]">
                  Open support
                  <ArrowRight className="h-3.5 w-3.5" />
                </p>
              </div>
            </div>
          </Link>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Policies</span>
              <FileText className="h-4 w-4 text-[#0B5CAD]" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#0B5CAD]">{totalPolicies ?? "..."}</p>
          </div>
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customers Served</span>
              <Briefcase className="h-4 w-4 text-[#0B5CAD]" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#0B5CAD]">0</p>
          </div>
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Monthly Commission</span>
              <Handshake className="h-4 w-4 text-[#0B5CAD]" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#0B5CAD]">₹0</p>
          </div>
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Premium Generated</span>
              <Upload className="h-4 w-4 text-[#0B5CAD]" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#0B5CAD]">₹0</p>
          </div>
        </section>

        <section className="mt-8 rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-heading">Recent Activity</h2>
            <Link href="/policies" className="text-sm font-medium text-[#0B5CAD] hover:text-[#0A4F95]">
              View all
            </Link>
          </div>
          {recentPolicies.length === 0 ? (
            <div className="mt-6 rounded-sm border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-700">No recent activity yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Upload your first policy to start tracking your partner activity.
              </p>
            </div>
          ) : (
            <div className="mt-6 divide-y divide-slate-100 rounded-sm border border-slate-200">
              {recentPolicies.map((policy) => (
                <Link
                  key={policy.policy_id}
                  href={`/policies/${policy.policy_id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-blue-50/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-heading">{policy.original_filename}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                      <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                      {new Date(policy.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-sm px-2.5 py-1 text-xs font-medium ${
                      policy.has_extracted_json
                        ? "border border-[#BFDBFE] bg-[#EFF6FF] text-[#0B5CAD]"
                        : "border border-[#DBEAFE] bg-white text-[#0B5CAD]"
                    }`}
                  >
                    {policy.has_extracted_json ? "Extracted" : "Pending"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
