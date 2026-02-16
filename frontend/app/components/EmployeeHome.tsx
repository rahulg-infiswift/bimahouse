"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import {
  ArrowRight,
  Briefcase,
  ClipboardList,
  FileText,
  ShieldCheck,
  ShieldUser,
  UserRound,
  Users,
} from "lucide-react";
import { SessionRole, isAdminRole } from "../lib/roles";
import { useEmployeeSession } from "../lib/use-employee-session";
import { fetchWithEmployeeRefresh } from "../lib/auth-refresh";

interface EmployeeHomeProps {
  role: SessionRole | null;
}
type LeadSummary = {
  submitted: number;
  in_review: number;
  approved: number;
  rejected: number;
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function getRoleDisplayName(role: SessionRole | null): string {
  if (!role) return "Employee";
  const roleNames: Record<string, string> = {
    sales: "Sales Executive",
    arm_rm: "ARM / RM",
    manager: "Manager",
    area_manager: "Area Manager",
    zonal_head: "Zonal Head",
    admin: "Administrator",
  };
  return roleNames[role] || "Employee";
}

export default function EmployeeHome({ role }: EmployeeHomeProps) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { employeeInfo, employeeToken } = useEmployeeSession();
  const [summary, setSummary] = useState<LeadSummary>({
    submitted: 0,
    in_review: 0,
    approved: 0,
    rejected: 0,
  });

  const employeeName = employeeInfo?.full_name?.trim();
  const displayName = employeeName || user?.fullName || user?.firstName || "Team Member";
  const effectiveRole = role ?? ((employeeInfo?.role as SessionRole | undefined) ?? null);
  const showAdminLink = isAdminRole(effectiveRole);
  const counts = useMemo(() => {
    const totalLeads = summary.submitted + summary.in_review + summary.approved + summary.rejected;
    const processed = summary.approved + summary.rejected;
    return {
      totalLeads,
      inReview: summary.in_review,
      approved: summary.approved,
      processed,
    };
  }, [summary]);

  useEffect(() => {
    let cancelled = false;
    async function loadSummary() {
      try {
        const token = employeeToken ?? (await getToken());
        if (!token) return;
        const res = await fetchWithEmployeeRefresh(API, `${API}/v1/posp-applications/summary`, token, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as LeadSummary;
        if (!cancelled) setSummary(data);
      } catch {
        // Keep safe defaults in UI if summary endpoint is unavailable
      }
    }
    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, [employeeToken, getToken]);

  return (
    <div className="px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-sm border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-blue-100/30 p-8 shadow-sm">
          <span className="inline-flex items-center gap-2 rounded-sm bg-[#0B5CAD] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
            <ShieldUser className="h-3.5 w-3.5" />
            Admin Console
          </span>
          <h1 className="mt-4 text-3xl font-semibold text-heading">
            Welcome back, <span className="text-[#0B5CAD]">{displayName}</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600">{getRoleDisplayName(effectiveRole)} Dashboard</p>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/leads"
            className="group rounded-sm border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-blue-50 text-[#0B5CAD]">
                <Briefcase className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-heading">
                  {showAdminLink ? "Manage Partner Leads" : "Partner Leads"}
                </h3>
                <p className="mt-1 text-sm text-slate-600">Review submitted POSP applications.</p>
                <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#0B5CAD]">
                  View lead queue
                  <ArrowRight className="h-3.5 w-3.5" />
                </p>
              </div>
            </div>
          </Link>

          {showAdminLink ? (
            <>
              <Link
                href="/admin"
                className="group rounded-sm border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-blue-50 text-[#0B5CAD]">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-heading">Manage Users</h3>
                    <p className="mt-1 text-sm text-slate-600">Configure customer access and roles.</p>
                    <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#0B5CAD]">
                      Open user management
                      <ArrowRight className="h-3.5 w-3.5" />
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                href="/admin/employees"
                className="group rounded-sm border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-blue-50 text-[#0B5CAD]">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-heading">Manage Employees</h3>
                    <p className="mt-1 text-sm text-slate-600">Control employee access and internal roles.</p>
                    <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#0B5CAD]">
                      Open employee management
                      <ArrowRight className="h-3.5 w-3.5" />
                    </p>
                  </div>
                </div>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/policies"
                className="group rounded-sm border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-blue-50 text-[#0B5CAD]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-heading">Policy Library</h3>
                    <p className="mt-1 text-sm text-slate-600">Browse and access uploaded policy files.</p>
                    <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#0B5CAD]">
                      View policy library
                      <ArrowRight className="h-3.5 w-3.5" />
                    </p>
                  </div>
                </div>
              </Link>

              <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-blue-50 text-[#0B5CAD]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-heading">Secure Access</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Your dashboard permissions are based on your employee role.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Leads</span>
              <Briefcase className="h-4 w-4 text-[#0B5CAD]" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#0B5CAD]">{counts.totalLeads}</p>
          </div>
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">In Review</span>
              <ClipboardList className="h-4 w-4 text-[#0B5CAD]" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#0B5CAD]">{counts.inReview}</p>
          </div>
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Approved</span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#0B5CAD]">{counts.approved}</p>
          </div>
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Applications Processed</span>
              <FileText className="h-4 w-4 text-[#0B5CAD]" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#0B5CAD]">{counts.processed}</p>
          </div>
        </section>

        <section className="mt-8 rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-heading">Recent Activity</h2>
            <Link href="/leads" className="text-sm font-medium text-[#0B5CAD] hover:text-[#0A4F95]">
              View all
            </Link>
          </div>
          <div className="mt-6 rounded-sm border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
            <ClipboardList className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm font-medium text-slate-700">No recent activity to show</p>
            <p className="mt-1 text-xs text-slate-500">
              Partner applications and policy updates will appear here.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
