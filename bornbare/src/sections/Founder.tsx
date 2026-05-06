import Reveal from "../components/Reveal";

export default function Founder() {
  return (
    <section className="relative bg-skin/40 py-40 sm:py-56">
      <div className="mx-auto max-w-3xl px-6 sm:px-10">
        <Reveal>
          <p className="font-sans text-[11px] uppercase tracking-[0.32em] text-earth/50 mb-12 text-center">
            A note from us
          </p>
        </Reveal>

        <Reveal delay={250}>
          <p className="font-serif font-light italic text-earth leading-[1.4] text-balance text-[clamp(1.5rem,2.6vw,2.1rem)] text-center">
            We started Born Bare because our own children deserved better &mdash; and so did the
            planet they&rsquo;d inherit. One product. Done exceptionally well. Nothing more.
          </p>
        </Reveal>

        <Reveal delay={500}>
          <p className="mt-14 text-center font-sans text-[11px] uppercase tracking-[0.32em] text-earth/50">
            Born Bare &mdash; founders
          </p>
        </Reveal>
      </div>
    </section>
  );
}
