"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function createSurvey(title: string, instructions: string) {
  await prisma.survey.create({
    data: { title, instructions },
  });
  revalidatePath("/");
}

export async function submitStatement(surveyId: string, text: string) {
  await prisma.statement.create({
    data: { surveyId, text },
  });
  revalidatePath(`/survey/${surveyId}`);
}

export type VoteType = "agree" | "disagree" | "pass";

export async function submitVote(statementId: string, value: VoteType) {
  await prisma.vote.create({
    data: { statementId, voteKind: value },
  });
}
