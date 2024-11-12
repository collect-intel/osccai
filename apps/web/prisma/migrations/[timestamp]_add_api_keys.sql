-- CreateTable
CREATE TABLE "ApiKey" (
    "uid" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT,
    "ownerId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("uid")
);

-- AlterTable
ALTER TABLE "CommunityModel" 
ADD COLUMN "apiEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_ownerId_idx" ON "ApiKey"("ownerId");

-- CreateIndex
CREATE INDEX "ApiKey_modelId_idx" ON "ApiKey"("modelId");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "CommunityModelOwner"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "CommunityModel"("uid") ON DELETE CASCADE ON UPDATE CASCADE; 