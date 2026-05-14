import type { Metadata } from "next";
import PreviewApp from "./PreviewApp";

export const metadata: Metadata = {
  title: "Recap — interactive preview",
  description: "Click through the Recap UI with demo data — no setup required.",
  robots: { index: false, follow: false },
};

export default function PreviewPage() {
  return <PreviewApp />;
}
