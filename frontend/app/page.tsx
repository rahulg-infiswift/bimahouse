// frontend/app/page.tsx
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

function isAdmin(userId: string | null | undefined) {
  if (!userId) return false;
  const allowList = process.env.NEXT_PUBLIC_ADMIN_USER_IDS || "";
  console.log("ALLOWLIST:", allowList);
  return allowList.includes(userId);
}

export default async function HomePage() {
  const { userId } = await auth();
  const admin = isAdmin(userId);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="rounded-2xl border bg-white/60 p-8 shadow-sm">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">BimaHouse Insurance</h1>
          <p className="text-sm text-gray-600 max-w-2xl">
            Upload insurance policy PDFs and extract structured data. Admins can manage partner onboarding
            leads and collect KYC documents for background checks.
          </p>
        </div>

        <SignedOut>
          <div className="mt-8 rounded-xl border bg-gray-50 p-5">
            <h2 className="text-base font-medium">Sign in to continue</h2>
            <p className="mt-1 text-sm text-gray-600">
              Use the Sign In / Sign Up buttons in the top-right. After signing in you can upload policies
              and view your policy history.
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
                  <p className="mt-1 text-sm text-gray-600">Upload a PDF to start extraction.</p>
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
                  <p className="mt-1 text-sm text-gray-600">Browse uploads and download outputs.</p>
                </div>
                <span className="text-gray-400 group-hover:text-gray-700">→</span>
              </div>
            </Link>

            {admin ? (
              <Link
                href="/admin/leads"
                className="group rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow sm:col-span-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-medium">Manage leads (Admin)</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Create leads, send email OTP, verify, and upload KYC documents.
                    </p>
                  </div>
                  <span className="text-gray-400 group-hover:text-gray-700">→</span>
                </div>
              </Link>
            ) : (
              <div className="rounded-2xl border bg-gray-50 p-5 sm:col-span-2">
                <div className="text-base font-medium">Manage leads</div>
                <div className="mt-1 text-sm text-gray-600">Admin access required.</div>
              </div>
            )}
          </div>
        </SignedIn>
      </div>
    </main>
  );
}
