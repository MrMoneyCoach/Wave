"use client";

import { useState } from "react";
import SettingsForm, { Row } from "@/components/SettingsForm";

export default function ShareAppearanceForm({
  quizId,
  initial,
  placeholderTitle,
}: {
  quizId: string;
  initial: {
    metaTitle: string;
    metaDescription: string;
    shareImageUrl: string;
  };
  placeholderTitle: string;
}) {
  const [metaTitle, setMetaTitle] = useState(initial.metaTitle);
  const [metaDescription, setMetaDescription] = useState(initial.metaDescription);
  const [shareImageUrl, setShareImageUrl] = useState(initial.shareImageUrl);

  return (
    <SettingsForm
      quizId={quizId}
      build={() => ({ metaTitle, metaDescription, shareImageUrl })}
    >
      <p className="text-sm text-slate-500">
        Control how this scorecard appears when shared on social platforms like
        Facebook, LinkedIn, X, and in messaging apps.
      </p>

      <Row
        label="Title"
        description="Something to pique the interest of others on social media — e.g. 'Discover your influence score'."
      >
        <input
          className="input"
          value={metaTitle}
          onChange={(e) => setMetaTitle(e.target.value)}
          placeholder={placeholderTitle}
          maxLength={200}
        />
      </Row>

      <Row
        label="Description"
        description="A brief description, usually 2-4 sentences. Shown below the title in social previews."
      >
        <textarea
          className="input min-h-[110px]"
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          placeholder="A 3-minute scorecard that gives you a personalised PDF report and a clear next step."
          maxLength={500}
        />
      </Row>

      <Row
        label="Image"
        description="Recommended dimensions are 1280 × 720. Used as the preview image when the scorecard URL is shared."
      >
        <div className="space-y-2">
          <input
            type="url"
            className="input"
            value={shareImageUrl}
            onChange={(e) => setShareImageUrl(e.target.value)}
            placeholder="https://..."
          />
          {shareImageUrl && (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shareImageUrl}
                alt=""
                className="h-auto w-full max-w-md object-cover"
              />
            </div>
          )}
        </div>
      </Row>
    </SettingsForm>
  );
}
