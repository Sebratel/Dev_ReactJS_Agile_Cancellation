-- AlterTable
ALTER TABLE `collection_attempts` ADD COLUMN `nextContactAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `collection_attempts_nextContactAt_idx` ON `collection_attempts`(`nextContactAt`);
