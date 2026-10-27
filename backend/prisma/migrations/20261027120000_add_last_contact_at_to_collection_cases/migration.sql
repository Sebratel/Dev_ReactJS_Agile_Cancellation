-- AlterTable
ALTER TABLE `CollectionCase` ADD COLUMN `lastContactAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `CollectionCase_lastContactAt_idx` ON `CollectionCase`(`lastContactAt`);
