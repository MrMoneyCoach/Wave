import type { Metadata } from "next";
import Section from "@/components/Section";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms of using the Born Bare site.",
};

export default function TermsPage() {
  return (
    <Section size="large">
      <Container className="max-w-prose">
        <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8">Terms</p>
        <h1 className="text-display-1">Terms of use.</h1>
        <p className="mt-10 text-body text-earth/75">
          UK terms placeholder. Final wording lands in phase 5 (legal review
          required before launch).
        </p>
      </Container>
    </Section>
  );
}
