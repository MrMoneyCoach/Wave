import Reveal from "../components/Reveal";

export default function SleepingBaby() {
  return (
    <section className="relative min-h-[100svh] bg-bare">
      <div className="relative h-[100svh] w-full overflow-hidden">
        {/* Swap src to /images/sleeping-baby.jpg once the locked Nano Banana hero is added. */}
        <img
          src="/images/sleeping-baby.svg"
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />

        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-earth/30 via-transparent to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-bare pointer-events-none"
        />

        <div className="relative h-full mx-auto max-w-page px-6 sm:px-10 flex items-end pb-24">
          <Reveal>
            <div className="max-w-md">
              <p className="font-sans text-[11px] uppercase tracking-[0.32em] text-bare/70 mb-6">
                The outcome
              </p>
              <p className="font-serif font-light italic text-bare text-balance text-[clamp(1.5rem,2.6vw,2.25rem)] leading-[1.3]">
                Your baby sleeps better when nothing gets in the way.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
