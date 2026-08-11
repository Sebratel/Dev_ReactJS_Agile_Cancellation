/**
 * O enum CollectionStatus nao possui valor dedicado a "cancelado".
 * Quando todas as etapas do CancellationProcess sao concluidas, o caso e
 * encerrado com este status.
 *
 * Nesta versao, CLOSED apos CancellationProcess.COMPLETED significa
 * encerramento por cancelamento concluido (nao recuperacao de credito).
 */
export const COLLECTION_CASE_STATUS_AFTER_CANCELLATION_COMPLETED =
  'CLOSED' as const;
