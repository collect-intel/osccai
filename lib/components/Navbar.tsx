import Link from "next/link";

function NavbarLink({ href, text }: { href: string; text: string }) {
  return (
    <Link href={href} className="font-medium hover:font-bold">
      {text}
    </Link>
  );
}

export default function Navbar() {
  return (
    <nav className="text-sm p-4 border-b border-[#E0E0E0]">
      <div className="flex items-center justify-between 2xl:container 2xl:mx-auto">
        <div className="flex gap-10">
          <Link href="/" className="font-mono font-bold text-black tracking-tight">
            COMMMUNITY MODELS
          </Link>
          <NavbarLink href="/about" text="About" />
          <NavbarLink href="/explore" text="Explore" />
        </div>
        <div className="flex items-center gap-5">
          <NavbarLink href="/polls" text="Polls" />
          <NavbarLink href="/constitutions" text="Constitutions" />
          <img src="/icon-placeholder.png" className="w-8 h-8 rounded-full" />
        </div>
      </div>
    </nav>
  );
}
