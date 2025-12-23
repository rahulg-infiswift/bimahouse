"use client";

import React from "react";

function stringify(v: any) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function isPlainObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-gray-50">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="border-b px-3 py-2 text-left text-xs font-semibold text-gray-600"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              {r.map((c, j) => (
                <td
                  key={j}
                  className="border-b px-3 py-2 align-top text-gray-800 whitespace-pre-wrap"
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ObjectAsKV({ obj }: { obj: Record<string, any> }) {
  const headers = ["Field", "Value"];
  const rows = Object.entries(obj).map(([k, v]) => [k, stringify(v)]);
  return <Table headers={headers} rows={rows} />;
}

function ListOfObjectsAsTable({ list }: { list: Record<string, any>[] }) {
  const cols = Array.from(new Set(list.flatMap((x) => Object.keys(x)))).sort();
  const rows = list.map((row) => cols.map((c) => stringify(row[c])));
  return <Table headers={cols} rows={rows} />;
}

export default function PolicyViewer({ data }: { data: any }) {
  if (!data) {
    return <div className="text-sm text-gray-600">No extracted JSON yet.</div>;
  }

  // If it's not an object, just render it
  if (!isPlainObject(data)) {
    return <pre className="text-xs leading-5 whitespace-pre-wrap">{stringify(data)}</pre>;
  }

  const entries = Object.entries(data as Record<string, any>);

  return (
    <div className="space-y-4">
      {entries.map(([section, value]) => (
        <div key={section} className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-800">{section}</h3>
          </div>

          <div className="p-4">
            {isPlainObject(value) ? (
              <ObjectAsKV obj={value} />
            ) : Array.isArray(value) && value.length > 0 && value.every(isPlainObject) ? (
              <ListOfObjectsAsTable list={value as Record<string, any>[]} />
            ) : Array.isArray(value) ? (
              <pre className="text-xs leading-5 whitespace-pre-wrap">{stringify(value)}</pre>
            ) : (
              <div className="text-sm text-gray-800">{stringify(value)}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
