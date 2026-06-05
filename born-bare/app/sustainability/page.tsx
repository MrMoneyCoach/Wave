import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import Section from "@/components/Section";
import Reveal from "@/components/Reveal";
import ImagePlaceholder from "@/components/ImagePlaceholder";

export const metadata: Metadata = {
  title: "Sustainability",
  description: "Bamboo. Biodegradable. Honest. The proof, not the performance.",
};

const credentials = [
  { v: "Bamboo + pulp", k: "Material" },
  { v: "Plant-based", k: "Inner layers" },
  { v: "Kraft", k: "Packaging" },
  { v: "−80%", k: "Plastic vs. conventional" },
  { v: "3–5 yrs", k: "Decomposition" },
  { v: "FSC", k: "Forest certification" },
];

export default function SustainabilityPage() {
  return (
    <>
      <Section size="large" bg="bare" className="pt-24 sm:pt-32 lg:pt-40">
        <Container>
          <Reveal>
            <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8">
              Sustainability
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <h1 className="text-display-1 sm:text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05] text-earth max-w-4xl">
              Proof, not performance.
            </h1>
          </Reveal>
          <Reveal delay={0.35}>
            <p className="mt-10 max-w-prose text-body text-earth/75">
              We don&rsquo;t shout about sustainability because we don&rsquo;t
              need to &mdash; it&rsquo;s the floor we built on, not the story
              we&rsquo;re selling. Here&rsquo;s what that looks like, in plain
              English.
            </p>
          </Reveal>
        </Container>
      </Section>

      <Section bg="skin">
        <Container>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-earth/10">
            {credentials.map((c, i) => (
              <Reveal key={c.k} delay={i * 0.06}>
                <div className="bg-skin/40 p-10 h-full">
                  <p className="text-caption uppercase tracking-[0.28em] text-stone mb-3">
                    {c.k}
                  </p>
                  <p className="font-serif font-light text-earth text-[clamp(1.75rem,2.8vw,2.5rem)] leading-tight">
                    {c.v}
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
                  name="bamboo-detail.jpg"
                  prompt="Macro of bamboo shoots and raw natural fibres on a warm bone surface, soft directional light, deeply tonal."
                  ratio="portrait"
                />
              </Reveal>
            </div>
            <div className="lg:col-span-7 max-w-prose">
              <Reveal>
                <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8">
                  Bamboo
                </p>
              </Reveal>
              <Reveal delay={0.15}>
                <h2 className="text-display-2 lg:text-[clamp(2rem,3.5vw,2.75rem)] leading-tight text-earth">
                  The fastest-growing plant we know.
                </h2>
              </Reveal>
              <Reveal delay={0.35}>
                <div className="mt-10 space-y-6 text-body text-earth/75 leading-relaxed">
                  <p>
                    Bamboo regrows up to a metre a day. It needs no pesticides,
                    little water, and the same root system keeps producing for
                    decades. It&rsquo;s soft on skin, naturally antibacterial,
                    and gentle on land.
                  </p>
                  <p>
                    Our bamboo is FSC-certified and processed without chlorine.
                    The brushed top sheet that touches your baby is unbleached,
                    undyed, and unfussed.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>

      <Section bg="bare">
        <Container>
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            <div className="lg:col-span-7 order-2 lg:order-1 max-w-prose">
              <Reveal>
                <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8">
                  End of life
                </p>
              </Reveal>
              <Reveal delay={0.15}>
                <h2 className="text-display-2 lg:text-[clamp(2rem,3.5vw,2.75rem)] leading-tight text-earth">
                  Gone in years, not centuries.
                </h2>
              </Reveal>
              <Reveal delay={0.35}>
                <div className="mt-10 space-y-6 text-body text-earth/75 leading-relaxed">
                  <p>
                    A conventional nappy takes around 500 years to decompose.
                    Born Bare nappies break down in three to five &mdash; with
                    around 80% less plastic in the build to begin with.
                  </p>
                  <p>
                    We&rsquo;re honest about what we can&rsquo;t do yet: home-
                    composting a nappy isn&rsquo;t something we recommend. Our
                    job is to make the best version available today, and to
                    keep moving toward the version that ends in soil.
                  </p>
                </div>
              </Reveal>
            </div>
            <div className="lg:col-span-5 order-1 lg:order-2">
              <Reveal>
                <ImagePlaceholder
                  name="soil-cycle.jpg"
                  prompt="Close-up of dark soil with a young green shoot emerging, warm natural light, no objects, gentle film grain."
                  ratio="portrait"
                />
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>

      <Section size="large" bg="earth">
        <Container className="text-center">
          <Reveal>
            <h2 className="text-display-2 lg:text-[clamp(2rem,4vw,3rem)] text-bare leading-tight max-w-2xl mx-auto">
              The version they inherit.
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 max-w-prose mx-auto text-body text-bare/75">
              Better for them now. Lighter on the world they&rsquo;ll grow up
              into. That&rsquo;s the whole calculation.
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
