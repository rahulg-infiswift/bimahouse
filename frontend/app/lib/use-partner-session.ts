"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

import { getPartnerToken, getPartnerInfo, subscribePartnerSession, PartnerInfo } from "./partner-auth";

export function usePartnerSession() {
  const { isSignedIn } = useUser();
  const [partnerToken, setPartnerToken] = useState<string | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [partnerReady, setPartnerReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      // Clerk session takes precedence. Ignore local partner OTP session when Clerk user is signed in.
      if (isSignedIn) {
        setPartnerToken(null);
        setPartnerInfo(null);
        setPartnerReady(true);
        return;
      }
      setPartnerToken(getPartnerToken());
      setPartnerInfo(getPartnerInfo());
      setPartnerReady(true);
    };
    sync();
    return subscribePartnerSession(sync);
  }, [isSignedIn]);

  return { partnerToken, partnerInfo, partnerReady };
}
