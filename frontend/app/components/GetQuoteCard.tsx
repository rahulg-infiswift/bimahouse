"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  Bike,
  Building2,
  Car,
  HeartPulse,
  Home,
  Plane,
  RefreshCw,
  Store,
} from "lucide-react";

type InsuranceLine = "car" | "bike" | "health" | "travel" | "home";

const INSURANCE_LINES = [
  { key: "car", label: "Car", icon: Car, enabled: true },
  { key: "bike", label: "Bike", icon: Bike, enabled: true },
  { key: "health", label: "Health", icon: HeartPulse, enabled: true },
  { key: "travel", label: "Travel", icon: Plane, enabled: true },
  { key: "home", label: "Home", icon: Home, enabled: true },
  { key: "sme", label: "SME", icon: Store, enabled: false },
  { key: "corporate", label: "Corporate", icon: Building2, enabled: false },
  { key: "renewal", label: "Renewal", icon: RefreshCw, enabled: false },
] as const;

interface GetQuoteCardProps {
  /** Where to navigate on submit (e.g. "/partner/quotes" or "/get-quote") */
  quotesPath: string;
}

export default function GetQuoteCard({ quotesPath }: GetQuoteCardProps) {
  const router = useRouter();
  const [activeLine, setActiveLine] = useState<InsuranceLine>("car");
  const [registrationNo, setRegistrationNo] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const isMotor = activeLine === "car" || activeLine === "bike";
  const registrationLabel =
    activeLine === "car" ? "Car registration no." : "Bike registration no.";

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setQuoteError(null);

    const reg = registrationNo.trim().toUpperCase();
    const mob = mobile.trim();
    const em = email.trim();

    if (isMotor && !reg) {
      setQuoteError("Enter registration number.");
      return;
    }
    if (!/^\d{10}$/.test(mob)) {
      setQuoteError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(em)) {
      setQuoteError("Enter a valid email address.");
      return;
    }

    const params = new URLSearchParams({ line: activeLine, mobile: mob, email: em });
    if (isMotor && reg) params.set("reg", reg);
    router.push(`${quotesPath}?${params.toString()}`);
  };

  const gridCols = isMotor
    ? "lg:grid-cols-[1fr_1fr_1fr_auto]"
    : "lg:grid-cols-[1fr_1fr_auto]";
  const inputClasses =
    "mt-2 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#0B5CAD] focus:outline-none focus:ring-2 focus:ring-blue-100";

  return (
    <section className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-r from-[#F8FBFF] to-white px-4 py-5 sm:px-6">
        <h2 className="text-2xl font-bold text-heading">Get insurance quotes</h2>
        <p className="mt-1 text-sm text-slate-600">
          Choose a coverage type and enter a few details to continue.
        </p>

        <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {INSURANCE_LINES.map((line) => {
            const Icon = line.icon;
            const isActive = line.key === activeLine;
            return (
              <button
                key={line.key}
                type="button"
                onClick={() =>
                  line.enabled && setActiveLine(line.key as InsuranceLine)
                }
                className={`rounded-xl border px-2 py-2 text-center transition ${
                  isActive
                    ? "border-[#0B5CAD] bg-blue-50 text-[#0B5CAD]"
                    : line.enabled
                      ? "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
                      : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
                }`}
              >
                <Icon className="mx-auto h-5 w-5" />
                <p className="mt-1 text-xs font-medium">{line.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={onSubmit} className="bg-slate-50 px-4 py-5 sm:px-6">
        <div className={`grid gap-4 ${gridCols} lg:items-end`}>
          {isMotor && (
            <label className="block">
              <span className="text-sm font-medium text-[#0B5CAD]">
                {registrationLabel} <span className="text-[#0B5CAD]">*</span>
              </span>
              <input
                type="text"
                value={registrationNo}
                onChange={(e) =>
                  setRegistrationNo(e.target.value.toUpperCase())
                }
                placeholder="E.g. MH01DF5698"
                className={inputClasses}
              />
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium text-[#0B5CAD]">
              Mobile number <span className="text-[#0B5CAD]">*</span>
            </span>
            <input
              type="tel"
              inputMode="numeric"
              value={mobile}
              onChange={(e) =>
                setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              placeholder="Enter mobile no."
              className={inputClasses}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#0B5CAD]">
              Email <span className="text-[#0B5CAD]">*</span>
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className={inputClasses}
            />
          </label>

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-sm border border-[#0B5CAD] bg-[#0B5CAD] px-7 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0A4F95] focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2"
            >
              Get quote
            </button>
          </div>
        </div>

        {quoteError && (
          <p className="mt-3 text-sm font-medium text-rose-600">{quoteError}</p>
        )}
      </form>
    </section>
  );
}
