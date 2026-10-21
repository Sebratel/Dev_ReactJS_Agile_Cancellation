-- AddColumn
ALTER TABLE `collection_cases` ADD COLUMN `assignedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `collection_cases_assignedAt_idx` ON `collection_cases`(`assignedAt`);

-- Backfill: casos ja atribuidos recebem uma data de atribuicao aproximada
-- (ultima atualizacao do caso), para o filtro por data nao começar vazio.
UPDATE `collection_cases`
SET `assignedAt` = `updatedAt`
WHERE `assignedUserId` IS NOT NULL AND `assignedAt` IS NULL;
