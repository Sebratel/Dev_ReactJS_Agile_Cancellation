import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-unread-notifications-count';
import { useMarkNotificationAsRead } from '@/features/notifications/hooks/use-mark-notification-read';
import { useMarkAllNotificationsAsRead } from '@/features/notifications/hooks/use-mark-all-notifications-read';
import { cn } from '@/lib/utils';
import { formatDateTimePtBR } from '@/utils/formatters';

function getEntityHref(entityType: string | null, entityId: string | null): string | null {
  if (!entityId) return null;
  if (entityType === 'collection_case') return `/supervisao/${entityId}`;
  return null;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadQuery = useUnreadNotificationsCount();
  const listQuery = useNotifications({ limit: 10 });
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const unreadCount = unreadQuery.data?.count ?? 0;
  const notifications = listQuery.data?.items ?? [];

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        size="sm"
        className="relative h-9 w-9 px-0"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 animate-scale-in origin-top-right rounded-xl border border-border bg-card shadow-floating">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h3 className="text-sm font-semibold">Notificações</h3>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas como lidas
              </button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-neutral">
                Nenhuma notificação ainda.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((notification) => {
                  const href = getEntityHref(notification.entityType, notification.entityId);
                  const isUnread = !notification.readAt;

                  const content = (
                    <div
                      className={cn(
                        'px-4 py-3 transition-colors hover:bg-muted/40',
                        isUnread && 'bg-primary/5',
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {isUnread ? (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        ) : (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {notification.title}
                          </p>
                          <p className="mt-0.5 text-xs text-neutral">
                            {notification.body}
                          </p>
                          <p className="mt-1 text-[11px] text-neutral/70">
                            {formatDateTimePtBR(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );

                  return (
                    <li key={notification.id}>
                      {href ? (
                        <Link
                          to={href}
                          onClick={() => {
                            if (isUnread) markAsRead.mutate(notification.id);
                            setOpen(false);
                          }}
                          className="block"
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (isUnread) markAsRead.mutate(notification.id);
                          }}
                          className="block w-full text-left"
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
