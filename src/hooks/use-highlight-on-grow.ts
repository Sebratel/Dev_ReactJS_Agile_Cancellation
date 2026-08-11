import { useEffect, useRef, useState } from 'react';

/**
 * Sinaliza (por ~1.2s) quando a quantidade de itens de uma lista AUMENTA
 * apos a montagem — usado para destacar visualmente um registro recem-criado.
 * Nao dispara no carregamento inicial.
 */
export function useHighlightOnGrow(count: number): boolean {
  const previousCount = useRef<number | null>(null);
  const [highlighted, setHighlighted] = useState(false);

  useEffect(() => {
    if (previousCount.current !== null && count > previousCount.current) {
      setHighlighted(true);

      const timeoutId = window.setTimeout(() => {
        setHighlighted(false);
      }, 1300);

      previousCount.current = count;

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    previousCount.current = count;
  }, [count]);

  return highlighted;
}
