"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { usePartnerSession } from "../lib/use-partner-session";
import { clearPartnerToken } from "../lib/partner-auth";
import { useRouter } from "next/navigation";

function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-[14px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors whitespace-nowrap"
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className="min-w-0 truncate">{label}</span>
    </Link>
  );
}

function IconLink({ href, icon }: { href: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100"
    >
      {icon}
    </Link>
  );
}

// Desktop nav links for partner session (OTP login)
export function PartnerDesktopNav() {
  const { partnerToken, partnerReady } = usePartnerSession();
  const { isSignedIn } = useUser();

  // Don't show if not ready, no partner token, or if Clerk user is signed in (server handles that)
  if (!partnerReady || !partnerToken || isSignedIn) return null;

  return (
    <>
      <NavLink
        href="/policies"
        label="My Policies"
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      />
      <NavLink
        href="/upload"
        label="Upload Policy"
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3v11.25" />
          </svg>
        }
      />
      <NavLink
        href="/support"
        label="Support"
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3l2 5-2 1a11 11 0 005 5l1-2 5 2v3a2 2 0 01-2 2 16 16 0 01-14-14z" />
          </svg>
        }
      />
    </>
  );
}

// Mobile nav icons for partner session (OTP login)
export function PartnerMobileNav() {
  const { partnerToken, partnerReady } = usePartnerSession();
  const { isSignedIn } = useUser();

  // Don't show if not ready, no partner token, or if Clerk user is signed in (server handles that)
  if (!partnerReady || !partnerToken || isSignedIn) return null;

  return (
    <nav className="flex items-center gap-1 xl:hidden">
      <IconLink
        href="/policies"
        icon={
          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      />
      <IconLink
        href="/upload"
        icon={
          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3v11.25" />
          </svg>
        }
      />
    </nav>
  );
}

// Partner user button (logout for OTP users)
export function PartnerUserButton() {
  const { partnerToken, partnerInfo, partnerReady } = usePartnerSession();
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Don't show if not ready, no partner token, or if Clerk user is signed in
  if (!partnerReady || !partnerToken || isSignedIn) return null;

  const handleLogout = () => {
    setIsOpen(false);
    clearPartnerToken();
    router.push("/");
  };

  // Get initials from name
  const initials = partnerInfo?.full_name
    ? partnerInfo.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "P";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-semibold ring-2 ring-slate-100 ring-offset-2 hover:bg-emerald-700 transition-colors"
        title={partnerInfo?.full_name || "Partner"}
      >
        {initials}
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-slate-200 bg-white py-2 shadow-lg z-50">
          {partnerInfo?.full_name && (
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-900 truncate">{partnerInfo.full_name}</p>
              {partnerInfo.email && (
                <p className="text-xs text-slate-500 truncate">{partnerInfo.email}</p>
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
