"use client";

export type PospApplicationFields = {
  date_of_birth?: string;
  gender?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
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
  compact?: boolean;
};

export default function PospApplicationForm({
  value,
  onChange,
  disabled = false,
  required = false,
  compact = true,
}: Props) {
  const wrap = compact ? "mt-4 space-y-4" : "mt-6 space-y-6";
  const label = "text-xs font-medium text-slate-600";
  const input = compact
    ? "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    : "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const req = required ? " *" : "";

  return (
    <div className={wrap}>
      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-700">Personal Details</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Date of Birth{req}</span>
            <input
              type="date"
              value={value.date_of_birth || ""}
              onChange={(e) => onChange({ ...value, date_of_birth: e.target.value })}
              className={input}
              disabled={disabled}
            />
          </label>
          <label className="block">
            <span className={label}>Gender{req}</span>
            <select
              value={value.gender || ""}
              onChange={(e) => onChange({ ...value, gender: e.target.value })}
              className={input}
              disabled={disabled}
            >
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-700">Identity Documents</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={label}>PAN Number{req}</span>
            <input
              type="text"
              value={value.pan_number || ""}
              onChange={(e) => onChange({ ...value, pan_number: e.target.value.toUpperCase() })}
              className={`${input} uppercase`}
              placeholder="ABCDE1234F"
              maxLength={10}
              disabled={disabled}
            />
          </label>
          <label className="block">
            <span className={label}>Aadhaar Number{req}</span>
            <input
              type="text"
              value={value.aadhaar_number || ""}
              onChange={(e) => onChange({ ...value, aadhaar_number: e.target.value.replace(/\D/g, "") })}
              className={input}
              placeholder="123456789012"
              maxLength={12}
              disabled={disabled}
            />
          </label>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-700">Address</h3>
        <div className="space-y-3">
          <label className="block">
            <span className={label}>Address Line 1{req}</span>
            <input
              type="text"
              value={value.address_line1 || ""}
              onChange={(e) => onChange({ ...value, address_line1: e.target.value })}
              className={input}
              placeholder="House/Flat No., Building Name, Street"
              disabled={disabled}
            />
          </label>
          <label className="block">
            <span className={label}>Address Line 2{req}</span>
            <input
              type="text"
              value={value.address_line2 || ""}
              onChange={(e) => onChange({ ...value, address_line2: e.target.value })}
              className={input}
              placeholder="Landmark, Area"
              disabled={disabled}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className={label}>City{req}</span>
              <input
                type="text"
                value={value.city || ""}
                onChange={(e) => onChange({ ...value, city: e.target.value })}
                className={input}
                placeholder="City"
                disabled={disabled}
              />
            </label>
            <label className="block">
              <span className={label}>State{req}</span>
              <select
                value={value.state || ""}
                onChange={(e) => onChange({ ...value, state: e.target.value })}
                className={input}
                disabled={disabled}
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
              <span className={label}>Pincode{req}</span>
              <input
                type="text"
                value={value.pincode || ""}
                onChange={(e) => onChange({ ...value, pincode: e.target.value.replace(/\D/g, "") })}
                className={input}
                placeholder="6-digit PIN"
                maxLength={6}
                disabled={disabled}
              />
            </label>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-700">Bank Details</h3>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Bank Name{req}</span>
              <input
                type="text"
                value={value.bank_name || ""}
                onChange={(e) => onChange({ ...value, bank_name: e.target.value })}
                className={input}
                placeholder="e.g., State Bank of India"
                disabled={disabled}
              />
            </label>
            <label className="block">
              <span className={label}>Branch Name{req}</span>
              <input
                type="text"
                value={value.branch_name || ""}
                onChange={(e) => onChange({ ...value, branch_name: e.target.value })}
                className={input}
                placeholder="Branch name"
                disabled={disabled}
              />
            </label>
          </div>
          <label className="block">
            <span className={label}>Account Holder Name{req}</span>
            <input
              type="text"
              value={value.account_holder_name || ""}
              onChange={(e) => onChange({ ...value, account_holder_name: e.target.value })}
              className={input}
              placeholder="Name as per bank records"
              disabled={disabled}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Account Number{req}</span>
              <input
                type="text"
                value={value.account_number || ""}
                onChange={(e) => onChange({ ...value, account_number: e.target.value.replace(/\D/g, "") })}
                className={input}
                placeholder="Account number"
                disabled={disabled}
              />
            </label>
            <label className="block">
              <span className={label}>IFSC Code{req}</span>
              <input
                type="text"
                value={value.ifsc_code || ""}
                onChange={(e) => onChange({ ...value, ifsc_code: e.target.value.toUpperCase() })}
                className={`${input} uppercase`}
                placeholder="e.g., SBIN0001234"
                maxLength={11}
                disabled={disabled}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
