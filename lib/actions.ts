"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function createPoll(title: string, instructions: string) {
  await prisma.poll.create({
    data: { title, instructions },
  });
  revalidatePath("/");
}

export async function submitStatement(pollId: string, text: string) {
  await prisma.statement.create({
    data: { pollId, text },
  });
  revalidatePath(`/poll/${pollId}`);
}

export type VoteType = "AGREE" | "DISAGREE" | "PASS";

export async function submitVote(statementId: string, voteValue: VoteType) {
  await prisma.vote.create({
    data: { statementId, voteValue },
  });
}
