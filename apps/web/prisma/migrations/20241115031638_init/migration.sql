-- CreateEnum
CREATE TYPE "ConstitutionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StatementStatus" AS ENUM ('PENDING', 'APPROVED', 'FLAGGED', 'DELETED');

-- CreateEnum
CREATE TYPE "VoteValue" AS ENUM ('AGREE', 'DISAGREE', 'PASS');

-- CreateTable
CREATE TABLE "CommunityModelOwner" (
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "participantId" TEXT,
    "clerkUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityModelOwner_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "CommunityModel" (
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "goal" TEXT,
    "bio" TEXT,
    "logoUrl" TEXT,
    "activeConstitutionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CommunityModel_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Constitution" (
    "uid" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ConstitutionStatus" NOT NULL DEFAULT 'DRAFT',
    "content" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Constitution_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Poll" (
    "uid" TEXT NOT NULL,
    "communityModelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "published" BOOLEAN NOT NULL,
    "requireAuth" BOOLEAN NOT NULL DEFAULT true,
    "allowParticipantStatements" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Participant" (
    "uid" TEXT NOT NULL,
    "anonymousId" TEXT,
    "clerkUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Statement" (
    "uid" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "status" "StatementStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "agreeCount" INTEGER NOT NULL DEFAULT 0,
    "disagreeCount" INTEGER NOT NULL DEFAULT 0,
    "passCount" INTEGER NOT NULL DEFAULT 0,
    "gacScore" DOUBLE PRECISION,
    "priorityScore" DOUBLE PRECISION,
    "lastCalculatedAt" TIMESTAMP(3),
    "isConstitutionable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Statement_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Vote" (
    "uid" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "voteValue" "VoteValue" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Flag" (
    "uid" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flag_pkey" PRIMARY KEY ("uid")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityModelOwner_participantId_key" ON "CommunityModelOwner"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityModelOwner_clerkUserId_key" ON "CommunityModelOwner"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityModel_activeConstitutionId_key" ON "CommunityModel"("activeConstitutionId");

-- CreateIndex
CREATE INDEX "CommunityModel_ownerId_idx" ON "CommunityModel"("ownerId");

-- CreateIndex
CREATE INDEX "Constitution_modelId_idx" ON "Constitution"("modelId");

-- CreateIndex
CREATE INDEX "Poll_communityModelId_idx" ON "Poll"("communityModelId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_anonymousId_key" ON "Participant"("anonymousId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_clerkUserId_key" ON "Participant"("clerkUserId");

-- CreateIndex
CREATE INDEX "Statement_pollId_idx" ON "Statement"("pollId");

-- CreateIndex
CREATE INDEX "Statement_status_idx" ON "Statement"("status");

-- CreateIndex
CREATE INDEX "Vote_participantId_idx" ON "Vote"("participantId");

-- CreateIndex
CREATE INDEX "Vote_statementId_idx" ON "Vote"("statementId");

-- CreateIndex
CREATE INDEX "Flag_participantId_idx" ON "Flag"("participantId");

-- CreateIndex
CREATE INDEX "Flag_statementId_idx" ON "Flag"("statementId");

-- AddForeignKey
ALTER TABLE "CommunityModelOwner" ADD CONSTRAINT "CommunityModelOwner_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityModel" ADD CONSTRAINT "CommunityModel_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "CommunityModelOwner"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityModel" ADD CONSTRAINT "CommunityModel_activeConstitutionId_fkey" FOREIGN KEY ("activeConstitutionId") REFERENCES "Constitution"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Constitution" ADD CONSTRAINT "Constitution_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "CommunityModel"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_communityModelId_fkey" FOREIGN KEY ("communityModelId") REFERENCES "CommunityModel"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Statement" ADD CONSTRAINT "Statement_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Statement" ADD CONSTRAINT "Statement_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
