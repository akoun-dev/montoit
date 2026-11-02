/**
 * UserAvatar - Avatar utilisateur pour les tableaux admin
 */

import { User } from 'lucide-react';

export interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  name?: string | null;
  email?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  status?: 'online' | 'offline' | 'away' | 'busy';
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-neutral-300',
  away: 'bg-amber-500',
  busy: 'bg-red-500',
};

export function UserAvatar({
  src,
  alt,
  name,
  email,
  size = 'md',
  showStatus = false,
  status = 'offline',
  className = '',
  onClick,
}: UserAvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : email
      ? email[0].toUpperCase()
      : '?';

  const avatarContent = src ? (
    <img
      src={src}
      alt={alt || name || email || 'Avatar'}
      className="w-full h-full object-cover"
      onError={(e) => {
        e.currentTarget.src = '';
        e.currentTarget.style.display = 'none';
      }}
    />
  ) : (
    <span className="font-medium text-[#6B5A4E]">{initials}</span>
  );

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full bg-[#FAF7F4] overflow-hidden ${sizeClasses[size]} ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-[#F16522] hover:ring-offset-2' : ''} ${className}`}
      onClick={onClick}
      title={name || email || ''}
    >
      {!src && <User className={`absolute text-[#E8D4C5]/50 ${size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6'}`}></User>}
      {avatarContent}
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-white ${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${statusColors[status]}`}
          aria-label={`Statut: ${status}`}
        />
      )}
    </div>
  );
}
