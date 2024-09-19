import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/lib/components/Navbar";

const dm = DM_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OSCCAI",
  description: "Open-source Collective Constitutional AI",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <ClerkProvider>
        <body className={"text-charcoal bg-off-white " + dm.className}>
          <Navbar />
          {children}
        </body>
      </ClerkProvider>
    </html>
  );
}
