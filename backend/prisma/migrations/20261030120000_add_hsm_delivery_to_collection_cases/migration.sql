-- AlterTable
ALTER TABLE `collection_cases` ADD COLUMN `hsmDeliveryState` VARCHAR(16) NULL,
    ADD COLUMN `hsmDeliveryDetail` VARCHAR(255) NULL,
    ADD COLUMN `hsmDeliveryAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `collection_cases_hsmDeliveryState_idx` ON `collection_cases`(`hsmDeliveryState`);
