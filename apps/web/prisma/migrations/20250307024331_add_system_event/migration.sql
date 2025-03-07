-- CreateTable
CREATE TABLE "SystemEvent" (
    "uid" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT,
    "isAdminAction" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemEvent_pkey" PRIMARY KEY ("uid")
);

-- CreateIndex
CREATE INDEX "SystemEvent_resourceType_resourceId_idx" ON "SystemEvent"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "SystemEvent_actorId_idx" ON "SystemEvent"("actorId");

-- CreateIndex
CREATE INDEX "SystemEvent_eventType_idx" ON "SystemEvent"("eventType");

-- CreateIndex
CREATE INDEX "SystemEvent_createdAt_idx" ON "SystemEvent"("createdAt");
