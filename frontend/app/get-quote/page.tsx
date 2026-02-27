"use client";

import QuoteWizard from "../components/QuoteWizard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function PublicGetQuotePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Compare Two-Wheeler Insurance
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Get instant quotes from top insurers. No login required.
        </p>
      </div>
      <QuoteWizard apiUrl={`${API_BASE}/v1/public/quotes`} />
      <p className="mt-8 text-center text-xs text-slate-400">
        Quotes shown are simulated for demonstration purposes.
      </p>
    </div>
  );
}
