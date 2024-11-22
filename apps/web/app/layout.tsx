import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import UserDebug from "@/lib/components/UserDebug";
import Navbar from "@/lib/components/Navbar";
import { headers } from 'next/headers';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Community Models",
  description: "Create and share community-aligned AI Models",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <main>{children}</main>
          <UserDebug />
        </body>
      </html>
    </ClerkProvider>
  );
}
