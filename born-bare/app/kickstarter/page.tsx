import type { Metadata } from "next";
import Container from "@/components/Container";
import Section from "@/components/Section";
import Reveal from "@/components/Reveal";
import EmailCapture from "@/components/EmailCapture";
import PerkCard from "@/components/PerkCard";
import { perkTiers } from "@/lib/perkTiers";

export const metadata: Metadata = {
  title: "Coming Soon",
  description:
    "Born Bare launches on Kickstarter. Nine quiet reward tiers, from a first trial pack to five years of better nights.",
};

export default function KickstarterPage() {
  return (
    <>
      <Section size="large" bg="bare" className="pt-24 sm:pt-32 lg:pt-40">
        <Container>
          <Reveal>
            <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8 text-center">
              Coming soon &middot; Kickstarter
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <h1 className="text-display-1 sm:text-[clamp(2.75rem,6vw,5rem)] leading-[1.05] text-earth text-center max-w-4xl mx-auto">
              Nine ways to be among the first.
            </h1>
          </Reveal>

          <Reveal delay={0.35}>
            <p className="mt-10 max-w-prose mx-auto text-body text-earth/75 text-center">
              From a single trial pack to five years of better nights, every tier
              opens the same door &mdash; founder pricing, hand-numbered Founding
              Family status, and a quieter way of doing this.
            </p>
          </Reveal>

          <Reveal delay={0.5}>
            <p className="mt-12 text-caption uppercase tracking-[0.28em] text-stone text-center">
              Pricing is indicative &middot; locked in on Kickstarter launch day
            </p>
          </Reveal>
        </Container>
      </Section>

      <Section bg="bare" className="pt-0 pb-section-lg">
        <Container>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {perkTiers.map((tier, i) => (
              <PerkCard key={tier.id} tier={tier} index={i} />
            ))}
          </div>
        </Container>
      </Section>

      <Section bg="skin">
        <Container className="text-center">
          <Reveal>
            <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8">
              How it works
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-12 mt-6 max-w-4xl mx-auto text-left">
            {[
              {
                step: "01",
                title: "Join the waitlist",
                body:
                  "Tell us which tier interests you. We&rsquo;ll let you know the moment Kickstarter goes live, before anyone else.",
              },
              {
                step: "02",
                title: "Pledge on launch day",
                body:
                  "Founder pricing is held for waitlist members for the first 48 hours. Pledge through Kickstarter as normal.",
              },
              {
                step: "03",
                title: "Receive your nappies",
                body:
                  "First shipments go out in the spring. Subscriptions begin afterwards for those who want ongoing supply.",
              },
            ].map(({ step, title, body }, i) => (
              <Reveal key={step} delay={i * 0.1}>
                <article>
                  <span className="font-sans text-caption tracking-[0.2em] uppercase text-stone">
                    {step}
                  </span>
                  <h3 className="mt-4 font-serif font-light text-earth text-[clamp(1.4rem,2vw,1.7rem)] leading-tight">
                    {title}
                  </h3>
                  <p
                    className="mt-4 text-body text-earth/75 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: body }}
                  />
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section size="large" bg="bare">
        <Container className="text-center">
          <Reveal>
            <h2 className="text-display-2 lg:text-[clamp(2rem,4vw,3rem)] leading-tight text-earth max-w-2xl mx-auto">
              Want the general waitlist instead?
            </h2>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="mt-6 max-w-prose mx-auto text-body text-earth/75">
              No tier preference yet? Drop your email and we&rsquo;ll send one
              gentle note when we go live.
            </p>
          </Reveal>

          <Reveal delay={0.4}>
            <div className="mt-10 flex justify-center">
              <EmailCapture source="kickstarter-general" variant="stacked" />
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
