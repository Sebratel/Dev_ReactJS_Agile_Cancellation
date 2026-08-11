-- AlterTable
ALTER TABLE `payment_promises` ADD COLUMN `fulfilledAt` DATETIME(3) NULL,
    ADD COLUMN `brokenAt` DATETIME(3) NULL,
    ADD COLUMN `cancelledAt` DATETIME(3) NULL;
