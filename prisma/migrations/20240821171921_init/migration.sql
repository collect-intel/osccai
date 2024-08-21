-- CreateEnum
CREATE TYPE "VoteValue" AS ENUM ('AGREE', 'DISAGREE', 'PASS');

-- CreateTable
CREATE TABLE "PollCreator" (
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "PollCreator_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Participant" (
    "uid" TEXT NOT NULL,
    "phoneNumber" TEXT,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Poll" (
    "uid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "urlSlug" TEXT NOT NULL,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Statement" (
    "uid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "participantId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,

    CONSTRAINT "Statement_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Vote" (
    "uid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "participantId" TEXT NOT NULL,
    "voteValue" "VoteValue" NOT NULL,
    "statementId" TEXT NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("uid")
);

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "PollCreator"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Statement" ADD CONSTRAINT "Statement_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Statement" ADD CONSTRAINT "Statement_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;
