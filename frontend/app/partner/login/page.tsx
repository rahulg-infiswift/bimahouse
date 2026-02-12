"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  FileText,
  Handshake,
  KeyRound,
  Loader2,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { setPartnerToken, getPartnerToken, PartnerInfo } from "../../lib/partner-auth";
import CountryCodeSelect from "../../components/CountryCodeSelect";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const COUNTRY_OPTIONS = [{ code: "+91", label: "India (+91)", shortLabel: "+91", digits: 10 }] as const;

export default function PartnerLoginPage() {
  const router = useRouter();
  const [countryCode, setCountryCode] = useState<(typeof COUNTRY_OPTIONS)[number]["code"]>("+91");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selectedCountry = COUNTRY_OPTIONS[0];

  function getPhoneE164(): string | null {
    const nationalNumber = phone.replace(/\D/g, "");
    if (nationalNumber.length !== selectedCountry.digits) return null;
    return `${countryCode}${nationalNumber}`;
  }

  // Redirect if already logged in
  useEffect(() => {
    if (getPartnerToken()) {
      router.push("/");
    }
  }, [router]);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    const phoneE164 = getPhoneE164();
    if (!phoneE164) {
      setError(`Enter a valid ${selectedCountry.digits}-digit phone number.`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API}/v1/partner-auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneE164 }),
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
    const phoneE164 = getPhoneE164();
    if (!phoneE164 || !otp.trim()) {
      setError(`Enter a valid ${selectedCountry.digits}-digit phone number and OTP.`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API}/v1/partner-auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneE164, otp: otp.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body?.detail === "string" ? body.detail : "OTP verification failed.");
      }
      const token = typeof body?.access_token === "string" ? body.access_token : null;
      if (!token) throw new Error("Login token missing in response.");
      
      // Store partner info along with token
      const partnerInfo: PartnerInfo = {
        full_name: body.full_name || "Partner",
        email: body.email || "",
        partner_application_id: body.partner_application_id || "",
        partner_display_id: body.partner_display_id,
      };
      setPartnerToken(token, partnerInfo);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-12rem)] px-4 py-12 sm:px-6">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_420px]">
        <section className="hidden rounded-sm border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-blue-100/30 p-8 text-heading shadow-sm sm:p-10 lg:block">
          <span className="inline-flex items-center rounded-sm bg-[#0B5CAD] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
            Partner Access
          </span>
          <div className="mt-4 flex h-16 w-16 items-center justify-center rounded-sm border border-blue-200 bg-[#EAF2FF]">
            <Briefcase className="h-8 w-8 text-[#0B5CAD]" />
          </div>
          <h1 className="mt-6 text-3xl font-bold leading-tight text-[#0B5CAD] sm:text-4xl">Partner Login</h1>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">Access your POSP dashboard to manage your business with Bima House.</p>
          <div className="mt-6 space-y-3 text-sm text-slate-700">
            <p className="inline-flex w-full items-center gap-2 rounded-sm border border-blue-100 bg-white px-3 py-2">
              <Handshake className="h-4 w-4 text-[#0B5CAD]" />
              Track partner leads and customer handoffs
            </p>
            <p className="inline-flex w-full items-center gap-2 rounded-sm border border-blue-100 bg-white px-3 py-2">
              <FileText className="h-4 w-4 text-[#0B5CAD]" />
              Access uploaded policies and application records
            </p>
            <p className="inline-flex w-full items-center gap-2 rounded-sm border border-blue-100 bg-white px-3 py-2">
              <ShieldCheck className="h-4 w-4 text-[#0B5CAD]" />
              Work through compliant partner workflows
            </p>
          </div>
          <div className="mt-8 text-sm">
            <Link href="/" className="inline-flex items-center gap-1 text-[#0B5CAD] hover:text-[#0A4F95]">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Home
            </Link>
          </div>
        </section>

        <section className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <span className="inline-flex items-center rounded-sm bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#0B5CAD]">
            Partner Sign In
          </span>
          <h2 className="mt-2 text-xl font-semibold text-heading">Sign In</h2>
          <p className="mt-1 text-sm text-slate-500">Use your registered partner mobile number.</p>
          <form onSubmit={otpRequested ? verifyOtp : requestOtp} className="mt-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Registered Phone Number
            </span>
            <div className="mt-2 grid grid-cols-[84px_1fr] gap-2">
              <CountryCodeSelect
                options={COUNTRY_OPTIONS}
                value={countryCode}
                onChange={(next) => setCountryCode(next as (typeof COUNTRY_OPTIONS)[number]["code"])}
                disabled={busy || otpRequested}
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Phone className="h-5 w-5" />
                </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, selectedCountry.digits))
                }
                placeholder={`Enter ${selectedCountry.digits}-digit number`}
                className="w-full rounded-sm border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#0B5CAD] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors"
                disabled={busy || otpRequested}
              />
              </div>
            </div>
          </label>

          {otpRequested && (
            <label className="mt-5 block">
              <span className="text-sm font-medium text-slate-700">Enter OTP</span>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <KeyRound className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit OTP"
                  className="w-full rounded-sm border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#0B5CAD] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors"
                  disabled={busy}
                  autoFocus
                />
              </div>
            </label>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-sm border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="mt-4 flex items-start gap-2 rounded-sm border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-[#0B5CAD]">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0B5CAD]" />
              <span>{notice}</span>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-sm bg-[#0B5CAD] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0A4F95] disabled:opacity-60 transition-colors"
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Please wait...
                </span>
              ) : otpRequested ? (
                "Verify OTP & Login"
              ) : (
                "Send OTP"
              )}
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
                className="w-full rounded-sm border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Change Phone Number
              </button>
            )}
          </div>
          </form>

          <div className="mt-7 rounded-sm border border-blue-100 bg-[#F5F9FF] p-4 text-center">
            <p className="text-sm text-slate-600">Not a partner yet?</p>
            <Link
              href="/become-partner"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#0B5CAD] hover:text-[#0A4F95] transition-colors"
            >
              Apply to become a POSP Partner
              <ShieldCheck className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
