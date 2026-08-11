import { ChevronRight, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context';
import { NotificationBell } from '@/features/notifications/components/notification-bell';

type AppTopbarProps = {
  currentTitle: string;
  onOpenMobileMenu: () => void;
};

export function AppTopbar({ currentTitle, onOpenMobileMenu }: AppTopbarProps) {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-background/95 px-4 shadow-[0_1px_0_rgba(17,17,17,0.02)] backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 shrink-0 px-0 lg:hidden"
          onClick={onOpenMobileMenu}
          aria-label="Abrir menu lateral"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <nav
          aria-label="Trilha de navegação"
          className="flex min-w-0 items-center gap-1.5 text-sm"
        >
          <img
            src="/logo-circular-sebratel.png"
            alt="Sebratel"
            className="h-6 w-6 shrink-0 rounded-full object-cover"
          />
          <span className="hidden shrink-0 text-[11px] font-black uppercase tracking-[0.16em] text-neutral sm:inline">
            SEBRATEL
          </span>
          <ChevronRight
            className="h-3.5 w-3.5 shrink-0 text-neutral/60"
            aria-hidden="true"
          />
          <span className="truncate font-semibold">{currentTitle}</span>
        </nav>
      </div>
      <div className="flex items-center gap-1.5">
        <NotificationBell />
        <Button
          variant="secondary"
          size="sm"
          className="h-9"
          onClick={logout}
          aria-label="Encerrar sessão"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
}
