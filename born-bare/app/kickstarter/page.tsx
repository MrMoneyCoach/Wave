import type { Metadata } from "next";
import Section from "@/components/Section";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Coming Soon",
  description: "Born Bare launches on Kickstarter. Nine reward tiers. Join the waitlist.",
};

export default function KickstarterPage() {
  return (
    <Section size="large">
      <Container className="max-w-prose">
        <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8">Coming soon</p>
        <h1 className="text-display-1">Launching on Kickstarter.</h1>
        <p className="mt-10 text-body text-earth/75">
          Nine reward tiers, the campaign explainer and per-tier waitlist
          interest live here in phase 2.
        </p>
      </Container>
    </Section>
  );
}
