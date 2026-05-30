"use client";

import { useMemo } from "react";
import ShareButtons from "./ShareButtons";
import ReferralProgress from "./ReferralProgress";

type Props = {
  email?: string | null;
  referralCode: string;
  referralCount?: number;
  alreadyJoined?: boolean;
  theme?: "light" | "dark";
};

export default function WaitlistSuccess({
  email,
  referralCode,
  referralCount = 0,
  alreadyJoined = false,
  theme = "light",
}: Props) {
  const referralUrl = useMemo(() => {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "https://wearebornbare.com");
    return `${origin}/?ref=${referralCode}`;
  }, [referralCode]);

  const isDark = theme === "dark";

  return (
    <div className={isDark ? "text-bare" : "text-earth"}>
      <p className="font-sans text-caption uppercase tracking-[0.28em] text-stone mb-4">
        {alreadyJoined ? "You're already on the list" : "On the list. Welcome."}
      </p>
      <p className="font-serif italic text-[clamp(1.5rem,2.4vw,2rem)] leading-snug max-w-prose">
        {alreadyJoined
          ? "Thanks for coming back. Your link is below — share it and we'll thank you when we launch."
          : "Better sleep is on its way. Share your link to skip the queue."}
      </p>
      {email && (
        <p className="mt-3 font-sans text-caption text-stone">
          {alreadyJoined ? "Found you at " : "We'll be in touch at "}
          {email}.
        </p>
      )}

      <div className="mt-10 max-w-prose">
        <ShareButtons url={referralUrl} />
      </div>

      <div className="mt-12 pt-10 border-t border-earth/10 max-w-prose">
        <ReferralProgress count={referralCount} />
      </div>
    </div>
  );
}
