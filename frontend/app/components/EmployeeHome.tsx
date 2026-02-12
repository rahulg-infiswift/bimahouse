"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import {
  ArrowRight,
  Briefcase,
  ClipboardList,
  FileText,
  ShieldCheck,
  ShieldUser,
  Users,
} from "lucide-react";
import { UserRole, isAdminRole } from "../lib/roles";
import { useEmployeeSession } from "../lib/use-employee-session";

interface EmployeeHomeProps {
  role: UserRole | null;
}

function getRoleDisplayName(role: UserRole | null): string {
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
  const { user } = useUser();
  const { employeeInfo } = useEmployeeSession();

  const employeeName = employeeInfo?.full_name?.trim();
  const firstName = employeeName || user?.firstName || "Team Member";
  const effectiveRole = role ?? ((employeeInfo?.role as UserRole | undefined) ?? null);
  const showAdminLink = isAdminRole(effectiveRole);

  return (
    <div className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-sm border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-blue-100/30 p-8 shadow-sm">
          <span className="inline-flex items-center gap-2 rounded-sm bg-[#0B5CAD] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
            <ShieldUser className="h-3.5 w-3.5" />
            Employee Workspace
          </span>
          <h1 className="mt-4 text-3xl font-semibold text-[#0B1F3B]">
            Welcome back, <span className="text-[#0B5CAD]">{firstName}</span>
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
                <h3 className="text-base font-semibold text-[#0B1F3B]">Partner Leads</h3>
                <p className="mt-1 text-sm text-slate-600">Review submitted POSP applications.</p>
                <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#0B5CAD]">
                  Open workspace
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
                <h3 className="text-base font-semibold text-[#0B1F3B]">Policy Library</h3>
                <p className="mt-1 text-sm text-slate-600">Browse and access uploaded policy files.</p>
                <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#0B5CAD]">
                  View policies
                  <ArrowRight className="h-3.5 w-3.5" />
                </p>
              </div>
            </div>
          </Link>

          {showAdminLink ? (
            <Link
              href="/admin"
              className="group rounded-sm border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-blue-50 text-[#0B5CAD]">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-[#0B1F3B]">Manage Users</h3>
                  <p className="mt-1 text-sm text-slate-600">Configure customer access and roles.</p>
                  <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#0B5CAD]">
                    Open admin
                    <ArrowRight className="h-3.5 w-3.5" />
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-blue-50 text-[#0B5CAD]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#0B1F3B]">Secure Access</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Your dashboard permissions are based on your employee role.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Leads</span>
              <Briefcase className="h-4 w-4 text-[#0B5CAD]" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#0B1F3B]">—</p>
          </div>
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">In Review</span>
              <ClipboardList className="h-4 w-4 text-[#0B5CAD]" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#0B1F3B]">—</p>
          </div>
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Approved</span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#0B1F3B]">—</p>
          </div>
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Policies Processed</span>
              <FileText className="h-4 w-4 text-[#0B5CAD]" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#0B1F3B]">—</p>
          </div>
        </section>

        <section className="mt-8 rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0B1F3B]">Recent Activity</h2>
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
