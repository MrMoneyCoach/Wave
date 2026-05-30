"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Item = {
  q: string;
  a: string;
};

type Props = {
  items: Item[];
};

export default function Accordion({ items }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <ul className="divide-y divide-earth/15 border-y border-earth/15">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              className="w-full flex items-baseline justify-between gap-6 py-7 text-left text-earth"
            >
              <span className="font-serif text-[clamp(1.15rem,1.6vw,1.4rem)] leading-tight text-balance">
                {item.q}
              </span>
              <span
                aria-hidden
                className={cn(
                  "shrink-0 mt-1 text-stone text-2xl font-light leading-none transition-transform duration-500 ease-calm",
                  open && "rotate-45"
                )}
              >
                +
              </span>
            </button>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-500 ease-calm",
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <p className="text-body text-earth/75 max-w-prose pb-7 leading-relaxed">
                  {item.a}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
