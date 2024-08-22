import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/lib/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OSCCAI",
  description: "Open-source Collective Constitutional AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={"max-w-4xl mt-8 mx-auto " + inter.className}>
        <Header />
        {children}
      </body>
    </html>
  );
}
