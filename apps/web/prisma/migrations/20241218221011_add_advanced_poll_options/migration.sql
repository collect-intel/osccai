-- AlterTable
ALTER TABLE "CommunityModel" ADD COLUMN     "advancedOptionsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Poll" ADD COLUMN     "completionMessage" TEXT,
ADD COLUMN     "maxSubmissionsPerParticipant" INTEGER,
ADD COLUMN     "maxVotesPerParticipant" INTEGER,
ADD COLUMN     "minRequiredSubmissions" INTEGER,
ADD COLUMN     "minVotesBeforeSubmission" INTEGER;
