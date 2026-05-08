import { Suspense, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import NappyPlaceholder from "../three/NappyPlaceholder";

gsap.registerPlugin(ScrollTrigger);

const layers = [
  { name: "Top sheet", note: "Brushed bamboo. Soft to the skin." },
  { name: "Core", note: "Compressed natural pulp. Quietly absorbent." },
  { name: "Back layer", note: "PLA bio-film. Plant-based, breathable." },
  { name: "Outer shell", note: "Organic cotton weave." },
];

export default function Anatomy() {
  const root = useRef<HTMLElement | null>(null);
  const progressRef = useRef(0);

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;

      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          progressRef.current = self.progress;
        },
      });

      gsap.fromTo(
        ".anatomy-eyebrow",
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: section, start: "top 70%", once: true },
        }
      );

      gsap.fromTo(
        ".anatomy-headline-word",
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: 1.4,
          ease: "power4.out",
          stagger: 0.1,
          scrollTrigger: { trigger: ".anatomy-headline", start: "top 80%", once: true },
        }
      );

      gsap.fromTo(
        ".anatomy-layer",
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: { trigger: ".anatomy-list", start: "top 75%", once: true },
        }
      );
    },
    { scope: root }
  );

  const headlineWords = ["Four", "layers.", "Nothing", "else."];

  return (
    <section
      ref={root}
      id="shop"
      className="relative bg-bare"
      style={{ height: "200svh" }}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden flex items-center">
        <div className="mx-auto max-w-page px-6 sm:px-10 w-full">
          <p className="anatomy-eyebrow font-sans text-[11px] uppercase tracking-[0.34em] text-earth/45 mb-10 opacity-0">
            Anatomy
          </p>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div
              className="relative h-[55svh] lg:h-[72svh] anatomy-canvas-mask"
            >
              <Suspense fallback={null}>
                <NappyPlaceholder progressRef={progressRef} />
              </Suspense>
              <p className="absolute bottom-2 left-2 font-sans text-[10px] uppercase tracking-[0.28em] text-earth/30 mix-blend-multiply">
                Placeholder · 3D model pending
              </p>
            </div>

            <div>
              <h2 className="anatomy-headline font-serif font-light text-earth leading-[1.05] text-balance text-[clamp(2rem,4.5vw,3.25rem)] mb-12">
                {headlineWords.map((w, i) => (
                  <span key={i} className="reveal-mask mr-[0.25em] last:mr-0">
                    <span className="anatomy-headline-word reveal-word">{w}</span>
                  </span>
                ))}
              </h2>

              <ul className="anatomy-list space-y-7">
                {layers.map((layer, i) => (
                  <li
                    key={layer.name}
                    className="anatomy-layer flex gap-8 border-t border-earth/15 pt-5"
                  >
                    <span className="font-sans text-[11px] tracking-[0.2em] uppercase text-earth/40 w-8 pt-1">
                      0{i + 1}
                    </span>
                    <div>
                      <h3 className="font-serif text-2xl text-earth mb-1">{layer.name}</h3>
                      <p className="text-earth/65 text-sm leading-relaxed">{layer.note}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
