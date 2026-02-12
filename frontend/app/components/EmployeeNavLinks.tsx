"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearEmployeeToken } from "../lib/employee-auth";
import { useEmployeeSession } from "../lib/use-employee-session";
import { isAdminRole, UserRole } from "../lib/roles";

function EmployeeLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-slate-900 text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {label}
    </Link>
  );
}

export function EmployeeDesktopNav() {
  const { employeeToken, employeeInfo, employeeReady } = useEmployeeSession();

  if (!employeeReady || !employeeToken) return null;

  return (
    <>
      <EmployeeLink href="/policies" label="All Policies" />
      <EmployeeLink href="/leads" label="Manage Partner Leads" />
      {isAdminRole((employeeInfo?.role as UserRole | undefined) ?? null) && (
        <>
          <EmployeeLink href="/admin" label="Manage Users" />
          <EmployeeLink href="/admin/employees" label="Manage Employees" />
        </>
      )}
    </>
  );
}

export function EmployeeMobileNav() {
  const { employeeToken, employeeInfo, employeeReady } = useEmployeeSession();

  if (!employeeReady || !employeeToken) return null;

  return (
    <nav className="flex items-center gap-1 xl:hidden">
      <Link href="/policies" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </Link>
      <Link href="/leads" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M5 7h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2zm4 6h4m-4-3h4" />
        </svg>
      </Link>
      {isAdminRole((employeeInfo?.role as UserRole | undefined) ?? null) && (
        <>
          <Link href="/admin" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </Link>
          <Link href="/admin/employees" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M17 20H9m8 0v-2c0-.656-.126-1.283-.356-1.857M9 20v-2c0-.656.126-1.283.356-1.857M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </>
      )}
    </nav>
  );
}

export function EmployeeUserButton() {
  const router = useRouter();
  const { employeeToken, employeeInfo, employeeReady } = useEmployeeSession();

  if (!employeeReady || !employeeToken) return null;

  const label = employeeInfo?.primary_email || employeeInfo?.role || "Employee";

  return (
    <button
      type="button"
      onClick={() => {
        clearEmployeeToken();
        router.push("/");
      }}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
      title="Logout employee session"
    >
      <span className="max-w-[140px] truncate">{label}</span>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">Logout</span>
    </button>
  );
}
