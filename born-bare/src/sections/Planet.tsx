import Reveal from "../components/Reveal";

export default function Planet() {
  return (
    <section className="relative bg-bare py-40 sm:py-56">
      <div className="mx-auto max-w-page px-6 sm:px-10">
        <div className="grid lg:grid-cols-12 gap-16 items-end">
          <div className="lg:col-span-7">
            <Reveal>
              <p className="font-sans text-[11px] uppercase tracking-[0.32em] text-earth/50 mb-12">
                The planet
              </p>
            </Reveal>

            <Reveal delay={200}>
              <h2 className="font-serif font-light italic text-earth leading-[1.1] text-balance text-[clamp(2rem,5vw,3.75rem)]">
                Gone in years, not centuries.
              </h2>
            </Reveal>

            <Reveal delay={500}>
              <p className="mt-12 max-w-lg text-earth/70 leading-relaxed">
                Conventional nappies take 500 years to decompose. Ours biodegrade in 3&ndash;5.
                Eighty percent less plastic. Brown paper packaging. Because they inherit
                this planet.
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-5">
            <Reveal delay={300}>
              <div className="grid grid-cols-2 gap-px bg-earth/10">
                <Stat label="Conventional" value="500 yrs" muted />
                <Stat label="Born Bare" value="3–5 yrs" />
                <Stat label="Plastic" value="−80%" />
                <Stat label="Packaging" value="Kraft. Compostable." small />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  muted = false,
  small = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
  small?: boolean;
}) {
  return (
    <div className="bg-bare p-8">
      <p className="font-sans text-[10px] uppercase tracking-[0.28em] text-earth/40 mb-3">
        {label}
      </p>
      <p
        className={`font-serif font-light text-earth ${
          muted ? "text-earth/40" : ""
        } ${small ? "text-xl" : "text-3xl"}`}
      >
        {value}
      </p>
    </div>
  );
}
