export type ElevenIntegrationMode = 'stub' | 'disabled' | 'live';

export type ElevenIntegrationStatus = {
  mode: ElevenIntegrationMode;
  available: boolean;
  message: string;
};
