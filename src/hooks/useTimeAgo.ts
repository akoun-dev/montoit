export const useTimeAgo = (date: string | Date) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) {
    return 'À l\'instant';
  } else if (diffMinutes < 60) {
    return `Il y a ${diffMinutes} min`;
  } else if (diffHours < 24) {
    return `Il y a ${diffHours}h`;
  } else if (diffDays === 1) {
    const timeStr = past.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Africa/Abidjan'
    });
    return `Hier à ${timeStr}`;
  } else if (diffDays < 7) {
    return `Il y a ${diffDays} jours`;
  } else {
    return past.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Africa/Abidjan'
    });
  }
};
