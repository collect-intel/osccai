"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { logout } from "@/app/login/actions";

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsClicked(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleClick = () => {
    setIsClicked(!isClicked);
    setIsOpen(!isClicked);
  };

  const buttonStyle =
    "block p-1.5 text-sm font-medium rounded hover:bg-[#F0F0F0]";

  return (
    <div
      className="relative"
      ref={dropdownRef}
      onMouseEnter={() => !isClicked && setIsOpen(true)}
      onMouseLeave={() => !isClicked && setIsOpen(false)}
    >
      <button onClick={handleClick}>
        <img
          src="/icon-placeholder.png"
          className="w-8 h-8 rounded-full"
          alt="User profile image"
        />
      </button>

      {isOpen && (
        <>
          <div className="absolute right-0 top-full w-48 h-2 bg-transparent" />
          <div className="absolute right-0 top-[calc(100%+8px)] w-48 p-3 bg-white rounded-lg overflow-hidden shadow-lg">
            <Link href="/account" className={buttonStyle}>
              Account
            </Link>
            <form>
              <button
                className={buttonStyle + " w-full text-left"}
                formAction={logout}
              >
                Log Out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
