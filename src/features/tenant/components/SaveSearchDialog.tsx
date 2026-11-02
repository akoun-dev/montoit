import { useState } from 'react';
import { X, Bookmark, Bell, BellOff } from 'lucide-react';

interface SaveSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, enableNotifications: boolean) => Promise<void>;
  currentFilters: {
    city?: string;
    propertyType?: string;
    minPrice?: string;
    maxPrice?: string;
    bedrooms?: string;
  };
}

export default function SaveSearchDialog({
  isOpen,
  onClose,
  onSave,
  currentFilters,
}: SaveSearchDialogProps) {
  const [name, setName] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const getFilterSummary = () => {
    const parts: string[] = [];
    if (currentFilters.city) parts.push(currentFilters.city);
    if (currentFilters.propertyType) {
      const types: Record<string, string> = {
        appartement: 'Appartement',
        maison: 'Maison',
        studio: 'Studio',
        villa: 'Villa',
      };
      parts.push(types[currentFilters.propertyType] || currentFilters.propertyType);
    }
    if (currentFilters.minPrice || currentFilters.maxPrice) {
      const min = currentFilters.minPrice
        ? `${parseInt(currentFilters.minPrice).toLocaleString()}`
        : '';
      const max = currentFilters.maxPrice
        ? `${parseInt(currentFilters.maxPrice).toLocaleString()}`
        : '';
      if (min && max) parts.push(`${min} - ${max} FCFA`);
      else if (min) parts.push(`Min ${min} FCFA`);
      else if (max) parts.push(`Max ${max} FCFA`);
    }
    if (currentFilters.bedrooms) parts.push(`${currentFilters.bedrooms}+ chambres`);
    return parts.join(' • ') || 'Tous les critères';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave(name.trim(), notifications);
      setName('');
      setNotifications(true);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-background rounded-[20px] shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Bookmark className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Sauvegarder la recherche</h2>
            <p className="text-sm text-muted-foreground">Retrouvez-la facilement plus tard</p>
          </div>
        </div>

        {/* Filter summary */}
        <div className="mb-6 p-4 bg-muted/50 rounded-xl border border-border">
          <p className="text-sm font-medium text-muted-foreground mb-1">Critères actuels</p>
          <p className="text-foreground">{getFilterSummary()}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name input */}
          <div className="mb-6">
            <label htmlFor="searchName" className="block text-sm font-medium text-foreground mb-2">
              Nom de la recherche
            </label>
            <input
              id="searchName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Appartement Cocody"
              className="w-full px-4 py-3 border-2 border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
              autoFocus
            />
          </div>

          {/* Notifications toggle */}
          <div className="mb-6 p-4 bg-muted/30 rounded-xl">
            <button
              type="button"
              onClick={() => setNotifications(!notifications)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {notifications ? (
                  <Bell className="w-5 h-5 text-primary" />
                ) : (
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                )}
                <div className="text-left">
                  <p className="font-medium text-foreground">Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    {notifications
                      ? 'Recevez des alertes pour les nouvelles propriétés'
                      : 'Les notifications sont désactivées'}
                  </p>
                </div>
              </div>
              <div
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  notifications ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    notifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </div>
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-border text-muted-foreground rounded-full hover:bg-muted transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
