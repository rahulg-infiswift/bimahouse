"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getEmployeeToken, setEmployeeToken, EmployeeInfo } from "../../lib/employee-auth";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function EmployeeLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (getEmployeeToken()) {
      router.push("/");
    }
  }, [router]);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!phone.trim()) {
      setError("Enter your registered phone number.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API}/v1/employee-auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body?.detail === "string" ? body.detail : "Unable to request OTP.");
      }
      setOtpRequested(true);
      setNotice(
        typeof body?.message === "string"
          ? body.message
          : "If your employee account exists, OTP has been sent to your registered number."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!phone.trim() || !otp.trim()) {
      setError("Enter phone number and OTP.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API}/v1/employee-auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), otp: otp.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body?.detail === "string" ? body.detail : "OTP verification failed.");
      }

      const token = typeof body?.access_token === "string" ? body.access_token : null;
      if (!token) throw new Error("Login token missing in response.");

      const employeeInfo: EmployeeInfo = {
        user_id: String(body.employee_id || ""),
        role: String(body.role || ""),
        primary_email: typeof body.primary_email === "string" ? body.primary_email : null,
      };
      setEmployeeToken(token, employeeInfo);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-12rem)] flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-200 mb-4">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Employee Login</h1>
          <p className="mt-2 text-sm text-slate-600">Access internal operations with OTP</p>
        </div>

        <form onSubmit={otpRequested ? verifyOtp : requestOtp} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Registered Phone Number</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +919876543210"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white py-3 px-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              disabled={busy || otpRequested}
            />
          </label>

          {otpRequested && (
            <label className="mt-5 block">
              <span className="text-sm font-medium text-slate-700">Enter OTP</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit OTP"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white py-3 px-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                disabled={busy}
                autoFocus
              />
            </label>
          )}

          {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          {notice && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 hover:from-blue-700 hover:to-blue-800 disabled:opacity-60"
            >
              {busy ? "Please wait..." : otpRequested ? "Verify OTP & Login" : "Send OTP"}
            </button>

            {otpRequested && (
              <button
                type="button"
                onClick={() => {
                  setOtpRequested(false);
                  setOtp("");
                  setError("");
                  setNotice("");
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Change Phone Number
              </button>
            )}
          </div>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link href="/" className="text-slate-600 hover:text-slate-900">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
