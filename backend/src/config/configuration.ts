import { getAppConfig } from '@/config/app.config';
import { getElevenConfig } from '@/config/eleven.config';
import { getWebhookConfig } from '@/config/webhook.config';

export default () => ({
  app: getAppConfig(),
  eleven: getElevenConfig(),
  webhook: getWebhookConfig(),
});
