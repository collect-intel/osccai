import { createClient } from "@/lib/supabase/server";

export async function isCreator(
  creatorId: string | undefined,
): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error(error);
    return false;
  }

  return data.user?.id === creatorId;
}
