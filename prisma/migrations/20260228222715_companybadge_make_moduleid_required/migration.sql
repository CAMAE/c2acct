/*
  Warnings:

  - Made the column `moduleId` on table `CompanyBadge` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "CompanyBadge" ALTER COLUMN "moduleId" SET NOT NULL;
