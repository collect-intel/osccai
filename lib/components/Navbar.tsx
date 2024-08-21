import Link from "next/link";

function NavbarLink({ href, text }: { href: string; text: string }) {
  return (
    <Link href={href} className="font-medium">
      {text}
    </Link>
  );
}

export default function Navbar() {
  return (
    <nav className="text-sm p-4 border-b border-[#E0E0E0]">
      <div className="flex items-center justify-between 2xl:container 2xl:mx-auto">
        <div className="flex gap-8">
          <div className="font-mono font-bold text-black">
            COMMMUNITY MODELS
          </div>
          <NavbarLink href="/about" text="About" />
          <NavbarLink href="/explore" text="Explore" />
        </div>
        <div className="flex gap-8">
          <NavbarLink href="/polls" text="Polls" />
          <NavbarLink href="/constitutions" text="Constitutions" />
          <div>Icon</div>
        </div>
      </div>
    </nav>
  );
}
