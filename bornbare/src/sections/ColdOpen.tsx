import Reveal from "../components/Reveal";

export default function ColdOpen() {
  return (
    <section
      id="top"
      className="relative h-[100svh] flex items-center justify-center bg-bare grain overflow-hidden"
    >
      <div className="mx-auto max-w-page px-6 text-center">
        <Reveal delay={400}>
          <p className="font-sans text-[11px] uppercase tracking-[0.32em] text-earth/50 mb-10">
            born bare
          </p>
        </Reveal>

        <Reveal delay={1100}>
          <h1 className="font-serif font-light text-earth leading-[1.05] text-balance text-[clamp(2.5rem,7vw,5.5rem)]">
            Better sleep <span className="italic">starts</span> here.
          </h1>
        </Reveal>

        <Reveal delay={2000}>
          <p className="mt-10 text-earth/60 text-sm tracking-[0.18em] uppercase">
            scroll
          </p>
        </Reveal>
      </div>

      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bare pointer-events-none"
      />
    </section>
  );
}
