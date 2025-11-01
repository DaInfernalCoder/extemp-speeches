import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Extemp Speeches",
  description: "Extemporaneous speeches leaderboard",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#1a1a1a',
              border: '3px solid #000000',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '4px 4px 0px #000000',
            },
            success: {
              iconTheme: {
                primary: '#00D9A0',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#FF4757',
                secondary: '#ffffff',
              },
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}
