"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePartnerSession } from "../lib/use-partner-session";
import { UserRole, isEmployeeRole } from "../lib/roles";

interface HomePageWrapperProps {
  clerkUserId: string | null;
  clerkRole: UserRole | null;
  LoggedOutHome: ReactNode;
  CustomerHome: ReactNode;
  PartnerDashboard: ReactNode;
  EmployeeHome: ReactNode;
}

export default function HomePageWrapper({
  clerkUserId,
  clerkRole,
  LoggedOutHome,
  CustomerHome,
  PartnerDashboard,
  EmployeeHome,
}: HomePageWrapperProps) {
  const { partnerToken, partnerReady } = usePartnerSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Wait until client is mounted to check partner token
  if (!mounted || !partnerReady) {
    // Show loading or the server-rendered content temporarily
    // For SSR, show based on Clerk auth only
    if (clerkUserId) {
      if (isEmployeeRole(clerkRole)) {
        return <>{EmployeeHome}</>;
      }
      if (clerkRole === "partner") {
        return <>{PartnerDashboard}</>;
      }
      return <>{CustomerHome}</>;
    }
    return <>{LoggedOutHome}</>;
  }

  // Partner logged in via OTP (localStorage token)
  if (partnerToken) {
    return <>{PartnerDashboard}</>;
  }

  // Clerk user logged in
  if (clerkUserId) {
    // Check for employee role first
    if (isEmployeeRole(clerkRole)) {
      return <>{EmployeeHome}</>;
    }
    if (clerkRole === "partner") {
      return <>{PartnerDashboard}</>;
    }
    return <>{CustomerHome}</>;
  }

  // Not logged in
  return <>{LoggedOutHome}</>;
}
