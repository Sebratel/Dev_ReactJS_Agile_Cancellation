import { describe, expect, it } from 'vitest';
import {
  splitSupervisorActions,
  type SupervisorActionItem,
} from '@/features/dashboard/utils/supervisor-actions';

function item(
  key: string,
  value: SupervisorActionItem['value'],
  tone: SupervisorActionItem['tone'],
): SupervisorActionItem {
  return { key, label: key, helper: '', value, tone, icon: null, href: '/' };
}

describe('splitSupervisorActions', () => {
  it('ordena por urgencia: tom primeiro, depois quantidade', () => {
    const result = splitSupervisorActions([
      item('semResponsavel', 291, 'warning'),
      item('promessas', 13, 'danger'),
      item('semMovimento', 2, 'neutral'),
      item('renegociados', 40, 'warning'),
    ]);

    expect(result.urgent.map((entry) => entry.key)).toEqual([
      'promessas',
      'semResponsavel',
      'renegociados',
      'semMovimento',
    ]);
  });

  it('separa zerados e itens sem dado (indisponivel nao e zero)', () => {
    const result = splitSupervisorActions([
      item('elegiveis', 0, 'danger'),
      item('renegociados', 'unavailable', 'warning'),
      item('carregando', 'loading', 'warning'),
      item('promessas', 5, 'danger'),
    ]);

    expect(result.urgent.map((entry) => entry.key)).toEqual(['promessas']);
    expect(result.calm.map((entry) => entry.key)).toEqual(['elegiveis']);
    expect(result.pending.map((entry) => entry.key)).toEqual([
      'renegociados',
      'carregando',
    ]);
  });
});
