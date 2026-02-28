"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Loader2,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuoteItem {
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

export interface QuoteResult {
  quotes: QuoteItem[];
  best_value_insurer: string | null;
  disclaimer: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const INSURER_NAMES: Record<string, string> = {
  icici: "ICICI Lombard",
  tata_agi: "Tata AIG",
  hdfc_ergo: "HDFC ERGO",
  star_health: "Star Health",
  care_health: "Care Health",
  bajaj_allianz: "Bajaj Allianz",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return `₹${value.toLocaleString("en-IN")}`;
}

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

export interface StepDef {
  label: string;
  icon: LucideIcon;
}

export function StepIndicator({
  steps,
  current,
}: {
  steps: StepDef[];
  current: number;
}) {
  return (
    <nav className="mb-8 flex items-center justify-center gap-1 sm:gap-2">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const isActive = i === current;
        const isDone = i < current;
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
  );
}

// ---------------------------------------------------------------------------
// Results Step
// ---------------------------------------------------------------------------

export function ResultsStep({
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
          No quotes available. Please check your details and try again.
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
                    {q.idv != null && (
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
                    )}
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
// Wizard Shell
// ---------------------------------------------------------------------------

interface WizardShellProps {
  steps: StepDef[];
  apiUrl: string;
  fetchFn?: (url: string, init: RequestInit) => Promise<Response>;
  buildPayload: () => Record<string, unknown>;
  children: (step: number) => React.ReactNode;
}

export function WizardShell({
  steps,
  apiUrl,
  fetchFn,
  buildPayload,
  children,
}: WizardShellProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuoteResult | null>(null);

  const lastInputStep = steps.length - 2; // step before Results

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const doFetch = fetchFn || ((url: string, init: RequestInit) => fetch(url, init));
      const res = await doFetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
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

  const goNext = () => {
    if (step === lastInputStep) {
      handleSubmit();
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const goBack = () => {
    setError(null);
    if (step === steps.length - 1) {
      setResult(null);
    }
    setStep((s) => Math.max(s - 1, 0));
  };

  const isResultsStep = step === steps.length - 1;

  return (
    <div className="mx-auto max-w-2xl">
      <StepIndicator steps={steps} current={step} />

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {isResultsStep ? (
          <ResultsStep
            loading={loading}
            error={error}
            result={result}
            onRetry={handleSubmit}
          />
        ) : (
          children(step)
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={goBack}
          disabled={step === 0}
          className="flex items-center gap-1 rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:invisible"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        {!isResultsStep && (
          <button
            onClick={goNext}
            className="flex items-center gap-1 rounded-md bg-[#0B5CAD] px-5 py-2 text-sm font-medium text-white hover:bg-[#094a8d] transition-colors"
          >
            {step === lastInputStep ? "Get Quotes" : "Next"}
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {isResultsStep && !loading && result && (
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
