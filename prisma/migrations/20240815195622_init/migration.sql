-- CreateTable
CREATE TABLE "Survey" (
    "uid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Statement" (
    "uid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "text" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,

    CONSTRAINT "Statement_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Vote" (
    "uid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voteKind" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("uid")
);

-- AddForeignKey
ALTER TABLE "Statement" ADD CONSTRAINT "Statement_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;
