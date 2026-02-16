"use client";

import { ReactNode, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
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
  const { getToken } = useAuth();
  const { partnerToken, partnerReady } = usePartnerSession();
  const { employeeToken, employeeReady } = useEmployeeSession();
  const syncedUser = useRef(false);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  useEffect(() => {
    if (!clerkUserId || syncedUser.current) return;
    syncedUser.current = true;

    async function ensureUserRecord() {
      const token = await getToken();
      if (!token) return;
      // Ensure a local users row exists for Clerk users (auto-create on demand).
      await fetch(`${apiBase}/v1/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    }

    void ensureUserRecord();
  }, [apiBase, clerkUserId, getToken]);

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
