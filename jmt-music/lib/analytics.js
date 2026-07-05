"use client";

import { sendGAEvent } from "@next/third-parties/google";

export function trackEvent(name, parameters = {}) {
  if (process.env.NEXT_PUBLIC_GA_ID) {
    sendGAEvent("event", name, parameters);
  }

  if (process.env.NEXT_PUBLIC_CLARITY_ID && typeof window.clarity === "function") {
    window.clarity("event", name);
  }
}
