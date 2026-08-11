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
