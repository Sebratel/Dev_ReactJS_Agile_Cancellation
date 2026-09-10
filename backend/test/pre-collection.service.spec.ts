import { normalizeDaysWindow } from '@/modules/pre-collection/pre-collection.service';

describe('normalizeDaysWindow', () => {
  it('usa 7 dias como padrao para valores invalidos', () => {
    expect(normalizeDaysWindow(undefined)).toBe(7);
    expect(normalizeDaysWindow('')).toBe(7);
    expect(normalizeDaysWindow('abc')).toBe(7);
  });

  it('aceita valores validos e arredonda', () => {
    expect(normalizeDaysWindow(3)).toBe(3);
    expect(normalizeDaysWindow('7')).toBe(7);
    expect(normalizeDaysWindow(4.6)).toBe(5);
  });

  it('limita ao intervalo [1, 15]', () => {
    expect(normalizeDaysWindow(0)).toBe(1);
    expect(normalizeDaysWindow(-5)).toBe(1);
    expect(normalizeDaysWindow(30)).toBe(15);
    expect(normalizeDaysWindow(999)).toBe(15);
  });
});
