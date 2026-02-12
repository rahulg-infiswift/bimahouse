"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type CountryOption = {
  code: string;
  label: string;
  shortLabel: string;
};

type CountryCodeSelectProps = {
  options: readonly CountryOption[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
};

export default function CountryCodeSelect({
  options,
  value,
  onChange,
  disabled = false,
  className = "",
}: CountryCodeSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.code === value) ?? options[0];

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-sm border border-slate-200 bg-white px-2.5 py-3 text-sm text-slate-700 focus:border-[#0B5CAD] focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected.shortLabel}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-sm border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((option) => (
            <button
              key={option.code}
              type="button"
              onClick={() => {
                onChange(option.code);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[#F5F9FF] ${
                value === option.code ? "font-semibold text-[#0B5CAD]" : "text-slate-700"
              }`}
              role="option"
              aria-selected={value === option.code}
              title={option.label}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
