export const ELEVEN_MODE_VALUES = ['stub', 'disabled', 'live'] as const;

export type ElevenMode = (typeof ELEVEN_MODE_VALUES)[number];

export type ElevenConfig = {
  mode: ElevenMode;
};

export function isValidElevenMode(value: string): value is ElevenMode {
  return (ELEVEN_MODE_VALUES as readonly string[]).includes(value);
}

export function getElevenConfig(
  env: NodeJS.ProcessEnv = process.env,
): ElevenConfig {
  const rawMode = env.ELEVEN_MODE ?? 'stub';

  if (isValidElevenMode(rawMode)) {
    return { mode: rawMode };
  }

  return { mode: 'stub' };
}
