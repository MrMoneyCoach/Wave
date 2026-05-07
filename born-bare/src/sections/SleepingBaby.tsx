import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export default function SleepingBaby() {
  const root = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;

      gsap.fromTo(
        ".baby-image",
        { yPercent: -8, scale: 1.08 },
        {
          yPercent: 8,
          scale: 1.02,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );

      gsap.fromTo(
        ".baby-eyebrow",
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".baby-caption",
            start: "top 80%",
            once: true,
          },
        }
      );

      gsap.fromTo(
        ".baby-caption-line",
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: 1.4,
          ease: "power4.out",
          stagger: 0.18,
          scrollTrigger: {
            trigger: ".baby-caption",
            start: "top 80%",
            once: true,
          },
        }
      );
    },
    { scope: root }
  );

  return (
    <section ref={root} className="relative h-[110svh] bg-bare">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {/* Swap src to /images/sleeping-baby.jpg once the locked Nano Banana hero is added. */}
        <img
          src="/images/sleeping-baby.svg"
          alt=""
          aria-hidden
          className="baby-image absolute inset-[-6%] w-[112%] h-[112%] object-cover will-change-transform"
          loading="lazy"
        />

        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-earth/35 via-transparent to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-bare/95 to-transparent pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-bare pointer-events-none"
        />

        <div className="baby-caption relative h-full mx-auto max-w-page px-6 sm:px-10 flex items-end pb-32">
          <div className="max-w-md">
            <p className="baby-eyebrow font-sans text-[11px] uppercase tracking-[0.34em] text-bare/75 mb-6">
              The outcome
            </p>
            <p className="font-serif font-light italic text-bare text-balance text-[clamp(1.5rem,2.6vw,2.25rem)] leading-[1.3]">
              <span className="reveal-mask">
                <span className="baby-caption-line reveal-word">Your baby sleeps better</span>
              </span>{" "}
              <span className="reveal-mask">
                <span className="baby-caption-line reveal-word">when nothing gets in the way.</span>
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
