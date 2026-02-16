"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { clearEmployeeToken } from "../lib/employee-auth";
import { useEmployeeSession } from "../lib/use-employee-session";
import { isAdminRole, SessionRole } from "../lib/roles";
import { FileText, Home, LogOut, ShieldUser, Users, UserRound } from "lucide-react";
import { NavLink, MobileNavLink } from "./NavLink";

export function EmployeeDesktopNav() {
  const { isSignedIn } = useUser();
  const { employeeToken, employeeInfo, employeeReady } = useEmployeeSession();

  if (!employeeReady || !employeeToken || isSignedIn) return null;

  return (
    <>
      <NavLink href="/" label="Home" icon={<Home className="h-4 w-4" />} />
      <NavLink href="/policies" label="All Policies" icon={<FileText className="h-4 w-4" />} />
      <NavLink href="/leads" label="Manage Partner Leads" icon={<Users className="h-4 w-4" />} />
      {isAdminRole((employeeInfo?.role as SessionRole | undefined) ?? null) && (
        <>
      <NavLink href="/admin" label="Manage Users" icon={<ShieldUser className="h-4 w-4" />} exact />
      <NavLink href="/admin/employees" label="Manage Employees" icon={<UserRound className="h-4 w-4" />} />
        </>
      )}
    </>
  );
}

export function EmployeeMobileNav() {
  const { isSignedIn } = useUser();
  const { employeeToken, employeeInfo, employeeReady } = useEmployeeSession();

  if (!employeeReady || !employeeToken || isSignedIn) return null;

  return (
    <nav className="flex items-center gap-1 xl:hidden">
      <MobileNavLink href="/" icon={<Home className="h-5 w-5" />} />
      <MobileNavLink href="/policies" icon={<FileText className="h-5 w-5" />} />
      <MobileNavLink href="/leads" icon={<Users className="h-5 w-5" />} />
      {isAdminRole((employeeInfo?.role as SessionRole | undefined) ?? null) && (
        <>
      <MobileNavLink href="/admin" icon={<ShieldUser className="h-5 w-5" />} exact />
      <MobileNavLink href="/admin/employees" icon={<UserRound className="h-5 w-5" />} />
        </>
      )}
    </nav>
  );
}

export function EmployeeUserButton() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const { employeeToken, employeeInfo, employeeReady } = useEmployeeSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!employeeReady || !employeeToken || isSignedIn) return null;

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
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex h-8 min-w-8 items-center justify-center rounded-sm bg-[#0B1F3B] px-2 text-xs font-semibold text-white hover:bg-[#142B4D] transition-colors"
        title={title}
      >
        {initials || "E"}
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-sm border border-slate-200 bg-white py-2 shadow-lg z-50">
          <div className="px-4 py-2 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-900 truncate">{employeeInfo?.full_name || "Employee"}</p>
            {employeeInfo?.primary_email && (
              <p className="text-xs text-slate-500 truncate">{employeeInfo.primary_email}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              clearEmployeeToken();
              router.push("/");
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-600 hover:bg-[#F5F9FF]"
            title="Logout employee session"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
