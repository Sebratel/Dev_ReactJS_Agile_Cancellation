import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * Largura atual (px) do elemento referenciado, observada via ResizeObserver.
 * Serve para escolher layout pela largura REALMENTE disponível (container) em
 * vez do viewport — mais preciso quando há sidebar/painéis. Retorna 0 até a
 * primeira medição (ex.: SSR/jsdom), o que deve ser tratado como "não medido".
 */
export function useContainerWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const measure = () => setWidth(element.getBoundingClientRect().width);
    measure();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => observer.disconnect();
  }, [ref]);

  return width;
}
