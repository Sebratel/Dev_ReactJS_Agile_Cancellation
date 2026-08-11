import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { isValidElevenMode } from '@/config/eleven.config';
import { EnvValidationSchema } from '@/config/env.validation';

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance<
    EnvValidationSchema,
    Record<string, unknown>
  >(EnvValidationSchema, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: true,
  });

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration: ${errors.length} issue(s) found.`,
    );
  }

  const elevenMode = config.ELEVEN_MODE;

  if (
    typeof elevenMode === 'string' &&
    elevenMode.length > 0 &&
    !isValidElevenMode(elevenMode)
  ) {
    throw new Error(
      `Invalid environment configuration: ELEVEN_MODE must be stub, disabled or live.`,
    );
  }

  return config;
}
