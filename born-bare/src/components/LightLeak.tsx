export default function LightLeak() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute -top-1/3 -left-1/4 w-[80vw] h-[80vw] rounded-full opacity-50 blur-3xl mix-blend-screen will-change-transform"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(212,196,181,0.55), rgba(184,145,122,0.18) 45%, transparent 70%)",
          animation: "leak-drift 22s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute -bottom-1/4 -right-1/4 w-[70vw] h-[70vw] rounded-full opacity-40 blur-3xl mix-blend-screen will-change-transform"
        style={{
          background:
            "radial-gradient(circle at 70% 70%, rgba(216,196,181,0.5), rgba(168,181,160,0.12) 50%, transparent 75%)",
          animation: "leak-drift-2 28s ease-in-out infinite alternate",
        }}
      />
    </div>
  );
}
