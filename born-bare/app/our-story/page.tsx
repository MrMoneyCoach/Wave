import type { Metadata } from "next";
import Section from "@/components/Section";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Our Story",
  description: "Why we started Born Bare — and the quiet, exhausting nights that led to it.",
};

export default function OurStoryPage() {
  return (
    <Section size="large">
      <Container className="max-w-prose">
        <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8">Our story</p>
        <h1 className="text-display-1">A quieter answer.</h1>
        <p className="mt-10 text-body text-earth/75">
          Founder story, mission and the &ldquo;why&rdquo; land here in phase 2.
        </p>
      </Container>
    </Section>
  );
}
