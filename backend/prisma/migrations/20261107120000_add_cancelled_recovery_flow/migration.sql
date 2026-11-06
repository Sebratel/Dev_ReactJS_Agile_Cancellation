-- Fluxo de recuperação de clientes cancelados:
--  * CANCELLED_IN_RECOVERY: cancelado devolvido pela supervisão a uma carteira;
--    continua cancelado até o ERP mostrar o contrato "Normal" de novo.
--  * REACTIVATED: contrato voltou a Normal no ERP sem contato qualificado do
--    atendente antes da reativação (não credita receita).
--  * reactivatedAt: data da reativação (evento "Reativação de Contrato"), base
--    da janela de pagamentos que compõem a receita do atendente.
ALTER TABLE `collection_cases`
  MODIFY `status` ENUM(
    'WAITING_TRIAGE',
    'IN_COLLECTION',
    'AWAITING_PAYMENT',
    'NO_RESPONSE',
    'ELIGIBLE_FOR_CANCELLATION',
    'CANCELLATION_IN_PROGRESS',
    'CLOSED',
    'RECOVERED',
    'PAYMENT_MADE',
    'RENEGOTIATED',
    'CANCELLED_IN_RECOVERY',
    'REACTIVATED'
  ) NOT NULL DEFAULT 'WAITING_TRIAGE',
  ADD COLUMN `reactivatedAt` DATETIME(3) NULL;
