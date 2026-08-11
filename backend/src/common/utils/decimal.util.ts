import type { Decimal } from '@prisma/client/runtime/library';

export function formatDecimal(value: Decimal | null | undefined): string {
  if (value == null) {
    return '0.00';
  }

  return value.toFixed(2);
}
