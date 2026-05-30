import type { Metadata } from "next";
import Section from "@/components/Section";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Questions, answered. Quietly.",
};

export default function FAQPage() {
  return (
    <Section size="large">
      <Container className="max-w-prose">
        <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8">FAQ</p>
        <h1 className="text-display-1">Questions, answered.</h1>
        <p className="mt-10 text-body text-earth/75">
          Accordion FAQ lands in phase 5.
        </p>
      </Container>
    </Section>
  );
}
