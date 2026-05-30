import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import Section from "@/components/Section";
import Reveal from "@/components/Reveal";
import ImagePlaceholder from "@/components/ImagePlaceholder";

export const metadata: Metadata = {
  title: "Our Story",
  description: "Why we started Born Bare — and the quiet, exhausting nights that led to it.",
};

export default function OurStoryPage() {
  return (
    <>
      <Section size="large" bg="bare" className="pt-24 sm:pt-32 lg:pt-40">
        <Container>
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-end">
            <div className="lg:col-span-7">
              <Reveal>
                <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8">
                  Our story
                </p>
              </Reveal>
              <Reveal delay={0.15}>
                <h1 className="text-display-1 sm:text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05] text-earth">
                  We started with a quieter answer.
                </h1>
              </Reveal>
            </div>
            <div className="lg:col-span-5">
              <Reveal delay={0.3}>
                <ImagePlaceholder
                  name="story-window-light.jpg"
                  prompt="Soft natural morning light through a window onto crumpled cream linen, no people, deeply tonal, Kinfolk mood."
                  ratio="portrait"
                />
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>

      <Section bg="bare">
        <Container className="max-w-prose">
          <Reveal>
            <div className="space-y-7 text-body text-earth/80 leading-relaxed">
              <p>
                Born Bare started in the small hours, the way most useful things
                do. The fussing, the heaviness against the skin, the suspicion
                that the nappy itself was getting in the way.
              </p>
              <p>
                We&rsquo;d tried everything &mdash; the supermarket brands, the
                eco brands, the boutique brands. They were all close. None were
                quite right. So we set out to make the one we wished we&rsquo;d
                had: bamboo-soft, free of the things skin shouldn&rsquo;t meet,
                quiet against the environment we&rsquo;d hand our children one
                day.
              </p>
              <p className="font-serif italic text-earth text-[clamp(1.3rem,2vw,1.65rem)] leading-snug">
                One product. Done exceptionally well.
              </p>
              <p>
                That&rsquo;s the whole brief. No range, no fragrance line, no
                pivot. Just the nappy, made the way we always wanted it to be
                made, sent in brown paper to your door.
              </p>
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section bg="skin">
        <Container>
          <Reveal>
            <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8 text-center">
              What we believe
            </p>
          </Reveal>
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-16">
            {[
              { k: "Purity", v: "No chemicals you wouldn’t want on your own skin." },
              { k: "Simplicity", v: "One product, done exceptionally well." },
              { k: "Honesty", v: "Real sustainability. No greenwashing." },
              { k: "Rest", v: "We're in the business of sleep." },
            ].map((value, i) => (
              <Reveal key={value.k} delay={i * 0.1}>
                <div>
                  <p className="font-sans text-caption uppercase tracking-[0.28em] text-stone mb-3">
                    {value.k}
                  </p>
                  <p className="font-serif text-earth text-[clamp(1.2rem,1.6vw,1.4rem)] leading-snug">
                    {value.v}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section bg="bare">
        <Container>
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            <div className="lg:col-span-5">
              <Reveal>
                <ImagePlaceholder
                  name="founder-portrait.jpg"
                  prompt="Founder portrait — soft natural light, hands rather than face, cream linen surface, warm muted palette. Tactile, not glossy."
                  ratio="portrait"
                />
              </Reveal>
            </div>
            <div className="lg:col-span-7">
              <Reveal>
                <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8">
                  A note from the founders
                </p>
              </Reveal>
              <Reveal delay={0.15}>
                <p className="font-serif italic text-earth leading-[1.4] text-[clamp(1.4rem,2.4vw,2rem)] max-w-prose">
                  Thank you for being here this early. Every email, every
                  pre-order, every share is what makes a quiet brand like this
                  possible. We won&rsquo;t take it lightly.
                </p>
              </Reveal>
              <Reveal delay={0.35}>
                <p className="mt-10 text-caption uppercase tracking-[0.28em] text-stone">
                  Born Bare &mdash; founders
                </p>
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>

      <Section size="large" bg="earth">
        <Container className="text-center">
          <Reveal>
            <h2 className="text-display-2 lg:text-[clamp(2rem,4vw,3rem)] text-bare leading-tight max-w-2xl mx-auto">
              Be among the first.
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 max-w-prose mx-auto text-body text-bare/75">
              Our Kickstarter opens soon. The waitlist gets founder pricing and
              a quiet note when we&rsquo;re ready.
            </p>
          </Reveal>
          <Reveal delay={0.4}>
            <Link
              href="/#waitlist"
              className="mt-10 inline-flex items-center gap-2 text-btn uppercase tracking-[0.18em] text-bare/85 hover:text-bare transition-colors duration-300"
            >
              Join the waitlist <span aria-hidden>&rarr;</span>
            </Link>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
