import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "promptlab — learn prompt engineering, beginner to expert · from Aravind Labs",
  description:
    "Interactive prompt-engineering curriculum with live-graded assignments. 12 lessons, beginner to expert. From Aravind Labs.",
  authors: [{ name: "Aravind Pilla" }],
  creator: "Aravind Labs",
  publisher: "Aravind Labs",
  openGraph: {
    title: "promptlab — learn prompt engineering by getting graded",
    description: "12 lessons, beginner to expert. Live LLM grading. From Aravind Labs.",
    siteName: "promptlab",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "promptlab — from Aravind Labs",
    description: "Learn prompt engineering by getting graded. 12 lessons.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden font-sans">{children}</body>
    </html>
  );
}
