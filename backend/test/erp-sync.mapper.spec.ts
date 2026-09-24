import {
  type ErpEligibleRow,
  mapContractStatus,
  mapErpRowsToIngestPayload,
} from '@/modules/erp-sync/erp-sync.mapper';

function buildRow(overrides: Partial<ErpEligibleRow> = {}): ErpEligibleRow {
  return {
    erp_client_id: '289082',
    document: '01517371007',
    name: 'CLIENTE TESTE',
    email: 'cliente@teste.com',
    phone: '(51)99999-0000',
    erp_contract_id: '285431',
    contract_external_id: 'daf0095c-90c7-31fd-69ec-0c59cb12820e',
    contract_number: '285431',
    erp_contract_status: 'Normal',
    contract_date: new Date('2025-01-15T00:00:00.000Z'),
    contract_monthly_amount: '99.90',
    plan_title: 'PF - ANUAL - E-MAIL',
    title_external_id: '16934559',
    invoice_number: 'FAT260731110249427',
    title_amount: '99.90',
    outstanding_amount: '99.90',
    expiration_date: new Date('2026-08-30T00:00:00.000Z'),
    ...overrides,
  };
}

describe('mapErpRowsToIngestPayload', () => {
  const now = new Date('2026-09-30T00:00:00.000Z');

  it('agrupa titulos do mesmo contrato em um unico evento', () => {
    const rows = [
      buildRow({ title_external_id: 't1', outstanding_amount: '99.90' }),
      buildRow({
        title_external_id: 't2',
        outstanding_amount: '50.00',
        expiration_date: new Date('2026-07-30T00:00:00.000Z'),
      }),
    ];

    const { payload, skippedContracts } = mapErpRowsToIngestPayload(
      rows,
      now,
    );

    expect(skippedContracts).toBe(0);
    expect(payload.source).toBe('erp-sync');
    expect(payload.events).toHaveLength(1);

    const [event] = payload.events;
    expect(event?.invoices).toHaveLength(2);
    expect(event?.case.outstandingAmount).toBeCloseTo(149.9);
  });

  it('calcula daysOverdue a partir do titulo mais antigo em aberto', () => {
    const rows = [
      buildRow({
        title_external_id: 't1',
        expiration_date: new Date('2026-08-31T00:00:00.000Z'),
      }),
      buildRow({
        title_external_id: 't2',
        expiration_date: new Date('2026-07-01T00:00:00.000Z'),
      }),
    ];

    const { payload } = mapErpRowsToIngestPayload(rows, now);

    expect(payload.events[0]?.case.daysOverdue).toBe(91);
  });

  it('marca prioridade HIGH quando ultrapassa 60 dias em atraso', () => {
    const rows = [
      buildRow({ expiration_date: new Date('2026-01-01T00:00:00.000Z') }),
    ];

    const { payload } = mapErpRowsToIngestPayload(rows, now);

    expect(payload.events[0]?.case.priority).toBe('HIGH');
  });

  it('mantem prioridade MEDIUM quando dentro de 60 dias', () => {
    const rows = [
      buildRow({ expiration_date: new Date('2026-09-01T00:00:00.000Z') }),
    ];

    const { payload } = mapErpRowsToIngestPayload(rows, now);

    expect(payload.events[0]?.case.priority).toBe('MEDIUM');
  });

  it('mapeia Bloqueio Financeiro do ERP para contrato suspenso', () => {
    const rows = [buildRow({ erp_contract_status: 'Bloqueio Financeiro' })];

    const { payload } = mapErpRowsToIngestPayload(rows, now);

    expect(payload.events[0]?.contract.status).toBe('SUSPENDED');
  });

  it('separa contratos diferentes em eventos distintos', () => {
    const rows = [
      buildRow({ erp_contract_id: 'c1', contract_external_id: 'ext-c1' }),
      buildRow({ erp_contract_id: 'c2', contract_external_id: 'ext-c2' }),
    ];

    const { payload } = mapErpRowsToIngestPayload(rows, now);

    expect(payload.events).toHaveLength(2);
    expect(payload.events.map((e) => e.externalId).sort()).toEqual([
      'ext-c1',
      'ext-c2',
    ]);
  });

  it('descarta contratos sem documento sem afetar os demais', () => {
    const rows = [
      buildRow({
        erp_contract_id: 'c1',
        contract_external_id: 'ext-c1',
        document: null,
      }),
      buildRow({ erp_contract_id: 'c2', contract_external_id: 'ext-c2' }),
    ];

    const { payload, skippedContracts } = mapErpRowsToIngestPayload(
      rows,
      now,
    );

    expect(skippedContracts).toBe(1);
    expect(payload.events).toHaveLength(1);
    expect(payload.events[0]?.externalId).toBe('ext-c2');
  });

  it('descarta contratos com documento em branco', () => {
    const rows = [buildRow({ document: '   ' })];

    const { payload, skippedContracts } = mapErpRowsToIngestPayload(
      rows,
      now,
    );

    expect(skippedContracts).toBe(1);
    expect(payload.events).toHaveLength(0);
  });

  it('usa monthlyValue undefined quando o ERP nao informa valor', () => {
    const rows = [buildRow({ contract_monthly_amount: null })];

    const { payload } = mapErpRowsToIngestPayload(rows, now);

    expect(payload.events[0]?.contract.monthlyValue).toBeUndefined();
  });

  it('marca como OPEN faturas futuras e como OVERDUE apenas as vencidas', () => {
    const rows = [
      buildRow({
        title_external_id: 'vencida',
        expiration_date: new Date('2026-08-30T00:00:00.000Z'),
        outstanding_amount: '99.90',
      }),
      buildRow({
        title_external_id: 'futura',
        expiration_date: new Date('2027-07-30T00:00:00.000Z'),
        outstanding_amount: '99.90',
      }),
    ];

    const { payload } = mapErpRowsToIngestPayload(rows, now);

    const invoices = payload.events[0]?.invoices ?? [];
    const vencida = invoices.find((i) => i.externalId === 'vencida');
    const futura = invoices.find((i) => i.externalId === 'futura');

    expect(vencida?.status).toBe('OVERDUE');
    expect(futura?.status).toBe('OPEN');
  });

  it('nao soma faturas futuras no outstandingAmount nem no daysOverdue', () => {
    const rows = [
      buildRow({
        title_external_id: 'vencida',
        expiration_date: new Date('2026-08-30T00:00:00.000Z'),
        outstanding_amount: '99.90',
      }),
      buildRow({
        title_external_id: 'futura',
        expiration_date: new Date('2027-07-30T00:00:00.000Z'),
        outstanding_amount: '99.90',
      }),
    ];

    const { payload } = mapErpRowsToIngestPayload(rows, now);

    expect(payload.events[0]?.case.outstandingAmount).toBeCloseTo(99.9);
    expect(payload.events[0]?.case.daysOverdue).toBe(31);
  });

  it('descarta contrato quando nenhum titulo esta realmente vencido', () => {
    const rows = [
      buildRow({
        title_external_id: 'futura',
        expiration_date: new Date('2027-07-30T00:00:00.000Z'),
      }),
    ];

    const { payload, skippedContracts } = mapErpRowsToIngestPayload(
      rows,
      now,
    );

    expect(skippedContracts).toBe(1);
    expect(payload.events).toHaveLength(0);
  });
});

describe('mapContractStatus', () => {
  it('mapeia os v_status do ERP para o enum do contrato', () => {
    expect(mapContractStatus('Normal')).toBe('ACTIVE');
    expect(mapContractStatus('Bloqueio Financeiro')).toBe('SUSPENDED');
    expect(mapContractStatus('Cancelado')).toBe('CANCELLED');
    expect(mapContractStatus(null)).toBe('ACTIVE');
    expect(mapContractStatus(undefined)).toBe('ACTIVE');
  });
});
