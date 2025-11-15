import type { Metadata } from "next";
import "./globals.css";
import "@/styles/theme.css";
import Header from "@/components/Header";

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
      </body>
    </html>
  );
}

