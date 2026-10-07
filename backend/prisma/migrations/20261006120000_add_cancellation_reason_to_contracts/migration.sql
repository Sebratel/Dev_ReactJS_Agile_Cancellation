-- Motivo do cancelamento vindo do ERP (contract_events), para distinguir
-- "Encerrado por inadimplencia" (batalha da cobranca) de saidas externas.
ALTER TABLE `contracts` ADD COLUMN `cancellationReason` VARCHAR(191) NULL;
