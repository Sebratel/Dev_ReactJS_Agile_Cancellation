-- AlterTable
ALTER TABLE `collection_cases` ADD COLUMN `recoveredAmount` DECIMAL(15, 2) NULL;

-- Preenche os Recuperados ja existentes: soma das faturas baixadas (PAID) na hora
-- da recuperacao (janela de 30 min em torno de recoveredAt). Os demais ficam nulos
-- e contam como zero no ranking.
UPDATE `collection_cases` cc
SET cc.`recoveredAmount` = (
  SELECT COALESCE(SUM(i.`paidAmount`), 0)
  FROM `invoices` i
  WHERE i.`contractId` = cc.`contractId`
    AND i.`status` = 'PAID'
    AND i.`updatedAt` BETWEEN cc.`recoveredAt` - INTERVAL 30 MINUTE
                          AND cc.`recoveredAt` + INTERVAL 30 MINUTE
)
WHERE cc.`status` = 'RECOVERED'
  AND cc.`recoveredAt` IS NOT NULL
  AND cc.`recoveredAmount` IS NULL;
