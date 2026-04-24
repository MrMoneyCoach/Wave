import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flowscore — turn quizzes into qualified leads",
  description:
    "Flowscore helps you build branded scorecard quizzes that score your audience, deliver personalised results, and capture leads on autopilot.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
