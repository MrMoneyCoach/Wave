import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  bg?: "bare" | "skin" | "earth";
  size?: "default" | "large";
  id?: string;
};

const bgClass = {
  bare: "bg-bare text-earth",
  skin: "bg-skin/40 text-earth",
  earth: "bg-earth text-bare",
} as const;

const sizeClass = {
  default: "py-section",
  large: "py-section-lg",
} as const;

export default function Section({
  children,
  className,
  bg = "bare",
  size = "default",
  id,
}: Props) {
  return (
    <section id={id} className={cn(bgClass[bg], sizeClass[size], className)}>
      {children}
    </section>
  );
}
