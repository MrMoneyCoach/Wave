import Link from "next/link";
import { cn } from "@/lib/utils";

type CommonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

type AnchorProps = CommonProps & {
  href: string;
  type?: never;
  onClick?: never;
  disabled?: never;
};

type ButtonProps = CommonProps & {
  href?: never;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  disabled?: boolean;
};

type Props = AnchorProps | ButtonProps;

const baseClass =
  "inline-flex items-center justify-center text-btn uppercase tracking-[0.18em] font-medium transition-colors duration-300 ease-calm whitespace-nowrap";

const variantClass = {
  primary: "bg-earth text-bare px-7 py-4 hover:bg-earth/90",
  secondary:
    "bg-transparent text-earth border border-earth/80 px-7 py-4 hover:bg-earth hover:text-bare",
  ghost: "bg-transparent text-earth/80 hover:text-earth px-2 py-2",
} as const;

export default function Button({
  children,
  variant = "primary",
  className,
  ...rest
}: Props) {
  const classes = cn(baseClass, variantClass[variant], className);

  if ("href" in rest && rest.href) {
    return (
      <Link href={rest.href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={rest.type ?? "button"}
      onClick={rest.onClick}
      disabled={rest.disabled}
      className={cn(classes, rest.disabled && "opacity-50 cursor-not-allowed")}
    >
      {children}
    </button>
  );
}
