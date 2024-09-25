"use client";

import Link from "next/link";
import { Crimson_Text } from "next/font/google";
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/nextjs";

const crimson = Crimson_Text({ subsets: ["latin"], weight: "400" });

function NavbarLink({ href, text }: { href: string; text: string }) {
  return (
    <Link href={href} className="font-medium">
      {text}
    </Link>
  );
}

export default function Navbar() {
  return (
    <nav className="text-sm p-4 border-b border-light-gray bg-yellow">
      <div className="flex items-center justify-between 2xl:container 2xl:mx-auto">
        <div className="flex items-center gap-10">
          <Link
            href="/"
            className={"text-xl text-black tracking-tight " + crimson.className}
          >
            Community AI Models
          </Link>
          <NavbarLink href="/how-it-works" text="How it Works" />
          <NavbarLink href="/library" text="Explore Public Library" />
        </div>
        <div className="flex items-center gap-5">
          <NavbarLink href="/community-models" text="My Community Models" />
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-sm font-medium">Sign In</button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </nav>
  );
}
