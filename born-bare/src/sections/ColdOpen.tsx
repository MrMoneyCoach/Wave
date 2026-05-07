import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import LightLeak from "../components/LightLeak";
import Grain from "../components/Grain";

const HEADLINE: { word: string; italic?: boolean }[] = [
  { word: "Better" },
  { word: "sleep" },
  { word: "starts", italic: true },
  { word: "here." },
];

export default function ColdOpen() {
  const root = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ delay: 0.4 });

      tl.to(".cold-eyebrow", {
        opacity: 1,
        y: 0,
        duration: 1.1,
        ease: "power3.out",
      })
        .to(
          ".reveal-word",
          {
            yPercent: 0,
            duration: 1.4,
            ease: "power4.out",
            stagger: 0.12,
          },
          "-=0.5"
        )
        .to(
          ".cold-cue",
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
          },
          "-=0.4"
        );

      gsap.to(".cold-cue-line", {
        scaleY: 0.4,
        transformOrigin: "top",
        duration: 1.6,
        ease: "power1.inOut",
        repeat: -1,
        yoyo: true,
      });
    },
    { scope: root }
  );

  return (
    <section
      ref={root}
      id="top"
      className="relative h-[100svh] flex items-center justify-center bg-bare overflow-hidden"
    >
      <LightLeak />
      <Grain opacity={0.09} />

      <div className="relative z-10 mx-auto max-w-page px-6 text-center">
        <p className="cold-eyebrow font-sans text-[11px] uppercase tracking-[0.34em] text-earth/45 mb-12 opacity-0 translate-y-3">
          born bare &middot; chapter one
        </p>

        <h1 className="font-serif font-light text-earth leading-[1.02] text-balance text-[clamp(2.75rem,8vw,6rem)]">
          {HEADLINE.map((item, i) => (
            <span key={i} className="reveal-mask mr-[0.25em] last:mr-0">
              <span className={`reveal-word ${item.italic ? "italic" : ""}`}>
                {item.word}
              </span>
            </span>
          ))}
        </h1>

        <div className="cold-cue mt-16 flex flex-col items-center gap-3 opacity-0 translate-y-3">
          <span className="font-sans text-[10px] uppercase tracking-[0.32em] text-earth/45">
            scroll
          </span>
          <span className="cold-cue-line block w-px h-10 bg-earth/30 origin-top" />
        </div>
      </div>

      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bare pointer-events-none z-10"
      />
    </section>
  );
}
