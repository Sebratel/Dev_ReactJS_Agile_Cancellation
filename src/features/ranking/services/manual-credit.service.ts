import { httpClient } from '@/services/api/http-client';

export type ManualCreditPayload = {
  assignedUserId: string;
  reason: string;
};

export type ManualCreditResponse = {
  credited: boolean;
  amount: string;
};

// Supervisão/admin: credita a um atendente a receita de um cliente que pagou
// sem contato registrado (caso "Pagamento realizado").
export async function creditCaseManually(
  caseId: string,
  payload: ManualCreditPayload,
) {
  const response = await httpClient.request<ManualCreditResponse>({
    path: `/erp/manual-credit/${encodeURIComponent(caseId)}`,
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
}
