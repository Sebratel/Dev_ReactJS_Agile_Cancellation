import type { ElevenMode } from '@/config/eleven.config';

export type ElevenIntegrationStatusResponse = {
  mode: ElevenMode;
  available: boolean;
  message: string;
};
