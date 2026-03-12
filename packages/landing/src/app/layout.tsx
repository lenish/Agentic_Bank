import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agentic Bank — Agent Operating Account (AOA)",
  description: "The Operating System for Agent Finance. MAS-Ready from Day One.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230f172a'/%3E%3Ccircle cx='32' cy='32' r='10' stroke='%23f8fafc' stroke-width='4'/%3E%3Cpath d='M22 32h20M32 22v20' stroke='%23f8fafc' stroke-width='4' stroke-linecap='round'/%3E%3Ccircle cx='32' cy='32' r='3.6' fill='%232dd4bf'/%3E%3C/svg%3E"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
