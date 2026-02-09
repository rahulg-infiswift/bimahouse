"use client";

import { useState } from "react";
import PospApplicationForm, {
  emptyPospApplicationFields,
  PospApplicationFields,
} from "../components/PospApplicationForm";

type ApplyResponse = {
  application_id: string;
  display_id: string;
  lead_display_id: string;
  partner_display_id?: string | null;
  status: string;
  email_verified: boolean;
  created_via: string;
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function BecomePartnerPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profile, setProfile] = useState<PospApplicationFields>(emptyPospApplicationFields);
  const [documents, setDocuments] = useState<Record<string, File | null>>({
    aadhaar: null,
    pan: null,
    marksheet_10: null,
    cancelled_cheque: null,
    photo: null,
    other: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ApplyResponse | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedPan = (profile.pan_number || "").trim().toUpperCase();

    if (!trimmedName) {
      setError("Full name is required.");
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!trimmedPhone || !/^\d{10}$/.test(trimmedPhone.replace(/\D/g, ""))) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    if (!(profile.business_location || "").trim()) {
      setError("Business location is required.");
      return;
    }
    if (trimmedPan && !/^([A-Z]{5}[0-9]{4}[A-Z])$/.test(trimmedPan)) {
      setError("Please enter a valid PAN number (e.g. ABCDE1234F).");
      return;
    }
    if (profile.aadhaar_number?.trim() && !/^\d{12}$/.test(profile.aadhaar_number.replace(/\D/g, ""))) {
      setError("Please enter a valid 12-digit Aadhaar number.");
      return;
    }
    if (profile.pincode?.trim() && !/^\d{6}$/.test(profile.pincode.replace(/\D/g, ""))) {
      setError("Please enter a valid 6-digit pincode.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/v1/public/partner-applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          ...profile,
          pan_number: trimmedPan || undefined,
        }),
      });

      if (!res.ok) {
        let detail = "Unable to submit application.";
        try {
          const body = await res.json();
          if (typeof body?.detail === "string") detail = body.detail;
        } catch {
          // keep default
        }
        throw new Error(detail);
      }

      const data = (await res.json()) as ApplyResponse;
      setUploading(true);
      const uploads = Object.entries(documents).filter(([, file]) => file);
      for (const [docType, file] of uploads) {
        const form = new FormData();
        form.append("file", file as File);
        const uploadResp = await fetch(
          `${API}/v1/public/partner-applications/${data.application_id}/documents?doc_type=${encodeURIComponent(docType)}`,
          { method: "POST", body: form }
        );
        if (!uploadResp.ok) {
          throw new Error(`Upload failed for ${docType}: ${uploadResp.status}`);
        }
      }
      setSuccess(data);
      setFullName("");
      setEmail("");
      setPhone("");
      setProfile(emptyPospApplicationFields);
      setDocuments({
        aadhaar: null,
        pan: null,
        marksheet_10: null,
        cancelled_cheque: null,
        photo: null,
        other: null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit application.");
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  }

  return (
    <main className="py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-8 shadow-sm mb-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white shadow-sm">
            Partner Network
          </span>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">Become a Bima House Partner</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-3xl">
            Join our partner network and grow your insurance business with structured onboarding, product support, and claims assistance.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">POSP Application Form</h2>
          <p className="mt-1 text-sm text-slate-600">Fill the form below and submit your application.</p>
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
            Required fields: Full Name, Email, Phone, Business Location.
          </div>

          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">Full Name *</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Your full name"
              />
            </label>

            <label>
              <span className="text-xs font-medium text-slate-600">Email *</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="name@example.com"
              />
            </label>

            <label>
              <span className="text-xs font-medium text-slate-600">Phone *</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="10-digit mobile number"
              />
            </label>

            <div className="sm:col-span-2">
              <PospApplicationForm
                value={profile}
                onChange={setProfile}
                disabled={submitting}
                compact
                requiredFields={["business_location"]}
              />
            </div>

            <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <h3 className="text-sm font-semibold text-slate-700">Document Attachments</h3>
              <p className="mt-1 text-xs text-slate-500">Upload clear scans/photos for verification.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {[
                  { key: "aadhaar", label: "Aadhaar Card" },
                  { key: "pan", label: "PAN Card" },
                  { key: "marksheet_10", label: "10th Marksheet" },
                  { key: "cancelled_cheque", label: "Cancelled Cheque" },
                  { key: "photo", label: "Passport Photo" },
                  { key: "other", label: "Other (optional)" },
                ].map((item) => (
                  <label key={item.key} className="block">
                    <span className="text-xs font-medium text-slate-600">{item.label}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-slate-800"
                      onChange={(e) =>
                        setDocuments((prev) => ({
                          ...prev,
                          [item.key]: e.target.files?.[0] ?? null,
                        }))
                      }
                      disabled={submitting || uploading}
                    />
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {error}
              </div>
            )}

            {success && (
              <div className="sm:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Application submitted successfully. Reference ID: <span className="font-semibold">{success.lead_display_id}</span>
              </div>
            )}

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting || uploading}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white shadow-md shadow-blue-200 hover:bg-blue-700 disabled:opacity-60"
              >
                {uploading ? "Uploading..." : submitting ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
