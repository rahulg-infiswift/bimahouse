"use client";

import { Building2, CreditCard, FileBadge2, UserRound } from "lucide-react";

export type PospApplicationFields = {
  date_of_birth?: string;
  gender?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  business_location?: string;
  current_insurance_experience?: string;
  preferred_products?: string;
  bank_name?: string;
  account_holder_name?: string;
  account_number?: string;
  ifsc_code?: string;
  branch_name?: string;
  pan_number?: string;
  aadhaar_number?: string;
};

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

export const emptyPospApplicationFields: PospApplicationFields = {
  date_of_birth: "",
  gender: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  pincode: "",
  business_location: "",
  current_insurance_experience: "",
  preferred_products: "",
  bank_name: "",
  account_holder_name: "",
  account_number: "",
  ifsc_code: "",
  branch_name: "",
  pan_number: "",
  aadhaar_number: "",
};

type Props = {
  value: PospApplicationFields;
  onChange: (next: PospApplicationFields) => void;
  disabled?: boolean;
  required?: boolean;
  requiredFields?: Array<keyof PospApplicationFields>;
  compact?: boolean;
};

export default function PospApplicationForm({
  value,
  onChange,
  disabled = false,
  required = false,
  requiredFields = [],
  compact = true,
}: Props) {
  const wrap = compact ? "mt-4 space-y-4" : "mt-6 space-y-6";
  const label = "text-xs font-medium text-slate-600";
  const input = compact
    ? "mt-1 w-full rounded-sm border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    : "mt-1 w-full rounded-sm border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const requiredSet = new Set(requiredFields);
  const isRequired = (field: keyof PospApplicationFields) => required || requiredSet.has(field);
  const req = (field: keyof PospApplicationFields) => (isRequired(field) ? " *" : "");

  return (
    <div className={wrap}>
      <div>
        <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#0B1F3B]">
          <Building2 className="h-4 w-4 text-[#0B5CAD]" />
          Professional Details
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Business Location{req("business_location")}</span>
            <input
              type="text"
              value={value.business_location || ""}
              onChange={(e) => onChange({ ...value, business_location: e.target.value })}
              className={input}
              placeholder="City or area where you operate"
              disabled={disabled}
              required={isRequired("business_location")}
            />
          </label>
          <label className="block">
            <span className={label}>Current Insurance Experience (Years){req("current_insurance_experience")}</span>
            <input
              type="number"
              min={0}
              max={60}
              step={1}
              value={value.current_insurance_experience || ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  current_insurance_experience: e.target.value.replace(/\D/g, ""),
                })
              }
              className={input}
              placeholder="e.g., 3"
              disabled={disabled}
              required={isRequired("current_insurance_experience")}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>Preferred Products{req("preferred_products")}</span>
            <input
              type="text"
              value={value.preferred_products || ""}
              onChange={(e) => onChange({ ...value, preferred_products: e.target.value })}
              className={input}
              placeholder="Motor, Health, Life, Travel, etc."
              disabled={disabled}
              required={isRequired("preferred_products")}
            />
          </label>
        </div>
      </div>

      <div>
        <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#0B1F3B]">
          <UserRound className="h-4 w-4 text-[#0B5CAD]" />
          Personal Details
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Date of Birth{req("date_of_birth")}</span>
            <input
              type="date"
              value={value.date_of_birth || ""}
              onChange={(e) => onChange({ ...value, date_of_birth: e.target.value })}
              className={input}
              disabled={disabled}
              required={isRequired("date_of_birth")}
            />
          </label>
          <label className="block">
            <span className={label}>Gender{req("gender")}</span>
            <select
              value={value.gender || ""}
              onChange={(e) => onChange({ ...value, gender: e.target.value })}
              className={input}
              disabled={disabled}
              required={isRequired("gender")}
            >
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>Address Line 1{req("address_line1")}</span>
            <input
              type="text"
              value={value.address_line1 || ""}
              onChange={(e) => onChange({ ...value, address_line1: e.target.value })}
              className={input}
              placeholder="House/Flat No., Building Name, Street"
              disabled={disabled}
              required={isRequired("address_line1")}
            />
          </label>
          <label className="block">
            <span className={label}>Address Line 2{req("address_line2")}</span>
            <input
              type="text"
              value={value.address_line2 || ""}
              onChange={(e) => onChange({ ...value, address_line2: e.target.value })}
              className={input}
              placeholder="Landmark, Area"
              disabled={disabled}
              required={isRequired("address_line2")}
            />
          </label>
          <label className="block">
            <span className={label}>City{req("city")}</span>
            <input
              type="text"
              value={value.city || ""}
              onChange={(e) => onChange({ ...value, city: e.target.value })}
              className={input}
              placeholder="City"
              disabled={disabled}
              required={isRequired("city")}
            />
          </label>
          <label className="block">
            <span className={label}>State{req("state")}</span>
            <select
              value={value.state || ""}
              onChange={(e) => onChange({ ...value, state: e.target.value })}
              className={input}
              disabled={disabled}
              required={isRequired("state")}
            >
              <option value="">Select State</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>Pincode{req("pincode")}</span>
            <input
              type="text"
              value={value.pincode || ""}
              onChange={(e) => onChange({ ...value, pincode: e.target.value.replace(/\D/g, "") })}
              className={input}
              placeholder="6-digit PIN"
              maxLength={6}
              disabled={disabled}
              required={isRequired("pincode")}
            />
          </label>
        </div>
      </div>

      <div>
        <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#0B1F3B]">
          <FileBadge2 className="h-4 w-4 text-[#0B5CAD]" />
          Identity Documents
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={label}>PAN Number{req("pan_number")}</span>
            <input
              type="text"
              value={value.pan_number || ""}
              onChange={(e) => onChange({ ...value, pan_number: e.target.value.toUpperCase() })}
              className={`${input} uppercase`}
              placeholder="ABCDE1234F"
              maxLength={10}
              disabled={disabled}
              required={isRequired("pan_number")}
            />
          </label>
          <label className="block">
            <span className={label}>Aadhaar Number{req("aadhaar_number")}</span>
            <input
              type="text"
              value={value.aadhaar_number || ""}
              onChange={(e) => onChange({ ...value, aadhaar_number: e.target.value.replace(/\D/g, "") })}
              className={input}
              placeholder="123456789012"
              maxLength={12}
              disabled={disabled}
              required={isRequired("aadhaar_number")}
            />
          </label>
        </div>
      </div>

      <div>
        <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#0B1F3B]">
          <CreditCard className="h-4 w-4 text-[#0B5CAD]" />
          Bank Details
        </h3>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Bank Name{req("bank_name")}</span>
              <input
                type="text"
                value={value.bank_name || ""}
                onChange={(e) => onChange({ ...value, bank_name: e.target.value })}
                className={input}
                placeholder="e.g., State Bank of India"
                disabled={disabled}
                required={isRequired("bank_name")}
              />
            </label>
            <label className="block">
              <span className={label}>Branch Name{req("branch_name")}</span>
              <input
                type="text"
                value={value.branch_name || ""}
                onChange={(e) => onChange({ ...value, branch_name: e.target.value })}
                className={input}
                placeholder="Branch name"
                disabled={disabled}
                required={isRequired("branch_name")}
              />
            </label>
          </div>
          <label className="block">
            <span className={label}>Account Holder Name{req("account_holder_name")}</span>
            <input
              type="text"
              value={value.account_holder_name || ""}
              onChange={(e) => onChange({ ...value, account_holder_name: e.target.value })}
              className={input}
              placeholder="Name as per bank records"
              disabled={disabled}
              required={isRequired("account_holder_name")}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Account Number{req("account_number")}</span>
              <input
                type="text"
                value={value.account_number || ""}
                onChange={(e) => onChange({ ...value, account_number: e.target.value.replace(/\D/g, "") })}
                className={input}
                placeholder="Account number"
                disabled={disabled}
                required={isRequired("account_number")}
              />
            </label>
            <label className="block">
              <span className={label}>IFSC Code{req("ifsc_code")}</span>
              <input
                type="text"
                value={value.ifsc_code || ""}
                onChange={(e) => onChange({ ...value, ifsc_code: e.target.value.toUpperCase() })}
                className={`${input} uppercase`}
                placeholder="e.g., SBIN0001234"
                maxLength={11}
                disabled={disabled}
                required={isRequired("ifsc_code")}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
