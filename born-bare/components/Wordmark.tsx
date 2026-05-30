import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  variant?: "earth" | "bare";
  stacked?: boolean;
};

export default function Wordmark({
  className,
  variant = "earth",
  stacked = false,
}: Props) {
  const colour = variant === "earth" ? "text-earth" : "text-bare";

  return (
    <span
      aria-label="Born Bare"
      className={cn(
        "font-serif font-light lowercase tracking-wordmark leading-none select-none",
        stacked ? "flex flex-col gap-1" : "inline-block",
        colour,
        className
      )}
    >
      {stacked ? (
        <>
          <span>born</span>
          <span>bare</span>
        </>
      ) : (
        "born bare"
      )}
    </span>
  );
}
