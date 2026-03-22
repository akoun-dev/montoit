/**
 * Page de gestion des créneaux de visite pour les propriétaires
 *
 * Permet aux propriétaires de définir leurs disponibilités pour les visites
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  CalendarDays,
  Video,
  MapPin,
  Settings,
  Bell,
  BarChart3,
} from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { visitSlotsService, VisitSlot, CreateSlotData, RecurringSlotData } from '@/services/visits/visitSlots.service';
import { VisitCalendar } from '@/shared/ui/VisitCalendar';

// Types
type TimeSlot = {
  time: string;
  label: string;
};

const TIME_SLOTS: TimeSlot[] = [
  { time: '09:00', label: '09:00' },
  { time: '10:00', label: '10:00' },
  { time: '11:00', label: '11:00' },
  { time: '14:00', label: '14:00' },
  { time: '15:00', label: '15:00' },
  { time: '16:00', label: '16:00' },
  { time: '17:00', label: '17:00' },
  { time: '18:00', label: '18:00' },
];

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
];

export default function VisitSlotsManagementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<VisitSlot[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    booked: 0,
    blocked: 0,
  });
  const [properties, setProperties] = useState<any[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState<'calendar' | 'list' | 'recurring' | 'stats'>('calendar');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<VisitSlot | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Form state
  const [slotForm, setSlotForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '10:00',
    endTime: '11:00',
    visitType: 'in_person' as 'in_person' | 'virtual' | 'video_call',
    maxAttendees: 5,
    notes: '',
  });

  // Recurring form state
  const [recurringForm, setRecurringForm] = useState({
    propertyId: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    startTime: '10:00',
    endTime: '11:00',
    daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
    visitType: 'in_person' as 'in_person' | 'virtual' | 'video_call',
    maxAttendees: 5,
  });

  // Load data
  useEffect(() => {
    if (user) {
      loadData();
      loadProperties();
    }
  }, [user, selectedPropertyId, selectedDate]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const ownerId = user.id;
      const [slotsData, statsData] = await Promise.all([
        visitSlotsService.getOwnerSlots(ownerId, undefined, selectedPropertyId || undefined),
        visitSlotsService.getSlotStats(ownerId, selectedPropertyId || undefined),
      ]);

      // Filter slots by date if selected
      let filteredSlots = slotsData;
      if (selectedDate) {
        const startDate = new Date(selectedDate);
        const endDate = addDays(startDate, 30); // Next 30 days
        filteredSlots = slotsData.filter(slot => {
          const slotDate = new Date(slot.start_time);
          return slotDate >= startDate && slotDate <= endDate;
        });
      }

      setSlots(filteredSlots);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading slots:', error);
      toast.error('Erreur lors du chargement des créneaux');
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, city')
        .eq('owner_id', user.id)
        .eq('status', 'available')
        .order('title');

      if (error) throw error;

      setProperties(data || []);
      if (data && data.length > 0 && !selectedPropertyId) {
        setSelectedPropertyId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading properties:', error);
    }
  };

  // Create single slot
  const handleCreateSlot = async () => {
    if (!user || !selectedPropertyId) {
      toast.error('Veuillez sélectionner une propriété');
      return;
    }

    const slotData: CreateSlotData = {
      property_id: selectedPropertyId,
      start_time: `${slotForm.date}T${slotForm.startTime}:00`,
      end_time: `${slotForm.date}T${slotForm.endTime}:00`,
      visit_type: slotForm.visitType,
      max_attendees: slotForm.maxAttendees,
      notes: slotForm.notes || undefined,
    };

    setSaving(true);
    try {
      await visitSlotsService.createVisitSlot(user.id, slotData);
      toast.success('Créneau créé avec succès');
      setShowCreateModal(false);
      setSlotForm({
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '10:00',
        endTime: '11:00',
        visitType: 'in_person',
        maxAttendees: 5,
        notes: '',
      });
      loadData();
    } catch (error) {
      console.error('Error creating slot:', error);
      toast.error('Erreur lors de la création du créneau');
    } finally {
      setSaving(false);
    }
  };

  // Create recurring slots
  const handleCreateRecurring = async () => {
    if (!user || !recurringForm.propertyId) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (recurringForm.daysOfWeek.length === 0) {
      toast.error('Veuillez sélectionner au moins un jour');
      return;
    }

    const recurringData: RecurringSlotData = {
      property_id: recurringForm.propertyId,
      start_date: recurringForm.startDate,
      end_date: recurringForm.endDate,
      start_time: recurringForm.startTime,
      end_time: recurringForm.endTime,
      days_of_week: recurringForm.daysOfWeek,
      visit_type: recurringForm.visitType,
      max_attendees: recurringForm.maxAttendees,
    };

    setSaving(true);
    try {
      const result = await visitSlotsService.createRecurringSlots(user.id, recurringData);
      toast.success(`${result.slots_created} créneaux créés avec succès`);
      setShowRecurringModal(false);
      loadData();
    } catch (error) {
      console.error('Error creating recurring slots:', error);
      toast.error('Erreur lors de la création des créneaux');
    } finally {
      setSaving(false);
    }
  };

  // Delete slot
  const handleDeleteSlot = async (slotId: string) => {
    if (!user) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce créneau ?')) return;

    try {
      await visitSlotsService.deleteVisitSlot(slotId, user.id);
      toast.success('Créneau supprimé');
      loadData();
    } catch (error) {
      console.error('Error deleting slot:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Convert slots to calendar format
  const calendarSlots = useMemo(() => {
    return slots
      .filter(slot => slot.status !== 'cancelled')
      .map(slot => ({
        id: slot.id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_booked: slot.status === 'booked',
        visit_type: slot.visit_type === 'video_call' ? 'virtual' : slot.visit_type,
      }));
  }, [slots]);

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
              <Calendar className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Gestion des Créneaux de Visite</h1>
              <p className="text-[#E8D4C5]">Définissez vos disponibilités pour les visites</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Property Selector */}
        {properties.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Propriété
            </label>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
            >
              {properties.map((prop) => (
                <option key={prop.id} value={prop.id}>
                  {prop.title} - {prop.city}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">Total créneaux</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.available}</p>
                <p className="text-xs text-gray-500">Disponibles</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.booked}</p>
                <p className="text-xs text-gray-500">Réservés</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.blocked}</p>
                <p className="text-xs text-gray-500">Bloqués</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm mb-6 p-2 border border-gray-200 inline-flex">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'calendar'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CalendarDays className="w-4 h-4 inline mr-2" />
            Calendrier
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'list'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <List className="w-4 h-4 inline mr-2" />
            Liste
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'recurring'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CalendarDays className="w-4 h-4 inline mr-2" />
            Récurrents
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#F16522] hover:bg-[#e55a1d] text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Créer un créneau
          </button>
          <button
            onClick={() => setShowRecurringModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#2C1810] hover:bg-[#3D2518] text-white rounded-lg font-medium transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
            Créneaux récurrents
          </button>
        </div>

        {/* Calendar View */}
        {activeTab === 'calendar' && (
          <VisitCalendar
            slots={calendarSlots}
            selectedSlot={null}
            onSelectSlot={() => {}}
            loading={loading}
          />
        )}

        {/* List View */}
        {activeTab === 'list' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Tous les créneaux</h2>
            </div>

            {slots.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucun créneau</h3>
                <p className="text-gray-500 mb-6">Créez vos premiers créneaux de disponibilité</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {slots.map((slot) => {
                  const startDate = new Date(slot.start_time);
                  const endDate = new Date(slot.end_time);

                  return (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          slot.status === 'available' ? 'bg-green-50' :
                          slot.status === 'booked' ? 'bg-orange-50' :
                          'bg-red-50'
                        }`}>
                          {slot.visit_type === 'virtual' || slot.visit_type === 'video_call' ? (
                            <Video className={`w-5 h-5 ${
                              slot.status === 'available' ? 'text-green-600' :
                              slot.status === 'booked' ? 'text-orange-600' :
                              'text-red-600'
                            }`} />
                          ) : (
                            <MapPin className={`w-5 h-5 ${
                              slot.status === 'available' ? 'text-green-600' :
                              slot.status === 'booked' ? 'text-orange-600' :
                              'text-red-600'
                            }`} />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">
                              {format(startDate, 'dd MMM yyyy', { locale: fr })}
                            </p>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                slot.status === 'available'
                                  ? 'bg-green-100 text-green-700'
                                  : slot.status === 'booked'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {slot.status === 'available' ? 'Disponible' :
                               slot.status === 'booked' ? 'Réservé' : 'Bloqué'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                            {slot.current_attendees > 0 && ` (${slot.current_attendees}/${slot.max_attendees})`}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Recurring View */}
        {activeTab === 'recurring' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <CalendarDays className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Créneaux récurrents</h3>
              <p className="text-gray-500 mb-6">Créez des plages horaires récurrentes pour vos visites</p>
              <button
                onClick={() => setShowRecurringModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#F16522] hover:bg-[#e55a1d] text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Créer une récurrence
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Slot Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Nouveau créneau</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={slotForm.date}
                  onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Début
                  </label>
                  <select
                    value={slotForm.startTime}
                    onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  >
                    {TIME_SLOTS.map(slot => (
                      <option key={slot.time} value={slot.time}>{slot.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fin
                  </label>
                  <select
                    value={slotForm.endTime}
                    onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  >
                    {TIME_SLOTS.map(slot => (
                      <option key={slot.time} value={slot.time}>{slot.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de visite
                </label>
                <select
                  value={slotForm.visitType}
                  onChange={(e) => setSlotForm({ ...slotForm, visitType: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                >
                  <option value="in_person">Sur place</option>
                  <option value="virtual">Visite virtuelle</option>
                  <option value="video_call">Viséoconférence</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre maximum de visiteurs
                </label>
                <input
                  type="number"
                  value={slotForm.maxAttendees}
                  onChange={(e) => setSlotForm({ ...slotForm, maxAttendees: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={10}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                />
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
                onClick={handleCreateSlot}
                disabled={saving}
                className="flex-1 py-3 rounded-lg font-semibold text-white bg-[#F16522] hover:bg-[#e55a1d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Recurring Modal */}
      {showRecurringModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Créneaux récurrents</h2>
                <button
                  onClick={() => setShowRecurringModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={recurringForm.startDate}
                    onChange={(e) => setRecurringForm({ ...recurringForm, startDate: e.target.value })}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={recurringForm.endDate}
                    onChange={(e) => setRecurringForm({ ...recurringForm, endDate: e.target.value })}
                    min={recurringForm.startDate}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Heure de début
                  </label>
                  <select
                    value={recurringForm.startTime}
                    onChange={(e) => setRecurringForm({ ...recurringForm, startTime: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  >
                    {TIME_SLOTS.map(slot => (
                      <option key={slot.time} value={slot.time}>{slot.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Heure de fin
                  </label>
                  <select
                    value={recurringForm.endTime}
                    onChange={(e) => setRecurringForm({ ...recurringForm, endTime: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  >
                    {TIME_SLOTS.map(slot => (
                      <option key={slot.time} value={slot.time}>{slot.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jours de la semaine
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <label
                      key={day.value}
                      className={`flex items-center justify-center px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                        recurringForm.daysOfWeek.includes(day.value)
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={recurringForm.daysOfWeek.includes(day.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setRecurringForm({
                              ...recurringForm,
                              daysOfWeek: [...recurringForm.daysOfWeek, day.value],
                            });
                          } else {
                            setRecurringForm({
                              ...recurringForm,
                              daysOfWeek: recurringForm.daysOfWeek.filter(d => d !== day.value),
                            });
                          }
                        }}
                        className="sr-only"
                      />
                      <span className="text-sm">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de visite
                </label>
                <select
                  value={recurringForm.visitType}
                  onChange={(e) => setRecurringForm({ ...recurringForm, visitType: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                >
                  <option value="in_person">Sur place</option>
                  <option value="virtual">Visite virtuelle</option>
                  <option value="video_call">Viséoconférence</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowRecurringModal(false)}
                className="flex-1 py-3 rounded-lg font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateRecurring}
                disabled={saving}
                className="flex-1 py-3 rounded-lg font-semibold text-white bg-[#F16522] hover:bg-[#e55a1d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Création...' : 'Créer les créneaux'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
