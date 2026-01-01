// frontend/app/page.tsx
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="rounded-2xl border bg-white/60 p-8 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight">
          BimaHouse Insurance
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          Upload an insurance policy PDF and extract structured policy details
          into Excel. Track status via jobs and download the extracted output.
        </p>

        <SignedOut>
          <div className="mt-8 rounded-xl border bg-gray-50 p-5">
            <h2 className="text-base font-medium">Sign in to continue</h2>
            <p className="mt-1 text-sm text-gray-600">
              Use the Sign In / Sign Up buttons in the top-right to access upload
              and your policy history.
            </p>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link
              href="/upload"
              className="group rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-medium">Upload a policy</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Upload a PDF to start extraction.
                  </p>
                </div>
                <span className="text-gray-400 group-hover:text-gray-700">→</span>
              </div>
            </Link>

            <Link
              href="/policies"
              className="group rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-medium">View policies</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    List recent uploads and download extracted JSON.
                  </p>
                </div>
                <span className="text-gray-400 group-hover:text-gray-700">→</span>
              </div>
            </Link>
          </div>
        </SignedIn>
      </div>
    </main>
  );
}
