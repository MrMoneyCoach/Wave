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
  /** Tint applied over the video for legibility. 0–1 */
  overlayOpacity?: number;
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
  overlayOpacity = 0.35,
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
          // Branded fallback if neither video nor poster has been added yet
          <div className="h-full w-full bg-gradient-to-b from-skin to-earth flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <p className="font-sans text-[10px] uppercase tracking-[0.32em] text-bare/55 mb-3">
                Hero asset placeholder
              </p>
              <p className="font-serif italic text-bare/85 text-[clamp(1.1rem,1.6vw,1.35rem)] leading-snug">
                Drop the Kickstarter video into{" "}
                <span className="not-italic font-sans tracking-[0.05em]">
                  /public/video/
                </span>{" "}
                and pass it to <span className="not-italic">VideoHero</span>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Layer 2 — darkening overlay for text legibility */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, rgba(61,54,50,${
            overlayOpacity * 0.3
          }) 0%, rgba(61,54,50,${overlayOpacity * 0.5}) 50%, rgba(61,54,50,${
            overlayOpacity * 1.2
          }) 100%)`,
        }}
      />

      {/* Layer 3 — foreground content */}
      <div className="relative z-10 h-full">{children}</div>
    </section>
  );
}
