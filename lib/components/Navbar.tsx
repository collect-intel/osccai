import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";

function NavbarLink({ href, text }: { href: string; text: string }) {
  return (
    <Link href={href} className="font-medium hover:font-semibold">
      {text}
    </Link>
  );
}

function UserIcon() {
  return (
    <form>
      <button formAction={logout}>
        <img
          src="/icon-placeholder.png"
          className="w-8 h-8 rounded-full"
          alt="User profile image"
        />
      </button>
    </form>
  );
}

export default async function Navbar() {
  const supabase = createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error(error);
  }

  return (
    <nav className="text-sm p-4 border-b border-[#E0E0E0]">
      <div className="flex items-center justify-between 2xl:container 2xl:mx-auto">
        <div className="flex gap-10">
          <Link
            href="/"
            className="font-mono font-bold text-black tracking-tight"
          >
            COMMMUNITY MODELS
          </Link>
          <NavbarLink href="/about" text="About" />
          <NavbarLink href="/explore" text="Explore" />
        </div>
        <div className="flex items-center gap-5">
          <NavbarLink href="/polls" text="Polls" />
          <NavbarLink href="/constitutions" text="Constitutions" />
          {data?.user ? <UserIcon /> : <Link href="/login">Log in</Link>}
        </div>
      </div>
    </nav>
  );
}
