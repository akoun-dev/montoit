import { useState, useEffect } from 'react';
import {
  Calendar,
  Bell,
  Mail,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  Settings,
  RefreshCw,
  FileText,
  Users,
  TrendingUp,
  Eye,
  Loader2,
  X,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Reminder {
  id: string;
  contract_id: string;
  tenant_id: string;
  property_id: string;
  reminder_type: string;
  schedule_offset: number;
  status: string;
  channel: string;
  subject: string;
  message: string;
  scheduled_date: string;
  sent_date: string | null;
  opened: boolean;
  opened_date: string | null;
  click_count: number;
  created_at: string;
  tenant?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  property?: {
    title: string;
    city: string;
  };
}

interface ReminderStats {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  pending: number;
}

interface LeaseExpiry {
  contract_id: string;
  property_id: string;
  tenant_id: string;
  days_until_expiry: number;
  expiry_date: string;
  tenant?: {
    first_name: string;
    last_name: string;
  };
  property?: {
    title: string;
  };
}

const REMINDER_TYPES = [
  { value: 'rent_due', label: 'Loyer dû', icon: Calendar, color: 'bg-blue-50 text-blue-600' },
  { value: 'rent_overdue', label: 'Loyer en retard', icon: AlertCircle, color: 'bg-red-50 text-red-600' },
  { value: 'lease_expiry', label: 'Fin de contrat', icon: RefreshCw, color: 'bg-orange-50 text-orange-600' },
  { value: 'lease_renewal', label: 'Renouvellement', icon: FileText, color: 'bg-green-50 text-green-600' },
  { value: 'custom', label: 'Personnalisé', icon: Bell, color: 'bg-purple-50 text-purple-600' },
];

const SCHEDULE_OPTIONS = [
  { value: -7, label: 'J-7 (1 semaine avant)' },
  { value: -3, label: 'J-3 (3 jours avant)' },
  { value: 0, label: 'J0 (jour de l\'échéance)' },
  { value: 3, label: 'J+3 (3 jours après)' },
  { value: 7, label: 'J+7 (1 semaine après)' },
];

const StatCard = ({
  icon: Icon,
  label,
  value,
  trend,
  color = 'gray',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  trend?: string;
  color?: 'gray' | 'blue' | 'green' | 'orange' | 'purple' | 'red';
}) => {
  const colors = {
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    red: 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <div className={`p-5 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${color === 'gray' ? 'text-gray-500' : ''}`} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        {trend && (
          <span className="text-xs font-semibold text-green-600">+{trend}</span>
        )}
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const config = {
    pending: { label: 'En attente', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
    sent: { label: 'Envoyé', color: 'text-blue-700', bg: 'bg-blue-100', icon: Send },
    delivered: { label: 'Délivré', color: 'text-purple-700', bg: 'bg-purple-100', icon: CheckCircle },
    opened: { label: 'Ouvert', color: 'text-green-700', bg: 'bg-green-100', icon: Eye },
    failed: { label: 'Échoué', color: 'text-red-700', bg: 'bg-red-100', icon: AlertCircle },
  };

  const statusConfig = config[status as keyof typeof config] || config.pending;
  const Icon = statusConfig.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {statusConfig.label}
    </span>
  );
};

export default function AgencyRemindersPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [expiringLeases, setExpiringLeases] = useState<LeaseExpiry[]>([]);
  const [stats, setStats] = useState<ReminderStats>({
    total: 0,
    sent: 0,
    delivered: 0,
    opened: 0,
    pending: 0,
  });
  const [activeTab, setActiveTab] = useState<'reminders' | 'expiring' | 'settings'>('reminders');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contracts, setContracts] = useState<Array<{
    id: string;
    property_id: string;
    tenant_id: string;
    monthly_rent: number;
    start_date: string;
    end_date: string | null;
    status: string;
    properties: { title: string };
    tenant: { first_name: string; last_name: string };
  }>>([]);

  // Settings state
  const [settings, setSettings] = useState({
    rent_reminder_schedule: [-7, -3, 0],
    default_channel: 'email',
    reminders_enabled: true,
    renewal_reminders_enabled: true,
    renewal_reminder_days: 30,
  });

  // New reminder form state
  const [newReminder, setNewReminder] = useState({
    contract_id: '',
    reminder_type: 'rent_due',
    schedule_offset: -3,
    channel: 'email',
    subject: '',
    message: '',
    scheduled_date: '',
  });

  const [saving, setSaving] = useState(false);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadAgencyId();
    }
  }, [user]);

  const loadAgencyId = async () => {
    if (!user) return;

    try {
      // Use RPC function to get user's agency (bypasses RLS)
      const { data: agencyData } = await supabase
        .rpc('get_user_agency', {
          user_uuid: user.id
        });

      const agencyId = agencyData?.[0]?.id || null;

      setAgencyId(agencyId);
      if (agencyId) {
        loadData(agencyId);
      } else {
        toast.error('Profil agence non trouvé. Veuillez contacter le support.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading agency ID:', error);
      toast.error('Erreur lors du chargement du profil');
      setLoading(false);
    }
  };

  const loadData = async (id: string) => {
    try {
      setLoading(true);

      // Charger les rappels
      const { data: remindersData } = await (supabase as unknown as {
        from: (table: string) => {
          select: (columns: string) => {
            eq: (field: string, value: string) => {
              order: (field: string, options: { ascending: boolean }) => {
                limit: (count: number) => Promise<{ data: Reminder[] | null; error: unknown }>;
              };
            };
          };
        };
      })
        .from('payment_reminders')
        .select('*, properties(title, city), tenant:profiles(first_name, last_name, email)')
        .eq('agency_id', id)
        .order('scheduled_date', { ascending: false })
        .limit(100);

      setReminders((remindersData || []) as Reminder[]);

      // Calculer les stats
      const reminderStats = (remindersData || []).reduce(
        (acc: ReminderStats, r: Reminder) => {
          acc.total++;
          if (r.status === 'sent') acc.sent++;
          if (r.status === 'delivered') acc.delivered++;
          if (r.opened) acc.opened++;
          if (r.status === 'pending') acc.pending++;
          return acc;
        },
        { total: 0, sent: 0, delivered: 0, opened: 0, pending: 0 }
      );
      setStats(reminderStats);

      // Charger les settings (try agency_reminder_settings first, then reminder_settings)
      let settingsData: unknown;

      try {
        const result = await (supabase as unknown as {
          from: (table: string) => {
            select: (columns: string) => {
              eq: (field: string, value: string) => {
                single: () => Promise<{ data: unknown; error: { code?: string } | null }>;
              };
            };
          };
        })
          .from('agency_reminder_settings')
          .select('*')
          .eq('agency_id', id)
          .single();
        settingsData = result.data;
        if (!result.error || result.error.code === 'PGRST116') {
          // Table exists or we got data
        }
      } catch (_error) {
        // Continue to fallback
      }

      if (!settingsData) {
        // Try owner_settings as fallback
        const result = await (supabase as unknown as {
          from: (table: string) => {
            select: (columns: string) => {
              eq: (field: string, value: string) => {
                maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
              };
            };
          };
        })
          .from('reminder_settings')
          .select('*')
          .eq('owner_id', user.id)
          .maybeSingle();
        settingsData = result.data;
      }

      if (settingsData && typeof settingsData === 'object') {
        const data = settingsData as {
          rent_reminder_schedule?: number[];
          default_channel?: string;
          reminders_enabled?: boolean;
          renewal_reminders_enabled?: boolean;
          renewal_reminder_days?: number;
        };
        setSettings({
          rent_reminder_schedule: data.rent_reminder_schedule || [-7, -3, 0],
          default_channel: data.default_channel || 'email',
          reminders_enabled: data.reminders_enabled ?? true,
          renewal_reminders_enabled: data.renewal_reminders_enabled ?? true,
          renewal_reminder_days: data.renewal_reminder_days || 30,
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading reminders:', error);
      toast.error('Erreur lors du chargement des rappels');
      setLoading(false);
    }
  };

  const loadContracts = async () => {
    if (!user || !agencyId) return;

    try {
      const { data } = await (supabase as unknown as {
        from: (table: string) => {
          select: (columns: string) => {
            eq: (field: string, value: string) => {
              order: (field: string, options: { ascending: boolean }) => Promise<{
                data: Array<{
                  id: string;
                  property_id: string;
                  tenant_id: string;
                  monthly_rent: number;
                  start_date: string;
                  end_date: string | null;
                  status: string;
                  properties: { agency_id?: string; [key: string]: unknown };
                  tenant: { [key: string]: unknown };
                }> | null;
                error: unknown;
              }>;
            };
          };
        };
      })
        .from('lease_contracts')
        .select('id, property_id, tenant_id, monthly_rent, start_date, end_date, status, properties(*), tenant:profiles(*)')
        .eq('status', 'active')
        .order('start_date', { ascending: false });

      // Filter by agency properties
      const agencyContracts = (data || []).filter((c) =>
        c.properties?.agency_id === agencyId
      );

      setContracts(agencyContracts);
    } catch (error) {
      console.error('Error loading contracts:', error);
      toast.error('Erreur lors du chargement des contrats');
    }
  };

  const handleSaveSettings = async () => {
    if (!user || !agencyId) return;

    try {
      setSaving(true);

      // Try agency_reminder_settings first
      const result1 = await (supabase as unknown as { from: (table: string) => { upsert: (data: Record<string, unknown>) => Promise<{ error: { error?: { message: string } } | null }> } })
        .from('agency_reminder_settings')
        .upsert({
          agency_id: agencyId,
          rent_reminder_schedule: settings.rent_reminder_schedule,
          default_channel: settings.default_channel,
          reminders_enabled: settings.reminders_enabled,
          renewal_reminders_enabled: settings.renewal_reminders_enabled,
          renewal_reminder_days: settings.renewal_reminder_days,
        });

      // If agency table doesn't exist, try owner_settings
      if (result1.error?.error?.message?.includes('relation')) {
        const result2 = await (supabase as unknown as { from: (table: string) => { upsert: (data: Record<string, unknown>) => Promise<{ error: { error?: { message: string } } | null }> } })
          .from('reminder_settings')
          .upsert({
            owner_id: user.id,
            rent_reminder_schedule: settings.rent_reminder_schedule,
            default_channel: settings.default_channel,
            reminders_enabled: settings.reminders_enabled,
            renewal_reminders_enabled: settings.renewal_reminders_enabled,
            renewal_reminder_days: settings.renewal_reminder_days,
          });

        if (result2.error?.error) throw result2.error.error;
      } else if (result1.error?.error) {
        throw result1.error.error;
      }

      toast.success('Configuration sauvegardée');
    } catch (error: unknown) {
      console.error('Error saving settings:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateReminder = async () => {
    if (!user || !agencyId) return;

    if (!newReminder.contract_id) {
      toast.error('Veuillez sélectionner un contrat');
      return;
    }

    if (!newReminder.scheduled_date) {
      toast.error('Veuillez sélectionner une date');
      return;
    }

    try {
      setSaving(true);

      const contract = contracts.find((c) => c.id === newReminder.contract_id);

      const result = await (supabase as unknown as { from: (table: string) => { insert: (data: Record<string, unknown>) => Promise<{ error: { error?: { message: string } } | null }> } })
        .from('payment_reminders')
        .insert({
          agency_id: agencyId,
          contract_id: newReminder.contract_id,
          tenant_id: contract?.tenant_id,
          property_id: contract?.property_id,
          reminder_type: newReminder.reminder_type,
          schedule_offset: newReminder.schedule_offset,
          scheduled_date: new Date(newReminder.scheduled_date).toISOString(),
          channel: newReminder.channel,
          subject: newReminder.subject || `Rappel - ${contract?.properties?.title}`,
          message: newReminder.message || 'Rappel de votre échéance.',
          status: 'pending',
        });

      if (result.error?.error) throw result.error.error;

      toast.success('Rappel créé avec succès');
      setShowCreateModal(false);
      setNewReminder({
        contract_id: '',
        reminder_type: 'rent_due',
        schedule_offset: -3,
        channel: 'email',
        subject: '',
        message: '',
        scheduled_date: '',
      });
      if (agencyId) loadData(agencyId);
    } catch (error: unknown) {
      console.error('Error creating reminder:', error);
      toast.error('Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = () => {
    loadContracts();
    setShowCreateModal(true);
  };

  const loadExpiringLeases = async () => {
    if (!user || !agencyId) return;

    try {
      const { data: contracts } = await (supabase as unknown as {
        from: (table: string) => {
          select: (columns: string) => {
            eq: (field: string, value: string) => {
              gte: (field: string, value: string) => {
                order: (field: string, options: { ascending: boolean }) => Promise<{
                  data: Array<{
                    id: string;
                    property_id: string;
                    tenant_id: string;
                    end_date: string;
                    properties: { title: string; agency_id?: string };
                    tenant: { first_name: string };
                  }> | null;
                  error: unknown;
                }>;
              };
            };
          };
        };
      })
        .from('lease_contracts')
        .select('id, property_id, tenant_id, end_date, properties(title, agency_id), tenant:profiles(first_name)')
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString())
        .order('end_date', { ascending: true });

      // Filter by agency
      const agencyContracts = (contracts || []).filter((c) =>
        c.properties?.agency_id === agencyId
      );

      const expiring = agencyContracts
        .map((c) => {
          const daysUntilExpiry = Math.ceil(
            (new Date(c.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );
          return {
            contract_id: c.id,
            property_id: c.property_id,
            tenant_id: c.tenant_id,
            days_until_expiry: daysUntilExpiry,
            expiry_date: c.end_date,
            tenant: c.tenant,
            property: c.properties,
          };
        })
        .filter((l) => l.days_until_expiry <= 90);

      setExpiringLeases(expiring);
    } catch (error) {
      console.error('Error loading expiring leases:', error);
    }
  };

  const handleSendReminder = async (reminderId: string) => {
    try {
      await (supabase as unknown as { from: (table: string) => { update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: null }> } } })
        .from('payment_reminders')
        .update({ status: 'sent', sent_date: new Date().toISOString() })
        .eq('id', reminderId);

      toast.success('Rappel envoyé avec succès');
      if (agencyId) loadData(agencyId);
    } catch (error) {
      toast.error('Erreur lors de l\'envoi du rappel');
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rappel ?')) return;

    try {
      await (supabase as unknown as { from: (table: string) => { delete: () => { eq: (col: string, val: string) => Promise<{ error: null }> } } })
        .from('payment_reminders')
        .delete()
        .eq('id', reminderId);

      toast.success('Rappel supprimé');
      if (agencyId) loadData(agencyId);
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (!user) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Veuillez vous connecter</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#2C1810] rounded-2xl shadow-sm mb-8">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center">
              <Bell className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Rappels Automatisés</h1>
              <p className="text-[#E8D4C5]">Gérez les rappels de loyer et les renouvellements</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <StatCard icon={Bell} label="Total Rappels" value={stats.total} color="gray" />
          <StatCard icon={Send} label="Envoyés" value={stats.sent} color="blue" />
          <StatCard icon={CheckCircle} label="Ouverts" value={stats.opened} color="green" />
          <StatCard icon={Clock} label="En attente" value={stats.pending} color="orange" />
          <StatCard icon={TrendingUp} label="Taux d'ouverture" value={`${stats.total > 0 ? Math.round((stats.opened / stats.sent) * 100) : 0}%`} color="purple" />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm mb-6 p-2 border border-gray-200 inline-flex">
          <button
            onClick={() => setActiveTab('reminders')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'reminders'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Rappels
          </button>
          <button
            onClick={() => {
              setActiveTab('expiring');
              loadExpiringLeases();
            }}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'expiring'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Renouvellements
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Configuration
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'reminders' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Historique des rappels</h2>
                <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white bg-[#F16522] hover:bg-[#e55a1d] transition-colors">
                  <Plus className="w-4 h-4" />
                  Nouveau rappel
                </button>
              </div>
            </div>

            {reminders.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucun rappel</h3>
                <p className="text-gray-500 mb-6">Créez votre premier rappel automatique</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {reminders.map((reminder) => {
                  const typeConfig = REMINDER_TYPES.find((t) => t.value === reminder.reminder_type) || REMINDER_TYPES[4];
                  const TypeIcon = typeConfig!.icon;

                  return (
                    <div
                      key={reminder.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`p-3 rounded-lg ${typeConfig!.color} flex-shrink-0`}>
                          <TypeIcon className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900 truncate">{reminder.subject}</p>
                            <StatusBadge status={reminder.status} />
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{format(new Date(reminder.scheduled_date), 'dd MMM yyyy', { locale: fr })}</span>
                            {reminder.property && (
                              <>
                                <span>•</span>
                                <span>{reminder.property.title}</span>
                              </>
                            )}
                            {reminder.tenant && (
                              <>
                                <span>•</span>
                                <span>{reminder.tenant.first_name} {reminder.tenant.last_name}</span>
                              </>
                            )}
                          </div>
                          {reminder.opened && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-green-600">
                              <Eye className="w-3 h-3" />
                              Ouvert {reminder.opened_date ? format(new Date(reminder.opened_date), 'dd MMM HH:mm', { locale: fr }) : ''}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {reminder.status === 'pending' && (
                            <button
                              onClick={() => handleSendReminder(reminder.id)}
                              className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Envoyer maintenant"
                            >
                              <Send className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                          <button
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Voir détails"
                          >
                            <FileText className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteReminder(reminder.id)}
                            className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'expiring' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Contrats proches de l'expiration</h2>
              <p className="text-sm text-gray-500">Contrats qui se terminent dans les 90 prochains jours</p>
            </div>

            {expiringLeases.length === 0 ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucun contrat à renouveler</h3>
                <p className="text-gray-500">Tous vos contrats sont à jour</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {expiringLeases.map((lease) => (
                  <div
                    key={lease.contract_id}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        className={`p-3 rounded-lg flex-shrink-0 ${
                          lease.days_until_expiry <= 7
                            ? 'bg-red-50 text-red-600'
                            : lease.days_until_expiry <= 30
                            ? 'bg-orange-50 text-orange-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        <RefreshCw className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">{lease.property?.title || 'Bien non spécifié'}</p>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              lease.days_until_expiry <= 7
                                ? 'bg-red-100 text-red-700'
                                : lease.days_until_expiry <= 30
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            J-{lease.days_until_expiry}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          Expire le {format(new Date(lease.expiry_date), 'dd MMM yyyy', { locale: fr })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          className="px-4 py-2 rounded-lg font-semibold text-white bg-[#F16522] hover:bg-[#e55a1d] transition-colors text-sm"
                        >
                          Contacter
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Configuration des rappels</h2>
              <p className="text-sm text-gray-500">Personnalisez vos rappels automatiques</p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-3">Fréquence des rappels de loyer</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {SCHEDULE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        settings.rent_reminder_schedule.includes(option.value)
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={settings.rent_reminder_schedule.includes(option.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSettings({
                              ...settings,
                              rent_reminder_schedule: [...settings.rent_reminder_schedule, option.value],
                            });
                          } else {
                            setSettings({
                              ...settings,
                              rent_reminder_schedule: settings.rent_reminder_schedule.filter((v) => v !== option.value),
                            });
                          }
                        }}
                        className="rounded text-orange-500"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-3">Canaux de communication</h3>
                <div className="space-y-3">
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    settings.default_channel === 'email' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-500'
                  }`}>
                    <input
                      type="radio"
                      name="channel"
                      value="email"
                      checked={settings.default_channel === 'email'}
                      onChange={() => setSettings({ ...settings, default_channel: 'email' })}
                      className="text-orange-500"
                    />
                    <Mail className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Email</p>
                      <p className="text-xs text-gray-500">Notifications détaillées avec pièces jointes</p>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    settings.default_channel === 'sms' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-500'
                  }`}>
                    <input
                      type="radio"
                      name="channel"
                      value="sms"
                      checked={settings.default_channel === 'sms'}
                      onChange={() => setSettings({ ...settings, default_channel: 'sms' })}
                      className="text-orange-500"
                    />
                    <MessageSquare className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">SMS</p>
                      <p className="text-xs text-gray-500">Notifications rapides sur mobile</p>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    settings.default_channel === 'both' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-500'
                  }`}>
                    <input
                      type="radio"
                      name="channel"
                      value="both"
                      checked={settings.default_channel === 'both'}
                      onChange={() => setSettings({ ...settings, default_channel: 'both' })}
                      className="text-orange-500"
                    />
                    <Send className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Email + SMS</p>
                      <p className="text-xs text-gray-500">Maximum de visibilité</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="w-full py-3 rounded-xl font-semibold text-white bg-[#F16522] hover:bg-[#e55a1d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de création de rappel */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full w-fullxl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Nouveau rappel</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Sélectionner un contrat</label>
                {contracts.length === 0 ? (
                  <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-600">Aucun contrat actif trouvé</p>
                    <p className="text-sm text-gray-500 mt-1">Créez d'abord un contrat pour pouvoir créer des rappels</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2">
                    {contracts.map((contract) => (
                      <button
                        key={contract.id}
                        onClick={() => setNewReminder({ ...newReminder, contract_id: contract.id })}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          newReminder.contract_id === contract.id
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{contract.properties?.title || 'Bien sans titre'}</p>
                            <p className="text-sm text-gray-500 truncate">{contract.properties?.city || ''}</p>
                          </div>
                          {newReminder.contract_id === contract.id && (
                            <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0 ml-2" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">
                            {contract.tenant?.first_name} {contract.tenant?.last_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm mt-1">
                          <Wallet className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-gray-700">{contract.monthly_rent?.toLocaleString()} FCFA/mois</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type de rappel</label>
                  <select
                    value={newReminder.reminder_type}
                    onChange={(e) => setNewReminder({ ...newReminder, reminder_type: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-colors"
                  >
                    {REMINDER_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Canal d'envoi</label>
                  <select
                    value={newReminder.channel}
                    onChange={(e) => setNewReminder({ ...newReminder, channel: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-colors"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="both">Email + SMS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date et heure d'envoi</label>
                <input
                  type="datetime-local"
                  value={newReminder.scheduled_date}
                  onChange={(e) => setNewReminder({ ...newReminder, scheduled_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sujet (optionnel)</label>
                <input
                  type="text"
                  value={newReminder.subject}
                  onChange={(e) => setNewReminder({ ...newReminder, subject: e.target.value })}
                  placeholder="Sujet du rappel"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={newReminder.message}
                  onChange={(e) => setNewReminder({ ...newReminder, message: e.target.value })}
                  placeholder="Message du rappel..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-colors resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Variables disponibles: {"{tenant}"}, {"{propriete}"}, {"{montant}"}, {"{date}"}, {"{mois}"}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 rounded-lg font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateReminder}
                disabled={saving || !newReminder.contract_id}
                className="flex-1 py-3 rounded-lg font-semibold text-white bg-[#F16522] hover:bg-[#e55a1d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Création...' : 'Créer le rappel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
