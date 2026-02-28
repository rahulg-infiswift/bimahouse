"use client";

import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import {
  FileText,
  Handshake,
  Headset,
  Scale,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import GetQuoteCard from "./GetQuoteCard";

export default function LoggedOutHome() {
  return (
    <div className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="rounded-sm border border-blue-100 bg-gradient-to-br from-white via-blue-50/30 to-white p-8 shadow-sm sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-sm border border-[#B7D1FF] bg-[#EAF2FF] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#0B5CAD]">
                <ShieldCheck className="h-3.5 w-3.5" />
                IRDAI Licensed Direct Insurance Broker
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-tight text-heading sm:text-5xl">
                Insurance that works <span className="text-[#0B5CAD]">for you.</span>
              </h1>
              <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                Transparent guidance and structured comparisons from <span className="font-semibold text-[#0B5CAD]">Bima House</span> — we represent your interest, not a single insurer.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href="#get-quote"
                  className="inline-flex items-center justify-center rounded-sm border border-[#0B5CAD] bg-[#0B5CAD] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0A4F95]"
                >
                  Get a Free Quote
                </a>
                <Link
                  href="/become-partner"
                  className="inline-flex items-center justify-center rounded-sm border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-[#0B5CAD] hover:text-[#0B5CAD]"
                >
                  Become A POSP Partner
                </Link>
              </div>

              <div className="mt-8 flex items-center gap-6 border-t border-slate-200 pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#0B5CAD]">5+</p>
                  <p className="mt-0.5 text-xs text-slate-500">Insurance Providers</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#0B5CAD]">10+</p>
                  <p className="mt-0.5 text-xs text-slate-500">POSP Partners</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#0B5CAD]">100%</p>
                  <p className="mt-0.5 text-xs text-slate-500">IRDAI Compliant</p>
                </div>
              </div>
            </div>

            <aside className="flex flex-col rounded-sm border border-blue-100 bg-gradient-to-br from-white to-blue-50/40 p-5 shadow-sm">
              <h3 className="text-xl font-semibold text-heading">Sign in to your account</h3>
              <p className="mt-1 text-sm text-slate-500">Choose your portal to get started</p>

              <div className="mt-6 space-y-5">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">For Partners</p>
                  <Link
                    href="/partner/login"
                    className="flex w-full items-center justify-center gap-2 rounded-sm border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-heading hover:border-[#A6C5F7] hover:bg-[#F5F9FF]"
                  >
                    <Handshake className="h-4 w-4 text-[#0B5CAD]" />
                    Partner (POSP) Login
                  </Link>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-medium text-slate-400">or</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">For Customers</p>
                  <SignInButton mode="modal">
                    <button className="flex w-full items-center justify-center gap-2 rounded-sm border border-[#0B5CAD] bg-[#0B5CAD] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0A4F95]">
                      <UserRound className="h-4 w-4" />
                      Customer Sign In
                    </button>
                  </SignInButton>
                </div>

                <p className="text-xs text-slate-500">
                  New to Bima House?{" "}
                  <SignUpButton mode="modal">
                    <button className="font-semibold text-[#0B5CAD] underline underline-offset-2 hover:text-[#0A4F95]">
                      Create an account
                    </button>
                  </SignUpButton>
                  .
                </p>
              </div>
            </aside>
          </div>
        </section>

        <div id="get-quote">
          <GetQuoteCard quotesPath="/get-quote" />
        </div>

        <section className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-heading">Why Customers Choose Bima House</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "IRDAI-Compliant Process",
                desc: "Licensed advisory process with audit-ready workflows.",
                icon: ShieldCheck,
              },
              {
                title: "Insurer-Agnostic Guidance",
                desc: "Compare options across providers with objective inputs.",
                icon: Scale,
              },
              {
                title: "Claims Assistance",
                desc: "Structured support through claim lifecycle and escalation.",
                icon: Headset,
              },
              {
                title: "Partner Network",
                desc: "Onboarded POSP partners operating through governed controls.",
                icon: Handshake,
              },
              {
                title: "Operational Reliability",
                desc: "Predictable process with document and status visibility.",
                icon: FileText,
              },
              {
                title: "Customer-First Advisory",
                desc: "Recommendations tailored to profile, risk, and budget.",
                icon: UserRound,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-sm border border-slate-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#9FC1F6] hover:bg-[#FAFCFF] hover:shadow-md hover:shadow-blue-100/50"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-[#EAF2FF] text-[#0B5CAD]">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[#0B5CAD]">{item.title}</h3>
                </div>
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
