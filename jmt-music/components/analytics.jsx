"use client";

import Script from "next/script";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export function MicrosoftClarity({ projectId }) {
  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", ${JSON.stringify(projectId)});
      `}
    </Script>
  );
}

export function AnalyticsClickTracker() {
  useEffect(() => {
    const handleClick = (event) => {
      const link = event.target.closest("[data-analytics-event]");
      if (!link) return;

      trackEvent(link.dataset.analyticsEvent, {
        cta_label: link.dataset.analyticsLabel || link.textContent.trim(),
        service_name: link.dataset.analyticsService || undefined,
        link_url: link.href
      });
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
