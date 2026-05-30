import { cn } from "@/lib/utils";

type Props = {
  name: string;
  prompt: string;
  ratio?: "square" | "portrait" | "landscape" | "wide";
  className?: string;
};

const ratioClass = {
  square: "aspect-square",
  portrait: "aspect-[4/5]",
  landscape: "aspect-[16/10]",
  wide: "aspect-[21/9]",
} as const;

export default function ImagePlaceholder({
  name,
  prompt,
  ratio = "landscape",
  className,
}: Props) {
  return (
    <figure
      aria-label={prompt}
      className={cn(
        "relative w-full bg-skin/40 border border-earth/10 overflow-hidden",
        ratioClass[ratio],
        className
      )}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 gap-3">
        <span className="font-sans uppercase tracking-[0.32em] text-[10px] text-earth/40">
          Image placeholder
        </span>
        <span className="font-serif italic text-earth/55 text-lg">{name}</span>
        <span className="text-caption text-earth/50 max-w-xs text-pretty">{prompt}</span>
      </div>
    </figure>
  );
}
