import { UserRound } from 'lucide-react';

export function getAssigneeInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts.at(-1)?.charAt(0) ?? '') : '';

  return `${first}${last}`.toUpperCase() || '?';
}

// Avatar do responsável: foto quando houver, senão iniciais; ícone genérico
// para "Não atribuído". Compartilhado entre o seletor por linha e o em lote.
export function AssigneeAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="h-5 w-5 shrink-0 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  if (name === 'Nao atribuido' || name === 'Não atribuído') {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-neutral">
        <UserRound className="h-3 w-3" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-foreground">
      {getAssigneeInitials(name)}
    </span>
  );
}
