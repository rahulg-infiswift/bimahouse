"use client";

import { useEffect, useState } from "react";
import {
  EmployeeInfo,
  getEmployeeInfo,
  getEmployeeToken,
  subscribeEmployeeSession,
} from "./employee-auth";

export function useEmployeeSession() {
  const [employeeToken, setEmployeeToken] = useState<string | null>(null);
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo | null>(null);
  const [employeeReady, setEmployeeReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setEmployeeToken(getEmployeeToken());
      setEmployeeInfo(getEmployeeInfo());
      setEmployeeReady(true);
    };
    sync();
    return subscribeEmployeeSession(sync);
  }, []);

  return { employeeToken, employeeInfo, employeeReady };
}
