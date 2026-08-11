import { getElevenConfig, isValidElevenMode } from '@/config/eleven.config';

describe('eleven.config', () => {
  it('aceita stub, disabled e live', () => {
    expect(isValidElevenMode('stub')).toBe(true);
    expect(isValidElevenMode('disabled')).toBe(true);
    expect(isValidElevenMode('live')).toBe(true);
    expect(isValidElevenMode('invalid')).toBe(false);
  });

  it('resolve modo live na configuracao', () => {
    expect(getElevenConfig({ ELEVEN_MODE: 'live' })).toEqual({ mode: 'live' });
  });

  it('usa stub para valor invalido', () => {
    expect(getElevenConfig({ ELEVEN_MODE: 'unknown' })).toEqual({
      mode: 'stub',
    });
  });
});
