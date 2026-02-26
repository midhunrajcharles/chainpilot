import ContextProvider from "@/context/index";
import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import Script from "next/script";

// Didot/Bodoni-style display serif — for headlines and brand name
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

// Restrained, neutral body sans-serif
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ChainPilot AI - Swap Crypto with Just Words",
  description: "Powered by Somnia Testnet and AI Technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Resource hints for Privy */}
        <link
          rel="preconnect"
          href="https://auth.privy.io"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://auth.privy.io" />
        <Script
          src="https://tempo-deployment-985010e5-977e-4f75-8201-d4a4a0133ae-f78r2tsxp.vercel.app/widget.js"
          data-agent-id="3b3a50a8-2379-4e3a-a882-73900fb36a36"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${cormorant.variable} ${dmSans.variable} ${dmSans.className}`}>
        <ContextProvider>{children}</ContextProvider>
      </body>
    </html>
  );
}

