"use client";

import { useState } from "react";
import SettingsForm, { Row } from "@/components/SettingsForm";

type Initial = {
  logoUrl: string;
  squareIconUrl: string;
  brandColor: string;
  secondaryColor: string;
};

export default function BrandingSettingsForm({
  quizId,
  initial,
}: {
  quizId: string;
  initial: Initial;
}) {
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [squareIconUrl, setSquareIconUrl] = useState(initial.squareIconUrl);
  const [brandColor, setBrandColor] = useState(initial.brandColor);
  const [secondaryColor, setSecondaryColor] = useState(initial.secondaryColor);

  return (
    <SettingsForm
      quizId={quizId}
      build={() => ({
        logoUrl,
        squareIconUrl,
        brandColor,
        secondaryColor,
      })}
    >
      <Row
        label="Logo"
        description="Used on landing pages, the question screen header and the PDF report."
      >
        <ImageUrlField
          value={logoUrl}
          onChange={setLogoUrl}
          placeholder="https://..."
          previewClassName="h-14 w-auto max-w-[220px] object-contain"
        />
      </Row>

      <Row
        label="Icon"
        description="A square icon used as a fallback thumbnail and in the dashboard list."
      >
        <ImageUrlField
          value={squareIconUrl}
          onChange={setSquareIconUrl}
          placeholder="https://..."
          previewClassName="h-16 w-16 rounded-md object-cover"
        />
      </Row>

      <Row
        label="Primary brand colour"
        description="Used for buttons, score bars and accents."
      >
        <ColorField value={brandColor} onChange={setBrandColor} />
      </Row>

      <Row
        label="Secondary brand colour"
        description="Used for headers and dark backgrounds."
      >
        <ColorField value={secondaryColor} onChange={setSecondaryColor} />
      </Row>
    </SettingsForm>
  );
}

function ImageUrlField({
  value,
  onChange,
  placeholder,
  previewClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  previewClassName: string;
}) {
  return (
    <div className="space-y-2">
      <input
        type="url"
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className={previewClassName} />
        </div>
      )}
    </div>
  );
}

function ColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-14 cursor-pointer rounded-md border border-slate-200"
      />
      <input
        className="input max-w-[160px] font-mono text-sm uppercase"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        pattern="^#[0-9a-fA-F]{6}$"
        maxLength={7}
      />
    </div>
  );
}
