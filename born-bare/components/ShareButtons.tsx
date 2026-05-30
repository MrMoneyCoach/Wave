"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  url: string;
  className?: string;
};

const SHARE_TEXT = "Born Bare is launching soon — bamboo nappies for better sleep. Worth a look.";

export default function ShareButtons({ url, className }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // no-op
    }
  }

  const enc = encodeURIComponent;
  const text = enc(SHARE_TEXT);
  const link = enc(url);

  const channels = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${text}%20${link}`,
    },
    {
      label: "Email",
      href: `mailto:?subject=${enc("Nothing but sleep — Born Bare")}&body=${text}%0A%0A${link}`,
    },
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${text}&url=${link}`,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${link}`,
    },
  ];

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-stretch border border-earth/20 bg-bare">
        <input
          type="text"
          value={url}
          readOnly
          aria-label="Your referral link"
          className="flex-1 px-4 py-3 bg-transparent text-caption text-earth/85 truncate focus:outline-none"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={copy}
          className="px-5 text-btn uppercase tracking-[0.18em] font-medium bg-earth text-bare hover:bg-earth/90 transition-colors duration-300 ease-calm"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {channels.map((c) => (
          <a
            key={c.label}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-5 py-3 text-caption uppercase tracking-[0.2em] font-medium border border-earth/20 text-earth/85 hover:border-earth hover:text-earth transition-colors duration-300 ease-calm"
          >
            {c.label}
          </a>
        ))}
      </div>
    </div>
  );
}
