"use client";

const EMPLOYEE_TOKEN_KEY = "bimahouse_employee_token";
const EMPLOYEE_INFO_KEY = "bimahouse_employee_info";
const EMPLOYEE_SESSION_EVENT = "bimahouse:employee-session-changed";

export interface EmployeeInfo {
  user_id: string;
  role: string;
  full_name?: string | null;
  primary_email?: string | null;
}

export function getEmployeeToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(EMPLOYEE_TOKEN_KEY);
}

export function getEmployeeInfo(): EmployeeInfo | null {
  if (typeof window === "undefined") return null;
  const data = window.localStorage.getItem(EMPLOYEE_INFO_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as EmployeeInfo;
  } catch {
    return null;
  }
}

export function setEmployeeToken(token: string, info?: EmployeeInfo): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EMPLOYEE_TOKEN_KEY, token);
  if (info) {
    window.localStorage.setItem(EMPLOYEE_INFO_KEY, JSON.stringify(info));
  }
  window.dispatchEvent(new Event(EMPLOYEE_SESSION_EVENT));
}

export function clearEmployeeToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(EMPLOYEE_TOKEN_KEY);
  window.localStorage.removeItem(EMPLOYEE_INFO_KEY);
  window.dispatchEvent(new Event(EMPLOYEE_SESSION_EVENT));
}

export function subscribeEmployeeSession(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === EMPLOYEE_TOKEN_KEY || event.key === EMPLOYEE_INFO_KEY) listener();
  };

  window.addEventListener(EMPLOYEE_SESSION_EVENT, listener);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(EMPLOYEE_SESSION_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
