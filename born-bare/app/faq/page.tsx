import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import Section from "@/components/Section";
import Accordion from "@/components/Accordion";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Questions about Born Bare, answered quietly.",
};

const productFaqs = [
  {
    q: "When does Born Bare launch?",
    a: "We're launching on Kickstarter shortly. Joining the waitlist is the way to be told first — and you'll get access to founder pricing for the first 48 hours.",
  },
  {
    q: "What is the nappy made of?",
    a: "A brushed bamboo top sheet, a compressed natural pulp core, a plant-based bio-film back layer, and an organic cotton outer shell. Nothing else.",
  },
  {
    q: "Is it fully biodegradable?",
    a: "The nappy breaks down in approximately three to five years, versus around 500 for a conventional one. The core and inner layers are plant-based and certified compostable; the cotton outer is biodegradable. We're honest about what we can't do yet — home composting isn't something we recommend.",
  },
  {
    q: "Is it good for sensitive skin?",
    a: "Yes — we built it for sensitive skin from the start. No chlorine, no latex, no parabens, no phthalates, no fragrances, no dyes.",
  },
  {
    q: "What sizes will be available?",
    a: "Six sizes, from newborn to size 5 (12kg+). Full size and weight guide on the Nappy page.",
  },
];

const orderingFaqs = [
  {
    q: "How does the waitlist work?",
    a: "Drop your email and we'll send one quiet note when our Kickstarter opens. You'll get founder pricing held for 48 hours before anyone else. No spam, ever.",
  },
  {
    q: "What is the referral link?",
    a: "After joining the waitlist you get a unique link to share. Each friend who signs up via your link unlocks a reward — from an early thank-you card at one referral, all the way to a year of nappies at twenty-five.",
  },
  {
    q: "Will you ship outside the UK?",
    a: "At launch we're UK-only. We'll open up to Ireland, then Europe, then further afield as quickly as we can do it well.",
  },
  {
    q: "Will subscriptions be available after launch?",
    a: "Yes — we'll move to monthly direct-to-consumer subscriptions once the Kickstarter ships. Waitlist members get founding-subscriber pricing for life.",
  },
  {
    q: "How can I get in touch?",
    a: "Write to hello@bornbare.co.uk or use the contact form. We read everything.",
  },
];

export default function FAQPage() {
  return (
    <>
      <Section size="large" bg="bare" className="pt-24 sm:pt-32 lg:pt-40">
        <Container className="max-w-4xl">
          <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8 text-center">
            FAQ
          </p>
          <h1 className="text-display-1 sm:text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] text-earth text-center">
            Questions, answered.
          </h1>
        </Container>
      </Section>

      <Section bg="bare">
        <Container className="max-w-3xl">
          <p className="text-caption uppercase tracking-[0.28em] text-stone mb-6">
            The product
          </p>
          <Accordion items={productFaqs} />
        </Container>
      </Section>

      <Section bg="skin">
        <Container className="max-w-3xl">
          <p className="text-caption uppercase tracking-[0.28em] text-stone mb-6">
            Ordering and the waitlist
          </p>
          <Accordion items={orderingFaqs} />
        </Container>
      </Section>

      <Section size="large" bg="bare">
        <Container className="text-center max-w-prose">
          <p className="font-serif italic text-earth text-[clamp(1.3rem,2vw,1.7rem)] leading-snug">
            Still nothing here that answers it? Just{" "}
            <Link href="/contact" className="underline underline-offset-4">
              write to us
            </Link>
            .
          </p>
        </Container>
      </Section>
    </>
  );
}
