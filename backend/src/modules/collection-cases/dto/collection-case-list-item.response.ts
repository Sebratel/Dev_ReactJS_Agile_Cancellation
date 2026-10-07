import { type CollectionCaseAssigneeSummary } from '@/modules/collection-cases/dto/collection-case-details.response';

export type CollectionCaseListItemResponse = {
  id: string;
  customerName: string;
  customerPhone: string | null;
  contractCode: string;
  contractStatus: string;
  // Status bruto do ERP (v_status do Elleven), para exibicao fiel.
  contractErpStatus: string | null;
  // Motivo do cancelamento (quando encerrado): texto limpo + categoria.
  contractCancellationReason: string | null;
  contractCancellationReasonCategory: string | null;
  firstOverdueDate: string | null;
  secondOverdueDate: string | null;
  status: string;
  priority: string;
  daysOverdue: number;
  outstandingAmount: string;
  totalAttempts: number;
  assignedTo: CollectionCaseAssigneeSummary | null;
  slaDueAt: string | null;
  matrixAwaitingReply: boolean;
  matrixLastOutboundAt: string | null;
  matrixLastReplyAt: string | null;
};
