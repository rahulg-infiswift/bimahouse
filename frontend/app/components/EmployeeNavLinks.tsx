"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearEmployeeToken } from "../lib/employee-auth";
import { useEmployeeSession } from "../lib/use-employee-session";
import { isAdminRole, UserRole } from "../lib/roles";
import { FileText, LogOut, ShieldUser, Users, UsersRound } from "lucide-react";

function EmployeeLink({ href, label, exact = false }: { href: string; label: string; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-sm px-3 py-2 text-[13px] font-semibold transition-colors ${
        active
          ? "bg-[#E8F0FE] text-[#0B1F3B]"
          : "text-slate-700 hover:bg-[#F0F5FF] hover:text-[#0B1F3B]"
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
          <EmployeeLink href="/admin" label="Manage Users" exact />
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
      <Link href="/policies" className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-slate-700 hover:bg-[#F0F5FF] hover:text-[#0B1F3B]">
        <FileText className="h-5 w-5" />
      </Link>
      <Link href="/leads" className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-slate-700 hover:bg-[#F0F5FF] hover:text-[#0B1F3B]">
        <Users className="h-5 w-5" />
      </Link>
      {isAdminRole((employeeInfo?.role as UserRole | undefined) ?? null) && (
        <>
          <Link href="/admin" className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-slate-700 hover:bg-[#F0F5FF] hover:text-[#0B1F3B]">
            <ShieldUser className="h-5 w-5" />
          </Link>
          <Link href="/admin/employees" className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-slate-700 hover:bg-[#F0F5FF] hover:text-[#0B1F3B]">
            <UsersRound className="h-5 w-5" />
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

  const source = employeeInfo?.full_name || employeeInfo?.primary_email || employeeInfo?.role || "Employee";
  const initials = source
    .split(/[\s._@-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const title = employeeInfo?.full_name || employeeInfo?.primary_email || "Employee";

  return (
    <button
      type="button"
      onClick={() => {
        clearEmployeeToken();
        router.push("/");
      }}
      className="inline-flex items-center gap-2 rounded-sm border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#0B1F3B] hover:bg-[#F5F9FF]"
      title="Logout employee session"
    >
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-[#0B1F3B] text-[10px] font-bold text-white"
        title={title}
      >
        {initials || "E"}
      </span>
      <span className="inline-flex items-center gap-1 rounded-sm bg-[#E8F0FE] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#0B1F3B]"><LogOut className="h-3 w-3" />Logout</span>
    </button>
  );
}
