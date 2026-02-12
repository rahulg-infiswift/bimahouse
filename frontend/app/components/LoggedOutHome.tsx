"use client";

import Link from "next/link";
import { Building2, Car, Heart, ShieldPlus } from "lucide-react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

export default function LoggedOutHome() {
  return (
    <div className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="rounded-sm border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-sm border border-[#B7D1FF] bg-[#EAF2FF] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#0A4DBA]">
                IRDAI Licensed Direct Insurance Broker
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-tight text-[#0B1F3B] sm:text-5xl">
                Welcome to <span className="text-[#0A4DBA]">Bima House</span>
              </h1>
              <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                We help individuals and businesses choose insurance with transparent guidance, structured comparisons,
                and compliant advisory support.
              </p>
              <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-[#0A4DBA]">
                We represent your interest, not a single insurer.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/become-partner"
                  className="inline-flex items-center justify-center rounded-sm border border-[#1D8F43] bg-[#1FA34A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1A8C3F]"
                >
                  Become A POSP Partner Today
                </Link>
              </div>
            </div>

            <aside className="rounded-sm border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <h3 className="text-2xl font-semibold text-[#0B1F3B]">Login</h3>
              <p className="mt-1 text-sm text-slate-500">Access your portal</p>

              <div className="mt-5 space-y-3">
                <SignInButton mode="modal">
                  <button className="w-full rounded-sm border border-[#0A4DBA] bg-[#0F5FCC] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0A4DBA]">
                    Customer Sign In
                  </button>
                </SignInButton>

                <Link
                  href="/partner/login"
                  className="block w-full rounded-sm border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-[#0B1F3B] hover:border-[#A6C5F7] hover:bg-[#F5F9FF]"
                >
                  Partner (POSP) Login
                </Link>

                <Link
                  href="/employee/login"
                  className="block w-full rounded-sm border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-[#0B1F3B] hover:border-[#A6C5F7] hover:bg-[#F5F9FF]"
                >
                  Employee Login
                </Link>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                New to Bima House?{" "}
                <SignUpButton mode="modal">
                  <button className="font-semibold text-[#0A4DBA] underline underline-offset-2 hover:text-[#083D93]">
                    Create an account
                  </button>
                </SignUpButton>
                .
              </p>
            </aside>
          </div>
        </section>

        <section className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0A4DBA]">Coverage Segments</p>
              <h2 className="mt-1 text-2xl font-bold text-[#0B1F3B]">Insurance Products We Support</h2>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Life Insurance",
                icon: <Heart className="h-4 w-4" />,
              },
              {
                label: "Health Insurance",
                icon: <ShieldPlus className="h-4 w-4" />,
              },
              {
                label: "Motor Insurance",
                icon: <Car className="h-4 w-4" />,
              },
              {
                label: "Corporate Insurance",
                icon: <Building2 className="h-4 w-4" />,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-sm border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-[#0B1F3B] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#9FC1F6] hover:bg-[#F5F9FF] hover:shadow-md hover:shadow-blue-100/60"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#0A4DBA]">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-[#0B1F3B]">Why Customers Choose Bima House</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "IRDAI-Compliant Process",
                desc: "Licensed advisory process with audit-ready workflows.",
              },
              {
                title: "Insurer-Agnostic Guidance",
                desc: "Compare options across providers with objective inputs.",
              },
              {
                title: "Claims Assistance",
                desc: "Structured support through claim lifecycle and escalation.",
              },
              {
                title: "Partner Network",
                desc: "Onboarded POSP partners operating through governed controls.",
              },
              {
                title: "Operational Reliability",
                desc: "Predictable process with document and status visibility.",
              },
              {
                title: "Customer-First Advisory",
                desc: "Recommendations tailored to profile, risk, and budget.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-sm border border-slate-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#9FC1F6] hover:bg-[#FAFCFF] hover:shadow-md hover:shadow-blue-100/50"
              >
                <h3 className="text-sm font-bold uppercase tracking-wide text-[#0A4DBA]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-sm border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs leading-relaxed text-slate-500">
            Disclaimer: Bima House Insurance Broking Private Limited is a Direct Insurance Broker licensed by IRDAI.
            Insurance is the subject matter of solicitation. Please read policy wording, exclusions, and terms before
            purchase.
          </p>
        </section>
      </div>
    </div>
  );
}
