import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  Ban,
  Bell,
  BellRing,
  CheckCheck,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-unread-notifications-count';
import { useMarkNotificationAsRead } from '@/features/notifications/hooks/use-mark-notification-read';
import { useMarkAllNotificationsAsRead } from '@/features/notifications/hooks/use-mark-all-notifications-read';
import { useAuth } from '@/features/auth/auth-context';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { formatDateTimePtBR } from '@/utils/formatters';
import type { NotificationResponse } from '@/features/notifications/types/notifications-api.types';

// O backend grava entityType em caixa alta ('COLLECTION_CASE'); comparamos sem
// diferenciar caixa para não depender da convenção do emissor. O caminho base
// depende do papel: atendente abre o caso na sua carteira, supervisão na visão
// de supervisão.
function getEntityHref(
  entityType: string | null,
  entityId: string | null,
  caseBasePath: string,
): string | null {
  if (!entityId) return null;
  if (entityType?.toLowerCase() === 'collection_case') {
    return `${caseBasePath}/${entityId}`;
  }
  return null;
}

function isPromiseNotification(notification: NotificationResponse) {
  return notification.type.startsWith('PAYMENT_PROMISE_');
}

function isRecoveryNotification(notification: NotificationResponse) {
  return (
    notification.type === 'CASE_RECOVERED' ||
    notification.type === 'CASES_RECOVERED_SUMMARY'
  );
}

function isCancellationNotification(notification: NotificationResponse) {
  return (
    notification.type === 'CASE_CANCELLED_EXTERNAL' ||
    notification.type === 'CASES_CANCELLED_EXTERNAL_SUMMARY'
  );
}

const RECOVERY_TONE = {
  icon: BadgeCheck,
  label: 'Cliente regularizado',
  className: 'border-success/30 bg-success/10 text-success',
};

const CANCELLATION_TONE = {
  icon: Ban,
  label: 'Cliente cancelou',
  className: 'border-danger/30 bg-danger/10 text-danger',
};

function getPromiseNotificationTone(type: string) {
  if (type === 'PAYMENT_PROMISE_FULFILLED') {
    return {
      icon: BadgeCheck,
      label: 'Promessa cumprida',
      className: 'border-success/30 bg-success/10 text-success',
    };
  }

  return {
    icon: TriangleAlert,
    label:
      type === 'PAYMENT_PROMISE_BROKEN'
        ? 'Promessa descumprida'
        : 'Promessa cancelada',
    className: 'border-warning/30 bg-warning/10 text-warning',
  };
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const latestPromiseNotificationId = useRef<string | null>(null);

  // Atendente de cobrança navega para o caso dentro da sua carteira; demais
  // papéis (supervisão/admin) usam a visão de supervisão.
  const roles = session?.user.roles ?? [];
  const isAgentOnly =
    roles.includes('COLLECTION_AGENT') &&
    !roles.includes('SUPERVISOR') &&
    !roles.includes('ADMIN');
  const caseBasePath = isAgentOnly ? '/minha-cobranca' : '/supervisao';

  const unreadQuery = useUnreadNotificationsCount();
  const listQuery = useNotifications({ limit: 10 });
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const unreadCount = unreadQuery.data?.count ?? 0;
  const notifications = useMemo(
    () => listQuery.data?.items ?? [],
    [listQuery.data],
  );
  const hasUnreadPromise = notifications.some(
    (notification) =>
      !notification.readAt && isPromiseNotification(notification),
  );

  useEffect(() => {
    const latestPromiseNotification = notifications.find(
      (notification) =>
        !notification.readAt && isPromiseNotification(notification),
    );

    if (!latestPromiseNotification) return;

    if (latestPromiseNotificationId.current === null) {
      latestPromiseNotificationId.current = latestPromiseNotification.id;
      return;
    }

    if (latestPromiseNotificationId.current !== latestPromiseNotification.id) {
      latestPromiseNotificationId.current = latestPromiseNotification.id;
      toast(latestPromiseNotification.title, {
        description: latestPromiseNotification.body,
        action: {
          label: 'Abrir caso',
          onClick: () => {
            void navigate(
              getEntityHref(
                latestPromiseNotification.entityType,
                latestPromiseNotification.entityId,
                caseBasePath,
              ) ?? '/promessas',
            );
          },
        },
      });
    }
  }, [navigate, notifications, caseBasePath]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
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
        className={cn(
          'relative h-9 w-9 px-0',
          hasUnreadPromise &&
            'bg-warning/10 text-warning shadow-[0_0_0_4px_rgba(255,170,0,0.12)]',
        )}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notificações"
      >
        {hasUnreadPromise ? (
          <BellRing className="h-5 w-5 animate-pulse" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
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
                  const href = getEntityHref(
                    notification.entityType,
                    notification.entityId,
                    caseBasePath,
                  );
                  const isUnread = !notification.readAt;
                  const isPromise = isPromiseNotification(notification);
                  const promiseTone = isPromise
                    ? getPromiseNotificationTone(notification.type)
                    : null;
                  const tone = promiseTone
                    ? promiseTone
                    : isRecoveryNotification(notification)
                      ? RECOVERY_TONE
                      : isCancellationNotification(notification)
                        ? CANCELLATION_TONE
                        : null;
                  const ToneIcon = tone?.icon;

                  const content = (
                    <div
                      className={cn(
                        'px-4 py-3 transition-colors hover:bg-muted/40',
                        isUnread && 'bg-primary/5',
                        isUnread && isPromise && 'bg-warning/10',
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {ToneIcon && tone ? (
                          <span
                            className={cn(
                              'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
                              tone.className,
                            )}
                          >
                            <ToneIcon className="h-4 w-4" />
                          </span>
                        ) : isUnread ? (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        ) : (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {notification.title}
                          </p>
                          {tone ? (
                            <span
                              className={cn(
                                'mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]',
                                tone.className,
                              )}
                            >
                              {tone.label}
                            </span>
                          ) : null}
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
