import { useState } from 'react';
import { User, Mail, Phone, MapPin, Save } from 'lucide-react';

interface ProfileInformationTabProps {
  profile: any;
  user: any;
  onSave: (formData: any) => Promise<void>;
}

export default function ProfileInformationTab({
  profile,
  user,
  onSave,
}: ProfileInformationTabProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    city: profile?.city || '',
    address: profile?.address || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-scrapbook p-8">
      <h2 className="text-2xl font-bold text-gradient mb-6">Informations personnelles</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            <User className="inline h-4 w-4 mr-2" />
            Nom complet
          </label>
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-terracotta-200 focus:border-terracotta-500 transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            <Mail className="inline h-4 w-4 mr-2" />
            Email
          </label>
          <input
            type="email"
            value={user?.email}
            disabled
            className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl text-gray-600 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">L'email ne peut pas être modifié</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            <Phone className="inline h-4 w-4 mr-2" />
            Téléphone
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-terracotta-200 focus:border-terracotta-500 transition-all"
            placeholder="+225 XX XX XX XX XX"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            <MapPin className="inline h-4 w-4 mr-2" />
            Ville
          </label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-terracotta-200 focus:border-terracotta-500 transition-all"
            placeholder="Abidjan, Yamoussoukro..."
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            <MapPin className="inline h-4 w-4 mr-2" />
            Adresse complète
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-terracotta-200 focus:border-terracotta-500 transition-all"
            placeholder="Rue, quartier..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-4 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-5 w-5" />
          <span>{loading ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
        </button>
      </form>
    </div>
  );
}
