import Link from "next/link";
import Container from "./Container";
import Wordmark from "./Wordmark";

const cols = [
  {
    title: "Brand",
    links: [
      { href: "/our-story", label: "Our story" },
      { href: "/sustainability", label: "Sustainability" },
      { href: "/the-nappy", label: "The nappy" },
    ],
  },
  {
    title: "Pre-launch",
    links: [
      { href: "/kickstarter", label: "Coming soon" },
      { href: "/#waitlist", label: "Join the waitlist" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
      { href: "mailto:hello@bornbare.co.uk", label: "hello@bornbare.co.uk" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-earth text-bare">
      <Container className="py-section">
        <div className="text-center">
          <Wordmark className="text-[clamp(2.5rem,6vw,4.5rem)]" variant="bare" />
          <p className="mt-3 font-serif italic text-bare/70 text-[clamp(1rem,1.6vw,1.25rem)]">
            Nothing but sleep.
          </p>
        </div>

        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-10 text-caption uppercase tracking-[0.18em] text-bare/60">
          {cols.map((col) => (
            <div key={col.title}>
              <p className="text-bare/40 mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-bare transition-colors duration-300">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-20 pt-8 border-t border-bare/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] tracking-[0.22em] uppercase text-bare/40">
          <p>&copy; Born Bare {new Date().getFullYear()}</p>
          <p>wearebornbare.com</p>
        </div>
      </Container>
    </footer>
  );
}
