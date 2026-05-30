import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import Section from "@/components/Section";
import Reveal from "@/components/Reveal";
import EmailCapture from "@/components/EmailCapture";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import VideoHero from "@/components/VideoHero";
import TextureGrid from "@/components/TextureGrid";

export const metadata: Metadata = {
  title: "Born Bare — Nothing but sleep.",
  description:
    "Bamboo nappies for better sleep. Honest materials, kinder to skin, gentler on the planet. Join the pre-launch waitlist.",
};

const pillars = [
  {
    title: "Better sleep",
    body:
      "Bamboo-soft, drier through the night, free of the irritants that wake babies before they need to wake. When they sleep, you sleep.",
    eyebrow: "For both of you",
  },
  {
    title: "The best for baby",
    body:
      "No chlorine, no latex, no parabens, no phthalates, no fragrances. Around 80% less plastic than conventional nappies. Just what touches skin should be.",
    eyebrow: "Quiet ingredients",
  },
  {
    title: "Gone in years",
    body:
      "Conventional nappies take five hundred years to disappear. Ours biodegrade in three to five. Brown paper packaging. The planet they inherit, kept softer.",
    eyebrow: "Biodegradable",
  },
];

const stats = [
  { label: "Plastic vs. conventional", value: "−80%" },
  { label: "Decomposition", value: "3–5 yrs" },
  { label: "Material", value: "Bamboo + pulp" },
  { label: "Packaging", value: "Kraft, recyclable" },
];

