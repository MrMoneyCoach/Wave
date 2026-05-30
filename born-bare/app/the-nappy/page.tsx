import type { Metadata } from "next";
import Section from "@/components/Section";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "The Nappy",
  description:
    "Bamboo-soft. Around 80% less plastic. No harmful chemicals. The nappy, in detail.",
};

export default function TheNappyPage() {
  return (
    <Section size="large">
      <Container className="max-w-prose">
        <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8">The nappy</p>
        <h1 className="text-display-1">Made of what matters.</h1>
        <p className="mt-10 text-body text-earth/75">
          Features, sizing, performance and the eco credentials sit here in phase 2.
        </p>
      </Container>
    </Section>
  );
}
