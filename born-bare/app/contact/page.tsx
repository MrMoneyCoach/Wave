import type { Metadata } from "next";
import Section from "@/components/Section";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Born Bare team.",
};

export default function ContactPage() {
  return (
    <Section size="large">
      <Container className="max-w-prose">
        <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8">Contact</p>
        <h1 className="text-display-1">Say hello.</h1>
        <p className="mt-10 text-body text-earth/75">
          Or write to{" "}
          <a className="underline underline-offset-4" href="mailto:hello@bornbare.co.uk">
            hello@bornbare.co.uk
          </a>
          . Full contact form wired to Supabase lands in phase 3.
        </p>
      </Container>
    </Section>
  );
}
