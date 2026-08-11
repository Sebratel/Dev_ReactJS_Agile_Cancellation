ALTER TABLE `collection_cases`
  ADD COLUMN `matrixAttendanceCode` VARCHAR(191) NULL,
  ADD COLUMN `matrixMessageCode` VARCHAR(191) NULL,
  ADD COLUMN `matrixAwaitingReply` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `matrixLastOutboundAt` DATETIME(3) NULL,
  ADD COLUMN `matrixLastReplyAt` DATETIME(3) NULL;

CREATE UNIQUE INDEX `collection_cases_matrixAttendanceCode_key` ON `collection_cases`(`matrixAttendanceCode`);
CREATE UNIQUE INDEX `collection_cases_matrixMessageCode_key` ON `collection_cases`(`matrixMessageCode`);
CREATE INDEX `collection_cases_matrixAwaitingReply_idx` ON `collection_cases`(`matrixAwaitingReply`);
CREATE INDEX `collection_cases_matrixLastOutboundAt_idx` ON `collection_cases`(`matrixLastOutboundAt`);
CREATE INDEX `collection_cases_matrixLastReplyAt_idx` ON `collection_cases`(`matrixLastReplyAt`);
