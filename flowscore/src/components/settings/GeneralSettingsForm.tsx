"use client";

import { useState } from "react";
import SettingsForm, { Row } from "@/components/SettingsForm";

export default function GeneralSettingsForm({
  quizId,
  initial,
  publicHost,
}: {
  quizId: string;
  initial: { title: string; slug: string };
  publicHost: string;
}) {
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);

  return (
    <SettingsForm
      quizId={quizId}
      build={() => ({ title, slug })}
    >
      <Row
        label="Name"
        description="Give your scorecard a punchy name that intrigues your audience."
      >
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="The Financial Clarity Scorecard"
          required
        />
      </Row>

      <Row
        label="Scorecard URL"
        description="The path on your Flowscore subdomain where this scorecard is reachable. Lowercase letters, numbers and dashes only."
      >
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
            https://{publicHost}/q/
          </span>
          <input
            className="input flex-1 min-w-[180px]"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            pattern="[a-z0-9\-]+"
            required
          />
        </div>
      </Row>

      <Row
        label="Language"
        description="The language of default UI strings (buttons, error messages, etc.). English-only for now — more locales coming."
      >
        <select className="input max-w-xs" value="en" disabled>
          <option value="en">English</option>
        </select>
      </Row>
    </SettingsForm>
  );
}
