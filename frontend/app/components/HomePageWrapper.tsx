"use client";

import { ReactNode } from "react";
import { usePartnerSession } from "../lib/use-partner-session";
import { useEmployeeSession } from "../lib/use-employee-session";

interface HomePageWrapperProps {
  clerkUserId: string | null;
  LoggedOutHome: ReactNode;
  CustomerHome: ReactNode;
  PartnerHome: ReactNode;
  EmployeeHome: ReactNode;
}

export default function HomePageWrapper({
  clerkUserId,
  LoggedOutHome,
  CustomerHome,
  PartnerHome,
  EmployeeHome,
}: HomePageWrapperProps) {
  const { partnerToken, partnerReady } = usePartnerSession();
  const { employeeToken, employeeReady } = useEmployeeSession();

  // Wait until client is mounted to check partner token
  if (!partnerReady || !employeeReady) {
    // Show loading or the server-rendered content temporarily
    // For SSR, show based on Clerk auth only
    if (clerkUserId) {
      return <>{CustomerHome}</>;
    }
    return <>{LoggedOutHome}</>;
  }

  // Clerk user logged in
  if (clerkUserId) {
    return <>{CustomerHome}</>;
  }

  // OTP sessions apply only when no Clerk user is signed in.
  if (employeeToken) {
    return <>{EmployeeHome}</>;
  }

  if (partnerToken) {
    return <>{PartnerHome}</>;
  }

  // Not logged in
  return <>{LoggedOutHome}</>;
}
