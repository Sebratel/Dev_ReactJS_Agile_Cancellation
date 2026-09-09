# Notificação — Cliente Regularizado

Processo que avisa **o atendente responsável** e **a supervisão** quando um
cliente que estava na esteira de cobrança **paga e se regulariza**.

- **Sino interno** (dentro da plataforma): sempre funciona, sem dependência externa.
- **Entrega externa** (e-mail via Gmail, WhatsApp, etc.): via **webhook N8N**.

---

## Visão geral do fluxo

```mermaid
sequenceDiagram
    participant ERP as ERP (Voalle)
    participant SYNC as ErpSyncService (a cada 30 min)
    participant DB as Banco (collection_cases)
    participant BELL as NotificationsService (sino)
    participant N8N as N8N (webhook cases-recovered)
    participant MAIL as Gmail

    SYNC->>ERP: consulta títulos em aberto dos casos ativos
    ERP-->>SYNC: títulos (ou ausência = pago)
    SYNC->>DB: marca caso como RECUPERADO (após commit)
    Note over SYNC: dispatchRecoveryNotifications()
    SYNC->>BELL: notify(atendente) + notifySupervisors(resumo)
    SYNC->>N8N: POST cases-recovered { summary, supervisorEmails, cases[] }
    N8N-->>SYNC: 200 (best-effort; falha não reverte nada)
    N8N->>MAIL: 1 e-mail por atendente + 1 resumo p/ supervisão
```

### Onde cada parte vive

| Parte | Local |
| --- | --- |
| Detecção do pagamento (reconcile) | `backend/src/modules/erp-sync/erp-sync.service.ts` → `reconcileRecoveredCases()` |
| Montagem das notificações (sino) | `backend/src/modules/erp-sync/recovery-notifications.builder.ts` → `buildRecoveryNotifications()` |
| Montagem do payload do webhook | mesmo arquivo → `buildRecoveryWebhookPayload()` |
| Envio ao N8N (best-effort) | `backend/src/modules/erp-sync/recovery-notifier.service.ts` |
| Sino interno | `NotificationsService` (`notify` / `notifySupervisors`) |
| Fluxo N8N (exportado) | `docs/n8n-cases-recovered.workflow.json` |

---

## Contrato do webhook

**Requisição** — `POST {N8N_RECOVERY_WEBHOOK_URL}` (header opcional `X-Webhook-Secret`):

```json
{
  "event": "cases.recovered",
  "occurredAt": "2026-09-09T12:00:00.000Z",
  "summary": { "count": 3, "totalAmount": 4500.0 },
  "supervisorEmails": ["supervisor@sebratel.com.br"],
  "cases": [
    {
      "caseId": "case_0001",
      "customerName": "Construtora Horizonte",
      "recoveredAmount": 1500.0,
      "hadActivePromise": false,
      "agent": { "name": "Marina Lopes", "email": "marina@sebratel.com.br" }
    }
  ]
}
```

- `agent` é `null` quando o caso está **sem responsável** (entra só no resumo da supervisão).
- É **1 chamada por rodada** de reconciliação (contém o lote inteiro daquela rodada).
- **Resposta esperada:** `200`. A plataforma só olha o status; o corpo é ignorado.

---

## O fluxo N8N (`cases-recovered`)

Arquivo versionado: `docs/n8n-cases-recovered.workflow.json` (importável).

```
Webhook Plataforma  →  Preparar e-mails (Code)  →  Enviar e-mail (Gmail / HTML)
```

1. **Webhook Plataforma** — `POST /webhook/cases-recovered`. Responde `200` no
   recebimento (não espera o e-mail sair).
2. **Preparar e-mails** (Code) — transforma o payload em uma lista de e-mails:
   um por atendente (`to`, `subject`, `html`) + um resumo para a supervisão.
   Valores formatados em `pt-BR` (`R$ 1.500,00`). Sem destinatário, retorna vazio.
3. **Enviar e-mail** (Gmail, `Email Type = HTML`) — um envio por item, com a
   credencial **Gmail Fabricio**.

O canvas tem notas (sticky notes) explicando cada bloco.

---

## Como configurar (uma vez)

1. **Importar o fluxo no N8N:** Workflows → *Import from File* →
   `docs/n8n-cases-recovered.workflow.json`.
2. No nó **Enviar e-mail**, confirmar a credencial Gmail e que **Email Type = HTML**.
3. Copiar a **URL de produção** do webhook e colocar no `.env` do backend:
   ```bash
   N8N_RECOVERY_WEBHOOK_URL="https://n8n-staging.sebratel.net.br/webhook/cases-recovered"
   # opcional, se validar o segredo no fluxo:
   N8N_RECOVERY_WEBHOOK_SECRET="<segredo>"
   N8N_RECOVERY_TIMEOUT_MS="15000"
   ```
4. **Ativar** o workflow no N8N.
5. **Reiniciar o backend** (ele só relê o `.env` na inicialização).

> Sem `N8N_RECOVERY_WEBHOOK_URL`, a entrega externa é apenas ignorada (no-op) —
> o sino interno continua funcionando normalmente.

---

## Como testar sem esperar a reconciliação

Dispare um payload de exemplo direto no webhook (PowerShell):

```powershell
$body = @{
  event = "cases.recovered"
  occurredAt = (Get-Date).ToString("o")
  summary = @{ count = 1; totalAmount = 1500 }
  supervisorEmails = @("voce@sebratel.com.br")
  cases = @(@{
    caseId = "teste_001"
    customerName = "Cliente Teste"
    recoveredAmount = 1500
    hadActivePromise = $false
    agent = @{ name = "Atendente Teste"; email = "voce@sebratel.com.br" }
  })
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Post -Uri "https://n8n-staging.sebratel.net.br/webhook/cases-recovered" -ContentType "application/json" -Body $body
```

Deve responder `200` e cair um e-mail na caixa informada.

---

## Solução de problemas

| Sintoma | Provável causa |
| --- | --- |
| `404` ao disparar | Workflow não está **ativo** no N8N, ou a URL está errada. |
| E-mail com tags `<p>` visíveis | No nó Gmail, **Email Type** não está em **HTML**. |
| Valor sem separador (`R$ 1500,00`) | Função `brl` com a regex antiga (barras perdidas) — usar a versão versionada, com `toLocaleString`. |
| Nada é enviado, sem erro | `N8N_RECOVERY_WEBHOOK_URL` vazio no `.env` (no-op), ou nenhum caso recuperado na rodada. |
| Sino funciona, e-mail não | Problema no N8N/credencial — o sino é interno e independe do N8N. |

---

## Decisões de projeto

- **Por que N8N e não SMTP direto?** O N8N já é o hub de integração de saída
  (mesmo padrão do HSM Matrix). Evita credenciais na plataforma e permite trocar
  de canal (e-mail → WhatsApp) sem alterar código.
- **Best-effort:** o disparo nunca lança exceção nem reverte a recuperação já
  persistida. Se o N8N estiver fora, perde-se apenas a notificação externa daquela
  rodada (o sino interno permanece).
- **Supervisão em resumo:** para evitar inundação numa leva grande de pagamentos,
  a supervisão recebe **um resumo por rodada**, enquanto o atendente recebe **um
  por cliente** da carteira dele.
