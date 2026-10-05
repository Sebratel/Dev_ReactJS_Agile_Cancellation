-- Status bruto do ERP (v_status do Elleven) no contrato, para exibicao fiel.
-- O enum `status` (mapeado) continua para a logica interna.
ALTER TABLE `contracts` ADD COLUMN `erpStatus` VARCHAR(191) NULL;
