import Link from "next/link";
import Container from "@/components/Container";
import Section from "@/components/Section";
import Button from "@/components/Button";

export default function NotFound() {
  return (
    <Section size="large" className="min-h-[70svh] flex items-center">
      <Container className="max-w-prose text-center">
        <p className="text-caption uppercase tracking-[0.32em] text-stone mb-8">404</p>
        <h1 className="text-display-1">Nothing here, quietly.</h1>
        <p className="mt-8 text-body text-earth/70">
          The page you were after has wandered off. Try the{" "}
          <Link href="/" className="underline underline-offset-4 hover:text-earth">
            home page
          </Link>
          .
        </p>
        <div className="mt-12 flex justify-center">
          <Button href="/" variant="secondary">
            Back to start
          </Button>
        </div>
      </Container>
    </Section>
  );
}
