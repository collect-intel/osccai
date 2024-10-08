/*
  Warnings:

  - Added the required column `bio` to the `CommunityModel` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CommunityModel" ADD COLUMN     "bio" TEXT NOT NULL;
