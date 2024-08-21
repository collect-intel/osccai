/*
  Warnings:

  - You are about to drop the column `instructions` on the `Poll` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Poll" DROP COLUMN "instructions",
ADD COLUMN     "allowParticipantStatements" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "requireSMS" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "title" SET DEFAULT '';
