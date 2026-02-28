"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { usePartnerSession } from "../../lib/use-partner-session";
import { fetchWithPartnerRefresh } from "../../lib/auth-refresh";
import QuoteWizard from "../../components/QuoteWizard";
import HealthQuoteWizard from "../../components/HealthQuoteWizard";
import TravelQuoteWizard from "../../components/TravelQuoteWizard";
import HomeQuoteWizard from "../../components/HomeQuoteWizard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const LINE_CONFIG: Record<string, { label: string; apiPath: string }> = {
  car: { label: "Car", apiPath: "/v1/partner/motor-4w/quotes" },
  bike: { label: "Bike", apiPath: "/v1/partner/quotes" },
  health: { label: "Health", apiPath: "/v1/partner/health/quotes" },
  travel: { label: "Travel", apiPath: "/v1/partner/travel/quotes" },
  home: { label: "Home", apiPath: "/v1/partner/home/quotes" },
};

export default function PartnerQuotesPage() {
  const { partnerToken, partnerReady } = usePartnerSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const line = searchParams.get("line") || "bike";
  const registrationNo = (searchParams.get("reg") || "").toUpperCase();
  const config = LINE_CONFIG[line] || LINE_CONFIG.bike;

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

  const apiUrl = `${API_BASE}${config.apiPath}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        Get {config.label} Insurance Quotes
      </h1>
      {(line === "car" || line === "bike") && (
        <QuoteWizard
          apiUrl={apiUrl}
          fetchFn={fetchFn}
          initialRegistrationNo={registrationNo}
        />
      )}
      {line === "health" && (
        <HealthQuoteWizard apiUrl={apiUrl} fetchFn={fetchFn} />
      )}
      {line === "travel" && (
        <TravelQuoteWizard apiUrl={apiUrl} fetchFn={fetchFn} />
      )}
      {line === "home" && (
        <HomeQuoteWizard apiUrl={apiUrl} fetchFn={fetchFn} />
      )}
    </div>
  );
}
