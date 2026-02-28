"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { usePartnerSession } from "../lib/use-partner-session";
import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Clock3,
  FileText,
  Handshake,
  TrendingUp,
} from "lucide-react";
import GetQuoteCard from "./GetQuoteCard";

type PartnerPolicyItem = {
  policy_id: string;
  original_filename: string;
  created_at: string;
  has_extracted_json: boolean;
};

export default function PartnerHome() {
  const { user } = useUser();
  const { partnerInfo, partnerToken } = usePartnerSession();
  const [totalPolicies, setTotalPolicies] = useState<number | null>(null);
  const [recentPolicies, setRecentPolicies] = useState<PartnerPolicyItem[]>([]);

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

  return (
    <div className="px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-sm border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-blue-100/30 p-8 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
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
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                href="/upload"
                className="inline-flex items-center justify-center rounded-sm border border-[#0B5CAD] bg-[#0B5CAD] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0A4F95]"
              >
                Upload Policy
              </Link>
              <Link
                href="/policies"
                className="inline-flex items-center justify-center rounded-sm border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-[#0B5CAD] hover:text-[#0B5CAD]"
              >
                View Policies
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-8">
          <GetQuoteCard quotesPath="/partner/quotes" />
        </div>

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
            <p className="mt-3 text-2xl font-semibold text-[#0B5CAD]">&ndash;</p>
          </div>
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Monthly Commission</span>
              <Handshake className="h-4 w-4 text-[#0B5CAD]" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#0B5CAD]">&ndash;</p>
          </div>
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Premium Generated</span>
              <TrendingUp className="h-4 w-4 text-[#0B5CAD]" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#0B5CAD]">&ndash;</p>
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
              <Link
                href="/upload"
                className="mt-4 inline-flex items-center justify-center rounded-sm border border-[#0B5CAD] bg-[#0B5CAD] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0A4F95]"
              >
                Upload Policy
              </Link>
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
