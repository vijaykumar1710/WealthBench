import type { Metadata } from "next";
import "./globals.css";
import "@/styles/theme.css";
import Header from "@/components/Header";
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: "WealthBench",
  description: "WealthBench Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
         <Analytics />
      </body>
    </html>
  );
}

