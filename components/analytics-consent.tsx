"use client";
import { useEffect, useState } from "react";
import { disableAnalytics, enableAnalytics, track } from "@/lib/analytics";
export default function AnalyticsConsent() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    track("landing_page_view");
  }, []);
  return (
    <div className="analytics-choice">
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            if (e.target.checked) enableAnalytics();
            else disableAnalytics();
          }}
        />
        Allow optional analytics &amp; advertising measurement
      </label>
      <span>Off by default. You can change this anytime.</span>
    </div>
  );
}
