import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const line1 = ["Nothing", "between", "your", "baby"];
const line2 = ["and", "a", "better", "night’s", "sleep."];

export default function Promise() {
  const root = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        ".promise-eyebrow",
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: root.current, start: "top 70%", once: true },
        }
      );

      gsap.fromTo(
        ".promise-word",
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: 1.4,
          ease: "power4.out",
          stagger: 0.08,
          scrollTrigger: { trigger: ".promise-headline", start: "top 80%", once: true },
        }
      );

      gsap.fromTo(
        ".promise-body",
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: { trigger: ".promise-body", start: "top 85%", once: true },
        }
      );
    },
    { scope: root }
  );

  return (
    <section
      ref={root}
      id="story"
      className="relative bg-bare py-40 sm:py-56"
    >
      <div className="mx-auto max-w-page px-6 sm:px-10">
        <p className="promise-eyebrow font-sans text-[11px] uppercase tracking-[0.34em] text-earth/45 mb-12 opacity-0">
          The promise
        </p>

        <h2 className="promise-headline font-serif font-light text-earth leading-[1.05] text-balance text-[clamp(2rem,5vw,3.75rem)] max-w-4xl">
          {line1.map((w, i) => (
            <span key={`a${i}`} className="reveal-mask mr-[0.22em]">
              <span className="promise-word reveal-word">{w}</span>
            </span>
          ))}
          <br className="hidden sm:block" />
          {line2.map((w, i) => (
            <span key={`b${i}`} className="reveal-mask mr-[0.22em] last:mr-0">
              <span className="promise-word reveal-word">{w}</span>
            </span>
          ))}
        </h2>

        <p className="promise-body mt-16 max-w-xl text-earth/70 leading-relaxed text-base opacity-0">
          We strip away everything unnecessary. The chemicals, the plastics, the noise.
          What&rsquo;s left is bamboo-soft, gentle on the most sensitive skin, and made for the
          quiet hours that matter most.
        </p>
      </div>
    </section>
  );
}
