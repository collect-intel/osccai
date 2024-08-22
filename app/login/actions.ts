"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

const emailSignupSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string(), // .min(8),
});

type EmailSignupData = z.infer<typeof emailSignupSchema>;

function parseSignupData(formData: FormData): EmailSignupData {
  const parseResult = emailSignupSchema.safeParse({
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (!parseResult.success) {
    console.error("parseSignupData", parseResult.error);
    redirect("/error");
  }

  return parseResult.data;
}

const emailLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(), // .min(8),
});

type EmailLoginData = z.infer<typeof emailLoginSchema>;

function parseLoginData(formData: FormData): EmailLoginData {
  const parseResult = emailLoginSchema.safeParse({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (!parseResult.success) {
    console.error("parseLoginData", parseResult.error);
    redirect("/error");
  }

  return parseResult.data;
}

export async function login(formData: FormData) {
  const supabase = createClient();
  const data = parseLoginData(formData);
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
  const data = parseSignupData(formData);
  const {
    error,
    data: { user },
  } = await supabase.auth.signUp(data);

  if (error || !user) {
    console.error(error);
    redirect("/error");
  }

  await Promise.all([
    prisma.pollCreator.create({
      data: {
        uid: user.id, // TODO: maybe just point to the supabase record instead of sharing a key
        name: data.name,
        email: data.email,
      },
    }),
    // TODO: For demo purposes only. Real app has different flows for poll creators and participants.
    prisma.participant.create({
      data: {
        uid: user.id,
      },
    }),
  ]);

  revalidatePath("/", "layout");
  redirect("/");
}
