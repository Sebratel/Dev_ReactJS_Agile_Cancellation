import { Logger } from '@nestjs/common';

// Rede de seguranca: uma rejeicao nao tratada (ex.: conflito de escrita do banco em
// tarefa em segundo plano) derrubaria o processo no Node 22 e poria a API em loop de restart.
export function registerProcessSafetyNets(
  target: Pick<NodeJS.Process, 'on'> = process,
): void {
  const logger = new Logger('Process');
  target.on('unhandledRejection', (reason: unknown) => {
    logger.error(
      'unhandledRejection capturada (processo mantido).',
      reason instanceof Error ? reason.stack : String(reason),
    );
  });
}
