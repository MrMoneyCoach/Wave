"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Container from "./Container";
import Button from "./Button";
import Wordmark from "./Wordmark";

const navLinks = [
  { href: "/the-nappy", label: "The Nappy" },
  { href: "/our-story", label: "Our Story" },
  { href: "/sustainability", label: "Sustainability" },
  { href: "/kickstarter", label: "Coming Soon" },
  { href: "/faq", label: "FAQ" },
];

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors duration-500 ease-calm",
        scrolled ? "bg-bare/85 backdrop-blur-md" : "bg-bare/0"
      )}
    >
      <Container className="h-16 flex items-center justify-between">
        <Link href="/" aria-label="Born Bare home">
          <Wordmark className="text-xl" />
        </Link>

        <nav className="hidden lg:flex items-center gap-9 text-caption uppercase tracking-[0.18em] text-earth/75">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "transition-colors hover:text-earth",
                pathname === link.href && "text-earth"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button href="/#waitlist" variant="secondary" className="hidden sm:inline-flex">
            Join waitlist
          </Button>

          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden w-10 h-10 -mr-2 flex flex-col items-center justify-center gap-1.5"
          >
            <span
              className={cn(
                "block h-px w-5 bg-earth transition-transform duration-300 ease-calm",
                open && "translate-y-[3px] rotate-45"
              )}
            />
            <span
              className={cn(
                "block h-px w-5 bg-earth transition-transform duration-300 ease-calm",
                open && "-translate-y-[3px] -rotate-45"
              )}
            />
          </button>
        </div>
      </Container>

      {open && (
        <div className="lg:hidden border-t border-earth/10 bg-bare">
          <Container className="py-6 flex flex-col gap-5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-h3 font-serif text-earth"
              >
                {link.label}
              </Link>
            ))}
            <Button href="/#waitlist" variant="primary" className="mt-2 self-start">
              Join waitlist
            </Button>
          </Container>
        </div>
      )}
    </header>
  );
}
