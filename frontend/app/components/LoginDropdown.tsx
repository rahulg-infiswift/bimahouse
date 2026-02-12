"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { Briefcase, Building2, ChevronDown, UserRound } from "lucide-react";

export function LoginDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="inline-flex items-center gap-1.5 rounded-sm border border-[#0B5CAD] bg-[#0B5CAD] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0A4F95]"
      >
        Login
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-sm border border-slate-200 bg-white shadow-lg focus:outline-none">
          <div className="p-2">
            <div className="rounded-sm bg-[#F5F9FF] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#0B5CAD]">
              Choose login type
            </div>
            <SignInButton mode="modal">
              <button
                onClick={() => setIsOpen(false)}
                className="mt-1 flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-[#F5F9FF]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#E8F0FE] text-[#0B5CAD]">
                  <UserRound className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-heading">Customer</div>
                  <div className="text-xs text-slate-500">Buy & manage your policies</div>
                </div>
              </button>
            </SignInButton>
            <Link
              href="/partner/login"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-[#F5F9FF]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#E8F0FE] text-[#0B5CAD]">
                <Briefcase className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-heading">Partner (POSP)</div>
              </div>
            </Link>
            <div className="my-1 border-t border-slate-100" />
            <Link
              href="/employee/login"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-[#F5F9FF]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#E8F0FE] text-[#0B5CAD]">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-heading">Employee</div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
