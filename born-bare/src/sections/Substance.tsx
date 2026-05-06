import Reveal from "../components/Reveal";

const absent = ["chlorine", "latex", "parabens", "phthalates", "fragrances"];

export default function Substance() {
  return (
    <section className="relative bg-earth text-bare py-40 sm:py-56">
      <div className="mx-auto max-w-page px-6 sm:px-10">
        <Reveal>
          <p className="font-sans text-[11px] uppercase tracking-[0.32em] text-bare/50 mb-12">
            The substance
          </p>
        </Reveal>

        <Reveal delay={200}>
          <h2 className="font-serif font-light italic text-bare leading-[1.1] text-balance text-[clamp(2rem,5vw,3.75rem)] max-w-4xl">
            Nothing you wouldn&rsquo;t want on your own skin.
          </h2>
        </Reveal>

        <ul className="mt-20 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-y-10">
          {absent.map((word, i) => (
            <Reveal key={word} delay={i * 100}>
              <li className="text-center">
                <span className="block font-sans text-[10px] uppercase tracking-[0.32em] text-bare/40 mb-3">
                  No
                </span>
                <span className="font-serif font-light text-bare text-[clamp(1.6rem,2.4vw,2.2rem)] capitalize">
                  {word}
                </span>
              </li>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={500}>
          <p className="mt-24 max-w-md text-bare/65 text-sm leading-relaxed">
            Just bamboo-soft material that&rsquo;s gentle on the most sensitive skin.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
