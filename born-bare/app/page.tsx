import Section from "@/components/Section";
import Container from "@/components/Container";
import Button from "@/components/Button";

export default function HomePage() {
  return (
    <>
      <Section size="large" className="min-h-[80svh] flex items-center">
        <Container className="text-center">
          <p className="text-caption uppercase tracking-[0.32em] text-stone mb-10">
            Coming soon
          </p>
          <h1 className="text-display-1 font-serif font-light text-balance">
            Nothing but sleep.
          </h1>
          <p className="mt-10 max-w-prose mx-auto text-body text-earth/75">
            Better sleep starts here. Be the first to know when Born Bare launches.
          </p>
          <div className="mt-12 flex justify-center">
            <Button href="/#waitlist">Join the waitlist</Button>
          </div>
        </Container>
      </Section>

      <Section bg="skin" id="waitlist">
        <Container className="text-center">
          <h2 className="text-display-2">Waitlist coming next.</h2>
          <p className="mt-6 max-w-prose mx-auto text-body text-earth/70">
            The full home page, email capture, referral mechanic and the
            nine-tier Kickstarter teaser are coming in the next build pass.
          </p>
        </Container>
      </Section>
    </>
  );
}
