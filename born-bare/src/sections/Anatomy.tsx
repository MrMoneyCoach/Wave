import { Suspense } from "react";
import Reveal from "../components/Reveal";
import NappyPlaceholder from "../three/NappyPlaceholder";

const layers = [
  { name: "Top sheet", note: "Brushed bamboo. Soft to the skin." },
  { name: "Core", note: "Compressed natural pulp. Quietly absorbent." },
  { name: "Back layer", note: "PLA bio-film. Plant-based, breathable." },
  { name: "Outer shell", note: "Organic cotton weave." },
];

export default function Anatomy() {
  return (
    <section id="shop" className="relative bg-bare py-32 sm:py-44">
      <div className="mx-auto max-w-page px-6 sm:px-10">
        <Reveal>
          <p className="font-sans text-[11px] uppercase tracking-[0.32em] text-earth/50 mb-12">
            Anatomy
          </p>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative h-[60vh] min-h-[420px] lg:h-[80vh]">
            <Suspense fallback={null}>
              <NappyPlaceholder />
            </Suspense>
            <p className="absolute bottom-2 left-2 font-sans text-[10px] uppercase tracking-[0.24em] text-earth/40">
              Placeholder · 3D model pending
            </p>
          </div>

          <div>
            <Reveal>
              <h2 className="font-serif font-light text-earth leading-[1.1] text-balance text-[clamp(2rem,4.5vw,3.25rem)] mb-12">
                Four layers. Nothing else.
              </h2>
            </Reveal>

            <ul className="space-y-8">
              {layers.map((layer, i) => (
                <Reveal key={layer.name} delay={i * 120}>
                  <li className="flex gap-8 border-t border-earth/15 pt-6">
                    <span className="font-sans text-[11px] tracking-[0.2em] uppercase text-earth/40 w-8 pt-1">
                      0{i + 1}
                    </span>
                    <div>
                      <h3 className="font-serif text-2xl text-earth mb-1">{layer.name}</h3>
                      <p className="text-earth/65 text-sm leading-relaxed">{layer.note}</p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
