"use client";

import { useState } from "react";
import {
  Car,
  FileText,
  Shield,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Trophy,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuoteItem {
  insurer_code: string;
  premium: number | null;
  final_premium: number | null;
  gst: number | null;
  idv: number | null;
  min_idv: number | null;
  max_idv: number | null;
  success: boolean;
  error_message: string | null;
}

interface QuoteResult {
  quotes: QuoteItem[];
  best_value_insurer: string | null;
  disclaimer: string;
}

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
  /** Full URL for the quote API endpoint */
  apiUrl: string;
  /** Function to make the fetch call (allows injecting auth) */
  fetchFn?: (url: string, init: RequestInit) => Promise<Response>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = [
  { label: "Vehicle", icon: Car },
  { label: "Policy History", icon: FileText },
  { label: "Coverage", icon: Shield },
  { label: "Results", icon: CheckCircle2 },
];

const NCB_OPTIONS = [0, 20, 25, 35, 45, 50];

const INSURER_NAMES: Record<string, string> = {
  icici: "ICICI Lombard",
  tata_agi: "Tata AIG",
};

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

export default function QuoteWizard({ apiUrl, fetchFn }: QuoteWizardProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuoteResult | null>(null);

  // Step 1: Vehicle
  const [vehicle, setVehicle] = useState<VehicleDetails>({
    registration_no: "",
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

  const goNext = () => {
    if (step === 2) {
      // Submit on advancing from coverage to results
      handleSubmit();
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError(null);
    if (step === 3) {
      setResult(null);
    }
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const body = {
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
    };

    try {
      const doFetch = fetchFn || ((url: string, init: RequestInit) => fetch(url, init));
      const res = await doFetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `Request failed (${res.status})`);
      }

      const data: QuoteResult = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Step indicator */}
      <nav className="mb-8 flex items-center justify-center gap-1 sm:gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={s.label} className="flex items-center gap-1 sm:gap-2">
              {i > 0 && (
                <div
                  className={`hidden h-px w-6 sm:block ${isDone ? "bg-[#0B5CAD]" : "bg-slate-200"}`}
                />
              )}
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[#0B5CAD] text-white"
                    : isDone
                      ? "bg-[#E8F0FE] text-[#0B5CAD]"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Step content */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {step === 0 && (
          <VehicleStep vehicle={vehicle} onChange={setVehicle} />
        )}
        {step === 1 && (
          <PolicyStep policy={policy} onChange={setPolicy} />
        )}
        {step === 2 && (
          <CoverageStep coverage={coverage} onChange={setCoverage} />
        )}
        {step === 3 && (
          <ResultsStep
            loading={loading}
            error={error}
            result={result}
            onRetry={handleSubmit}
          />
        )}
      </div>

      {/* Navigation buttons */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={goBack}
          disabled={step === 0}
          className="flex items-center gap-1 rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:invisible"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        {step < 3 && (
          <button
            onClick={goNext}
            className="flex items-center gap-1 rounded-md bg-[#0B5CAD] px-5 py-2 text-sm font-medium text-white hover:bg-[#094a8d] transition-colors"
          >
            {step === 2 ? "Get Quotes" : "Next"}
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {step === 3 && !loading && result && (
          <button
            onClick={() => {
              setResult(null);
              setStep(0);
            }}
            className="flex items-center gap-1 rounded-md bg-[#0B5CAD] px-5 py-2 text-sm font-medium text-white hover:bg-[#094a8d] transition-colors"
          >
            Start Over
          </button>
        )}
      </div>
    </div>
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

function ResultsStep({
  loading,
  error,
  result,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  result: QuoteResult | null;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-[#0B5CAD]" />
        <p className="mt-3 text-sm">Fetching quotes from insurers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="mb-4 text-sm text-red-600">{error}</p>
        <button
          onClick={onRetry}
          className="rounded-md bg-[#0B5CAD] px-4 py-2 text-sm font-medium text-white hover:bg-[#094a8d]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!result) return null;

  const successfulQuotes = result.quotes.filter((q) => q.success);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Quote Comparison
      </h2>

      {successfulQuotes.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          No quotes available. Please check your vehicle details and try again.
        </p>
      ) : (
        <div className="space-y-4">
          {successfulQuotes.map((q) => {
            const isBest = q.insurer_code === result.best_value_insurer;
            return (
              <div
                key={q.insurer_code}
                className={`relative rounded-lg border p-4 ${
                  isBest
                    ? "border-[#0B5CAD] bg-[#F5F9FF]"
                    : "border-slate-200"
                }`}
              >
                {isBest && (
                  <span className="absolute -top-2.5 left-3 flex items-center gap-1 rounded-full bg-[#0B5CAD] px-2.5 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wide">
                    <Trophy className="h-3 w-3" />
                    Best Value
                  </span>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {INSURER_NAMES[q.insurer_code] || q.insurer_code}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      IDV: {formatCurrency(q.idv)}
                      {q.min_idv && q.max_idv && (
                        <span>
                          {" "}
                          (Range: {formatCurrency(q.min_idv)} –{" "}
                          {formatCurrency(q.max_idv)})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900">
                      {formatCurrency(q.final_premium)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Premium: {formatCurrency(q.premium)} + GST:{" "}
                      {formatCurrency(q.gst)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {result.disclaimer && (
        <p className="mt-4 text-[11px] text-slate-400 italic">
          {result.disclaimer}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return `₹${value.toLocaleString("en-IN")}`;
}
