"use client";

import { useState } from "react";
import SettingsForm, { Row } from "@/components/SettingsForm";

const DEFAULTS = {
  subject: "{{firstName}}, you were almost there…",
  intro:
    "Hi {{firstName}},\n\nYou started the {{quizTitle}} but didn't quite finish. We'd love to send you the personalised report — it only takes a couple more minutes to complete.\n\nResume right where you left off:",
  signoff: "Thanks,\n— {{ownerName}}",
};

export default function AbandonEmailSettingsForm({
  quizId,
  initial,
}: {
  quizId: string;
  initial: {
    abandonEmailEnabled: boolean;
    abandonEmailSubject: string;
    abandonEmailIntro: string;
    abandonEmailSignoff: string;
  };
}) {
  const [enabled, setEnabled] = useState(initial.abandonEmailEnabled);
  const [subject, setSubject] = useState(initial.abandonEmailSubject);
  const [intro, setIntro] = useState(initial.abandonEmailIntro);
  const [signoff, setSignoff] = useState(initial.abandonEmailSignoff);

  return (
    <SettingsForm
      quizId={quizId}
      build={() => ({
        abandonEmailEnabled: enabled,
        abandonEmailSubject: subject,
        abandonEmailIntro: intro,
        abandonEmailSignoff: signoff,
      })}
    >
      <Row
        label="Send abandon email"
        description="Sent within an hour of a respondent dropping off mid-quiz, with a link to resume right where they left off."
      >
        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-medium ${enabled ? "text-emerald-600" : "text-slate-400"}`}
          >
            {enabled ? "Yes" : "No"}
          </span>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            role="switch"
            aria-checked={enabled}
            className={`relative h-6 w-11 rounded-full border transition ${
              enabled
                ? "border-brand-600 bg-brand-600"
                : "border-slate-300 bg-slate-200"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                enabled ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </Row>

      <Row label="Subject">
        <input
          className="input"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={DEFAULTS.subject}
          disabled={!enabled}
        />
        <p className="text-xs text-slate-500">
          Tokens: {"{{firstName}}"}, {"{{quizTitle}}"}
        </p>
      </Row>

      <Row label="Intro">
        <textarea
          className="input min-h-[160px]"
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          placeholder={DEFAULTS.intro}
          disabled={!enabled}
        />
      </Row>

      <Row label="Sign-off">
        <textarea
          className="input min-h-[80px]"
          value={signoff}
          onChange={(e) => setSignoff(e.target.value)}
          placeholder={DEFAULTS.signoff}
          disabled={!enabled}
        />
      </Row>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        Note: actually sending the abandon email requires a background scheduler
        we'll add as the next step. The settings save now, but the send loop
        isn't wired up yet.
      </div>
    </SettingsForm>
  );
}
