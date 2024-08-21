/*
  Warnings:

  - A unique constraint covering the columns `[urlSlug]` on the table `Poll` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Poll_urlSlug_key" ON "Poll"("urlSlug");
