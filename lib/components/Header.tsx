import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";

export default async function Header() {
  const supabase = createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error(error);
  }

  return (
    <header className="flex justify-between">
      <h1>OSCCAI</h1>
      {data?.user ? (
        <div className="flex">
          {data.user.email}
          <form>
            <button formAction={logout}>Log out</button>
          </form>
        </div>
      ) : (
        <Link href="/login">Log in</Link>
      )}
    </header>
  );
}
