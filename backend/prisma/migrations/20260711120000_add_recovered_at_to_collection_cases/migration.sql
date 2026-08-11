-- AlterTable
ALTER TABLE `collection_cases` ADD COLUMN `recoveredAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `collection_cases_recoveredAt_idx` ON `collection_cases`(`recoveredAt`);
