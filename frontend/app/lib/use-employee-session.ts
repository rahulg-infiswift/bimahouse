"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  EmployeeInfo,
  getEmployeeInfo,
  getEmployeeToken,
  getEmployeeRefreshToken,
  isEmployeeTokenExpired,
  subscribeEmployeeSession,
  clearEmployeeToken,
  setEmployeeToken,
} from "./employee-auth";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export function useEmployeeSession() {
  const { isSignedIn } = useUser();
  const [employeeToken, setEmployeeTokenState] = useState<string | null>(null);
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo | null>(null);
  const [employeeReady, setEmployeeReady] = useState(false);

  useEffect(() => {
    const sync = async () => {
      // Clerk session takes precedence. Ignore local employee OTP session when Clerk user is signed in.
      if (isSignedIn) {
        setEmployeeTokenState(null);
        setEmployeeInfo(null);
        setEmployeeReady(true);
        return;
      }
      const token = getEmployeeToken();
      // Proactive refresh: if the access token expired, try refresh once on load.
      if (token && isEmployeeTokenExpired(token)) {
        const refreshToken = getEmployeeRefreshToken();
        if (refreshToken) {
          try {
            const res = await fetch(`${API}/v1/employee-auth/refresh`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh_token: refreshToken }),
            });
            const body = await res.json().catch(() => ({}));
            if (res.ok && typeof body?.access_token === "string") {
              const info: EmployeeInfo = {
                user_id: String(body.employee_id || ""),
                role: String(body.role || ""),
                full_name: typeof body.full_name === "string" ? body.full_name : null,
                primary_email: typeof body.primary_email === "string" ? body.primary_email : null,
              };
              setEmployeeToken(body.access_token, info, body.refresh_token);
              setEmployeeTokenState(body.access_token);
              setEmployeeInfo(info);
              setEmployeeReady(true);
              return;
            }
          } catch {
            // fall through to clear
          }
        }
        // Refresh failed: clear local session and treat as logged out.
        clearEmployeeToken();
        setEmployeeTokenState(null);
        setEmployeeInfo(null);
        setEmployeeReady(true);
        return;
      }
      setEmployeeTokenState(token);
      setEmployeeInfo(getEmployeeInfo());
      setEmployeeReady(true);
    };
    void sync();
    return subscribeEmployeeSession(() => {
      void sync();
    });
  }, [isSignedIn]);

  return { employeeToken, employeeInfo, employeeReady };
}
