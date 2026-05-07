import { useEffect, useRef } from "react";

type Props = {
  opacity?: number;
  className?: string;
};

export default function Grain({ opacity = 0.07, className = "" }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const step = () => {
      const x = Math.floor(Math.random() * 12) - 6;
      const y = Math.floor(Math.random() * 12) - 6;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = window.setTimeout(step, 90) as unknown as number;
    };
    step();
    return () => window.clearTimeout(raf);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute -inset-4 mix-blend-multiply ${className}`}
      style={{
        opacity,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.24 0 0 0 0 0.21 0 0 0 0 0.20 0 0 0 0.9 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        backgroundSize: "240px 240px",
      }}
    />
  );
}
