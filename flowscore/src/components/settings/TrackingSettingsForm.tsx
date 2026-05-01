"use client";

import { useState } from "react";
import SettingsForm, { Row } from "@/components/SettingsForm";

export default function TrackingSettingsForm({
  quizId,
  initial,
}: {
  quizId: string;
  initial: {
    facebookPixelId: string;
    googleAnalyticsCode: string;
    googleTagManagerId: string;
    customTrackingScript: string;
  };
}) {
  const [facebookPixelId, setFbId] = useState(initial.facebookPixelId);
  const [googleAnalyticsCode, setGaCode] = useState(initial.googleAnalyticsCode);
  const [googleTagManagerId, setGtmId] = useState(initial.googleTagManagerId);
  const [customTrackingScript, setCustomScript] = useState(
    initial.customTrackingScript,
  );

  return (
    <SettingsForm
      quizId={quizId}
      build={() => ({
        facebookPixelId,
        googleAnalyticsCode,
        googleTagManagerId,
        customTrackingScript,
      })}
    >
      <Row
        label="Facebook Pixel"
        description="Add page-view tracking to all landing pages, the question screen and result page."
      >
        <input
          className="input"
          value={facebookPixelId}
          onChange={(e) => setFbId(e.target.value)}
          placeholder="Facebook Pixel ID (e.g. 1234567890123456)"
        />
      </Row>

      <Row
        label="Google Analytics"
        description="Paste your full GA4 / Universal Analytics snippet, or just the Measurement ID."
      >
        <textarea
          className="input min-h-[120px] font-mono text-xs"
          value={googleAnalyticsCode}
          onChange={(e) => setGaCode(e.target.value)}
          placeholder="<!-- Paste your GA snippet here -->"
        />
      </Row>

      <Row
        label="Google Tag Manager"
        description="Container ID, e.g. GTM-XXXXXX. Loaded across all public scorecard pages."
      >
        <input
          className="input"
          value={googleTagManagerId}
          onChange={(e) => setGtmId(e.target.value)}
          placeholder="GTM-XXXXXX"
        />
      </Row>

      <Row
        label="Custom tracking script"
        description="Anything else you need — chat widget, heatmap, etc. Loaded after the page is ready."
      >
        <textarea
          className="input min-h-[180px] font-mono text-xs"
          value={customTrackingScript}
          onChange={(e) => setCustomScript(e.target.value)}
          placeholder="<script>...</script>"
        />
      </Row>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        Heads up: tracking scripts run in the visitor's browser. Only paste code
        from sources you trust — bad scripts can break the whole page or
        compromise data.
      </div>
    </SettingsForm>
  );
}
