import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getRankingInitials } from '@/features/ranking/utils/ranking-labels';

type UserAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  className?: string;
};

// Foto do Google quando houver; iniciais se não houver ou se a imagem falhar.
export function UserAvatar({ name, avatarUrl, className }: UserAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = Boolean(avatarUrl) && failedUrl !== avatarUrl;

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-bold text-foreground',
        className,
      )}
      aria-hidden="true"
    >
      {showPhoto ? (
        <img
          src={avatarUrl ?? undefined}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => {
            setFailedUrl(avatarUrl ?? null);
          }}
        />
      ) : (
        getRankingInitials(name)
      )}
    </span>
  );
}