const textureTiles = [
  {
    name: "world-bamboo.jpg",
    prompt:
      "Macro of bamboo fibre weave, warm directional light, deeply tonal, no objects, painterly mood.",
    caption: "Bamboo",
  },
  {
    name: "world-linen.jpg",
    prompt:
      "Soft cream linen folded across the frame, golden hour light from the left, gentle film grain, no people.",
    caption: "Linen",
  },
  {
    name: "world-skin.jpg",
    prompt:
      "Macro of a sleeping baby's bare shoulder against a cream linen background, warm soft light, intimate detail.",
    caption: "Skin",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ─────────────────────── Cinematic hero ─────────────────────── */}
      <VideoHero
        // When the Kickstarter cut is ready, drop the files into public/video/
        // and uncomment these:
        // sources={[
        //   { src: "/video/hero.webm", type: "video/webm" },
        //   { src: "/video/hero.mp4", type: "video/mp4" },
        // ]}
        // posterSrc="/video/hero-poster.jpg"
      >
        <Container className="h-full flex flex-col justify-end pb-24 sm:pb-28 lg:pb-32">
          <div className="max-w-3xl">
            <Reveal>
              <p className="font-display text-[12px] uppercase tracking-[0.4em] text-bare/65 mb-8">
                Born Bare &middot; pre-launch
              </p>
            </Reveal>

            <Reveal delay={0.2}>
              <h1 className="font-serif font-light text-bare leading-[0.95] text-[clamp(3rem,9vw,7.5rem)]">
                Nothing but sleep.
              </h1>
            </Reveal>

            <Reveal delay={0.4}>
              <p className="mt-8 font-serif italic text-bare/85 text-[clamp(1.25rem,2vw,1.65rem)] leading-relaxed max-w-xl">
                Better sleep starts here.
              </p>
            </Reveal>

            <Reveal delay={0.6}>
              <div className="mt-12 flex flex-wrap items-center gap-5">
                <a
                  href="#waitlist"
                  className="inline-flex items-center justify-center font-display text-[14px] uppercase tracking-[0.3em] px-8 py-4 bg-bare text-earth hover:bg-bare/90 transition-colors duration-300 ease-calm"
                >
                  Join the waitlist
                </a>
                <a
                  href="#story"
                  className="inline-flex items-center gap-2 font-display text-[13px] uppercase tracking-[0.3em] text-bare/75 hover:text-bare transition-colors duration-300 ease-calm"
                >
                  The story <span aria-hidden>&darr;</span>
                </a>
              </div>
            </Reveal>
          </div>
        </Container>
      </VideoHero>

      {/* ─────────────────────── Dedicated waitlist ─────────────────────── */}
      <Section
        bg="bare"
        size="default"
        id="waitlist"
        className="scroll-mt-20 border-b border-earth/10"
      >
        <Container>
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            <div className="lg:col-span-6">
              <Reveal>
                <p className="font-display text-[12px] uppercase tracking-[0.4em] text-stone mb-8">
                  The waitlist
                </p>
              </Reveal>
              <Reveal delay={0.15}>
                <h2 className="font-serif font-light text-earth leading-[1.05] text-[clamp(2rem,4.5vw,3.25rem)] max-w-xl">
                  Be among the first to try Born Bare.
                </h2>
              </Reveal>
              <Reveal delay={0.35}>
                <p className="mt-8 max-w-prose text-body text-earth/75">
                  Founder pricing on Kickstarter, held for waitlist members for
                  the first 48 hours. One gentle note when we&rsquo;re live, and
                  a referral link you can share if you&rsquo;d like to.
                </p>
              </Reveal>
            </div>

            <div className="lg:col-span-6">
              <Reveal delay={0.3}>
                <EmailCapture source="home-hero" />
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>

      {/* ─────────────── Problem / Solution narrative ─────────────── */}
      <Section bg="skin" id="story" className="scroll-mt-20">
        <Container>
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            <div className="lg:col-span-5 order-2 lg:order-1">
              <Reveal>
                <ImagePlaceholder
                  name="tiny-hand-detail.jpg"
                  prompt="Macro of a sleeping baby's curled hand on warm cream linen, soft directional natural light, gentle film grain."
                  ratio="square"
                />
              </Reveal>
            </div>

            <div className="lg:col-span-7 order-1 lg:order-2">
              <Reveal>
                <p className="font-display text-[12px] uppercase tracking-[0.4em] text-stone mb-8">
                  The quiet problem
                </p>
              </Reveal>

              <Reveal delay={0.15}>
                <h2 className="text-display-2 lg:text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] text-earth max-w-3xl">
                  Most nappies wake babies up.
                </h2>
              </Reveal>

              <Reveal delay={0.35}>
                <div className="mt-10 space-y-6 max-w-prose text-body text-earth/75">
                  <p>
                    The wetness. The chemicals. The rough seam at the hip. Tiny
                    irritations add up &mdash; and a baby who&rsquo;s almost
                    comfortable isn&rsquo;t sleeping.
                  </p>
                  <p>
                    We started with the question every exhausted parent eventually
                    asks: what if the nappy itself was making it harder?
                  </p>
                  <p className="font-serif italic text-earth/80 text-[clamp(1.15rem,1.8vw,1.4rem)] leading-snug">
                    Born Bare is our answer. One product. Done exceptionally well.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>

      {/* ─────────────── Texture grid (Skims-style world) ─────────────── */}
      <Section bg="bare" className="py-28 sm:py-36">
        <Container>
          <Reveal>
            <div className="max-w-3xl mb-16">
              <p className="font-display text-[12px] uppercase tracking-[0.4em] text-stone mb-6">
                The world of Born Bare
              </p>
              <h2 className="text-display-2 lg:text-[clamp(2rem,4vw,3.25rem)] leading-tight text-earth">
                Three things, considered.
              </h2>
            </div>
          </Reveal>
          <TextureGrid tiles={textureTiles} />
        </Container>
      </Section>

      {/* ─────────────────────── Three pillars ─────────────────────── */}
      <Section bg="bare" className="pt-0">
        <Container>
          <Reveal>
            <p className="font-display text-[12px] uppercase tracking-[0.4em] text-stone mb-8 text-center">
              Three things to know
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <h2 className="text-display-2 lg:text-[clamp(2.25rem,4vw,3.25rem)] leading-[1.1] text-earth text-center max-w-3xl mx-auto">
              Quietly considered, in every direction.
            </h2>
          </Reveal>

          <div className="mt-20 grid lg:grid-cols-3 gap-10 lg:gap-16">
            {pillars.map((pillar, i) => (
              <Reveal key={pillar.title} delay={i * 0.12}>
                <article className="flex flex-col h-full">
                  <span className="font-display text-[12px] uppercase tracking-[0.36em] text-stone mb-6">
                    {pillar.eyebrow}
                  </span>
                  <h3 className="font-serif font-light text-earth text-[clamp(1.5rem,2.2vw,1.85rem)] leading-tight">
                    {pillar.title}
                  </h3>
                  <p className="mt-5 text-body text-earth/75 leading-relaxed">
                    {pillar.body}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* ─────────────── Sustainability as proof ─────────────── */}
      <Section bg="earth">
        <Container>
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            <div className="lg:col-span-6">
              <Reveal>
                <p className="font-display text-[12px] uppercase tracking-[0.4em] text-bare/45 mb-8">
                  Sustainability, the proof
                </p>
              </Reveal>

              <Reveal delay={0.15}>
                <h2 className="text-display-2 lg:text-[clamp(2.25rem,4vw,3.25rem)] leading-[1.1] text-bare max-w-2xl">
                  Gone in years, not centuries.
                </h2>
              </Reveal>

              <Reveal delay={0.35}>
                <p className="mt-10 max-w-prose text-body text-bare/75 leading-relaxed">
                  We don&rsquo;t lead with eco because we don&rsquo;t need to. It&rsquo;s the
                  standard, not the story. Plant-based bamboo, certified compostable
                  inner layers, brown kraft packaging that recycles wherever
                  cardboard does. The figures are kept honest.
                </p>
              </Reveal>

              <Reveal delay={0.55}>
                <Link
                  href="/sustainability"
                  className="mt-10 inline-flex items-center gap-2 text-btn uppercase tracking-[0.18em] text-bare/85 hover:text-bare transition-colors duration-300"
                >
                  Read the full story
                  <span aria-hidden>&rarr;</span>
                </Link>
              </Reveal>
            </div>

            <div className="lg:col-span-6">
              <div className="grid grid-cols-2 gap-px bg-bare/10">
                {stats.map((stat, i) => (
                  <Reveal key={stat.label} delay={i * 0.08}>
                    <div className="bg-earth p-8 h-full">
                      <p className="font-display text-[11px] uppercase tracking-[0.32em] text-bare/45 mb-3">
                        {stat.label}
                      </p>
                      <p className="font-display text-bare text-[clamp(2.5rem,4vw,3.5rem)] leading-none">
                        {stat.value}
                      </p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* ─────────────────────── Meet Ren ─────────────────────── */}
      <Section bg="bare">
        <Container>
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            <div className="lg:col-span-5">
              <Reveal>
                <ImagePlaceholder
                  name="ren-portrait.png"
                  prompt="Ren the red panda — soft, painterly portrait, warm earthy tones, calm expression. Raster only (commissioned/AI-generated)."
                  ratio="square"
                />
              </Reveal>
            </div>

            <div className="lg:col-span-7">
              <Reveal>
                <p className="font-display text-[12px] uppercase tracking-[0.4em] text-stone mb-8">
                  Meet Ren
                </p>
              </Reveal>

              <Reveal delay={0.15}>
                <h2 className="text-display-2 lg:text-[clamp(2.25rem,4vw,3.25rem)] leading-[1.1] text-earth max-w-2xl">
                  A small companion for quiet nights.
                </h2>
              </Reveal>

              <Reveal delay={0.35}>
                <p className="mt-10 max-w-prose text-body text-earth/75 leading-relaxed">
                  Ren is the red panda who watches over Born Bare. You won&rsquo;t find
                  him on the nappy &mdash; the product stays simple, the way it should.
                  But he&rsquo;ll show up in the corners of the journal, the welcome
                  notes, and the slow stories we tell about better sleep.
                </p>
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>

      {/* ─────────────────────── Social proof (placeholder) ─────────────────────── */}
      <Section bg="skin">
        <Container>
          <Reveal>
            <p className="font-display text-[12px] uppercase tracking-[0.4em] text-stone mb-10 text-center">
              Early voices
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-10 lg:gap-16">
            {[1, 2, 3].map((i) => (
              <Reveal key={i} delay={(i - 1) * 0.12}>
                <figure className="flex flex-col h-full">
                  <blockquote className="font-serif italic text-earth text-[clamp(1.15rem,1.6vw,1.4rem)] leading-snug">
                    &ldquo;Quote from an early reviewer or parent will sit here once
                    we&rsquo;ve heard from them. Calm, specific, not glowing &mdash; just
                    true.&rdquo;
                  </blockquote>
                  <figcaption className="mt-6 text-caption uppercase tracking-[0.24em] text-stone">
                    Reviewer name &middot; placeholder
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* ─────────────────────── Closing CTA ─────────────────────── */}
      <Section size="large" bg="bare">
        <Container className="text-center">
          <Reveal>
            <h2 className="text-display-1 sm:text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05] text-earth max-w-3xl mx-auto">
              Be among the first to try Born Bare.
            </h2>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="mt-8 max-w-prose mx-auto text-body text-earth/75">
              Join the waitlist for founder pricing when our Kickstarter opens,
              and a quiet note when we&rsquo;re ready to send the first packs.
            </p>
          </Reveal>

          <Reveal delay={0.4}>
            <div className="mt-12 flex justify-center">
              <EmailCapture source="home-closing" variant="stacked" />
            </div>
          </Reveal>

          <Reveal delay={0.6}>
            <p className="mt-10 text-caption uppercase tracking-[0.28em] text-stone">
              <Link href="/kickstarter" className="hover:text-earth transition-colors">
                See the nine launch tiers &rarr;
              </Link>
            </p>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
