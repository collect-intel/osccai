"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { VoteValue } from "@prisma/client";

const participantId = "TODO: participantId";

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

export async function editPoll(
  uid: string,
  title: string,
  instructions: string,
) {
  await prisma.poll.update({
    where: { uid },
    data: { title, instructions },
  });
  revalidatePath(`/poll/${uid}`);
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

export async function flagStatement(statementId: string) {
  await prisma.flag.create({
    data: {
      statementId,
      participantId,
    },
  });
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
