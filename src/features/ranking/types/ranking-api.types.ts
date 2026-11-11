export type RecoveryRankingPeriod =
  | 'current_month'
  | 'last_month'
  | 'last_3_months'
  | 'all';

export type RecoveryRankingItem = {
  rank: number;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  recoveredAmount: string;
  recoveredCases: number;
};

export type RecoveryRankingResponse = {
  periodFrom: string;
  periodTo: string;
  totalRecoveredAmount: string;
  totalRecoveredCases: number;
  ranking: RecoveryRankingItem[];
};

export type RecoveryAuditCheckStatus = 'ok' | 'fail' | 'unknown';

export type RecoveryAuditCheck = {
  key: string;
  label: string;
  status: RecoveryAuditCheckStatus;
  detail: string;
};

export type RecoveryAuditContact = {
  id: string;
  attemptedAt: string;
  result: string;
  channel: string;
  notes: string | null;
  performedBy: { id: string; name: string } | null;
  effective: boolean;
  beforePayment: boolean | null;
  credited: boolean;
};

export type RecoveryAuditPayment = {
  titleNumber: string | null;
  paidDate: string;
  registeredAt: string | null;
  amount: string;
  receivedAmount: string;
  paymentForm: string | null;
  // Título gerado por renegociação de um título do caso.
  viaRenegotiation: boolean;
};

export type RecoveryAuditCase = {
  caseId: string;
  customerName: string;
  contractCode: string;
  recoveredAt: string;
  recoveredAmount: string;
  assignedTo: { id: string; name: string } | null;
  paymentDay: string | null;
  reactivatedAt: string | null;
  payments: RecoveryAuditPayment[];
  paymentsAvailable: boolean;
  contacts: RecoveryAuditContact[];
  checks: RecoveryAuditCheck[];
  verified: boolean;
};

export type RecoveryAuditResponse = {
  periodFrom: string;
  periodTo: string;
  user: { id: string; name: string; avatarUrl: string | null } | null;
  erpAvailable: boolean;
  totalAmount: string;
  verifiedCases: number;
  cases: RecoveryAuditCase[];
};

export type CaseRecoveryAuditResponse = {
  erpAvailable: boolean;
  // null = o caso não está recuperado (nada a conferir).
  audit: RecoveryAuditCase | null;
};
