"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { VoteValue } from "@prisma/client";

export async function createPoll(
  title: string,
  instructions: string,
  urlSlug: string,
  creatorId: string,
) {
  await prisma.poll.create({
    data: { title, instructions, urlSlug, creatorId },
  });
  revalidatePath("/");
}

export async function submitStatement(
  pollId: string,
  text: string,
  participantId: string,
) {
  await prisma.statement.create({
    data: { pollId, text, participantId },
  });
  revalidatePath(`/poll/${pollId}`);
}

export async function submitVote(
  statementId: string,
  voteValue: VoteValue,
  participantId: string,
) {
  await prisma.vote.create({
    data: { statementId, voteValue, participantId },
  });
}
