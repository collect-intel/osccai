-- CreateTable
CREATE TABLE "Flag" (
    "uid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "participantId" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,

    CONSTRAINT "Flag_pkey" PRIMARY KEY ("uid")
);

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;
