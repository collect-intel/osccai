/*
  Warnings:

  - You are about to drop the column `instructions` on the `Poll` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[urlSlug]` on the table `Poll` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `published` to the `Poll` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Poll" DROP COLUMN "instructions",
ADD COLUMN     "allowParticipantStatements" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "published" BOOLEAN NOT NULL,
ADD COLUMN     "requireSMS" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "title" SET DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Poll_urlSlug_key" ON "Poll"("urlSlug");
