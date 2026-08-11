import { getAppConfig } from '@/config/app.config';
import { getElevenConfig } from '@/config/eleven.config';
import { getMatrixContactConfig } from '@/config/matrix-contact.config';
import { getWebhookConfig } from '@/config/webhook.config';

export default () => ({
  app: getAppConfig(),
  eleven: getElevenConfig(),
  matrixContact: getMatrixContactConfig(),
  webhook: getWebhookConfig(),
});
