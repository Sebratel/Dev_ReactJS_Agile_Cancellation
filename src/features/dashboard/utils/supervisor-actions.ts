export type SupervisorActionTone = 'danger' | 'warning' | 'neutral';

export type SupervisorActionItem<TIcon = unknown> = {
  key: string;
  label: string;
  helper: string;
  // number = contagem; 'loading' = carregando; 'unavailable' = fonte indisponível
  // (não é o mesmo que zero).
  value: number | 'loading' | 'unavailable';
  tone: SupervisorActionTone;
  icon: TIcon;
  href: string;
};

const TONE_WEIGHT: Record<SupervisorActionTone, number> = {
  danger: 0,
  warning: 1,
  neutral: 2,
};

export type SplitSupervisorActions<T> = {
  // Com pendência, por urgência (tom e depois quantidade).
  urgent: T[];
  // Sem dado confiável agora (carregando ou indisponível).
  pending: T[];
  // Zerados: nada a fazer, ficam apagados no fim.
  calm: T[];
};

export function splitSupervisorActions<T extends SupervisorActionItem>(
  items: T[],
): SplitSupervisorActions<T> {
  const urgent = items
    .filter(
      (item): item is T & { value: number } =>
        typeof item.value === 'number' && item.value > 0,
    )
    .sort(
      (left, right) =>
        TONE_WEIGHT[left.tone] - TONE_WEIGHT[right.tone] ||
        right.value - left.value,
    );

  return {
    urgent,
    pending: items.filter((item) => typeof item.value !== 'number'),
    calm: items.filter((item) => item.value === 0),
  };
}
