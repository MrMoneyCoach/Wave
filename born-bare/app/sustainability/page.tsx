import type { Metadata } from "next";
import Section from "@/components/Section";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Sustainability",
  description: "Bamboo. Biodegradable. Honest. The proof, not the performance.",
};

export default function SustainabilityPage() {
  return (
    <Section size="large">
      <Container className="max-w-prose">
        <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8">Sustainability</p>
        <h1 className="text-display-1">Proof, not performance.</h1>
        <p className="mt-10 text-body text-earth/75">
          Bamboo material story, plant-based certification, biodegradable end-of-life.
          Lands in phase 2.
        </p>
      </Container>
    </Section>
  );
}
