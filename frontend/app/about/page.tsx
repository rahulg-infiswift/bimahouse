import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CheckCircle2,
  CircleGauge,
  FileCheck2,
  HeartHandshake,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

const focusItems = [
  {
    title: "Understanding Client Needs",
    desc: "We take time to understand your unique requirements.",
  },
  {
    title: "Unbiased Insurance Solutions",
    desc: "Transparent recommendations from multiple insurers.",
  },
  {
    title: "Policy Servicing & Claims",
    desc: "Dedicated assistance throughout your policy lifecycle.",
  },
  {
    title: "Ethics & Compliance",
    desc: "Operating per Insurance Act, 1938 and IRDAI regulations.",
  },
];

const serviceItems = [
  {
    title: "Life Insurance",
    points: ["Term Insurance", "Savings & Investment Plans", "Retirement & Pension Plans"],
  },
  {
    title: "Health Insurance",
    points: ["Individual & Family Floater", "Senior Citizen Health Plans", "Group Health Insurance"],
  },
  {
    title: "General Insurance",
    points: ["Motor Insurance", "Property & Travel Insurance", "Marine & Engineering Insurance"],
  },
  {
    title: "Corporate Insurance",
    points: ["Group Mediclaim", "Workmen Compensation", "Professional Indemnity & Liability"],
  },
];

const differentiators = [
  "IRDAI-regulated Insurance Broker",
  "Unbiased and transparent advice",
  "Multiple insurer options",
  "Dedicated claims support",
  "Ethical and compliant operations",
  "AI-powered policy extraction",
];

export default function AboutPage() {
  return (
    <main className="py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-sm border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-blue-100/40 p-8 shadow-sm sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-sm bg-[#0B5CAD] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
            <Building2 className="h-3.5 w-3.5" />
            About Us
          </span>
          <h1 className="mt-4 text-3xl font-bold text-heading sm:text-4xl">Bima House Insurance Broking</h1>
          <p className="mt-3 max-w-4xl text-base text-[#1F3B63] sm:text-lg">
            An IRDAI-licensed Direct Insurance Broker committed to delivering reliable insurance advisory and broking services across India.
          </p>
        </section>

        <section className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="inline-flex items-center gap-2 text-xl font-bold text-heading">
            <HeartHandshake className="h-5 w-5 text-[#0B5CAD]" />
            Who We Are
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[#1F3B63]">
            Bima House Insurance Broking Private Limited is dedicated to helping individuals and businesses choose the right insurance solutions by working in their best interest and in strict compliance with IRDAI regulations.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[#1F3B63]">
            Led by experienced professionals, we focus on understanding client needs, offering unbiased insurance solutions, ensuring policy servicing and claims assistance, and maintaining the highest standards of ethics and compliance.
          </p>
          <div className="mt-5 rounded-sm border border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm font-medium text-[#1F3B63]">
            We do not represent any single insurance company. <span className="font-bold text-[#0B5CAD]">We represent you.</span>
          </div>
        </section>

        <section className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="inline-flex items-center gap-2 text-base font-semibold text-heading">
            <Mail className="h-4 w-4 text-[#0B5CAD]" />
            Contact Us
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-[#365A86]">Email</p>
              <p className="text-sm font-medium text-heading">info@bimahouseinsurance.in</p>
            </div>
            <div className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-[#365A86]">Website</p>
              <p className="text-sm font-medium text-heading">www.bimahouseinsurance.in</p>
            </div>
            <div className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 sm:col-span-2">
              <p className="inline-flex items-center gap-1 text-xs text-[#365A86]">
                <Phone className="h-3.5 w-3.5" />
                Reach out for policy advisory and claims support
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="inline-flex items-center gap-2 text-xl font-bold text-heading">
              <CircleGauge className="h-5 w-5 text-[#0B5CAD]" />
              Our Focus
            </h2>
            <div className="mt-5 grid gap-3">
              {focusItems.map((item) => (
                <div key={item.title} className="rounded-sm border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-heading">{item.title}</p>
                  <p className="mt-1 text-xs text-[#1F3B63]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="inline-flex items-center gap-2 text-xl font-bold text-heading">
              <ShieldCheck className="h-5 w-5 text-[#0B5CAD]" />
              Why Choose Us
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {differentiators.map((item) => (
                <div key={item} className="flex items-start gap-2 rounded-sm border border-slate-200 bg-slate-50 px-3 py-3">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0B5CAD]" />
                  <p className="text-xs font-medium text-[#1F3B63]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="inline-flex items-center gap-2 text-xl font-bold text-heading">
            <Sparkles className="h-5 w-5 text-[#0B5CAD]" />
            Our Services
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {serviceItems.map((service) => (
              <div key={service.title} className="rounded-sm border border-slate-200 bg-white p-4">
                <h3 className="text-base font-semibold text-heading">{service.title}</h3>
                <ul className="mt-3 space-y-2">
                  {service.points.map((point) => (
                    <li key={point} className="flex items-center gap-2 text-sm text-[#1F3B63]">
                      <CheckCircle2 className="h-4 w-4 text-[#0B5CAD]" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="inline-flex items-center gap-2 text-base font-semibold text-heading">
              <ShieldCheck className="h-4 w-4 text-[#0B5CAD]" />
              Privacy Policy
            </h3>
            <p className="mt-3 text-xs leading-relaxed text-[#1F3B63]">
              We respect your privacy. Any personal information shared with us is used only for insurance advisory, servicing and regulatory compliance purposes and is not shared with any third party without consent, except as required by law or regulators.
            </p>
          </div>

          <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="inline-flex items-center gap-2 text-base font-semibold text-heading">
              <FileCheck2 className="h-4 w-4 text-[#0B5CAD]" />
              Terms & Conditions
            </h3>
            <ul className="mt-3 space-y-1 text-xs text-[#1F3B63]">
              <li>Services are subject to IRDAI regulations.</li>
              <li>Policy issuance is at insurer discretion.</li>
              <li>The company does not guarantee policy approval or claims settlement.</li>
              <li>All disputes are subject to Indian jurisdiction.</li>
            </ul>
          </div>
        </section>

        <section className="rounded-sm border border-amber-200 bg-amber-50 p-5">
          <h4 className="inline-flex items-center gap-2 text-sm font-semibold text-amber-800">
            <TriangleAlert className="h-4 w-4" />
            Important Disclaimer
          </h4>
          <p className="mt-2 text-xs leading-relaxed text-amber-700">
            Bima House Insurance Broking Private Limited is a <strong>Direct Insurance Broker</strong> licensed by the Insurance Regulatory and Development Authority of India (IRDAI). Insurance is the subject matter of solicitation. For more details on risk factors, terms and conditions, please read the policy documents carefully before concluding a sale.
          </p>
        </section>

        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#0B5CAD] hover:text-[#0A4F95]">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
