import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/lib/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={"text-[#121212] " + inter.className}>
        <Navbar />
        <div className="max-w-4xl mt-10 mx-auto">{children}</div>
      </body>
    </html>
  );
}
