"use client";

const PARTNER_TOKEN_KEY = "bimahouse_partner_token";
const PARTNER_REFRESH_TOKEN_KEY = "bimahouse_partner_refresh_token";
const PARTNER_INFO_KEY = "bimahouse_partner_info";
const PARTNER_SESSION_EVENT = "bimahouse:partner-session-changed";

export interface PartnerInfo {
  full_name: string;
  email: string;
  partner_application_id: string;
  partner_display_id?: string;
}

type JwtPayload = {
  exp?: number;
  [key: string]: unknown;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function isPartnerTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return true;
  return Date.now() >= payload.exp * 1000;
}

export function getPartnerToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PARTNER_TOKEN_KEY);
}

export function getPartnerRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PARTNER_REFRESH_TOKEN_KEY);
}

export function getPartnerInfo(): PartnerInfo | null {
  if (typeof window === "undefined") return null;
  const data = window.localStorage.getItem(PARTNER_INFO_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as PartnerInfo;
  } catch {
    return null;
  }
}

export function setPartnerToken(token: string, info?: PartnerInfo, refreshToken?: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PARTNER_TOKEN_KEY, token);
  if (refreshToken) {
    window.localStorage.setItem(PARTNER_REFRESH_TOKEN_KEY, refreshToken);
  }
  if (info) {
    window.localStorage.setItem(PARTNER_INFO_KEY, JSON.stringify(info));
  }
  window.dispatchEvent(new Event(PARTNER_SESSION_EVENT));
}

export function clearPartnerToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PARTNER_TOKEN_KEY);
  window.localStorage.removeItem(PARTNER_REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(PARTNER_INFO_KEY);
  window.dispatchEvent(new Event(PARTNER_SESSION_EVENT));
}

export function subscribePartnerSession(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === PARTNER_TOKEN_KEY || event.key === PARTNER_INFO_KEY) listener();
  };

  window.addEventListener(PARTNER_SESSION_EVENT, listener);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(PARTNER_SESSION_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
