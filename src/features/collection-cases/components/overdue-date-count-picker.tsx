import { BarChart3 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOverdueDateSummary } from '@/features/collection-cases/hooks/use-overdue-date-summary';
import { type CollectionCasesListParams } from '@/features/collection-cases/types/collection-cases-api.types';
import { cn } from '@/lib/utils';
import { formatDateOnlyPtBR } from '@/utils/formatters';

const POPOVER_WIDTH = 256;

type OverdueDateCountPickerProps = {
  field: 'first' | 'second';
  listParams: CollectionCasesListParams;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  label: string;
};

// Botao ao lado dos campos de 1o/2o vencimento: abre uma lista com as datas
// que realmente tem casos em aberto (respeitando os demais filtros ativos),
// para o supervisor escolher direto em vez de ir testando data por data. Nao
// ocupa espaco na tela quando fechado.
//
// Renderizado via portal em document.body, com posicao fixa calculada a
// partir do botao — assim ele sempre aparece por cima de tudo (cards de KPI,
// tabela etc.), sem depender do z-index/overflow dos ancestrais, que na
// pratica cortavam ou escondiam parte da lista quando ela ficava "presa"
// dentro do card de filtros.
export function OverdueDateCountPicker({
  field,
  listParams,
  selectedDate,
  onSelectDate,
  label,
}: OverdueDateCountPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const summaryQuery = useOverdueDateSummary(listParams, {
    enabled: isOpen,
  });

  function updatePosition() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const left = Math.min(
      Math.max(rect.right - POPOVER_WIDTH, 8),
      window.innerWidth - POPOVER_WIDTH - 8,
    );

    setPosition({ top: rect.bottom + 6, left });
  }

  function handleToggle() {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((open) => !open);
  }

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    // Reposiciona ao rolar/redimensionar; fecha se o botao sair da tela por
    // completo (ex.: rolagem rapida) para nao deixar o popover "flutuando".
    function handleScrollOrResize() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) {
        setIsOpen(false);
        return;
      }
      updatePosition();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const items =
    field === 'first'
      ? summaryQuery.data?.firstDueDates
      : summaryQuery.data?.secondDueDates;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label={`Ver quantidade de casos por data (${label})`}
        aria-expanded={isOpen}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-neutral transition-colors duration-150 hover:border-neutral/40 hover:text-foreground"
      >
        <BarChart3 className="h-4 w-4" aria-hidden="true" />
      </button>

      {isOpen && position
        ? createPortal(
            <div
              ref={panelRef}
              style={{ top: position.top, left: position.left }}
              className="fixed z-50 w-64 rounded-lg border border-border bg-card p-3 shadow-lg"
            >
              <p className="mb-2 text-xs font-medium text-neutral">
                Casos por data ({label})
              </p>

              {summaryQuery.isLoading ? (
                <p className="py-2 text-xs text-neutral">Carregando...</p>
              ) : null}

              {summaryQuery.isError ? (
                <p className="py-2 text-xs text-danger">
                  Não foi possível carregar as datas.
                </p>
              ) : null}

              {!summaryQuery.isLoading && !summaryQuery.isError ? (
                items && items.length > 0 ? (
                  <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
                    {items.map((item) => (
                      <button
                        key={item.date}
                        type="button"
                        onClick={() => {
                          onSelectDate(item.date);
                          setIsOpen(false);
                        }}
                        className={cn(
                          'flex items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors duration-150 hover:bg-muted',
                          item.date === selectedDate &&
                            'bg-primary/10 font-semibold',
                        )}
                      >
                        <span>{formatDateOnlyPtBR(item.date)}</span>
                        <span className="text-neutral">
                          {item.count} {item.count === 1 ? 'caso' : 'casos'}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="py-2 text-xs text-neutral">
                    Nenhum caso em aberto encontrado.
                  </p>
                )
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
