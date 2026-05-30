import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import Section from "@/components/Section";
import Reveal from "@/components/Reveal";
import ImagePlaceholder from "@/components/ImagePlaceholder";

export const metadata: Metadata = {
  title: "The Nappy",
  description:
    "Bamboo-soft. Around 80% less plastic. No harmful chemicals. The nappy, in detail.",
};

const layers = [
  {
    n: "01",
    title: "Top sheet",
    body: "Brushed bamboo. Unbleached, undyed, naturally antibacterial. Soft enough that you forget it's there.",
  },
  {
    n: "02",
    title: "Absorbent core",
    body: "Compressed natural pulp. Locks moisture quickly so the skin stays dry.",
  },
  {
    n: "03",
    title: "Back layer",
    body: "Plant-based bio-film. Breathable. Free of chlorine, latex, parabens, phthalates and fragrance.",
  },
  {
    n: "04",
    title: "Outer shell",
    body: "Organic cotton weave. Soft on the hip, kind to the skin under clothes.",
  },
];

const sizes = [
  { name: "Newborn", weight: "2–5 kg", note: "0–6 weeks" },
  { name: "Size 1", weight: "3–6 kg", note: "Birth–4 mo" },
  { name: "Size 2", weight: "4–8 kg", note: "3–7 mo" },
  { name: "Size 3", weight: "4–9 kg", note: "5–11 mo" },
  { name: "Size 4", weight: "7–18 kg", note: "9 mo–2 yrs" },
  { name: "Size 5", weight: "12+ kg", note: "18 mo+" },
];

export default function TheNappyPage() {
  return (
    <>
      <Section size="large" bg="bare" className="pt-24 sm:pt-32 lg:pt-40">
        <Container>
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            <div className="lg:col-span-7">
              <Reveal>
                <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8">
                  The nappy
                </p>
              </Reveal>
              <Reveal delay={0.15}>
                <h1 className="text-display-1 sm:text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05] text-earth">
                  Made of what matters.
                </h1>
              </Reveal>
              <Reveal delay={0.35}>
                <p className="mt-10 max-w-prose text-body text-earth/75">
                  One nappy, four honest layers. Soft, dry, calm. Nothing extra.
                </p>
              </Reveal>
            </div>
            <div className="lg:col-span-5">
              <Reveal delay={0.3}>
                <ImagePlaceholder
                  name="nappy-product-hero.jpg"
                  prompt="Single undyed bamboo disposable nappy, three-quarter front view on bone backdrop, soft top light, photoreal product render."
                  ratio="square"
                />
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>

      <Section bg="skin">
        <Container>
          <Reveal>
            <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8 text-center">
              Anatomy
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <h2 className="text-display-2 lg:text-[clamp(2rem,3.5vw,2.75rem)] text-earth text-center max-w-2xl mx-auto leading-tight">
              Four layers. Nothing else.
            </h2>
          </Reveal>

          <div className="mt-16 grid md:grid-cols-2 gap-x-12 gap-y-10">
            {layers.map((layer, i) => (
              <Reveal key={layer.title} delay={i * 0.08}>
                <article className="flex gap-8 border-t border-earth/15 pt-6">
                  <span className="font-sans text-caption tracking-[0.2em] uppercase text-stone w-8 pt-1">
                    {layer.n}
                  </span>
                  <div>
                    <h3 className="font-serif font-light text-earth text-[clamp(1.35rem,1.9vw,1.65rem)] leading-tight">
                      {layer.title}
                    </h3>
                    <p className="mt-4 text-body text-earth/75 leading-relaxed">
                      {layer.body}
                    </p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section bg="earth">
        <Container>
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <Reveal>
                <p className="text-caption uppercase tracking-[0.32em] text-bare/45 mb-8">
                  What&rsquo;s not in it
                </p>
              </Reveal>
              <Reveal delay={0.15}>
                <h2 className="text-display-2 lg:text-[clamp(2rem,3.5vw,2.75rem)] text-bare leading-tight italic font-serif">
                  Nothing you wouldn&rsquo;t want on your own skin.
                </h2>
              </Reveal>
              <Reveal delay={0.35}>
                <p className="mt-10 text-body text-bare/75 leading-relaxed max-w-prose">
                  We were strict about this list. Anything that could disturb
                  sleep didn&rsquo;t make it in.
                </p>
              </Reveal>
            </div>

            <ul className="grid grid-cols-2 gap-y-8 self-center">
              {["Chlorine", "Latex", "Parabens", "Phthalates", "Fragrances", "Dyes"].map(
                (word, i) => (
                  <Reveal key={word} delay={i * 0.08}>
                    <li>
                      <span className="block font-sans text-[10px] uppercase tracking-[0.32em] text-bare/40 mb-2">
                        No
                      </span>
                      <span className="font-serif font-light text-bare text-[clamp(1.5rem,2.2vw,1.9rem)]">
                        {word}
                      </span>
                    </li>
                  </Reveal>
                )
              )}
            </ul>
          </div>
        </Container>
      </Section>

      <Section bg="bare">
        <Container>
          <Reveal>
            <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8 text-center">
              Sizing
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <h2 className="text-display-2 lg:text-[clamp(2rem,3.5vw,2.75rem)] text-earth text-center max-w-2xl mx-auto leading-tight">
              Six sizes, from newborn to toddler.
            </h2>
          </Reveal>

          <div className="mt-16 max-w-3xl mx-auto">
            <ul className="divide-y divide-earth/15 border-y border-earth/15">
              {sizes.map((s, i) => (
                <Reveal key={s.name} delay={i * 0.05}>
                  <li className="grid grid-cols-3 gap-6 py-5">
                    <span className="font-serif text-earth text-[clamp(1.15rem,1.4vw,1.3rem)]">
                      {s.name}
                    </span>
                    <span className="font-sans text-body text-earth/75">{s.weight}</span>
                    <span className="font-sans text-body text-stone text-right">{s.note}</span>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      <Section size="large" bg="bare">
        <Container className="text-center">
          <Reveal>
            <h2 className="text-display-1 sm:text-[clamp(2.5rem,5vw,4rem)] text-earth leading-tight max-w-3xl mx-auto">
              Quietly different, from every angle.
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 max-w-prose mx-auto text-body text-earth/75">
              Try it for yourself with one of our Kickstarter tiers, or join the
              general waitlist and we&rsquo;ll let you know when we&rsquo;re
              ready to send the first packs.
            </p>
          </Reveal>
          <Reveal delay={0.4}>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
              <Link
                href="/kickstarter"
                className="text-btn uppercase tracking-[0.18em] font-medium bg-earth text-bare px-7 py-4 hover:bg-earth/90 transition-colors duration-300 ease-calm"
              >
                See the nine tiers
              </Link>
              <Link
                href="/#waitlist"
                className="text-btn uppercase tracking-[0.18em] font-medium border border-earth/80 px-7 py-4 hover:bg-earth hover:text-bare transition-colors duration-300 ease-calm"
              >
                Join the waitlist
              </Link>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
