"use client";

import React from "react";

function formatLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isScalar(v: unknown): boolean {
  return v === null || v === undefined || typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

function formatScalar(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

// ---------------------------------------------------------------------------
// Render a flat object as a two-column key/value table
// ---------------------------------------------------------------------------

function KVTable({ obj }: { obj: Record<string, unknown> }) {
  const entries = Object.entries(obj);
  // Separate scalar fields from nested fields
  const scalarEntries = entries.filter(([, v]) => isScalar(v));
  const nestedEntries = entries.filter(([, v]) => !isScalar(v));

  return (
    <div className="space-y-3">
      {scalarEntries.length > 0 && (
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <tbody>
              {scalarEntries.map(([key, value]) => (
                <tr key={key} className="hover:bg-slate-50">
                  <td className="border-b border-slate-100 px-3 py-2 text-xs font-medium text-slate-500 w-1/3 align-top whitespace-nowrap">
                    {formatLabel(key)}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-900 align-top">
                    {formatScalar(value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nestedEntries.map(([key, value]) => (
        <div key={key} className="rounded-lg border border-slate-100 overflow-hidden">
          <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            {formatLabel(key)}
          </div>
          <div className="p-3">
            <DataRenderer data={value} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Render an array of objects as a proper table
// ---------------------------------------------------------------------------

function ObjectListTable({ list }: { list: Record<string, unknown>[] }) {
  const cols = Array.from(new Set(list.flatMap((x) => Object.keys(x))));

  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-slate-50">
          <tr>
            {cols.map((h) => (
              <th
                key={h}
                className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600 whitespace-nowrap"
              >
                {formatLabel(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map((row, idx) => (
            <tr key={idx} className="hover:bg-slate-50">
              {cols.map((c) => (
                <td
                  key={c}
                  className="border-b border-slate-100 px-3 py-2 align-top text-slate-700 whitespace-pre-wrap"
                >
                  {isScalar(row[c])
                    ? formatScalar(row[c])
                    : isPlainObject(row[c])
                      ? Object.entries(row[c] as Record<string, unknown>)
                          .map(([k, v]) => `${formatLabel(k)}: ${formatScalar(v)}`)
                          .join("\n")
                      : formatScalar(JSON.stringify(row[c]))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic recursive renderer
// ---------------------------------------------------------------------------

function DataRenderer({ data }: { data: unknown }) {
  if (isScalar(data)) {
    return <span className="text-sm text-slate-900">{formatScalar(data)}</span>;
  }

  if (isPlainObject(data)) {
    return <KVTable obj={data} />;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-sm text-slate-400">—</span>;
    }
    if (data.every(isPlainObject)) {
      return <ObjectListTable list={data as Record<string, unknown>[]} />;
    }
    if (data.every(isScalar)) {
      return (
        <span className="text-sm text-slate-900">
          {data.map((v) => formatScalar(v)).join(", ")}
        </span>
      );
    }
    // Mixed array — render each item
    return (
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={i} className="rounded border border-slate-100 p-2">
            <DataRenderer data={item} />
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-sm text-slate-500">{String(data)}</span>;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PolicyViewer({ data }: { data: unknown }) {
  if (!data) {
    return <div className="text-sm text-slate-500">No extracted data yet.</div>;
  }

  if (!isPlainObject(data)) {
    return <DataRenderer data={data} />;
  }

  const entries = Object.entries(data);

  return (
    <div className="space-y-4">
      {entries.map(([section, value]) => (
        <div key={section} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">{formatLabel(section)}</h3>
          </div>
          <div className="p-4">
            <DataRenderer data={value} />
          </div>
        </div>
      ))}
    </div>
  );
}
