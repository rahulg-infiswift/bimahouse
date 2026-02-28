"use client";

import { useState } from "react";
import {
  Car,
  FileText,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { WizardShell, type StepDef } from "./quote-shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VehicleDetails {
  registration_no: string;
  make_code: number;
  model_code: number;
  rto_code: number;
  registration_date: string;
  owner_type: number;
}

interface PolicyHistory {
  previous_policy_claimed: boolean;
  previous_policy_ncb_percentage: number;
  previous_policy_expiry_date: string;
  previous_policy_type: number;
  previous_policy_has_zd_cover: boolean;
  previous_insurer_code: string;
}

interface CoverageOptions {
  idv: number;
  addons: string[];
  has_existing_pa_cover: boolean;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface QuoteWizardProps {
  apiUrl: string;
  fetchFn?: (url: string, init: RequestInit) => Promise<Response>;
  initialRegistrationNo?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS: StepDef[] = [
  { label: "Vehicle", icon: Car },
  { label: "Policy History", icon: FileText },
  { label: "Coverage", icon: Shield },
  { label: "Results", icon: CheckCircle2 },
];

const NCB_OPTIONS = [0, 20, 25, 35, 45, 50];

const ADDON_OPTIONS = [
  { code: "RSA", label: "Roadside Assistance" },
  { code: "ZD", label: "Zero Depreciation" },
  { code: "EC", label: "Engine Cover" },
  { code: "KP", label: "Key Protect" },
  { code: "CC", label: "Consumables Cover" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuoteWizard({ apiUrl, fetchFn, initialRegistrationNo }: QuoteWizardProps) {
  // Step 1: Vehicle
  const [vehicle, setVehicle] = useState<VehicleDetails>({
    registration_no: initialRegistrationNo || "",
    make_code: 10,
    model_code: 11846,
    rto_code: 12621,
    registration_date: "2017-03-31",
    owner_type: 1,
  });

  // Step 2: Policy History
  const [policy, setPolicy] = useState<PolicyHistory>({
    previous_policy_claimed: false,
    previous_policy_ncb_percentage: 0,
    previous_policy_expiry_date: "2024-09-30",
    previous_policy_type: 1,
    previous_policy_has_zd_cover: false,
    previous_insurer_code: "",
  });

  // Step 3: Coverage
  const [coverage, setCoverage] = useState<CoverageOptions>({
    idv: 208966,
    addons: ["RSA", "ZD"],
    has_existing_pa_cover: true,
  });

  const buildPayload = () => ({
    vehicle: {
      ...vehicle,
      registration_date: vehicle.registration_date
        ? new Date(vehicle.registration_date).toISOString()
        : "2017-03-31T18:30:00Z",
    },
    policy_history: {
      ...policy,
      previous_policy_expiry_date: policy.previous_policy_expiry_date
        ? new Date(policy.previous_policy_expiry_date).toISOString()
        : "2024-09-30T18:30:00Z",
    },
    coverage,
    proposer: {},
  });

  return (
    <WizardShell
      steps={STEPS}
      apiUrl={apiUrl}
      fetchFn={fetchFn}
      buildPayload={buildPayload}
    >
      {(step) => (
        <>
          {step === 0 && <VehicleStep vehicle={vehicle} onChange={setVehicle} />}
          {step === 1 && <PolicyStep policy={policy} onChange={setPolicy} />}
          {step === 2 && <CoverageStep coverage={coverage} onChange={setCoverage} />}
        </>
      )}
    </WizardShell>
  );
}

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------

function VehicleStep({
  vehicle,
  onChange,
}: {
  vehicle: VehicleDetails;
  onChange: (v: VehicleDetails) => void;
}) {
  const update = (fields: Partial<VehicleDetails>) =>
    onChange({ ...vehicle, ...fields });

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Vehicle Details
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Registration Number
          </label>
          <input
            type="text"
            placeholder="e.g. MH02AB1234"
            value={vehicle.registration_no}
            onChange={(e) => update({ registration_no: e.target.value.toUpperCase() })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Make Code
          </label>
          <input
            type="number"
            value={vehicle.make_code}
            onChange={(e) => update({ make_code: parseInt(e.target.value) || 0 })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Model Code
          </label>
          <input
            type="number"
            value={vehicle.model_code}
            onChange={(e) => update({ model_code: parseInt(e.target.value) || 0 })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            RTO Code
          </label>
          <input
            type="number"
            value={vehicle.rto_code}
            onChange={(e) => update({ rto_code: parseInt(e.target.value) || 0 })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Registration Date
          </label>
          <input
            type="date"
            value={vehicle.registration_date}
            onChange={(e) => update({ registration_date: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Owner Type
          </label>
          <div className="flex gap-4">
            {[
              { value: 1, label: "Individual" },
              { value: 2, label: "Company" },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
              >
                <input
                  type="radio"
                  name="owner_type"
                  checked={vehicle.owner_type === opt.value}
                  onChange={() => update({ owner_type: opt.value })}
                  className="accent-[#0B5CAD]"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PolicyStep({
  policy,
  onChange,
}: {
  policy: PolicyHistory;
  onChange: (p: PolicyHistory) => void;
}) {
  const update = (fields: Partial<PolicyHistory>) =>
    onChange({ ...policy, ...fields });

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Policy History
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Previous Policy Type
          </label>
          <select
            value={policy.previous_policy_type}
            onChange={(e) =>
              update({ previous_policy_type: parseInt(e.target.value) })
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          >
            <option value={1}>Comprehensive</option>
            <option value={2}>Third Party Only</option>
            <option value={3}>Standalone OD</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Claims on Previous Policy?
          </label>
          <div className="flex gap-4 mt-1">
            {[
              { value: false, label: "No" },
              { value: true, label: "Yes" },
            ].map((opt) => (
              <label
                key={String(opt.value)}
                className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
              >
                <input
                  type="radio"
                  name="claimed"
                  checked={policy.previous_policy_claimed === opt.value}
                  onChange={() =>
                    update({ previous_policy_claimed: opt.value })
                  }
                  className="accent-[#0B5CAD]"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            No Claim Bonus (NCB %)
          </label>
          <select
            value={policy.previous_policy_ncb_percentage}
            onChange={(e) =>
              update({
                previous_policy_ncb_percentage: parseInt(e.target.value),
              })
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          >
            {NCB_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}%
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Previous Policy Expiry
          </label>
          <input
            type="date"
            value={policy.previous_policy_expiry_date}
            onChange={(e) =>
              update({ previous_policy_expiry_date: e.target.value })
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Previous Insurer Code
          </label>
          <input
            type="text"
            placeholder="e.g. icici, tata_agi"
            value={policy.previous_insurer_code}
            onChange={(e) =>
              update({ previous_insurer_code: e.target.value })
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={policy.previous_policy_has_zd_cover}
              onChange={(e) =>
                update({ previous_policy_has_zd_cover: e.target.checked })
              }
              className="accent-[#0B5CAD]"
            />
            Previous policy had Zero Depreciation cover
          </label>
        </div>
      </div>
    </div>
  );
}

function CoverageStep({
  coverage,
  onChange,
}: {
  coverage: CoverageOptions;
  onChange: (c: CoverageOptions) => void;
}) {
  const update = (fields: Partial<CoverageOptions>) =>
    onChange({ ...coverage, ...fields });

  const toggleAddon = (code: string) => {
    const addons = coverage.addons.includes(code)
      ? coverage.addons.filter((a) => a !== code)
      : [...coverage.addons, code];
    update({ addons });
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Coverage Options
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Insured Declared Value (IDV)
          </label>
          <input
            type="number"
            value={coverage.idv}
            onChange={(e) =>
              update({ idv: parseFloat(e.target.value) || 0 })
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mt-6">
            <input
              type="checkbox"
              checked={coverage.has_existing_pa_cover}
              onChange={(e) =>
                update({ has_existing_pa_cover: e.target.checked })
              }
              className="accent-[#0B5CAD]"
            />
            Has existing PA cover
          </label>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Add-on Covers
          </label>
          <div className="flex flex-wrap gap-3">
            {ADDON_OPTIONS.map((addon) => (
              <label
                key={addon.code}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                  coverage.addons.includes(addon.code)
                    ? "border-[#0B5CAD] bg-[#E8F0FE] text-[#0B5CAD]"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={coverage.addons.includes(addon.code)}
                  onChange={() => toggleAddon(addon.code)}
                  className="accent-[#0B5CAD]"
                />
                {addon.label}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
