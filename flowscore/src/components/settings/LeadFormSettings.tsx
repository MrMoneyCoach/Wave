"use client";

import { useState } from "react";
import SettingsForm, { Row } from "@/components/SettingsForm";

type FieldType = "text" | "email" | "tel" | "company" | "url";

type ExtraField = {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
};

type Initial = {
  privacyPolicyUrl: string;
  optinConsent: "implied" | "optional" | "required";
  optinWording: string;
  privacyStatement: string;
  formBehaviour: "before" | "after";
  emailValidation: "none" | "basic" | "strict";
  extraFields: ExtraField[];
};

const BUILT_IN_FIELDS = [
  { key: "firstName", label: "First name", type: "text", required: true },
  { key: "lastName", label: "Last name", type: "text", required: false },
  { key: "email", label: "Email", type: "email", required: true },
  { key: "phone", label: "Phone", type: "tel", required: false },
] as const;

export default function LeadFormSettings({
  quizId,
  initial,
}: {
  quizId: string;
  initial: Initial;
}) {
  const [fields, setFields] = useState<ExtraField[]>(initial.extraFields);
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState(initial.privacyPolicyUrl);
  const [optinConsent, setOptinConsent] = useState(initial.optinConsent);
  const [optinWording, setOptinWording] = useState(initial.optinWording);
  const [privacyStatement, setPrivacyStatement] = useState(initial.privacyStatement);
  const [formBehaviour, setFormBehaviour] = useState(initial.formBehaviour);
  const [emailValidation, setEmailValidation] = useState(initial.emailValidation);

  function addField() {
    const i = fields.length + 1;
    setFields([
      ...fields,
      { key: `custom_${i}`, label: `Custom field ${i}`, type: "text", required: false },
    ]);
  }

  function updateField(idx: number, patch: Partial<ExtraField>) {
    setFields(fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }

  function removeField(idx: number) {
    setFields(fields.filter((_, i) => i !== idx));
  }

  return (
    <SettingsForm
      quizId={quizId}
      build={() => ({
        privacyPolicyUrl,
        optinConsent,
        optinWording,
        privacyStatement,
        formBehaviour,
        emailValidation,
        leadFormFields: fields,
      })}
    >
      <Row
        label="Form fields"
        description="First name and email are required by default. Custom fields are saved with the scorecard but are not yet rendered on the public form — coming next."
      >
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Label</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Required</th>
                <th className="px-3 py-2 text-right" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {BUILT_IN_FIELDS.map((f) => (
                <tr key={f.key} className="border-t border-slate-100 text-slate-500">
                  <td className="px-3 py-2 italic">{f.label}</td>
                  <td className="px-3 py-2 capitalize">{f.type}</td>
                  <td className="px-3 py-2">
                    {f.required ? "Yes" : "Optional"}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">built-in</td>
                </tr>
              ))}
              {fields.map((f, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <input
                      className="input"
                      value={f.label}
                      onChange={(e) => updateField(idx, { label: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="input"
                      value={f.type}
                      onChange={(e) =>
                        updateField(idx, { type: e.target.value as FieldType })
                      }
                    >
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="tel">Phone</option>
                      <option value="company">Company</option>
                      <option value="url">URL</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={f.required}
                        onChange={(e) =>
                          updateField(idx, { required: e.target.checked })
                        }
                      />
                      Required
                    </label>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeField(idx)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={addField}
            className="block w-full border-t border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            + Add field
          </button>
        </div>
      </Row>

      <Row
        label="Optin consent"
        description="How explicit GDPR consent should be when capturing leads."
      >
        <fieldset className="space-y-2">
          {(
            [
              [
                "implied",
                "Implied consent",
                "No optin checkbox shown to the visitor.",
              ],
              [
                "optional",
                "Explicit (optional)",
                "Visitors see an optin checkbox but can continue without ticking.",
              ],
              [
                "required",
                "Explicit (required)",
                "Visitors see an optin checkbox and must tick it to continue.",
              ],
            ] as const
          ).map(([value, label, hint]) => (
            <label
              key={value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm transition ${
                optinConsent === value
                  ? "border-brand-500 bg-brand-50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="optinConsent"
                value={value}
                checked={optinConsent === value}
                onChange={() => setOptinConsent(value)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium text-slate-900">{label}</span>
                <span className="block text-slate-500">{hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </Row>

      <Row label="Optin wording" description="Shown next to the consent checkbox.">
        <input
          className="input"
          value={optinWording}
          onChange={(e) => setOptinWording(e.target.value)}
        />
      </Row>

      <Row
        label="Privacy statement"
        description="A short paragraph shown alongside the form."
      >
        <textarea
          className="input min-h-[100px]"
          value={privacyStatement}
          onChange={(e) => setPrivacyStatement(e.target.value)}
        />
      </Row>

      <Row label="Privacy policy URL" description="Linked from the lead form.">
        <input
          type="url"
          className="input"
          value={privacyPolicyUrl}
          onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
          placeholder="https://example.com/privacy"
        />
      </Row>

      <Row
        label="Form behaviour"
        description="When the lead form is shown in the quiz flow."
      >
        <fieldset className="space-y-2">
          {(
            [
              [
                "before",
                "Before questions",
                "People can't start the questions without filling in the lead form first.",
              ],
              [
                "after",
                "After questions (coming next)",
                "People answer the questions first, then fill in the form to see results. Setting saves now but the flip is rolling out — currently the form always shows before questions.",
              ],
            ] as const
          ).map(([value, label, hint]) => (
            <label
              key={value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm transition ${
                formBehaviour === value
                  ? "border-brand-500 bg-brand-50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="formBehaviour"
                value={value}
                checked={formBehaviour === value}
                onChange={() => setFormBehaviour(value)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium text-slate-900">{label}</span>
                <span className="block text-slate-500">{hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </Row>

      <Row
        label="Email validation"
        description="How aggressively to filter out throwaway / role / disposable emails."
      >
        <select
          className="input max-w-xs"
          value={emailValidation}
          onChange={(e) =>
            setEmailValidation(e.target.value as "none" | "basic" | "strict")
          }
        >
          <option value="none">None — accept any email</option>
          <option value="basic">Basic — reject obviously invalid syntax</option>
          <option value="strict">Strict — also block disposable / role addresses (coming next)</option>
        </select>
      </Row>
    </SettingsForm>
  );
}
