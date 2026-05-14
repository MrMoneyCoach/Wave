import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recap — meeting transcripts, summaries, action items",
  description:
    "Upload a meeting, get a clean transcript with speaker labels and a template-driven summary in minutes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
