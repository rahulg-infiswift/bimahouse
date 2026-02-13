"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  EmployeeInfo,
  getEmployeeInfo,
  getEmployeeToken,
  subscribeEmployeeSession,
} from "./employee-auth";

export function useEmployeeSession() {
  const { isSignedIn } = useUser();
  const [employeeToken, setEmployeeToken] = useState<string | null>(null);
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo | null>(null);
  const [employeeReady, setEmployeeReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      // Clerk session takes precedence. Ignore local employee OTP session when Clerk user is signed in.
      if (isSignedIn) {
        setEmployeeToken(null);
        setEmployeeInfo(null);
        setEmployeeReady(true);
        return;
      }
      setEmployeeToken(getEmployeeToken());
      setEmployeeInfo(getEmployeeInfo());
      setEmployeeReady(true);
    };
    sync();
    return subscribeEmployeeSession(sync);
  }, [isSignedIn]);

  return { employeeToken, employeeInfo, employeeReady };
}
