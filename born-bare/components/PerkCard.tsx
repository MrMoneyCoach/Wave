"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { PerkTier } from "@/lib/perkTiers";
import { savings } from "@/lib/perkTiers";
import EmailCapture from "./EmailCapture";
import { cn } from "@/lib/utils";

type Props = {
  tier: PerkTier;
  index: number;
};

const ribbonAccent: Record<string, string> = {
  "Most popular": "bg-clay text-bare",
  "Early bird": "bg-sage/80 text-earth",
  Limited: "bg-earth text-bare",
  "Very limited": "bg-earth text-bare",
};

export default function PerkCard({ tier, index }: Props) {
  const [open, setOpen] = useState(false);
  const save = savings(tier);

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.9,
        ease: [0.22, 1, 0.36, 1],
        delay: (index % 3) * 0.08,
      }}
      className={cn(
        "relative flex flex-col bg-bare border border-earth/10 p-8 lg:p-10",
        tier.featured && "border-clay/40 shadow-[0_4px_30px_-12px_rgba(184,145,122,0.4)] lg:scale-[1.02]"
      )}
    >
      {tier.ribbon && (
        <span
          className={cn(
            "absolute -top-3 left-8 px-3 py-1 text-[10px] uppercase tracking-[0.24em] font-medium",
            ribbonAccent[tier.ribbon] ?? "bg-skin text-earth"
          )}
        >
          {tier.ribbon}
        </span>
      )}

      <div className="flex items-baseline justify-between gap-4 mb-6">
        <span className="font-sans text-caption uppercase tracking-[0.28em] text-stone">
          Tier {String(tier.number).padStart(2, "0")}
        </span>
        {save !== null && (
          <span className="font-sans text-caption uppercase tracking-[0.2em] text-clay">
            Save {save}%
          </span>
        )}
      </div>

      <h3 className="font-serif font-light text-earth text-[clamp(1.6rem,2.4vw,2rem)] leading-tight">
        {tier.name}
      </h3>
      <p className="mt-2 font-serif italic text-earth/65 text-body">
        {tier.tagline}
      </p>

      <div className="mt-8 flex items-baseline gap-3">
        <span className="font-serif font-light text-earth text-[clamp(2.5rem,4.5vw,3.5rem)] leading-none">
          £{tier.price}
        </span>
        {tier.retailValue && tier.retailValue > tier.price && (
          <span className="font-sans text-caption text-stone line-through">
            £{tier.retailValue}
          </span>
        )}
      </div>

      <ul className="mt-8 space-y-3 text-body text-earth/80">
        {tier.inclusions.map((item) => (
          <li key={item} className="flex gap-3 leading-relaxed">
            <span aria-hidden className="text-stone mt-[0.4em] text-xs">
              &mdash;
            </span>
            <span className="text-pretty">{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-10 pt-8 border-t border-earth/10">
        {open ? (
          <EmailCapture
            source={tier.waitlistSource}
            placeholder="Your email"
            ctaLabel="Notify me"
            successLabel="Saved. We'll be in touch."
            showConsent={false}
            className="text-left"
          />
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "w-full text-btn uppercase tracking-[0.18em] font-medium py-4 transition-colors duration-300 ease-calm",
              tier.featured
                ? "bg-clay text-bare hover:bg-clay/90"
                : "bg-earth text-bare hover:bg-earth/90"
            )}
            aria-label={`Notify me about ${tier.name}`}
          >
            Notify me at launch
          </button>
        )}
      </div>
    </motion.article>
  );
}
