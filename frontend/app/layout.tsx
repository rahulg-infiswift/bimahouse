// frontend/app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Policy Extractor",
  description: "Upload policy PDFs and extract structured JSON",
};

function NavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
    >
      {label}
    </Link>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
              {/* Left: brand + nav */}
              <div className="flex items-center gap-2">
                <Link href="/" className="text-sm font-semibold tracking-tight">
                  BimaHouse
                </Link>

                <SignedIn>
                  <nav className="ml-4 hidden items-center gap-1 sm:flex">
                    <NavLink href="/" label="Home" />
                    <NavLink href="/upload" label="Upload" />
                    <NavLink href="/policies" label="Policies" />
                  </nav>
                </SignedIn>
              </div>

              {/* Right: auth controls */}
              <div className="flex items-center gap-3">
                <SignedIn>
                  {/* Mobile nav */}
                  <nav className="flex items-center gap-1 sm:hidden">
                    <NavLink href="/upload" label="Upload" />
                    <NavLink href="/policies" label="Policies" />
                  </nav>
                </SignedIn>

                <SignedOut>
                  <SignInButton />
                  <SignUpButton>
                    <button className="bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
                      Sign Up
                    </button>
                  </SignUpButton>
                </SignedOut>

                <SignedIn>
                  <UserButton />
                </SignedIn>
              </div>
            </div>
          </header>

          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
