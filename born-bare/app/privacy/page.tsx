import type { Metadata } from "next";
import Container from "@/components/Container";
import Section from "@/components/Section";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Born Bare uses and protects your data.",
};

export default function PrivacyPage() {
  return (
    <Section size="large" bg="bare" className="pt-24 sm:pt-32 lg:pt-40">
      <Container className="max-w-prose">
        <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8">
          Privacy
        </p>
        <h1 className="text-display-1 sm:text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] text-earth">
          Privacy policy.
        </h1>

        <p className="mt-6 text-caption uppercase tracking-[0.24em] text-stone">
          Placeholder &middot; final policy requires legal review before launch
        </p>

        <div className="mt-12 space-y-10 text-body text-earth/80 leading-relaxed">
          <section>
            <h2 className="font-serif text-earth text-[clamp(1.4rem,2vw,1.7rem)] mb-4">
              Who we are
            </h2>
            <p>
              Born Bare is a UK pre-launch company. References to &ldquo;we&rdquo;,
              &ldquo;us&rdquo; and &ldquo;our&rdquo; refer to Born Bare. Contact:{" "}
              <a className="underline underline-offset-4" href="mailto:hello@bornbare.co.uk">
                hello@bornbare.co.uk
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-serif text-earth text-[clamp(1.4rem,2vw,1.7rem)] mb-4">
              What we collect, and why
            </h2>
            <p>When you join the waitlist or contact us, we store:</p>
            <ul className="mt-4 space-y-2 list-disc pl-5 marker:text-stone">
              <li>Your email address</li>
              <li>The page or campaign source you signed up from</li>
              <li>Your GDPR consent (or that you ticked the consent box)</li>
              <li>Your unique referral code and how many friends you&rsquo;ve referred</li>
              <li>Optional: name and message, if you use the contact form</li>
              <li>Basic technical metadata (browser type, time of signup)</li>
            </ul>
            <p className="mt-4">
              We use this data only to operate the waitlist, send you launch
              updates, credit referrals, and reply to your messages.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-earth text-[clamp(1.4rem,2vw,1.7rem)] mb-4">
              Lawful basis
            </h2>
            <p>
              Consent (UK GDPR Art. 6(1)(a)) for marketing emails. Legitimate
              interest for fraud and abuse prevention, and for responding to
              your enquiries.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-earth text-[clamp(1.4rem,2vw,1.7rem)] mb-4">
              Where it lives
            </h2>
            <p>
              Data is held in Supabase (London, eu-west-2 region). It&rsquo;s
              not sold, rented, or shared with third parties for marketing.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-earth text-[clamp(1.4rem,2vw,1.7rem)] mb-4">
              Your rights
            </h2>
            <p>
              You can ask to see, correct, or delete your data at any time by
              emailing{" "}
              <a className="underline underline-offset-4" href="mailto:hello@bornbare.co.uk">
                hello@bornbare.co.uk
              </a>
              . You also have the right to lodge a complaint with the ICO.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-earth text-[clamp(1.4rem,2vw,1.7rem)] mb-4">
              Cookies
            </h2>
            <p>
              We use a single localStorage entry to remember your cookie
              consent choice, and another to persist an inbound referral code
              between page navigations. No third-party tracking cookies are set
              before consent.
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
