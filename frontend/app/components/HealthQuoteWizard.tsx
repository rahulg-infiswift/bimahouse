"use client";

import { useState } from "react";
import { HeartPulse, Shield, CheckCircle2 } from "lucide-react";
import { WizardShell, type StepDef } from "./quote-shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Members {
  self_age: number;
  spouse: boolean;
  spouse_age: number | null;
  children_count: number;
  children_ages: number[];
}

interface Coverage {
  sum_insured: number;
  room_type: "shared" | "single" | "suite";
  pre_existing_conditions: boolean;
  maternity_cover: boolean;
}

interface Proposer {
  city_tier: "metro" | "tier1" | "tier2" | "rural";
  pincode: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HealthQuoteWizardProps {
  apiUrl: string;
  fetchFn?: (url: string, init: RequestInit) => Promise<Response>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS: StepDef[] = [
  { label: "Members", icon: HeartPulse },
  { label: "Coverage", icon: Shield },
  { label: "Results", icon: CheckCircle2 },
];

const SUM_INSURED_OPTIONS = [
  { value: 300000, label: "₹3 Lakh" },
  { value: 500000, label: "₹5 Lakh" },
  { value: 1000000, label: "₹10 Lakh" },
  { value: 1500000, label: "₹15 Lakh" },
  { value: 2500000, label: "₹25 Lakh" },
  { value: 5000000, label: "₹50 Lakh" },
  { value: 10000000, label: "₹1 Crore" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HealthQuoteWizard({ apiUrl, fetchFn }: HealthQuoteWizardProps) {
  const [members, setMembers] = useState<Members>({
    self_age: 30,
    spouse: false,
    spouse_age: null,
    children_count: 0,
    children_ages: [],
  });

  const [coverage, setCoverage] = useState<Coverage>({
    sum_insured: 500000,
    room_type: "single",
    pre_existing_conditions: false,
    maternity_cover: false,
  });

  const [proposer, setProposer] = useState<Proposer>({
    city_tier: "metro",
    pincode: "",
  });

  const buildPayload = () => ({ members, coverage, proposer });

  return (
    <WizardShell
      steps={STEPS}
      apiUrl={apiUrl}
      fetchFn={fetchFn}
      buildPayload={buildPayload}
    >
      {(step) => (
        <>
          {step === 0 && <MembersStep members={members} onChange={setMembers} />}
          {step === 1 && (
            <CoverageStep
              coverage={coverage}
              proposer={proposer}
              onCoverageChange={setCoverage}
              onProposerChange={setProposer}
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

function MembersStep({
  members,
  onChange,
}: {
  members: Members;
  onChange: (m: Members) => void;
}) {
  const update = (fields: Partial<Members>) => onChange({ ...members, ...fields });

  const setChildrenCount = (count: number) => {
    const ages = [...members.children_ages];
    while (ages.length < count) ages.push(5);
    update({ children_count: count, children_ages: ages.slice(0, count) });
  };

  const setChildAge = (index: number, age: number) => {
    const ages = [...members.children_ages];
    ages[index] = age;
    update({ children_ages: ages });
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Family Members
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Your Age
          </label>
          <input
            type="number"
            min={18}
            max={80}
            value={members.self_age}
            onChange={(e) => update({ self_age: parseInt(e.target.value) || 18 })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          />
        </div>

        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={members.spouse}
              onChange={(e) =>
                update({
                  spouse: e.target.checked,
                  spouse_age: e.target.checked ? members.spouse_age ?? 28 : null,
                })
              }
              className="accent-[#0B5CAD]"
            />
            Include Spouse
          </label>
        </div>

        {members.spouse && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Spouse Age
            </label>
            <input
              type="number"
              min={18}
              max={80}
              value={members.spouse_age ?? 28}
              onChange={(e) => update({ spouse_age: parseInt(e.target.value) || 18 })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Number of Children
          </label>
          <select
            value={members.children_count}
            onChange={(e) => setChildrenCount(parseInt(e.target.value))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          >
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {members.children_ages.map((age, i) => (
          <div key={i}>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Child {i + 1} Age
            </label>
            <input
              type="number"
              min={0}
              max={25}
              value={age}
              onChange={(e) => setChildAge(i, parseInt(e.target.value) || 0)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CoverageStep({
  coverage,
  proposer,
  onCoverageChange,
  onProposerChange,
}: {
  coverage: Coverage;
  proposer: Proposer;
  onCoverageChange: (c: Coverage) => void;
  onProposerChange: (p: Proposer) => void;
}) {
  const updateCov = (fields: Partial<Coverage>) =>
    onCoverageChange({ ...coverage, ...fields });
  const updateProp = (fields: Partial<Proposer>) =>
    onProposerChange({ ...proposer, ...fields });

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Coverage & Location
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Sum Insured
          </label>
          <select
            value={coverage.sum_insured}
            onChange={(e) => updateCov({ sum_insured: parseInt(e.target.value) })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          >
            {SUM_INSURED_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Room Type
          </label>
          <div className="flex gap-4 mt-1">
            {(["shared", "single", "suite"] as const).map((rt) => (
              <label
                key={rt}
                className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
              >
                <input
                  type="radio"
                  name="room_type"
                  checked={coverage.room_type === rt}
                  onChange={() => updateCov({ room_type: rt })}
                  className="accent-[#0B5CAD]"
                />
                {rt.charAt(0).toUpperCase() + rt.slice(1)}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={coverage.pre_existing_conditions}
              onChange={(e) => updateCov({ pre_existing_conditions: e.target.checked })}
              className="accent-[#0B5CAD]"
            />
            Pre-existing Conditions
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={coverage.maternity_cover}
              onChange={(e) => updateCov({ maternity_cover: e.target.checked })}
              className="accent-[#0B5CAD]"
            />
            Maternity Cover
          </label>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            City Tier
          </label>
          <select
            value={proposer.city_tier}
            onChange={(e) => updateProp({ city_tier: e.target.value as Proposer["city_tier"] })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          >
            <option value="metro">Metro</option>
            <option value="tier1">Tier 1</option>
            <option value="tier2">Tier 2</option>
            <option value="rural">Rural</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Pincode
          </label>
          <input
            type="text"
            placeholder="e.g. 400001"
            value={proposer.pincode}
            onChange={(e) => updateProp({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#0B5CAD] focus:outline-none focus:ring-1 focus:ring-[#0B5CAD]"
          />
        </div>
      </div>
    </div>
  );
}
