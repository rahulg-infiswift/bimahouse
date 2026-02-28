"use client";

import { useState } from "react";
import { Home, MapPin, CheckCircle2 } from "lucide-react";
import { WizardShell, type StepDef } from "./quote-shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Property {
  property_type: "owned" | "rented";
  construction_type: "rcc" | "load_bearing" | "prefab";
  built_up_area_sqft: number;
  property_value: number;
  age_of_building_years: number;
}

interface Location {
  city: string;
  pincode: string;
  flood_zone: boolean;
  earthquake_zone: "I" | "II" | "III" | "IV";
}

interface Coverage {
  building_cover: boolean;
  contents_value: number;
  contents_cover: boolean;
  temporary_resettlement: boolean;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HomeQuoteWizardProps {
  apiUrl: string;
  fetchFn?: (url: string, init: RequestInit) => Promise<Response>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS: StepDef[] = [
  { label: "Property", icon: Home },
  { label: "Location & Coverage", icon: MapPin },
  { label: "Results", icon: CheckCircle2 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HomeQuoteWizard({ apiUrl, fetchFn }: HomeQuoteWizardProps) {
  const [property, setProperty] = useState<Property>({
    property_type: "owned",
    construction_type: "rcc",
    built_up_area_sqft: 1000,
    property_value: 5000000,
    age_of_building_years: 5,
  });

  const [location, setLocation] = useState<Location>({
    city: "",
    pincode: "",
    flood_zone: false,
    earthquake_zone: "II",
  });

  const [coverage, setCoverage] = useState<Coverage>({
    building_cover: true,
    contents_value: 500000,
    contents_cover: true,
    temporary_resettlement: false,
  });

  const buildPayload = () => ({ property, location, coverage });

  return (
    <WizardShell
      steps={STEPS}
      apiUrl={apiUrl}
      fetchFn={fetchFn}
      buildPayload={buildPayload}
    >
      {(step) => (
        <>
          {step === 0 && <PropertyStep property={property} onChange={setProperty} />}
          {step === 1 && (
            <LocationCoverageStep
              location={location}
              coverage={coverage}
              onLocationChange={setLocation}
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

function PropertyStep({
  property,
  onChange,
}: {
  property: Property;
  onChange: (p: Property) => void;
}) {
  const update = (fields: Partial<Property>) => onChange({ ...property, ...fields });

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Property Details
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Property Type
          </label>
          <div className="flex gap-4 mt-1">
            {(["owned", "rented"] as const).map((pt) => (
              <label
                key={pt}
                className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
              >
                <input
                  type="radio"
                  name="property_type"
                  checked={property.property_type === pt}
                  onChange={() => update({ property_type: pt })}
                  className="accent-[#0B5CAD]"
                />
                {pt.charAt(0).toUpperCase() + pt.slice(1)}
              </label>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Construction Type
          </label>
          <div className="flex gap-4 mt-1">
            {([
              { value: "rcc" as const, label: "RCC" },
              { value: "load_bearing" as const, label: "Load Bearing" },
              { value: "prefab" as const, label: "Prefab" },
            ]).map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
              >
                <input
                  type="radio"
                  name="construction_type"
                  checked={property.construction_type === opt.value}
                  onChange={() => update({ construction_type: opt.value })}
                  className="accent-[#0B5CAD]"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Built-up Area (sq. ft.)
          </label>
          <input
            type="number"
            min={1}
            value={property.built_up_area_sqft}
            onChange={(e) => update({ built_up_area_sqft: parseFloat(e.target.value) || 0 })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Property Value (INR)
          </label>
          <input
            type="number"
            min={0}
            value={property.property_value}
            onChange={(e) => update({ property_value: parseFloat(e.target.value) || 0 })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Age of Building (years)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={property.age_of_building_years}
            onChange={(e) => update({ age_of_building_years: parseInt(e.target.value) || 0 })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          />
        </div>
      </div>
    </div>
  );
}

function LocationCoverageStep({
  location,
  coverage,
  onLocationChange,
  onCoverageChange,
}: {
  location: Location;
  coverage: Coverage;
  onLocationChange: (l: Location) => void;
  onCoverageChange: (c: Coverage) => void;
}) {
  const updateLoc = (fields: Partial<Location>) =>
    onLocationChange({ ...location, ...fields });
  const updateCov = (fields: Partial<Coverage>) =>
    onCoverageChange({ ...coverage, ...fields });

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Location & Coverage
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            City
          </label>
          <input
            type="text"
            placeholder="e.g. Mumbai"
            value={location.city}
            onChange={(e) => updateLoc({ city: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Pincode
          </label>
          <input
            type="text"
            placeholder="e.g. 400001"
            value={location.pincode}
            onChange={(e) => updateLoc({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={location.flood_zone}
              onChange={(e) => updateLoc({ flood_zone: e.target.checked })}
              className="accent-[#0B5CAD]"
            />
            Flood Zone
          </label>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Earthquake Zone
          </label>
          <select
            value={location.earthquake_zone}
            onChange={(e) => updateLoc({ earthquake_zone: e.target.value as Location["earthquake_zone"] })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          >
            <option value="I">Zone I (Low)</option>
            <option value="II">Zone II (Moderate)</option>
            <option value="III">Zone III (High)</option>
            <option value="IV">Zone IV (Very High)</option>
          </select>
        </div>

        <div className="sm:col-span-2 border-t border-slate-100 pt-4 mt-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Coverage Options</h3>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={coverage.building_cover}
              onChange={(e) => updateCov({ building_cover: e.target.checked })}
              className="accent-[#0B5CAD]"
            />
            Building Cover
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={coverage.contents_cover}
              onChange={(e) => updateCov({ contents_cover: e.target.checked })}
              className="accent-[#0B5CAD]"
            />
            Contents Cover
          </label>
        </div>

        {coverage.contents_cover && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Contents Value (INR)
            </label>
            <input
              type="number"
              min={0}
              value={coverage.contents_value}
              onChange={(e) => updateCov({ contents_value: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
            />
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={coverage.temporary_resettlement}
              onChange={(e) => updateCov({ temporary_resettlement: e.target.checked })}
              className="accent-[#0B5CAD]"
            />
            Temporary Resettlement
          </label>
        </div>
      </div>
    </div>
  );
}
