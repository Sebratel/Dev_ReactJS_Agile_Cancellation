import { useState } from 'react';
import { appEnv } from '@/app/config/env';
import { getAccessToken } from '@/services/api/auth-session-bridge';
import { toast } from '@/lib/toast';
import { type CollectionCasesListParams } from '@/features/collection-cases/types/collection-cases-api.types';

export function useExportCasesCsv() {
  const [isExporting, setIsExporting] = useState(false);

  async function exportCsv(
    params: Omit<CollectionCasesListParams, 'page' | 'limit'>,
    filename = 'casos-cobranca.csv',
  ) {
    setIsExporting(true);
    try {
      const query = new URLSearchParams();
      if (params.status) query.set('status', params.status);
      if (params.priority) query.set('priority', params.priority);
      if (params.search) query.set('search', params.search);
      if (params.sortBy) {
        query.set('sortBy', params.sortBy);
        if (params.sortDirection)
          query.set('sortDirection', params.sortDirection);
      }
      if (params.assignedToId) query.set('assignedToId', params.assignedToId);
      if (params.contractStatus)
        query.set('contractStatus', params.contractStatus);
      if (params.daysOverdueMin !== undefined)
        query.set('daysOverdueMin', String(params.daysOverdueMin));
      if (params.daysOverdueMax !== undefined)
        query.set('daysOverdueMax', String(params.daysOverdueMax));
      if (params.totalOutstandingMin !== undefined)
        query.set('totalOutstandingMin', String(params.totalOutstandingMin));
      if (params.totalOutstandingMax !== undefined)
        query.set('totalOutstandingMax', String(params.totalOutstandingMax));
      if (params.firstDueDate) query.set('firstDueDate', params.firstDueDate);
      if (params.secondDueDate)
        query.set('secondDueDate', params.secondDueDate);
      if (params.slaStatus) query.set('slaStatus', params.slaStatus);
      if (params.createdToday) query.set('createdToday', 'true');
      if (params.interactionStatus)
        query.set('interactionStatus', params.interactionStatus);
      if (params.promiseStatus)
        query.set('promiseStatus', params.promiseStatus);

      const qs = query.toString();
      const url = `${appEnv.apiBaseUrl}/collection-cases/export${qs ? `?${qs}` : ''}`;

      const accessToken = getAccessToken();
      const response = await fetch(url, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });

      if (!response.ok) {
        throw new Error('Exportação falhou');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(objectUrl);

      toast.success('Exportação concluída com sucesso.');
    } catch {
      toast.error('Não foi possível exportar os dados.');
    } finally {
      setIsExporting(false);
    }
  }

  return { exportCsv, isExporting };
}
