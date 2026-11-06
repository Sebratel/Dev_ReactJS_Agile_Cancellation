// Cor de cada atendente nos gráficos da supervisão. Derivada do id, então a
// mesma pessoa tem a mesma cor em todas as telas, independente da ordem.
const AGENT_COLORS = [
  'hsl(244 55% 64%)',
  'hsl(160 69% 36%)',
  'hsl(210 70% 54%)',
  'hsl(340 60% 59%)',
  'hsl(37 78% 41%)',
  'hsl(246 42% 53%)',
  'hsl(165 76% 24%)',
  'hsl(14 68% 36%)',
];

export function getAgentColor(agentId: string): string {
  let hash = 0;

  for (let index = 0; index < agentId.length; index += 1) {
    hash = (hash * 31 + agentId.charCodeAt(index)) >>> 0;
  }

  return AGENT_COLORS[hash % AGENT_COLORS.length] ?? 'hsl(244 55% 64%)';
}
