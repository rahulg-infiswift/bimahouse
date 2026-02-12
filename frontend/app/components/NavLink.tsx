"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLinkProps = {
  href: string;
  label: string;
  icon?: React.ReactNode;
};

export function NavLink({ href, label, icon }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-sm px-3.5 py-2 text-[13px] font-semibold transition-colors whitespace-nowrap ${
        isActive
          ? "bg-[#E8F0FE] text-[#0B1F3B]"
          : "text-slate-700 hover:bg-[#F0F5FF] hover:text-[#0B1F3B]"
      }`}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className="min-w-0 truncate">{label}</span>
    </Link>
  );
}

export function MobileNavLink({ href, icon }: { href: string; icon: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`inline-flex shrink-0 items-center justify-center rounded-sm p-2 transition-colors ${
        isActive
          ? "bg-[#E8F0FE] text-[#0B1F3B]"
          : "text-slate-700 hover:bg-[#F0F5FF] hover:text-[#0B1F3B]"
      }`}
    >
      {icon}
    </Link>
  );
}
