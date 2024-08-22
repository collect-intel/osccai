"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const emailLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(), // .min(8),
});

type EmailLoginData = z.infer<typeof emailLoginSchema>;

function parseFormData(formData: FormData): EmailLoginData {
  const parseResult = emailLoginSchema.safeParse({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (!parseResult.success) {
    console.error(parseResult.error);
    redirect("/error");
  }

  return parseResult.data;
}

export async function login(formData: FormData) {
  const supabase = createClient();
  const data = parseFormData(formData);
  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    console.error(error);
    redirect("/error");
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error(error);
    redirect("/error");
  }
  revalidatePath("/", "layout");
}

export async function signup(formData: FormData) {
  const supabase = createClient();
  const data = parseFormData(formData);
  const { error } = await supabase.auth.signUp(data);

  if (error) {
    console.error(error);
    redirect("/error");
  }
  revalidatePath("/", "layout");
  redirect("/");
}
