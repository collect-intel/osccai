import { PrismaClient, VoteValue } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// middleware to update statement vote counts on vote creation
prisma.$use(async (params, next) => {
  if (params.model === "Vote" && params.action === "create") {
    const result = await next(params);

    // Update the corresponding statement's vote counts
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

    return result;
  }
  return next(params);
});

// Prevent hot reloading from creating new instances of prisma client
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
