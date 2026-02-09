"use client";

import { useEffect, useState } from "react";

import { getPartnerToken, getPartnerInfo, subscribePartnerSession, PartnerInfo } from "./partner-auth";

export function usePartnerSession() {
  const [partnerToken, setPartnerToken] = useState<string | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [partnerReady, setPartnerReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setPartnerToken(getPartnerToken());
      setPartnerInfo(getPartnerInfo());
      setPartnerReady(true);
    };
    sync();
    return subscribePartnerSession(sync);
  }, []);

  return { partnerToken, partnerInfo, partnerReady };
}
