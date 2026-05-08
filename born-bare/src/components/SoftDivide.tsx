type Direction = "down" | "up";

type Props = {
  direction: Direction;
  height?: string;
};

export default function SoftDivide({ direction, height = "32svh" }: Props) {
  const className =
    direction === "down" ? "soft-divide-down" : "soft-divide-up";
  return (
    <div
      aria-hidden
      className={`relative w-full pointer-events-none ${className}`}
      style={{ height }}
    >
      <div
        className="absolute inset-0 mix-blend-soft-light opacity-60"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
