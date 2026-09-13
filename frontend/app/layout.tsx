import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Reel Decoder — Decode Instagram Reels Instantly",
  description:
    "Paste any Instagram Reel URL. AI extracts the hidden roadmap, promised links, and resources — no follows, no comments, no waiting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="font-sans antialiased bg-[#111213] text-[#f4f4f5]">
        {children}
      </body>
    </html>
  );
}
