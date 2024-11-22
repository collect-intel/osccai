"use client";

import Link from "next/link";
import { Crimson_Text } from "next/font/google";
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/nextjs";
import { useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";

const crimson = Crimson_Text({ subsets: ["latin"], weight: "400" });

function NavbarLink({ href, text, onClick }: { 
  href: string; 
  text: string;
  onClick?: () => void;
}) {
  return (
    <Link href={href} className="font-medium" onClick={onClick}>
      {text}
    </Link>
  );
}

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <nav className="text-sm p-4 bg-yellow">
        <div className="flex items-center justify-between 2xl:container 2xl:mx-auto">
          <div className="flex items-center gap-4 md:gap-10">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden"
            >
              <FaBars className="w-5 h-5" />
            </button>

            <Link
              href="/"
              className={"text-xl text-black tracking-tight " + crimson.className}
            >
              Community Models
            </Link>
            
            <div className="hidden md:flex items-center gap-10">
              <NavbarLink href="/how-it-works" text="How it Works" />
              <NavbarLink href="/library" text="Explore Public Library" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <NavbarLink href="/community-models" text="My Models" />
            </div>
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

      <div 
        className={`md:hidden bg-yellow transition-all duration-200 overflow-hidden -mt-px ${
          isMenuOpen ? 'max-h-48 border-light-gray' : 'max-h-0'
        }`}
      >
        <div className="p-4 flex flex-col gap-4">
          <NavbarLink 
            href="/community-models" 
            text="My Models" 
            onClick={() => setIsMenuOpen(false)}
          />
          <NavbarLink 
            href="/how-it-works" 
            text="How it Works" 
            onClick={() => setIsMenuOpen(false)}
          />
          <NavbarLink 
            href="/library" 
            text="Explore Public Library" 
            onClick={() => setIsMenuOpen(false)}
          />
        </div>
      </div>
    </>
  );
}
