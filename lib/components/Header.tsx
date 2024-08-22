import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

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
        <p>{data.user.email}</p>
      ) : (
        <Link href="/login">Log in</Link>
      )}
    </header>
  );
}
