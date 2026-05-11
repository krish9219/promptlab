import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "promptlab — learn prompt engineering, beginner to expert",
  description: "Interactive prompt-engineering curriculum with live-graded assignments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden font-sans">{children}</body>
    </html>
  );
}
