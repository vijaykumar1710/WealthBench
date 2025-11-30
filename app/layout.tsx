import type { Metadata } from "next";
import "./globals.css";
import "@/styles/theme.css";
import Header from "@/components/Header";
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from "@vercel/speed-insights/next"

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
        <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Connect with us:</strong>
              </p>
              <div className="flex justify-center items-center gap-6 text-sm text-gray-600">
                <span>
                  📱 <span className="font-medium">Phone:</span> +91-9739519860
                </span>
                <span>
                  ✉️ <span className="font-medium">Email:</span> vijaysc123@gmail.com
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Feel free to reach out for collaborations, feedback, or any questions!
              </p>
            </div>
          </div>
        </footer>
         <Analytics />
         <SpeedInsights />
      </body>
    </html>
  );
}

