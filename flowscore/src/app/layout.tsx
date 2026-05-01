import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Flowscore — turn quizzes into qualified leads",
  description:
    "Flowscore helps you build branded scorecard quizzes that score your audience, deliver personalised results, and capture leads on autopilot.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Allow users to zoom — locking it down hurts accessibility.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
