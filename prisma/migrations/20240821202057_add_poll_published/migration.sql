/*
  Warnings:

  - Added the required column `published` to the `Poll` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Poll" ADD COLUMN     "published" BOOLEAN NOT NULL;

insert into "PollCreator" ("uid", "name", "email") values ('1', 'Joel', 'joel@gmail.com')
