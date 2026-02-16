"use client";

import { setEmployeeToken, getEmployeeRefreshToken, EmployeeInfo, clearEmployeeToken } from "./employee-auth";
import { setPartnerToken, getPartnerRefreshToken, PartnerInfo, clearPartnerToken } from "./partner-auth";

export async function refreshEmployeeSession(apiBase: string): Promise<string | null> {
  const refreshToken = getEmployeeRefreshToken();
  if (!refreshToken) return null;
  try {
    // Exchange refresh token for a new access token (silent re-auth).
    const res = await fetch(`${apiBase}/v1/employee-auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || typeof body?.access_token !== "string") {
      // Refresh rejected or malformed response: clear local session.
      clearEmployeeToken();
      return null;
    }
    const info: EmployeeInfo = {
      user_id: String(body.employee_id || ""),
      role: String(body.role || ""),
      full_name: typeof body.full_name === "string" ? body.full_name : null,
      primary_email: typeof body.primary_email === "string" ? body.primary_email : null,
    };
    setEmployeeToken(body.access_token, info, body.refresh_token);
    return body.access_token;
  } catch {
    // Network or parsing failure: clear local session to avoid loops.
    clearEmployeeToken();
    return null;
  }
}

export async function refreshPartnerSession(apiBase: string): Promise<string | null> {
  const refreshToken = getPartnerRefreshToken();
  if (!refreshToken) return null;
  try {
    // Exchange refresh token for a new access token (silent re-auth).
    const res = await fetch(`${apiBase}/v1/partner-auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || typeof body?.access_token !== "string") {
      // Refresh rejected or malformed response: clear local session.
      clearPartnerToken();
      return null;
    }
    const info: PartnerInfo = {
      full_name: body.full_name || "Partner",
      email: body.email || "",
      partner_application_id: body.partner_application_id || "",
      partner_display_id: body.partner_display_id,
    };
    setPartnerToken(body.access_token, info, body.refresh_token);
    return body.access_token;
  } catch {
    // Network or parsing failure: clear local session to avoid loops.
    clearPartnerToken();
    return null;
  }
}

export async function fetchWithEmployeeRefresh(
  apiBase: string,
  url: string,
  token: string,
  init?: RequestInit
): Promise<Response> {
  // First attempt with the current access token.
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.status !== 401) return res;
  // Retry once after refresh if the access token was rejected.
  const refreshed = await refreshEmployeeSession(apiBase);
  if (!refreshed) return res;
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${refreshed}`,
    },
  });
}

export async function fetchWithPartnerRefresh(
  apiBase: string,
  url: string,
  token: string,
  init?: RequestInit
): Promise<Response> {
  // First attempt with the current access token.
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.status !== 401) return res;
  // Retry once after refresh if the access token was rejected.
  const refreshed = await refreshPartnerSession(apiBase);
  if (!refreshed) return res;
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${refreshed}`,
    },
  });
}
