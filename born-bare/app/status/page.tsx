import type { Metadata } from "next";
import Container from "@/components/Container";
import Section from "@/components/Section";
import StatusLookup from "@/components/StatusLookup";

export const metadata: Metadata = {
  title: "Your waitlist status",
  description: "Check your Born Bare waitlist progress and find your unique referral link.",
  robots: { index: false, follow: false },
};

export default function StatusPage() {
  return (
    <Section size="large" bg="bare" className="pt-24 sm:pt-32 lg:pt-40">
      <Container className="max-w-prose">
        <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8 text-center">
          Waitlist
        </p>
        <h1 className="text-display-1 sm:text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] text-earth text-center">
          Your link, your friends.
        </h1>
        <p className="mt-8 text-body text-earth/75 text-center">
          Drop in the email you signed up with and we&rsquo;ll show your
          referral link and progress.
        </p>

        <div className="mt-12">
          <StatusLookup />
        </div>
      </Container>
    </Section>
  );
}
