"use client";

import { usePartnerSession } from "../lib/use-partner-session";
import { useEmployeeSession } from "../lib/use-employee-session";

// Wrapper that hides children when partner is logged in via OTP
export function HideForPartner({ children }: { children: React.ReactNode }) {
  const { partnerToken, partnerReady } = usePartnerSession();
  const { employeeToken, employeeReady } = useEmployeeSession();

  // Show loading placeholder while checking
  if (!partnerReady || !employeeReady) {
    return <div className="invisible">{children}</div>;
  }

  // Hide if partner is logged in
  if (partnerToken || employeeToken) {
    return null;
  }

  return <>{children}</>;
}

// Wrapper that shows children only when NOT logged in (neither Clerk nor Partner OTP)
export function ShowForLoggedOut({ children }: { children: React.ReactNode }) {
  const { partnerToken, partnerReady } = usePartnerSession();
  const { employeeToken, employeeReady } = useEmployeeSession();

  // Show loading placeholder while checking
  if (!partnerReady || !employeeReady) {
    return <div className="invisible">{children}</div>;
  }

  // Hide if partner/employee is logged in
  if (partnerToken || employeeToken) {
    return null;
  }

  // Otherwise show (Clerk's SignedOut will handle the Clerk auth check in parent)
  return <>{children}</>;
}
