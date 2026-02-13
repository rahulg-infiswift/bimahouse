"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import {
  ArrowRight,
  BriefcaseMedical,
  Car,
  HeartPulse,
  Plane,
  ShieldCheck,
  Sparkles,
  FileText,
} from "lucide-react";

const quickActions = [
  { href: "/insurance/health", label: "Health Insurance", cta: "Get Quote", icon: HeartPulse },
  { href: "/insurance/life", label: "Life Insurance", cta: "Get Quote", icon: ShieldCheck },
  { href: "/insurance/motor", label: "Motor Insurance", cta: "Get Quote", icon: Car },
  { href: "/insurance/travel", label: "Travel Insurance", cta: "Get Quote", icon: Plane },
];

const recommendedPlans = [
  {
    href: "/insurance/health/family",
    segment: "Health",
    title: "Family Floater",
    desc: "Comprehensive coverage for family medical emergencies and hospitalization.",
    price: "₹499/month",
    icon: BriefcaseMedical,
  },
  {
    href: "/insurance/life/term",
    segment: "Life",
    title: "Term Insurance",
    desc: "High life cover with efficient issuance and transparent policy terms.",
    price: "₹299/month",
    icon: ShieldCheck,
  },
  {
    href: "/insurance/motor/car",
    segment: "Motor",
    title: "Car Insurance",
    desc: "Comprehensive car policy with claim support and renewal reminders.",
    price: "₹2,999/year",
    icon: Car,
  },
];

export default function CustomerHome() {
  const { user } = useUser();
  const displayName = user?.fullName || user?.firstName || "there";

  return (
    <div className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-sm border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0B5CAD]">Customer Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold text-heading sm:text-4xl">
            Welcome back, <span className="text-[#0B5CAD]">{displayName}</span>
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Explore plans, compare options, and manage coverage from one place.
          </p>
          <div className="mt-6">
            <Link
              href="/insurance/health"
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-[#0B5CAD] bg-[#0B5CAD] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0A4F95]"
            >
              Explore Plans
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-heading">Quick Actions</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-sm border border-slate-200 bg-slate-50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#9FC1F6] hover:bg-[#F5F9FF] hover:shadow-md hover:shadow-blue-100/60"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-sm bg-[#EAF2FF] text-[#0B5CAD]">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-heading">{item.label}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-[#0B5CAD]">
                      {item.cta}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-heading">Your Coverage</h2>
            <Link href="/my-policies" className="text-sm font-semibold text-[#0B5CAD] hover:text-[#0A4F95]">
              View all
            </Link>
          </div>
          <div className="rounded-sm border border-slate-200 bg-slate-50 px-5 py-7 text-center">
            <span className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-sm bg-[#EAF2FF] text-[#0B5CAD]">
              <FileText className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold text-heading">No active policies yet</p>
            <p className="mt-2 text-sm text-slate-600">
              Start with a quote and choose a plan that fits your goals.
            </p>
            <Link
              href="/insurance/health"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-sm border border-[#0B5CAD] bg-[#0B5CAD] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0A4F95]"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-heading">Recommended For You</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {recommendedPlans.map((plan) => (
              <div
                key={plan.href}
                className="rounded-sm border border-slate-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#9FC1F6] hover:bg-[#FAFCFF] hover:shadow-md hover:shadow-blue-100/50"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm bg-[#EAF2FF] text-[#0B5CAD]">
                    <plan.icon className="h-4 w-4" />
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#0B5CAD]">{plan.segment}</p>
                </div>
                <h3 className="mt-1 text-lg font-bold text-heading">{plan.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{plan.desc}</p>
                <p className="mt-4 text-sm font-semibold text-heading">Starting from {plan.price}</p>
                <Link
                  href={plan.href}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-sm border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-heading hover:border-[#A6C5F7] hover:bg-[#F5F9FF]"
                >
                  View Plan
                  <Sparkles className="h-4 w-4 text-[#0B5CAD]" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
