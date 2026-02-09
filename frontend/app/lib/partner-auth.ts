"use client";

const PARTNER_TOKEN_KEY = "bimahouse_partner_token";

export function getPartnerToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PARTNER_TOKEN_KEY);
}

export function setPartnerToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PARTNER_TOKEN_KEY, token);
}

export function clearPartnerToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PARTNER_TOKEN_KEY);
}
