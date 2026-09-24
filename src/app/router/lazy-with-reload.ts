import { lazy, type ComponentType } from 'react';

const RELOAD_FLAG = 'chunk-reload-attempted';

function readReloadFlag() {
  try {
    return sessionStorage.getItem(RELOAD_FLAG) === '1';
  } catch {
    return false;
  }
}

function writeReloadFlag(value: boolean) {
  try {
    if (value) {
      sessionStorage.setItem(RELOAD_FLAG, '1');
    } else {
      sessionStorage.removeItem(RELOAD_FLAG);
    }
  } catch {
    /* sessionStorage indisponível — segue sem persistir o flag */
  }
}

/**
 * Igual ao `lazy` do React, mas com auto-recuperação de "Failed to fetch
 * dynamically imported module": quando um deploy novo troca os hashes dos
 * chunks, um navegador com a página antiga aponta para um arquivo que não
 * existe mais. Nesse caso recarregamos a página UMA vez para pegar o build
 * atual; o flag em sessionStorage evita loop se a falha persistir (aí o erro
 * sobe para o ErrorBoundary normalmente).
 */
export function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      // Carregou com sucesso: libera para um próximo deploy poder recarregar.
      writeReloadFlag(false);
      return mod;
    } catch (error) {
      if (!readReloadFlag()) {
        writeReloadFlag(true);
        window.location.reload();
        // Mantém o import pendente enquanto a página recarrega.
        return new Promise<{ default: T }>(() => {});
      }

      throw error;
    }
  });
}
