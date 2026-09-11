-- AlterEnum: adiciona PAYMENT_MADE ao status de collection_cases.
-- "Pagamento realizado" = cliente pagou SEM atendimento (distinto de "Recuperado",
-- que e credito de um atendente que trabalhou o caso).
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
    'PAYMENT_MADE'
  ) NOT NULL DEFAULT 'WAITING_TRIAGE';
