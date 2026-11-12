-- Uma "virada" do ERP durante o teste (chamada periodicamente pelo scenario.mjs):
-- clientes pagam, contratos sao cancelados e novos contratos entram na esteira.
-- Janelas limitadas por indice (expiration_date) para nao varrer as 17M linhas a cada virada.
\set ON_ERROR_STOP on
-- 1) ~1.5% dos titulos vencidos nos ultimos 120 dias (contratos Normal) sao pagos.
WITH pick AS (
  SELECT fr.id FROM erp.financial_receivable_titles fr
  JOIN erp.contracts c ON c.id = fr.contract_id AND c.v_status = 'Normal'
  WHERE fr.expiration_date BETWEEN CURRENT_DATE - 120 AND CURRENT_DATE - 1
    AND fr.balance > 0 AND fr.deleted IS false AND random() < 0.015
), upd AS (
  UPDATE erp.financial_receivable_titles fr SET balance = 0 FROM pick WHERE fr.id = pick.id RETURNING fr.id
)
INSERT INTO erp.financial_receipt_titles (id, financial_receivable_title_id, client_paid_date, payment_form_id, deleted)
SELECT (SELECT COALESCE(MAX(id), 0) FROM erp.financial_receipt_titles) + row_number() OVER (), id, CURRENT_DATE, 1, false FROM upd;

-- 2) ~100 contratos Normal sao cancelados.
WITH pick AS (
  UPDATE erp.contracts SET v_status = 'Cancelado', status = 4
  WHERE id IN (SELECT id FROM erp.contracts WHERE v_status = 'Normal' ORDER BY random() LIMIT 100) RETURNING id
)
INSERT INTO erp.contract_events (id, contract_id, contract_event_type_id, date, deleted)
SELECT (SELECT COALESCE(MAX(id), 0) FROM erp.contract_events) + row_number() OVER (), id, 1 + (id % 4), now(), false FROM pick;

-- 3) ~100 contratos novos entram na esteira (2 titulos em aberto: ontem e ontem-1 mes).
WITH pick AS (
  SELECT c.id FROM erp.contracts c
  JOIN erp.contract_types ct ON ct.id = c.contract_type_id AND ct.title <> 'Sebratel - Fat. Especial'
  WHERE c.v_status = 'Normal'
    AND NOT EXISTS (SELECT 1 FROM erp.financial_receivable_titles t
                    WHERE t.contract_id = c.id AND t.balance > 0 AND t.expiration_date < CURRENT_DATE)
  ORDER BY random() LIMIT 100
), base AS (SELECT COALESCE(MAX(id), 0) AS m FROM erp.financial_receivable_titles)
INSERT INTO erp.financial_receivable_titles
  (id, contract_id, client_id, financer_nature_id, bill_title_id, renegotiated, deleted, finished, type, situation, parcel, origin,
   title, title_amount, balance, expiration_date, issue_date)
SELECT base.m + row_number() OVER (), pick.id, pick.id, 1, NULL, false, false, false, 2, 0, 1, 44,
       'FAT-N' || pick.id || '-' || d.n, 129.90, 129.90, d.exp, d.exp - 10
FROM pick, base,
  (VALUES (1, (CURRENT_DATE - 1)), (2, ((CURRENT_DATE - 1) - interval '1 month')::date)) AS d(n, exp);
