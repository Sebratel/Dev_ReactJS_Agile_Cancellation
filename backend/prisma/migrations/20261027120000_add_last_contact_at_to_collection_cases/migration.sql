-- AlterTable
ALTER TABLE `collection_cases` ADD COLUMN `lastContactAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `collection_cases_lastContactAt_idx` ON `collection_cases`(`lastContactAt`);
