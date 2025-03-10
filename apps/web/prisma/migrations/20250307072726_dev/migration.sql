-- AlterTable
ALTER TABLE "SystemEvent" ADD COLUMN     "communityModelId" TEXT;

-- CreateIndex
CREATE INDEX "SystemEvent_communityModelId_idx" ON "SystemEvent"("communityModelId");
