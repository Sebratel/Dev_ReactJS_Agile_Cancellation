/**
 * Configurações globais da plataforma (feature flags/parâmetros).
 * Persistidas como pares chave/valor na tabela `app_settings`; aqui ficam a
 * forma tipada e os valores padrão usados quando a chave ainda não existe.
 */
export type AppSettings = {
  /**
   * Quando ligado, atendentes (COLLECTION_AGENT) também podem encaminhar casos
   * para o cancelamento. Desligado por padrão — liberado pelo administrador.
   */
  allowAgentSendToCancellation: boolean;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  allowAgentSendToCancellation: false,
};

export const APP_SETTING_KEYS = {
  allowAgentSendToCancellation: 'allowAgentSendToCancellation',
} as const;
