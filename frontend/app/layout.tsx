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
import { isAdminRole, isEmployeeRole, SessionRole } from "./lib/roles";
import { Geist, Geist_Mono } from "next/font/google";
import { PartnerDesktopNav, PartnerMobileNav, PartnerUserButton } from "./components/PartnerNavLinks";
import { EmployeeDesktopNav, EmployeeMobileNav, EmployeeUserButton } from "./components/EmployeeNavLinks";
import { LoginDropdown } from "./components/LoginDropdown";
import { HideForPartner } from "./components/AuthWrappers";
import { NavLink, MobileNavLink } from "./components/NavLink";
import { FileText, Handshake, Headset, Home, Info, ShieldUser, ShieldCheck, Users } from "lucide-react";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();
  const role: SessionRole | null = userId ? "customer" : null;
  // On the server, Clerk session is customer-only. Partner/employee nav is handled by client OTP session components.
  const showPolicyLinks = isEmployeeRole(role);
  const policyLabel = isEmployeeRole(role) ? "All Policies" : "My Policies";
  const showLeadsLink = isEmployeeRole(role);
  const showAdminLink = isAdminRole(role);
  const showSupportLink = false;
  const showAboutLink = !isEmployeeRole(role);

  return (
    <ClerkProvider
      appearance={{
        elements: {
          userButtonAvatarBox: "bg-[#0B5CAD] text-white",
        },
      }}
    >
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
            <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-4">
                <Link href="/" className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-[#0B5CAD] shadow-sm">
                    <ShieldCheck className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-lg font-bold text-[#0B5CAD]">Bima House</span>
                </Link>
                
                <nav className="hidden items-center gap-1 xl:flex">
                  <SignedIn>
                    <NavLink href="/" label="Home" icon={<Home className="h-4 w-4" />} />
                  </SignedIn>
                  <SignedOut>
                    <HideForPartner>
                      <NavLink href="/become-partner" label="Become a POSP Partner" icon={<Handshake className="h-4 w-4" />} />
                    </HideForPartner>
                  </SignedOut>
                  <SignedIn>
                    {showPolicyLinks && (
                      <NavLink href="/policies" label={policyLabel} icon={<FileText className="h-4 w-4" />} />
                    )}
                    {showLeadsLink && <NavLink href="/leads" label="Manage Partner Leads" icon={<Users className="h-4 w-4" />} />}
                    {showAdminLink && <NavLink href="/admin" label="Manage Users" icon={<ShieldUser className="h-4 w-4" />} />}
                    {showSupportLink && <NavLink href="/support" label="Support" icon={<Headset className="h-4 w-4" />} />}
                  </SignedIn>
                  {/* Partner nav links for OTP-logged partners (client component) */}
                  <PartnerDesktopNav />
                  {/* Employee nav links for OTP-logged employees (client component) */}
                  <EmployeeDesktopNav />
                  {showAboutLink && (
                    <HideForPartner>
                      <NavLink href="/about" label="About Us" icon={<Info className="h-4 w-4" />} />
                    </HideForPartner>
                  )}
                </nav>
              </div>

              <div className="flex items-center gap-3">
                <SignedIn>
                  <nav className="flex items-center gap-1 xl:hidden">
                    <MobileNavLink href="/" icon={<Home className="h-5 w-5 shrink-0" />} />
                    {showPolicyLinks && (
                      <MobileNavLink href="/policies" icon={<FileText className="h-5 w-5 shrink-0" />} />
                    )}
                    {showLeadsLink && <MobileNavLink href="/leads" icon={<Users className="h-5 w-5 shrink-0" />} />}
                    {showAdminLink && <MobileNavLink href="/admin" icon={<ShieldUser className="h-5 w-5 shrink-0" />} />}
                    {showSupportLink && <MobileNavLink href="/support" icon={<Headset className="h-5 w-5 shrink-0" />} />}
                  </nav>
                </SignedIn>
                <SignedOut>
                  <HideForPartner>
                    <div className="xl:hidden">
                      <MobileNavLink href="/become-partner" icon={<Handshake className="h-5 w-5 shrink-0" />} />
                    </div>
                  </HideForPartner>
                </SignedOut>
                {/* Partner mobile nav for OTP-logged partners */}
                <PartnerMobileNav />
                {/* Employee mobile nav for OTP-logged employees */}
                <EmployeeMobileNav />

                <SignedOut>
                  <HideForPartner>
                    <LoginDropdown />
                  </HideForPartner>
                </SignedOut>

                <SignedIn>
                  <div className="ml-2 rounded-sm ring-1 ring-slate-200 ring-offset-0">
                    <UserButton />
                  </div>
                </SignedIn>
                {/* Partner user button for OTP-logged partners */}
                <PartnerUserButton />
                {/* Employee user button for OTP-logged employees */}
                <EmployeeUserButton />
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
