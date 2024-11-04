import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import UserDebug from "@/lib/components/UserDebug";
import Navbar from "@/lib/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "OSCCAI",
  description: "Open-Source Collective Constitutional AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className} pb-16`}>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <UserDebug />
        </body>
      </html>
    </ClerkProvider>
  );
}
