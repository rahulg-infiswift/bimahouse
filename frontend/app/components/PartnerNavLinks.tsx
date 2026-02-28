"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { usePartnerSession } from "../lib/use-partner-session";
import { clearPartnerToken } from "../lib/partner-auth";
import { useRouter } from "next/navigation";
import { Bot, FileText, Headset, Home, LogOut, Upload } from "lucide-react";
import { NavLink, MobileNavLink } from "./NavLink";

// Desktop nav links for partner session (OTP login)
export function PartnerDesktopNav() {
  const { partnerToken, partnerReady } = usePartnerSession();
  const { isSignedIn } = useUser();

  // Don't show if not ready, no partner token, or if Clerk user is signed in (server handles that)
  if (!partnerReady || !partnerToken || isSignedIn) return null;

  return (
    <>
      <NavLink href="/" label="Home" icon={<Home className="h-4 w-4" />} />
      <NavLink
        href="/policies"
        label="My Policies"
        icon={<FileText className="h-4 w-4" />}
      />
      <NavLink
        href="/upload"
        label="Upload Policy"
        icon={<Upload className="h-4 w-4" />}
      />
      <NavLink
        href="/advisor"
        label="AI Advisor"
        icon={<Bot className="h-4 w-4" />}
      />
      <NavLink
        href="/support"
        label="Support"
        icon={<Headset className="h-4 w-4" />}
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
      <MobileNavLink href="/" icon={<Home className="h-5 w-5 shrink-0" />} />
      <MobileNavLink
        href="/policies"
        icon={<FileText className="h-5 w-5 shrink-0" />}
      />
      <MobileNavLink
        href="/upload"
        icon={<Upload className="h-5 w-5 shrink-0" />}
      />
      <MobileNavLink
        href="/advisor"
        icon={<Bot className="h-5 w-5 shrink-0" />}
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
        className="flex h-8 min-w-8 items-center justify-center rounded-sm bg-[#0B1F3B] px-2 text-xs font-semibold text-white hover:bg-[#142B4D] transition-colors"
        title={partnerInfo?.full_name || "Partner"}
      >
        {initials}
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-sm border border-slate-200 bg-white py-2 shadow-lg z-50">
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
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-600 hover:bg-[#F5F9FF]"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
