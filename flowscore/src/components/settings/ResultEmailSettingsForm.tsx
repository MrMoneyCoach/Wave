"use client";

import { useState } from "react";
import SettingsForm, { Row } from "@/components/SettingsForm";

const TOKENS: { token: string; label: string }[] = [
  { token: "{{firstName}}", label: "First name" },
  { token: "{{lastName}}", label: "Last name" },
  { token: "{{quizTitle}}", label: "Quiz title" },
  { token: "{{percent}}", label: "Percent score" },
  { token: "{{outcomeTitle}}", label: "Outcome title" },
  { token: "{{outcomeDescription}}", label: "Outcome description" },
  { token: "{{ownerName}}", label: "Your name" },
];

const DEFAULTS = {
  emailSubject: "Your {{quizTitle}} results",
  emailGreeting: "Hi {{firstName}},",
  emailIntro:
    "Thank you for completing the {{quizTitle}}. Your personalised report is attached as a PDF.\n\nYou scored {{percent}}% — {{outcomeTitle}}.",
  emailBullets: "",
  emailBookingLine: "Want to talk through your results? Book a no-obligation call.",
  emailSignoff: "Thanks,\n— {{ownerName}}",
};

export default function ResultEmailSettingsForm({
  quizId,
  initial,
}: {
  quizId: string;
  initial: {
    emailSubject: string;
    emailGreeting: string;
    emailIntro: string;
    emailBullets: string;
    emailBookingLine: string;
    emailSignoff: string;
  };
}) {
  const [emailSubject, setEmailSubject] = useState(initial.emailSubject);
  const [emailGreeting, setEmailGreeting] = useState(initial.emailGreeting);
  const [emailIntro, setEmailIntro] = useState(initial.emailIntro);
  const [emailBullets, setEmailBullets] = useState(initial.emailBullets);
  const [emailBookingLine, setEmailBookingLine] = useState(initial.emailBookingLine);
  const [emailSignoff, setEmailSignoff] = useState(initial.emailSignoff);

  return (
    <SettingsForm
      quizId={quizId}
      build={() => ({
        emailSubject,
        emailGreeting,
        emailIntro,
        emailBullets,
        emailBookingLine,
        emailSignoff,
      })}
    >
      <p className="text-sm text-slate-500">
        Sent to the respondent after they finish the quiz, with the PDF report
        attached. Leave any field blank to use the default — the placeholder
        shows what that default is. Tokens like{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[12px]">
          {"{{firstName}}"}
        </code>{" "}
        are replaced when the email is sent.
      </p>

      <Row label="Subject">
        <input
          className="input"
          value={emailSubject}
          onChange={(e) => setEmailSubject(e.target.value)}
          placeholder={DEFAULTS.emailSubject}
        />
      </Row>

      <Row label="Greeting">
        <input
          className="input"
          value={emailGreeting}
          onChange={(e) => setEmailGreeting(e.target.value)}
          placeholder={DEFAULTS.emailGreeting}
        />
      </Row>

      <Row label="Intro">
        <textarea
          className="input min-h-[120px]"
          value={emailIntro}
          onChange={(e) => setEmailIntro(e.target.value)}
          placeholder={DEFAULTS.emailIntro}
        />
      </Row>

      <Row
        label="Bullet list"
        description="One per line, optional. Renders as a checkmark list."
      >
        <textarea
          className="input min-h-[100px]"
          value={emailBullets}
          onChange={(e) => setEmailBullets(e.target.value)}
          placeholder={"Financial planning\nInvestment planning\nTax planning"}
        />
      </Row>

      <Row
        label="Line above the booking button"
        description="Only shown when this scorecard has a booking URL set."
      >
        <textarea
          className="input min-h-[80px]"
          value={emailBookingLine}
          onChange={(e) => setEmailBookingLine(e.target.value)}
          placeholder={DEFAULTS.emailBookingLine}
        />
      </Row>

      <Row label="Sign-off">
        <textarea
          className="input min-h-[80px]"
          value={emailSignoff}
          onChange={(e) => setEmailSignoff(e.target.value)}
          placeholder={DEFAULTS.emailSignoff}
        />
      </Row>

      <Row label="Tokens" description="Drop these into any field above.">
        <ul className="grid gap-1 text-xs sm:grid-cols-2">
          {TOKENS.map((t) => (
            <li key={t.token} className="flex justify-between gap-3 font-mono">
              <code className="rounded bg-slate-100 px-1.5 py-0.5">{t.token}</code>
              <span className="text-slate-400">{t.label}</span>
            </li>
          ))}
        </ul>
      </Row>
    </SettingsForm>
  );
}
