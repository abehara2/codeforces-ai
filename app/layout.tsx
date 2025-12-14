import type { Metadata } from "next";
import { Space_Mono, Playfair_Display, Orbitron } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Codeforces AI",
  description: "Competitive Programming Coach",
  openGraph: {
    title: "Codeforces AI",
    description: "Competitive Programming Coach",
    images: ["/CODE.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Codeforces AI",
    description: "Competitive Programming Coach",
    images: ["/CODE.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${spaceMono.variable} ${playfairDisplay.variable} ${orbitron.variable} antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
