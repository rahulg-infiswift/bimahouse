// frontend/app/page.tsx
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

function isAdmin(userId: string | null | undefined) {
  if (!userId) return false;
  const allowList = process.env.NEXT_PUBLIC_ADMIN_USER_IDS || "";
  return allowList.includes(userId);
}

export default async function HomePage() {
  const { userId } = await auth();
  const admin = isAdmin(userId);

  return (
    <div className="py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 mb-6">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-sm font-medium text-blue-700">Policy extraction made simple</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight mb-4">
            Welcome to <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">BimaHouse</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Upload insurance policy PDFs and instantly extract structured data. 
            Streamline your workflow with our AI-powered extraction system.
          </p>
        </div>

        <SignedOut>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Sign in to get started</h2>
            <p className="text-slate-600 mb-6">
              Create an account or sign in to upload policies and view your extraction history.
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/sign-in" className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors">
                Sign In
              </Link>
              <Link href="/sign-up" className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 hover:from-blue-700 hover:to-blue-800 transition-all">
                Create Account
              </Link>
            </div>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Upload Card */}
            <Link href="/upload" className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
              <div className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div className="pr-12">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">Upload a Policy</h2>
                <p className="text-sm text-slate-600">Upload a PDF document to extract policy details using AI.</p>
              </div>
              <div className="mt-4 flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
                Get started <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </div>
            </Link>

            {/* Policies Card */}
            <Link href="/policies" className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
              <div className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="pr-12">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">View Policies</h2>
                <p className="text-sm text-slate-600">Browse your uploaded policies and download extracted data.</p>
              </div>
              <div className="mt-4 flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
                View all <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </div>
            </Link>

            {/* Admin Card */}
            {admin ? (
              <Link href="/admin/leads" className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all sm:col-span-2">
                <div className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="pr-12">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-lg font-semibold text-slate-900">Manage Partner Leads</h2>
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">Admin</span>
                  </div>
                  <p className="text-sm text-slate-600">Create leads, send email OTP, verify partners, and manage KYC documents.</p>
                </div>
                <div className="mt-4 flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
                  Open dashboard <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </div>
              </Link>
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 sm:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-medium text-slate-700">Partner Management</h2>
                    <p className="text-sm text-slate-500">Admin access required</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Features Section */}
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm text-blue-600 mb-3">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Fast Processing</h3>
              <p className="text-xs text-slate-600">AI-powered extraction completes in seconds</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm text-emerald-600 mb-3">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Secure & Private</h3>
              <p className="text-xs text-slate-600">Your documents are encrypted and protected</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm text-purple-600 mb-3">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Easy Export</h3>
              <p className="text-xs text-slate-600">Download data as Excel or CSV anytime</p>
            </div>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}
