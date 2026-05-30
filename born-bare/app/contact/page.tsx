import type { Metadata } from "next";
import Container from "@/components/Container";
import Section from "@/components/Section";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Born Bare team.",
};

export default function ContactPage() {
  return (
    <Section size="large" bg="bare" className="pt-24 sm:pt-32 lg:pt-40">
      <Container>
        <div className="grid lg:grid-cols-12 gap-16 lg:gap-24">
          <div className="lg:col-span-5">
            <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8">
              Contact
            </p>
            <h1 className="text-display-1 sm:text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] text-earth">
              Say hello.
            </h1>
            <p className="mt-10 text-body text-earth/75 max-w-prose">
              Press, partners, parents &mdash; we read everything that lands.
              We&rsquo;ll write back within a couple of working days.
            </p>
            <p className="mt-8 text-body text-earth/75">
              Or write directly to{" "}
              <a
                href="mailto:hello@bornbare.co.uk"
                className="underline underline-offset-4 text-earth"
              >
                hello@bornbare.co.uk
              </a>
              .
            </p>
          </div>

          <div className="lg:col-span-7">
            <ContactForm />
          </div>
        </div>
      </Container>
    </Section>
  );
}
