// frontend/app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { canAccessPolicies, isAdminRole, isEmployeeRole, UserRole } from "./lib/roles";
import { Geist, Geist_Mono } from "next/font/google";
import { PartnerDesktopNav, PartnerMobileNav, PartnerUserButton } from "./components/PartnerNavLinks";
import { LoginDropdown } from "./components/LoginDropdown";
import { HideForPartner } from "./components/AuthWrappers";
import { NavLink, MobileNavLink } from "./components/NavLink";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bima House - Insurance Platform",
  description: "Upload insurance policy PDFs and extract structured data",
};

async function getUserRole(): Promise<UserRole | null> {
  const { userId, getToken } = await auth();
  if (!userId) return null;
  const token = await getToken();
  if (!token) return null;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  const res = await fetch(`${apiBase}/v1/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { role?: UserRole };
  return data.role ?? null;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const role = await getUserRole();
  // Employees see "All Policies", partners/customers see "My Policies"
  const showPolicyLinks = role === "customer" || role === "partner" || isEmployeeRole(role);
  const policyLabel = isEmployeeRole(role) ? "All Policies" : "My Policies";
  const showLeadsLink = isEmployeeRole(role);
  const showAdminLink = isAdminRole(role);
  const showSupportLink = role === "customer" || role === "partner";
  const showAboutLink = !isEmployeeRole(role);

  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
            <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-4">
                <Link href="/" className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-md shadow-blue-200">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Bima House</span>
                </Link>
                
                <nav className="hidden items-center gap-1 xl:flex">
                  <SignedOut>
                    <HideForPartner>
                      <NavLink href="/become-partner" label="Become Partner" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.12-3 2.5S10.343 13 12 13s3 1.12 3 2.5S13.657 18 12 18m0-10V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                    </HideForPartner>
                  </SignedOut>
                  <SignedIn>
                    {showPolicyLinks && (
                      <NavLink href="/policies" label={policyLabel} icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
                    )}
                    {showLeadsLink && <NavLink href="/leads" label="Manage Partner Leads" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M5 7h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2zm4 6h4m-4-3h4" /></svg>} />}
                    {showAdminLink && <NavLink href="/admin" label="Manage Users" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />}
                    {showSupportLink && <NavLink href="/support" label="Support" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3l2 5-2 1a11 11 0 005 5l1-2 5 2v3a2 2 0 01-2 2 16 16 0 01-14-14z" /></svg>} />}
                  </SignedIn>
                  {/* Partner nav links for OTP-logged partners (client component) */}
                  <PartnerDesktopNav />
                  {showAboutLink && (
                    <HideForPartner>
                      <NavLink href="/about" label="About Us" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                    </HideForPartner>
                  )}
                </nav>
              </div>

              <div className="flex items-center gap-3">
                <SignedIn>
                  <nav className="flex items-center gap-1 xl:hidden">
                    {showPolicyLinks && (
                      <MobileNavLink href="/policies" icon={<svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
                    )}
                    {showLeadsLink && <MobileNavLink href="/leads" icon={<svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M5 7h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2zm4 6h4m-4-3h4" /></svg>} />}
                    {showAdminLink && <MobileNavLink href="/admin" icon={<svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />}
                  </nav>
                </SignedIn>
                <SignedOut>
                  <HideForPartner>
                    <div className="xl:hidden">
                      <MobileNavLink href="/become-partner" icon={<svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.12-3 2.5S10.343 13 12 13s3 1.12 3 2.5S13.657 18 12 18m0-10V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                    </div>
                  </HideForPartner>
                </SignedOut>
                {showSupportLink && <MobileNavLink href="/support" icon={<svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3l2 5-2 1a11 11 0 005 5l1-2 5 2v3a2 2 0 01-2 2 16 16 0 01-14-14z" /></svg>} />}
                {/* Partner mobile nav for OTP-logged partners */}
                <PartnerMobileNav />

                <SignedOut>
                  <HideForPartner>
                    <LoginDropdown />
                  </HideForPartner>
                </SignedOut>

                <SignedIn>
                  <div className="ml-2 rounded-full ring-2 ring-slate-100 ring-offset-2">
                    <UserButton />
                  </div>
                </SignedIn>
                {/* Partner user button for OTP-logged partners */}
                <PartnerUserButton />
              </div>
            </div>
          </header>

          <main className="min-h-[calc(100vh-8rem)]">{children}</main>

          <footer className="border-t border-slate-200 bg-white py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <p className="text-center text-sm text-slate-500">© {new Date().getFullYear()} All rights reserved.</p>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
