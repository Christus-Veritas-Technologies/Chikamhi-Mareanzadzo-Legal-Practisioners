import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chikamhi & Mareanadzo — Document System",
  description: "Digitized document management for Chikamhi & Mareanadzo Legal Practitioners.",
  manifest: "/manifest.json",
  other: {
    "apple-mobile-web-app-title": "CMLP",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${fraunces.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
