import * as Dialog from '@radix-ui/react-dialog';
import { PanelLeftClose } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { roleLabels } from '@/features/auth/auth.constants';
import { useAuth } from '@/features/auth/auth-context';
import { getRoutesForRole } from '@/features/auth/utils/route-access';
import { cn } from '@/lib/utils';
import { theme } from '@/design-system/theme';
import { type AppRouteItem } from '@/app/router/route-config';

const NAV_GROUPS: Array<{ key: AppRouteItem['group']; label: string }> = [
  { key: 'operacao', label: 'Operação' },
  { key: 'gestao', label: 'Gestão' },
];

function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  const first = parts[0]?.charAt(0) ?? '';
  const last =
    parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';

  return `${first}${last}`.toUpperCase() || '?';
}

type SidebarContentProps = {
  onNavigate?: () => void;
};

function SidebarContent({ onNavigate }: SidebarContentProps) {
  const { session } = useAuth();
  const routes = session ? getRoutesForRole(session.user.role) : [];

  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <img
          src="/logo-circular-sebratel.png"
          alt="Sebratel"
          className="h-9 w-9 shrink-0 rounded-xl object-cover"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="bg-gradient-to-r from-[#ed1c24] via-[#ffb000] to-[#ed1c24] bg-clip-text text-[15px] font-black uppercase leading-tight tracking-[0.14em] text-transparent drop-shadow-[0_1px_5px_rgba(255,176,0,0.22)]">
            SEBRATEL
          </p>
          <p className="truncate text-xs font-medium text-neutral">
            Gestão de Cobrança
          </p>
        </div>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-3 py-4"
        aria-label="Navegação principal"
      >
        {NAV_GROUPS.map(({ key, label }) => {
          const groupRoutes = routes.filter((route) => route.group === key);

          if (groupRoutes.length === 0) {
            return null;
          }

          return (
            <div key={key} className="mb-5 last:mb-0">
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral/80">
                {label}
              </p>
              <div className="space-y-0.5">
                {groupRoutes.map(({ icon: Icon, label: routeLabel, path }) => (
                  <NavLink
                    key={path}
                    to={path}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors duration-150',
                        isActive
                          ? 'bg-primary/10 font-semibold text-foreground'
                          : 'font-medium text-neutral hover:bg-muted hover:text-foreground',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cn(
                            'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary transition-[opacity,transform] duration-200',
                            isActive ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-50',
                          )}
                          aria-hidden="true"
                        />
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-colors duration-200',
                            isActive
                              ? 'text-foreground'
                              : 'text-neutral group-hover:text-foreground',
                          )}
                        />
                        <span>{routeLabel}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {session ? (
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground"
              aria-hidden="true"
            >
              {getUserInitials(session.user.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">
                {session.user.name}
              </p>
              <p className="truncate text-xs text-neutral">
                {roleLabels[session.user.role]}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AppSidebarDesktop() {
  return (
    <aside
      className="sticky top-0 hidden h-screen shrink-0 lg:block"
      style={{ width: theme.sidebarWidth }}
      aria-label="Sidebar"
    >
      <SidebarContent />
    </aside>
  );
}

type AppSidebarMobileProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AppSidebarMobile({
  open,
  onOpenChange,
}: AppSidebarMobileProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/20 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out lg:hidden" />
        <Dialog.Content
          className="fixed left-0 top-0 z-50 h-full data-[state=open]:animate-drawer-in-left data-[state=closed]:animate-drawer-out-left lg:hidden"
          style={{ width: theme.sidebarWidth }}
        >
          <div className="flex h-full flex-col bg-card shadow-floating">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral">
                Menu
              </span>
              <Dialog.Close asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 px-0"
                  aria-label="Fechar menu lateral"
                >
                  <PanelLeftClose className="h-5 w-5" />
                </Button>
              </Dialog.Close>
            </div>
            <SidebarContent onNavigate={() => onOpenChange(false)} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
