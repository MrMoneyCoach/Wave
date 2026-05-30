import type { Metadata } from "next";
import Section from "@/components/Section";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Born Bare uses and protects your data.",
};

export default function PrivacyPage() {
  return (
    <Section size="large">
      <Container className="max-w-prose">
        <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8">Privacy</p>
        <h1 className="text-display-1">Privacy policy.</h1>
        <p className="mt-10 text-body text-earth/75">
          UK / GDPR-compliant policy placeholder. Final wording lands in phase 5
          (legal review required before launch).
        </p>
      </Container>
    </Section>
  );
}
