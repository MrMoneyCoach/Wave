import type { Metadata } from "next";
import Container from "@/components/Container";
import Section from "@/components/Section";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms of using the Born Bare site.",
};

export default function TermsPage() {
  return (
    <Section size="large" bg="bare" className="pt-24 sm:pt-32 lg:pt-40">
      <Container className="max-w-prose">
        <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8">
          Terms
        </p>
        <h1 className="text-display-1 sm:text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] text-earth">
          Terms of use.
        </h1>

        <p className="mt-6 text-caption uppercase tracking-[0.24em] text-stone">
          Placeholder &middot; final terms require legal review before launch
        </p>

        <div className="mt-12 space-y-10 text-body text-earth/80 leading-relaxed">
          <section>
            <h2 className="font-serif text-earth text-[clamp(1.4rem,2vw,1.7rem)] mb-4">
              About these terms
            </h2>
            <p>
              These terms cover your use of the Born Bare website during the
              pre-launch period. By using the site you agree to them.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-earth text-[clamp(1.4rem,2vw,1.7rem)] mb-4">
              The waitlist
            </h2>
            <p>
              Joining the waitlist is free and creates no obligation to
              purchase. We may close, reset, or change the waitlist mechanics
              at any time before launch. Founder pricing is held in good faith
              for waitlist members for 48 hours from Kickstarter open, subject
              to availability.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-earth text-[clamp(1.4rem,2vw,1.7rem)] mb-4">
              Referrals
            </h2>
            <p>
              Each waitlist member gets a unique referral code. Self-referral,
              automation, and other abuse is prohibited and disqualifies all
              associated rewards at our discretion.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-earth text-[clamp(1.4rem,2vw,1.7rem)] mb-4">
              Pricing
            </h2>
            <p>
              All prices shown are indicative until the Kickstarter campaign
              opens. Final pricing is set by the campaign tiers and may differ.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-earth text-[clamp(1.4rem,2vw,1.7rem)] mb-4">
              Content
            </h2>
            <p>
              All site content, brand, logo, and copy is &copy; Born Bare and
              may not be reproduced without permission.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-earth text-[clamp(1.4rem,2vw,1.7rem)] mb-4">
              Governing law
            </h2>
            <p>
              England &amp; Wales. Any disputes will be resolved in the courts
              of England and Wales.
            </p>
          </section>

          <p className="text-caption text-stone pt-6">
            Last updated: placeholder date &middot; replace before launch
          </p>
        </div>
      </Container>
    </Section>
  );
}
