import { type CollectionCaseAssigneeSummary } from '@/modules/collection-cases/dto/collection-case-details.response';

export type CollectionCaseListItemResponse = {
  id: string;
  customerName: string;
  customerPhone: string | null;
  contractCode: string;
  contractStatus: string;
  firstOverdueDate: string | null;
  secondOverdueDate: string | null;
  status: string;
  priority: string;
  daysOverdue: number;
  outstandingAmount: string;
  assignedTo: CollectionCaseAssigneeSummary | null;
  slaDueAt: string | null;
  matrixAwaitingReply: boolean;
  matrixLastOutboundAt: string | null;
  matrixLastReplyAt: string | null;
};
