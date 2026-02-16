"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

import {
  getPartnerToken,
  getPartnerInfo,
  getPartnerRefreshToken,
  isPartnerTokenExpired,
  subscribePartnerSession,
  PartnerInfo,
  clearPartnerToken,
  setPartnerToken,
} from "./partner-auth";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export function usePartnerSession() {
  const { isSignedIn } = useUser();
  const [partnerToken, setPartnerTokenState] = useState<string | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [partnerReady, setPartnerReady] = useState(false);

  useEffect(() => {
    const sync = async () => {
      // Clerk session takes precedence. Ignore local partner OTP session when Clerk user is signed in.
      if (isSignedIn) {
        setPartnerTokenState(null);
        setPartnerInfo(null);
        setPartnerReady(true);
        return;
      }
      const token = getPartnerToken();
      // Proactive refresh: if the access token expired, try refresh once on load.
      if (token && isPartnerTokenExpired(token)) {
        const refreshToken = getPartnerRefreshToken();
        if (refreshToken) {
          try {
            const res = await fetch(`${API}/v1/partner-auth/refresh`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh_token: refreshToken }),
            });
            const body = await res.json().catch(() => ({}));
            if (res.ok && typeof body?.access_token === "string") {
              const info: PartnerInfo = {
                full_name: body.full_name || "Partner",
                email: body.email || "",
                partner_application_id: body.partner_application_id || "",
                partner_display_id: body.partner_display_id,
              };
              setPartnerToken(body.access_token, info, body.refresh_token);
              setPartnerTokenState(body.access_token);
              setPartnerInfo(info);
              setPartnerReady(true);
              return;
            }
          } catch {
            // fall through to clear
          }
        }
        // Refresh failed: clear local session and treat as logged out.
        clearPartnerToken();
        setPartnerTokenState(null);
        setPartnerInfo(null);
        setPartnerReady(true);
        return;
      }
      setPartnerTokenState(token);
      setPartnerInfo(getPartnerInfo());
      setPartnerReady(true);
    };
    void sync();
    return subscribePartnerSession(() => {
      void sync();
    });
  }, [isSignedIn]);

  return { partnerToken, partnerInfo, partnerReady };
}
