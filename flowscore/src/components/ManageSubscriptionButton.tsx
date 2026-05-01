"use client";

import { useState } from "react";

export default function ManageSubscriptionButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.url === "string") {
        window.location.href = data.url;
        return;
      }
      setError(data.error || "Could not open the billing portal");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="btn-secondary"
      >
        {busy ? "Opening…" : "Manage subscription"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
