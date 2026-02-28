"use client";

import { useState } from "react";
import { Car, Bike, HeartPulse, Plane, Home } from "lucide-react";
import QuoteWizard from "../components/QuoteWizard";
import HealthQuoteWizard from "../components/HealthQuoteWizard";
import TravelQuoteWizard from "../components/TravelQuoteWizard";
import HomeQuoteWizard from "../components/HomeQuoteWizard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const PRODUCT_TABS = [
  { key: "car", label: "Car", icon: Car, apiPath: "/v1/public/motor-4w/quotes" },
  { key: "bike", label: "Bike", icon: Bike, apiPath: "/v1/public/quotes" },
  { key: "health", label: "Health", icon: HeartPulse, apiPath: "/v1/public/health/quotes" },
  { key: "travel", label: "Travel", icon: Plane, apiPath: "/v1/public/travel/quotes" },
  { key: "home", label: "Home", icon: Home, apiPath: "/v1/public/home/quotes" },
] as const;

type ProductKey = (typeof PRODUCT_TABS)[number]["key"];

export default function PublicGetQuotePage() {
  const [activeLine, setActiveLine] = useState<ProductKey>("bike");

  const activeTab = PRODUCT_TABS.find((t) => t.key === activeLine)!;
  const apiUrl = `${API_BASE}${activeTab.apiPath}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Compare {activeTab.label} Insurance
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Get instant quotes from top insurers. No login required.
        </p>
      </div>

      <div className="mb-6 flex items-center justify-center gap-2">
        {PRODUCT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeLine;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveLine(tab.key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-[#0B5CAD] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {(activeLine === "car" || activeLine === "bike") && (
        <QuoteWizard key={activeLine} apiUrl={apiUrl} />
      )}
      {activeLine === "health" && (
        <HealthQuoteWizard apiUrl={apiUrl} />
      )}
      {activeLine === "travel" && (
        <TravelQuoteWizard apiUrl={apiUrl} />
      )}
      {activeLine === "home" && (
        <HomeQuoteWizard apiUrl={apiUrl} />
      )}

      <p className="mt-8 text-center text-xs text-slate-400">
        Quotes shown are simulated for demonstration purposes.
      </p>
    </div>
  );
}
