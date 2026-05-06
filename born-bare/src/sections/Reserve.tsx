import { useState } from "react";
import Reveal from "../components/Reveal";

export default function Reserve() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  return (
    <section id="reserve" className="relative bg-bare py-40 sm:py-56">
      <div className="mx-auto max-w-page px-6 sm:px-10 text-center">
        <Reveal>
          <p className="font-sans text-[11px] uppercase tracking-[0.32em] text-earth/50 mb-10">
            Reserve
          </p>
        </Reveal>

        <Reveal delay={200}>
          <h2 className="font-serif font-light text-earth leading-[1.1] text-balance text-[clamp(2rem,5vw,3.5rem)] max-w-3xl mx-auto">
            Be among the first to try Born Bare.
          </h2>
        </Reveal>

        <Reveal delay={450}>
          <p className="mt-8 max-w-lg mx-auto text-earth/65 leading-relaxed">
            Join the waitlist. We&rsquo;ll let you know when we&rsquo;re ready.
            No noise in between.
          </p>
        </Reveal>

        <Reveal delay={650}>
          <form
            onSubmit={onSubmit}
            className="mt-14 mx-auto max-w-md flex items-center border-b border-earth/40 focus-within:border-earth transition-colors"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your email"
              className="flex-1 bg-transparent py-4 px-1 text-earth placeholder:text-earth/40 focus:outline-none"
              aria-label="Your email address"
            />
            <button
              type="submit"
              className="font-sans text-[12px] uppercase tracking-[0.22em] font-medium text-earth py-4 px-2 hover:text-clay transition-colors"
            >
              {submitted ? "On the list" : "Join"}
            </button>
          </form>
        </Reveal>

        {submitted && (
          <p className="mt-6 text-earth/60 text-sm" role="status">
            Thank you. We&rsquo;ll be in touch.
          </p>
        )}
      </div>
    </section>
  );
}
