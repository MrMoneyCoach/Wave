import { useEffect, useState } from "react";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-500 ${
        scrolled ? "bg-bare/85 backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-page px-6 sm:px-10 h-16 flex items-center justify-between">
        <a
          href="#top"
          className="font-serif font-light text-earth text-xl tracking-wordmark lowercase"
          aria-label="Born Bare home"
        >
          born bare
        </a>

        <nav className="hidden md:flex items-center gap-10 text-[13px] uppercase tracking-[0.18em] text-earth/80">
          <a href="#shop" className="hover:text-earth transition-colors">Shop</a>
          <a href="#story" className="hover:text-earth transition-colors">Our Story</a>
          <a href="#faq" className="hover:text-earth transition-colors">FAQ</a>
        </nav>

        <a
          href="#reserve"
          className="text-[13px] uppercase tracking-[0.18em] font-medium px-5 py-2.5 border border-earth/80 text-earth hover:bg-earth hover:text-bare transition-colors duration-300"
        >
          Reserve
        </a>
      </div>
    </header>
  );
}
