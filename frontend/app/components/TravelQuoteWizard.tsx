"use client";

import { useState } from "react";
import { Plane, Users, CheckCircle2 } from "lucide-react";
import { WizardShell, type StepDef } from "./quote-shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Trip {
  destination_type: "domestic" | "international";
  destination_country: string | null;
  trip_duration_days: number;
  trip_purpose: "leisure" | "business" | "student";
}

interface Travellers {
  count: number;
  ages: number[];
}

interface Coverage {
  coverage_amount_usd: number;
  medical_cover: boolean;
  trip_cancellation: boolean;
  baggage_loss: boolean;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TravelQuoteWizardProps {
  apiUrl: string;
  fetchFn?: (url: string, init: RequestInit) => Promise<Response>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS: StepDef[] = [
  { label: "Trip Details", icon: Plane },
  { label: "Travellers & Coverage", icon: Users },
  { label: "Results", icon: CheckCircle2 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TravelQuoteWizard({ apiUrl, fetchFn }: TravelQuoteWizardProps) {
  const [trip, setTrip] = useState<Trip>({
    destination_type: "international",
    destination_country: null,
    trip_duration_days: 7,
    trip_purpose: "leisure",
  });

  const [travellers, setTravellers] = useState<Travellers>({
    count: 1,
    ages: [30],
  });

  const [coverage, setCoverage] = useState<Coverage>({
    coverage_amount_usd: 50000,
    medical_cover: true,
    trip_cancellation: false,
    baggage_loss: false,
  });

  const buildPayload = () => ({ trip, travellers, coverage });

  return (
    <WizardShell
      steps={STEPS}
      apiUrl={apiUrl}
      fetchFn={fetchFn}
      buildPayload={buildPayload}
    >
      {(step) => (
        <>
          {step === 0 && <TripStep trip={trip} onChange={setTrip} />}
          {step === 1 && (
            <TravellersStep
              trip={trip}
              travellers={travellers}
              coverage={coverage}
              onTravellersChange={setTravellers}
              onCoverageChange={setCoverage}
            />
          )}
        </>
      )}
    </WizardShell>
  );
}

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------

function TripStep({
  trip,
  onChange,
}: {
  trip: Trip;
  onChange: (t: Trip) => void;
}) {
  const update = (fields: Partial<Trip>) => onChange({ ...trip, ...fields });

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Trip Details
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Destination Type
          </label>
          <div className="flex gap-4 mt-1">
            {(["domestic", "international"] as const).map((dt) => (
              <label
                key={dt}
                className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
              >
                <input
                  type="radio"
                  name="destination_type"
                  checked={trip.destination_type === dt}
                  onChange={() => update({ destination_type: dt })}
                  className="accent-[#0B5CAD]"
                />
                {dt.charAt(0).toUpperCase() + dt.slice(1)}
              </label>
            ))}
          </div>
        </div>

        {trip.destination_type === "international" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Destination Country
            </label>
            <input
              type="text"
              placeholder="e.g. US, UK, SG"
              value={trip.destination_country || ""}
              onChange={(e) => update({ destination_country: e.target.value || null })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Trip Duration (days)
          </label>
          <input
            type="number"
            min={1}
            max={365}
            value={trip.trip_duration_days}
            onChange={(e) => update({ trip_duration_days: parseInt(e.target.value) || 1 })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Trip Purpose
          </label>
          <div className="flex gap-4 mt-1">
            {(["leisure", "business", "student"] as const).map((p) => (
              <label
                key={p}
                className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
              >
                <input
                  type="radio"
                  name="trip_purpose"
                  checked={trip.trip_purpose === p}
                  onChange={() => update({ trip_purpose: p })}
                  className="accent-[#0B5CAD]"
                />
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TravellersStep({
  trip,
  travellers,
  coverage,
  onTravellersChange,
  onCoverageChange,
}: {
  trip: Trip;
  travellers: Travellers;
  coverage: Coverage;
  onTravellersChange: (t: Travellers) => void;
  onCoverageChange: (c: Coverage) => void;
}) {
  const updateCov = (fields: Partial<Coverage>) =>
    onCoverageChange({ ...coverage, ...fields });

  const setCount = (count: number) => {
    const ages = [...travellers.ages];
    while (ages.length < count) ages.push(30);
    onTravellersChange({ count, ages: ages.slice(0, count) });
  };

  const setAge = (index: number, age: number) => {
    const ages = [...travellers.ages];
    ages[index] = age;
    onTravellersChange({ ...travellers, ages });
  };

  const currencyLabel = trip.destination_type === "international" ? "USD" : "INR";

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Travellers & Coverage
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Number of Travellers
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={travellers.count}
            onChange={(e) => setCount(parseInt(e.target.value) || 1)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          />
        </div>

        {travellers.ages.map((age, i) => (
          <div key={i}>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Traveller {i + 1} Age
            </label>
            <input
              type="number"
              min={1}
              max={99}
              value={age}
              onChange={(e) => setAge(i, parseInt(e.target.value) || 1)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
            />
          </div>
        ))}

        <div className="sm:col-span-2 border-t border-slate-100 pt-4 mt-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Coverage Amount ({currencyLabel})
          </label>
          <input
            type="number"
            min={0}
            value={coverage.coverage_amount_usd}
            onChange={(e) => updateCov({ coverage_amount_usd: parseFloat(e.target.value) || 0 })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={coverage.medical_cover}
              onChange={(e) => updateCov({ medical_cover: e.target.checked })}
              className="accent-[#0B5CAD]"
            />
            Medical Cover
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={coverage.trip_cancellation}
              onChange={(e) => updateCov({ trip_cancellation: e.target.checked })}
              className="accent-[#0B5CAD]"
            />
            Trip Cancellation
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={coverage.baggage_loss}
              onChange={(e) => updateCov({ baggage_loss: e.target.checked })}
              className="accent-[#0B5CAD]"
            />
            Baggage Loss
          </label>
        </div>
      </div>
    </div>
  );
}
