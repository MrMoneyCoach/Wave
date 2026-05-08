import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Grain from "../components/Grain";

gsap.registerPlugin(ScrollTrigger);

const absent = ["chlorine", "latex", "parabens", "phthalates", "fragrances"];

const headlineWords = [
  { w: "Nothing", italic: true },
  { w: "you" },
  { w: "wouldn’t" },
  { w: "want" },
  { w: "on" },
  { w: "your" },
  { w: "own" },
  { w: "skin." },
];

export default function Substance() {
  const root = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        ".sub-eyebrow",
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
        ".sub-headline-word",
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: 1.4,
          ease: "power4.out",
          stagger: 0.08,
          scrollTrigger: { trigger: ".sub-headline", start: "top 75%", once: true },
        }
      );

      gsap.fromTo(
        ".sub-no-item",
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          stagger: 0.18,
          scrollTrigger: { trigger: ".sub-no-list", start: "top 80%", once: true },
        }
      );

      gsap.fromTo(
        ".sub-tail",
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: "power3.out",
          scrollTrigger: { trigger: ".sub-tail", start: "top 85%", once: true },
        }
      );
    },
    { scope: root }
  );

  return (
    <section
      ref={root}
      className="relative bg-earth text-bare py-40 sm:py-56 overflow-hidden"
    >
      <Grain opacity={0.06} className="opacity-50" />

      <div className="relative z-10 mx-auto max-w-page px-6 sm:px-10">
        <p className="sub-eyebrow font-sans text-[11px] uppercase tracking-[0.34em] text-bare/45 mb-12 opacity-0">
          The substance
        </p>

        <h2 className="sub-headline font-serif font-light text-bare leading-[1.1] text-balance text-[clamp(2rem,5vw,3.75rem)] max-w-4xl">
          {headlineWords.map((item, i) => (
            <span key={i} className="reveal-mask mr-[0.22em] last:mr-0">
              <span className={`sub-headline-word reveal-word ${item.italic ? "italic" : ""}`}>
                {item.w}
              </span>
            </span>
          ))}
        </h2>

        <ul className="sub-no-list mt-24 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-y-12">
          {absent.map((word) => (
            <li key={word} className="sub-no-item text-center opacity-0">
              <span className="block font-sans text-[10px] uppercase tracking-[0.32em] text-bare/40 mb-3">
                No
              </span>
              <span className="font-serif font-light text-bare text-[clamp(1.6rem,2.4vw,2.2rem)] capitalize">
                {word}
              </span>
            </li>
          ))}
        </ul>

        <p className="sub-tail mt-28 max-w-md text-bare/65 text-sm leading-relaxed opacity-0">
          Just bamboo-soft material that&rsquo;s gentle on the most sensitive skin.
        </p>
      </div>

    </section>
  );
}
