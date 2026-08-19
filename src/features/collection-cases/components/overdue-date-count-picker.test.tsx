import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OverdueDateCountPicker } from '@/features/collection-cases/components/overdue-date-count-picker';
import { renderWithProviders } from '@/test/test-utils';

vi.mock(
  '@/features/collection-cases/services/collection-cases.service',
  () => ({
    getOverdueDateSummary: vi.fn(),
  }),
);

import { getOverdueDateSummary } from '@/features/collection-cases/services/collection-cases.service';

describe('OverdueDateCountPicker', () => {
  it('abre a lista, busca sob demanda e aplica a data escolhida', async () => {
    const user = userEvent.setup();
    vi.mocked(getOverdueDateSummary).mockResolvedValue({
      firstDueDates: [
        { date: '2026-07-10', count: 45 },
        { date: '2026-08-04', count: 12 },
      ],
      secondDueDates: [],
    });

    const onSelectDate = vi.fn();

    renderWithProviders(
      <OverdueDateCountPicker
        field="first"
        label="1o vencimento"
        listParams={{}}
        selectedDate=""
        onSelectDate={onSelectDate}
      />,
    );

    // Fechado por padrao: nao busca nada ate o usuario clicar.
    expect(getOverdueDateSummary).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole('button', { name: /ver quantidade de casos por data/i }),
    );

    await waitFor(() => {
      expect(screen.getByText('04/08/2026')).toBeInTheDocument();
    });
    expect(screen.getByText('12 casos')).toBeInTheDocument();
    expect(screen.getByText('45 casos')).toBeInTheDocument();

    await user.click(screen.getByText('04/08/2026'));

    expect(onSelectDate).toHaveBeenCalledWith('2026-08-04');
  });

  it('mostra estado vazio quando nao ha datas', async () => {
    const user = userEvent.setup();
    vi.mocked(getOverdueDateSummary).mockResolvedValue({
      firstDueDates: [],
      secondDueDates: [],
    });

    renderWithProviders(
      <OverdueDateCountPicker
        field="second"
        label="2o vencimento"
        listParams={{}}
        selectedDate=""
        onSelectDate={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /ver quantidade de casos por data/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText('Nenhum caso em aberto encontrado.'),
      ).toBeInTheDocument();
    });
  });
});
