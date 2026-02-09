"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePartnerSession } from "../lib/use-partner-session";
import { UserRole } from "../lib/roles";

interface HomePageWrapperProps {
  clerkUserId: string | null;
  clerkRole: UserRole | null;
  LoggedOutHome: ReactNode;
  CustomerHome: ReactNode;
  PartnerDashboard: ReactNode;
}

export default function HomePageWrapper({
  clerkUserId,
  clerkRole,
  LoggedOutHome,
  CustomerHome,
  PartnerDashboard,
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
    if (clerkRole === "partner") {
      return <>{PartnerDashboard}</>;
    }
    return <>{CustomerHome}</>;
  }

  // Not logged in
  return <>{LoggedOutHome}</>;
}
