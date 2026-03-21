import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Reel Decoder — Get the actual guide, not the teaser",
  description:
    "Paste any Instagram Reel URL and get the complete step-by-step guide the creator was hiding. No follows, no comments, no waiting. Powered by Groq, Gemini, and Llama AI.",
  keywords: ["instagram reel", "ai decoder", "tutorial generator", "content analysis"],
  openGraph: {
    title: "Reel Decoder",
    description: "Reverse-engineer Instagram teaser reels into complete how-to guides.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="font-sans antialiased bg-gray-950 text-white">
        {children}
      </body>
    </html>
  );
}
