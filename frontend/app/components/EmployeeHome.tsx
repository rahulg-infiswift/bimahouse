"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { UserRole, isAdminRole } from "../lib/roles";

interface EmployeeHomeProps {
  role: UserRole | null;
}

export default function EmployeeHome({ role }: EmployeeHomeProps) {
  const { user } = useUser();
  const firstName = user?.firstName || "Team Member";
  const showAdminLink = isAdminRole(role);

  // Format role for display
  const getRoleDisplayName = (role: UserRole | null) => {
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
  };

  return (
    <div className="py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Personalized Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Welcome back, <span className="text-indigo-600">{firstName}</span>!
          </h1>
          <p className="text-slate-600 mt-1">
            {getRoleDisplayName(role)} Dashboard
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          <Link href="/leads" className="group rounded-xl border border-slate-200 bg-white p-6 hover:shadow-lg hover:border-indigo-300 transition-all">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Partner Leads</h3>
                <p className="text-sm text-indigo-600 font-medium">Review Applications →</p>
              </div>
            </div>
          </Link>

          {showAdminLink && (
            <Link href="/admin" className="group rounded-xl border border-slate-200 bg-white p-6 hover:shadow-lg hover:border-violet-300 transition-all">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">User Management</h3>
                  <p className="text-sm text-violet-600 font-medium">Manage Roles →</p>
                </div>
              </div>
            </Link>
          )}

          <Link href="/policies" className="group rounded-xl border border-slate-200 bg-white p-6 hover:shadow-lg hover:border-sky-300 transition-all">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-sky-100 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">All Policies</h3>
                <p className="text-sm text-sky-600 font-medium">Browse Uploads →</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Stats Overview */}
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">Active</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">—</p>
            <p className="text-sm text-slate-500">Total Leads</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Pending</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">—</p>
            <p className="text-sm text-slate-500">Pending Review</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Approved</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">—</p>
            <p className="text-sm text-slate-500">Approved This Month</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-sky-600 bg-sky-50 px-2 py-1 rounded-full">Total</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">—</p>
            <p className="text-sm text-slate-500">Policies Processed</p>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
            <Link href="/leads" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              View All →
            </Link>
          </div>
          <div className="text-center py-8 text-slate-500">
            <svg className="h-12 w-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">No recent activity to show</p>
            <p className="text-xs text-slate-400 mt-1">Partner applications and policy uploads will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
