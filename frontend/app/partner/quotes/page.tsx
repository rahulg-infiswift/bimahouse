"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { usePartnerSession } from "../../lib/use-partner-session";
import { fetchWithPartnerRefresh } from "../../lib/auth-refresh";
import QuoteWizard from "../../components/QuoteWizard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function PartnerQuotesPage() {
  const { partnerToken, partnerReady } = usePartnerSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const line = searchParams.get("line");
  const registrationNo = (searchParams.get("reg") || "").toUpperCase();
  const productLabel = line === "car" ? "Car" : "Bike";

  useEffect(() => {
    if (partnerReady && !partnerToken) {
      router.push("/partner/login");
    }
  }, [partnerReady, partnerToken, router]);

  if (!partnerReady || !partnerToken) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0B5CAD] border-t-transparent" />
      </div>
    );
  }

  const fetchFn = (url: string, init: RequestInit) =>
    fetchWithPartnerRefresh(API_BASE, url, partnerToken, init);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        Get {productLabel} Insurance Quotes
      </h1>
      <QuoteWizard
        apiUrl={`${API_BASE}/v1/partner/quotes`}
        fetchFn={fetchFn}
        initialRegistrationNo={registrationNo}
      />
    </div>
  );
}
