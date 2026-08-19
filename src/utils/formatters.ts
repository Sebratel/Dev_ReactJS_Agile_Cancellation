const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const integerFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR');

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function formatCurrencyBRL(value: number) {
  return currencyFormatter.format(value).replace(/\u00A0/g, ' ');
}

export function formatInteger(value: number) {
  return integerFormatter.format(value);
}

export function formatDatePtBR(value: Date | string | number) {
  return dateFormatter.format(new Date(value));
}

// Datas "puras" (sem significado de horario, ex.: vencimento de fatura) sao
// gravadas como meia-noite UTC. Formatar via `new Date(...)` + Intl usa o
// fuso do navegador e pode exibir o dia anterior para quem esta em UTC-3
// (ex.: 2025-10-20T00:00:00.000Z vira "19/10/2025" em Brasilia) — um desvio
// que quebra a busca por data exata, ja que o filtro compara o dia em UTC.
// Aqui extraimos o dia calendario direto da string ISO, sem conversao de
// fuso, garantindo que o que o supervisor ve e o que ele pode filtrar sejam
// o mesmo dia.
export function formatDateOnlyPtBR(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (!match) {
    return formatDatePtBR(value);
  }

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

export function formatDateTimePtBR(value: Date | string | number) {
  return dateTimeFormatter.format(new Date(value));
}

export function formatCurrencyFromDecimalString(value: string) {
  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return formatCurrencyBRL(0);
  }

  return formatCurrencyBRL(parsed);
}

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatPercentRate(value: number) {
  if (!Number.isFinite(value)) {
    return percentFormatter.format(0);
  }

  return percentFormatter.format(value);
}

export function formatDecimalDays(value: number) {
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)} dias`;
}
