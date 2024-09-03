import Link from "next/link";
import { Crimson_Text } from "next/font/google";

import { createClient } from "@/lib/supabase/server";
import ProfileDropdown from "./ProfileDropdown";

const crimson = Crimson_Text({ subsets: ["latin"], weight: "400" });

function NavbarLink({ href, text }: { href: string; text: string }) {
  return (
    <Link href={href} className="font-medium">
      {text}
    </Link>
  );
}

export default async function Navbar() {
  const supabase = createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error(error);
  }

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
          <NavbarLink href="/explore" text="Explore Constitutions" />
        </div>
        <div className="flex items-center gap-5">
          {data?.user ? (
            <>
              <NavbarLink href="/constitutions" text="My Constitutions" />
              <ProfileDropdown />
            </>
          ) : (
            <NavbarLink href="/login" text="Log in" />
          )}
        </div>
      </div>
    </nav>
  );
}
