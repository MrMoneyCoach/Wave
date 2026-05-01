"use client";

import { useState } from "react";
import SettingsForm, { Row } from "@/components/SettingsForm";

export default function NotificationSettingsForm({
  quizId,
  ownerEmail,
  initial,
}: {
  quizId: string;
  ownerEmail: string;
  initial: {
    adminNotifyEmail: string;
    adminNotifyEnabled: boolean;
  };
}) {
  const [enabled, setEnabled] = useState(initial.adminNotifyEnabled);
  const [email, setEmail] = useState(initial.adminNotifyEmail);

  return (
    <SettingsForm
      quizId={quizId}
      build={() => ({
        adminNotifyEnabled: enabled,
        adminNotifyEmail: email,
      })}
    >
      <Row
        label="Send notifications"
        description="Get a short summary email every time a respondent completes the scorecard, with a link straight to the lead in your dashboard."
      >
        <ToggleRow value={enabled} onChange={setEnabled} />
      </Row>

      <Row
        label="Recipients"
        description="Who should receive these notifications? Defaults to your account email. Can be a shared inbox."
      >
        <input
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={ownerEmail}
          disabled={!enabled}
        />
        <p className="text-xs text-slate-500">
          Defaults to {ownerEmail}.
        </p>
      </Row>
    </SettingsForm>
  );
}

function ToggleRow({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`text-sm font-medium ${value ? "text-emerald-600" : "text-slate-400"}`}>
        {value ? "Yes" : "No"}
      </span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        className={`relative h-6 w-11 rounded-full border transition ${
          value ? "border-brand-600 bg-brand-600" : "border-slate-300 bg-slate-200"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            value ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
