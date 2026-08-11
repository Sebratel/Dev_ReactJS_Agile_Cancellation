import { type CollectionCaseAssigneeSummary } from '@/modules/collection-cases/dto/collection-case-details.response';

export type CollectionCaseListItemResponse = {
  id: string;
  customerName: string;
  customerPhone: string | null;
  contractCode: string;
  status: string;
  priority: string;
  daysOverdue: number;
  outstandingAmount: string;
  assignedTo: CollectionCaseAssigneeSummary | null;
  slaDueAt: string | null;
};
