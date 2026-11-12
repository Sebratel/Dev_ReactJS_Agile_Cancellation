import { describe, expect, it } from 'vitest';
import { type AuditLogItem } from '@/features/auditoria/types/auditoria-api.types';
import {
  getActivePeriodPreset,
  getPeriodPresetRange,
  groupAuditLogsByDay,
} from '@/features/auditoria/utils/auditoria-presentation';

const NOW = new Date(2026, 10, 6, 15, 0, 0);

function log(id: string, date: Date): AuditLogItem {
  return {
    id,
    actor: null,
    entityType: 'COLLECTION_CASE',
    entityId: 'case_1',
    action: 'CREATE',
    summary: 'x',
    createdAt: date.toISOString(),
    metadata: {},
  };
}

describe('auditoria-presentation', () => {
  it('calcula os periodos rapidos', () => {
    expect(getPeriodPresetRange('today', NOW)).toEqual({
      startDate: '2026-11-06',
      endDate: '2026-11-06',
    });
    expect(getPeriodPresetRange('yesterday', NOW)).toEqual({
      startDate: '2026-11-05',
      endDate: '2026-11-05',
    });
    expect(getPeriodPresetRange('last7', NOW)).toEqual({
      startDate: '2026-10-31',
      endDate: '2026-11-06',
    });
    expect(getPeriodPresetRange('last30', NOW)).toEqual({
      startDate: '2026-10-08',
      endDate: '2026-11-06',
    });
  });

  it('identifica o periodo rapido ativo', () => {
    expect(getActivePeriodPreset('2026-11-06', '2026-11-06', NOW)).toBe(
      'today',
    );
    expect(getActivePeriodPreset('2026-10-31', '2026-11-06', NOW)).toBe(
      'last7',
    );
    expect(getActivePeriodPreset('2026-01-01', '2026-01-02', NOW)).toBeNull();
    expect(getActivePeriodPreset('', '', NOW)).toBeNull();
  });

  it('agrupa os registros por dia com rotulo de hoje e ontem', () => {
    const groups = groupAuditLogsByDay(
      [
        log('a', new Date(2026, 10, 6, 11, 34)),
        log('b', new Date(2026, 10, 6, 9, 10)),
        log('c', new Date(2026, 10, 5, 17, 52)),
        log('d', new Date(2026, 10, 3, 8, 0)),
      ],
      NOW,
    );

    expect(groups.map((group) => group.items.length)).toEqual([2, 1, 1]);
    expect(groups[0]?.label).toBe('Hoje, 06/11/2026');
    expect(groups[1]?.label).toBe('Ontem, 05/11/2026');
    expect(groups[2]?.label).toContain('03/11/2026');
  });
});
