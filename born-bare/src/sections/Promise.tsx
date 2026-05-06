import Reveal from "../components/Reveal";

export default function Promise() {
  return (
    <section
      id="story"
      className="relative bg-bare py-40 sm:py-56"
    >
      <div className="mx-auto max-w-page px-6 sm:px-10">
        <Reveal>
          <p className="font-sans text-[11px] uppercase tracking-[0.32em] text-earth/50 mb-12">
            The promise
          </p>
        </Reveal>

        <Reveal delay={250}>
          <h2 className="font-serif font-light text-earth leading-[1.1] text-balance text-[clamp(2rem,5vw,3.75rem)] max-w-4xl">
            Nothing between your baby <br className="hidden sm:block" />
            and a better night&rsquo;s sleep.
          </h2>
        </Reveal>

        <Reveal delay={600}>
          <p className="mt-14 max-w-xl text-earth/70 leading-relaxed text-base">
            We strip away everything unnecessary. The chemicals, the plastics, the noise.
            What&rsquo;s left is bamboo-soft, gentle on the most sensitive skin, and made for the
            quiet hours that matter most.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
