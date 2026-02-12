"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { usePartnerSession } from "../lib/use-partner-session";
import { clearPartnerToken } from "../lib/partner-auth";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  FileText,
  Handshake,
  Headset,
  LogOut,
  Upload,
} from "lucide-react";

export default function PartnerDashboard() {
  const { user } = useUser();
  const { partnerInfo, partnerToken } = usePartnerSession();
  const router = useRouter();

  const firstName = partnerInfo?.full_name?.split(" ")[0] || user?.firstName || "Partner";

  const handleLogout = () => {
    clearPartnerToken();
    router.push("/");
  };

  return (
    <div className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-sm border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-blue-100/30 p-8 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-sm bg-[#0B5CAD] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                <Handshake className="h-3.5 w-3.5" />
                Partner Workspace
              </span>
              <h1 className="mt-4 text-3xl font-semibold text-[#0B1F3B]">
                Welcome back, <span className="text-[#0B5CAD]">{firstName}</span>
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Track policies, upload new documents, and manage your partner operations.
              </p>
            </div>

            {partnerToken && (
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition-colors hover:bg-slate-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/upload"
            className="group rounded-sm border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-blue-50 text-[#0B5CAD]">
                <Upload className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[#0B1F3B]">Upload Policy</h3>
                <p className="mt-1 text-sm text-slate-600">Add a new customer policy document.</p>
                <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#0B5CAD]">
                  Start upload
                  <ArrowRight className="h-3.5 w-3.5" />
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/policies"
            className="group rounded-sm border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-blue-50 text-[#0B5CAD]">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[#0B1F3B]">My Policies</h3>
                <p className="mt-1 text-sm text-slate-600">Review all uploaded policies and statuses.</p>
                <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#0B5CAD]">
                  View policies
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
                <h3 className="text-base font-semibold text-[#0B1F3B]">Support</h3>
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
            <p className="mt-3 text-2xl font-semibold text-[#0B1F3B]">0</p>
          </div>
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customers Served</span>
              <Briefcase className="h-4 w-4 text-[#0B5CAD]" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#0B1F3B]">0</p>
          </div>
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Monthly Commission</span>
              <Handshake className="h-4 w-4 text-[#0B5CAD]" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#0B1F3B]">₹0</p>
          </div>
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Premium Generated</span>
              <Upload className="h-4 w-4 text-[#0B5CAD]" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#0B1F3B]">₹0</p>
          </div>
        </section>

        <section className="mt-8 rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0B1F3B]">Recent Activity</h2>
            <Link href="/policies" className="text-sm font-medium text-[#0B5CAD] hover:text-[#0A4F95]">
              View all
            </Link>
          </div>
          <div className="mt-6 rounded-sm border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm font-medium text-slate-700">No recent activity yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Upload your first policy to start tracking your partner activity.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
