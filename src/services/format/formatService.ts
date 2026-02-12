export class FormatService {
  static formatCurrency(amount: number | null | undefined, currency: string = 'FCFA'): string {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return `N/A`;
    }
    return `${amount.toLocaleString('fr-FR')} ${currency}`;
  }

  static formatNumber(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }
    return value.toLocaleString('fr-FR');
  }

  static formatDate(
    date: string | Date | null | undefined,
    options?: Intl.DateTimeFormatOptions
  ): string {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'N/A';
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options,
    };
    return dateObj.toLocaleDateString('fr-FR', defaultOptions);
  }

  static formatShortDate(date: string | Date): string {
    return this.formatDate(date, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  static formatTime(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  static formatDateTime(date: string | Date): string {
    return `${this.formatDate(date)} à ${this.formatTime(date)}`;
  }

  static formatRelativeTime(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "À l'instant";
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `Il y a ${diffInWeeks} semaine${diffInWeeks > 1 ? 's' : ''}`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `Il y a ${diffInMonths} mois`;
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return `Il y a ${diffInYears} an${diffInYears > 1 ? 's' : ''}`;
  }

  static formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('225')) {
      const number = cleaned.slice(3);
      return `+225 ${number.slice(0, 2)} ${number.slice(2, 4)} ${number.slice(4, 6)} ${number.slice(6, 8)}`;
    }

    if (cleaned.length === 10) {
      return `+225 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)}`;
    }

    return phone;
  }

  static formatAddress(address: string, city: string, neighborhood?: string): string {
    const parts = [address];
    if (neighborhood) parts.push(neighborhood);
    parts.push(city);
    return parts.join(', ');
  }

  static formatPropertyType(type: string): string {
    const types: Record<string, string> = {
      apartment: 'Appartement',
      house: 'Maison',
      studio: 'Studio',
      villa: 'Villa',
      duplex: 'Duplex',
      room: 'Chambre',
      office: 'Bureau',
      retail: 'Local commercial',
      warehouse: 'Entrepôt',
      land: 'Terrain',
    };
    return types[type] || type;
  }

  static formatStatus(status: string): { text: string; color: string } {
    const statusMap: Record<string, { text: string; color: string }> = {
      available: { text: 'Disponible', color: 'green' },
      rented: { text: 'Loué', color: 'blue' },
      pending: { text: 'En attente', color: 'yellow' },
      unavailable: { text: 'Indisponible', color: 'gray' },
      maintenance: { text: 'Maintenance', color: 'red' },
      inactive: { text: 'Inactif', color: 'gray' },
      approved: { text: 'Approuvé', color: 'green' },
      rejected: { text: 'Rejeté', color: 'red' },
      active: { text: 'Actif', color: 'green' },
      terminated: { text: 'Résilié', color: 'red' },
      cancelled: { text: 'Annulé', color: 'red' },
      expired: { text: 'Expiré', color: 'gray' },
      in_progress: { text: 'En cours', color: 'blue' },
      completed: { text: 'Complété', color: 'green' },
      failed: { text: 'Échoué', color: 'red' },
      overdue: { text: 'En retard', color: 'red' },
      partial: { text: 'Partiel', color: 'yellow' },
      refunded: { text: 'Remboursé', color: 'gray' },
    };

    return statusMap[status] || { text: status, color: 'gray' };
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  static formatPercentage(value: number, decimals: number = 0): string {
    return `${value.toFixed(decimals)}%`;
  }

  static formatSurfaceArea(area: number): string {
    return `${area.toLocaleString('fr-FR')} m²`;
  }

  static formatDuration(months: number): string {
    if (months < 12) {
      return `${months} mois`;
    }
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (remainingMonths === 0) {
      return `${years} an${years > 1 ? 's' : ''}`;
    }

    return `${years} an${years > 1 ? 's' : ''} et ${remainingMonths} mois`;
  }

  static truncateText(text: string, maxLength: number, suffix: string = '...'): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  static capitalizeFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  static pluralize(count: number, singular: string, plural?: string): string {
    if (count <= 1) return singular;
    return plural || `${singular}s`;
  }

  static formatCount(count: number, label: string, pluralLabel?: string): string {
    return `${count} ${this.pluralize(count, label, pluralLabel)}`;
  }

  static formatOrdinal(n: number): string {
    if (n === 1) return '1er';
    return `${n}ème`;
  }

  static generateInitials(name: string): string {
    return name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  static slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
