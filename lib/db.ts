import { PrismaClient, VoteValue } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// middleware to update statement vote counts on vote creation
prisma.$use(async (params, next) => {
  if (params.model === "Vote") {
    const result = await next(params);

    if (params.action === "create") {
      // Update the corresponding statement's vote counts on vote creation
      await prisma.statement.update({
        where: { uid: result.statementId },
        data: {
          agreeCount: {
            increment: result.voteValue === VoteValue.AGREE ? 1 : 0,
          },
          disagreeCount: {
            increment: result.voteValue === VoteValue.DISAGREE ? 1 : 0,
          },
          passCount: {
            increment: result.voteValue === VoteValue.PASS ? 1 : 0,
          },
        },
      });
    } else if (params.action === "update") {
      // Update the corresponding statement's vote counts on vote update
      const { voteValue: newVoteValue, statementId } = result;
      const { voteValue: oldVoteValue } = params.args.data;

      await prisma.statement.update({
        where: { uid: statementId },
        data: {
          agreeCount: {
            increment:
              newVoteValue === VoteValue.AGREE && oldVoteValue !== VoteValue.AGREE
                ? 1
                : newVoteValue !== VoteValue.AGREE && oldVoteValue === VoteValue.AGREE
                ? -1
                : 0,
          },
          disagreeCount: {
            increment:
              newVoteValue === VoteValue.DISAGREE && oldVoteValue !== VoteValue.DISAGREE
                ? 1
                : newVoteValue !== VoteValue.DISAGREE && oldVoteValue === VoteValue.DISAGREE
                ? -1
                : 0,
          },
          passCount: {
            increment:
              newVoteValue === VoteValue.PASS && oldVoteValue !== VoteValue.PASS
                ? 1
                : newVoteValue !== VoteValue.PASS && oldVoteValue === VoteValue.PASS
                ? -1
                : 0,
          },
        },
      });
    } else if (params.action === "delete") {
      // Update the corresponding statement's vote counts on vote deletion
      const { voteValue, statementId } = params.args.where;

      await prisma.statement.update({
        where: { uid: statementId },
        data: {
          agreeCount: {
            decrement: voteValue === VoteValue.AGREE ? 1 : 0,
          },
          disagreeCount: {
            decrement: voteValue === VoteValue.DISAGREE ? 1 : 0,
          },
          passCount: {
            decrement: voteValue === VoteValue.PASS ? 1 : 0,
          },
        },
      });
    }

    return result;
  }
  return next(params);
});

// Prevent hot reloading from creating new instances of prisma client
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
