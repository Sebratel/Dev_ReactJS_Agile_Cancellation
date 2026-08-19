// Sem limite de fila dedicada (Redis/BullMQ) — o worker processa aos poucos
// via MariaDB, entao cabe suportar lotes grandes; o teto e so uma trava de
// sanidade contra um envio acidental gigante (usado tanto na validacao do
// DTO quanto no cap de `listCaseIds`, que resolve o grupo "por filtro").
export const BULK_CONTACT_MAX_CASES = 2000;
