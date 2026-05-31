"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Source = { src: string; type: string };

type Props = {
  /** Optional video sources — drop into public/video/ when the cut is ready. */
  sources?: Source[];
  /** Poster image used until the video plays, or when video is absent. */
  posterSrc?: string;
  /** Friendly alt-text shown when nothing has loaded yet (a11y + dev). */
  posterAlt?: string;
  className?: string;
  children?: React.ReactNode;
};

/**
 * Full-bleed cinematic hero. Renders a muted, looping, playsInline video
 * if sources are provided; otherwise shows the poster image (or the
 * brand-coloured placeholder if no poster is given either).
 *
 * Once the Kickstarter video is cut, drop the files into
 * `public/video/` and pass them in. No layout changes needed.
 */
export default function VideoHero({
  sources = [],
  posterSrc,
  posterAlt = "Born Bare — sleeping baby, warm natural light",
  className,
  children,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onCanPlay = () => setVideoReady(true);
    v.addEventListener("canplay", onCanPlay);
    return () => v.removeEventListener("canplay", onCanPlay);
  }, []);

  const hasVideo = sources.length > 0;

  return (
    <section
      className={cn(
        "relative w-full h-[100svh] min-h-[640px] overflow-hidden bg-earth",
        className
      )}
    >
      {/* Layer 1 — video or poster */}
      <div aria-hidden className="absolute inset-0">
        {hasVideo ? (
          <video
            ref={videoRef}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-1000 ease-calm",
              videoReady ? "opacity-100" : "opacity-0"
            )}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={posterSrc}
          >
            {sources.map((s) => (
              <source key={s.src} src={s.src} type={s.type} />
            ))}
          </video>
        ) : posterSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterSrc}
            alt={posterAlt}
            className="h-full w-full object-cover"
            loading="eager"
            decoding="async"
          />
        ) : (
          // Tasteful, content-free placeholder until a video or poster
          // is added. The dev-facing hint lives in the README — we
          // never render breadcrumbs that show up to real visitors.
          <div className="absolute inset-0 bg-gradient-to-b from-skin via-clay/60 to-earth" />
        )}
      </div>

      {/* Layer 2 — darkening overlay for text legibility */}
      {/* Layer 2a — soft top scrim so the nav stays legible on bright video */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-40 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(61,54,50,0.4) 0%, rgba(61,54,50,0) 100%)",
        }}
      />

      {/* Layer 2b — deep bottom gradient. The hero copy sits in this band,
          so it stays legible regardless of how warm/bright the video is. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(61,54,50,0) 0%, rgba(61,54,50,0) 35%, rgba(61,54,50,0.35) 60%, rgba(61,54,50,0.7) 80%, rgba(61,54,50,0.9) 100%)",
        }}
      />

      {/* Layer 3 — foreground content */}
      <div className="relative z-10 h-full">{children}</div>
    </section>
  );
}
