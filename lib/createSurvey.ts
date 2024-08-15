"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export default async function createSurvey(
  title: string,
  instructions: string,
) {
  await prisma.survey.create({
    data: { title, instructions },
  });
  revalidatePath("/");
}
