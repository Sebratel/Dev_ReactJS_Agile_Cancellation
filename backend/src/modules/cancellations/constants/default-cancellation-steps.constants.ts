export const DEFAULT_CANCELLATION_STEP_DEFINITIONS = [
  { stepCode: 'LOWER_TITLES', name: 'Baixar titulos', stepOrder: 1 },
  { stepCode: 'APPLY_FINE', name: 'Aplicar multa', stepOrder: 2 },
  {
    stepCode: 'OPEN_ELEVEN_REQUEST',
    name: 'Abrir solicitacao Eleven',
    stepOrder: 3,
  },
  { stepCode: 'ROUTE_PROTOCOL', name: 'Encaminhar protocolo', stepOrder: 4 },
  {
    stepCode: 'SEND_WITHDRAWAL_PROTOCOL',
    name: 'Enviar protocolo de retirada',
    stepOrder: 5,
  },
  {
    stepCode: 'WAITING_EQUIPMENT_RETURN',
    name: 'Aguardar devolucao de equipamento',
    stepOrder: 6,
  },
  {
    stepCode: 'EQUIPMENT_RETURNED',
    name: 'Equipamento devolvido',
    stepOrder: 7,
  },
  {
    stepCode: 'CANCELLATION_COMPLETED',
    name: 'Cancelamento concluido',
    stepOrder: 8,
  },
] as const;

export type DefaultCancellationStepCode =
  (typeof DEFAULT_CANCELLATION_STEP_DEFINITIONS)[number]['stepCode'];

export function getCancellationStepLabel(stepCode: string) {
  const match = DEFAULT_CANCELLATION_STEP_DEFINITIONS.find(
    (definition) => definition.stepCode === stepCode,
  );

  return match?.name ?? stepCode;
}

export function isDefaultCancellationStepCode(
  stepCode: string,
): stepCode is DefaultCancellationStepCode {
  return DEFAULT_CANCELLATION_STEP_DEFINITIONS.some(
    (definition) => definition.stepCode === stepCode,
  );
}
