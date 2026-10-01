-- AlterEnum: adiciona RENEGOTIATED ao status de collection_cases.
-- "Renegociado" = o cliente renegociou a(s) fatura(s) no ERP (titulo original
-- vira renegotiated=true e um novo titulo consolidado e criado). NAO e pagamento
-- (o saldo continua em aberto), entao nao pode ser creditado como recuperacao.
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
    'RENEGOTIATED'
  ) NOT NULL DEFAULT 'WAITING_TRIAGE';
