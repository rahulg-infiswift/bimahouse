"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setPartnerToken, clearPartnerToken, getPartnerToken } from "../../lib/partner-auth";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function PartnerLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
      const res = await fetch(`${API}/v1/partner-auth/request-otp`, {
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
          : "If your account is approved, OTP has been sent to your registered phone number."
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
      const res = await fetch(`${API}/v1/partner-auth/verify-otp`, {
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
      setPartnerToken(token);
      router.push("/policies");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-xl">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-8 shadow-sm mb-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white shadow-sm">
            Partner Portal
          </span>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">Partner Login</h1>
          <p className="mt-2 text-sm text-slate-600">
            Login is available only for approved POSP partners.
          </p>
        </div>

        <form
          onSubmit={otpRequested ? verifyOtp : requestOtp}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Registered Phone Number
              </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              disabled={busy}
            />
          </label>

          {otpRequested && (
            <label className="mt-5 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">OTP</span>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                disabled={busy}
              />
            </label>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {notice && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {notice}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white shadow-md shadow-blue-200 hover:bg-blue-700 disabled:opacity-60"
            >
              {busy ? "Please wait..." : otpRequested ? "Verify OTP" : "Send OTP"}
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
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
              >
                Change Phone
              </button>
            )}
          </div>
        </form>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
          <Link href="/" className="text-slate-600 hover:text-slate-900">
            Back to Home
          </Link>
          <button
            type="button"
            onClick={() => {
              clearPartnerToken();
              setNotice("Partner session cleared.");
              setError("");
            }}
            className="text-slate-600 hover:text-slate-900"
          >
            Clear Partner Session
          </button>
          {getPartnerToken() && <span className="text-emerald-700">Partner session active</span>}
        </div>
      </div>
    </main>
  );
}
