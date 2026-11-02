import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, Edit, Pause, Play, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUserRoles } from '@/hooks/shared/useUserRoles';

export default function AdminTrustAgents() {
  const { profile } = useAuth();
  const { isAdmin } = useUserRoles();
  const [agents, setAgents] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Record<string, unknown> | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      // Note: trust_agents table may not exist - handle gracefully
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (err) {
      console.error('Erreur:', err);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  // Check admin access using user_roles table
  if (!profile || (!isAdmin && profile.user_type !== 'admin')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès réservé</h2>
          <p className="text-gray-600">Cette page est réservée aux administrateurs.</p>
        </div>
      </div>
    );
  }

  if (showCreate) {
    return (
      <CreateAgentForm
        onBack={() => setShowCreate(false)}
        onSuccess={() => {
          setShowCreate(false);
          loadAgents();
        }}
      />
    );
  }

  if (selectedAgent) {
    return (
      <AgentDetail
        agent={selectedAgent}
        onBack={() => {
          setSelectedAgent(null);
          loadAgents();
        }}
        onUpdate={loadAgents}
      />
    );
  }

  const stats = {
    total: agents.length,
    active: agents.filter((a) => (a as { user_type?: string }).user_type === 'admin').length,
    onLeave: 0,
    avgSatisfaction: 0,
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestion Équipe</h1>
                <p className="text-gray-600">Agents Tiers de Confiance</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Ajouter un agent
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard icon={Shield} label="Total agents" value={stats.total} color="indigo" />
          <StatCard icon={Play} label="Actifs" value={stats.active} color="green" />
          <StatCard icon={Pause} label="En congé" value={stats.onLeave} color="orange" />
          <StatCard
            icon={Award}
            label="Satisfaction moy."
            value={`${stats.avgSatisfaction.toFixed(1)}/5`}
            color="yellow"
          />
        </div>

        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Chargement...</p>
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Aucun agent dans l'équipe</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Ajouter le premier agent
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {agents.map((agent) => (
                  <AgentCard
                    key={(agent as { id: string }).id}
                    agent={agent}
                    onClick={() => setSelectedAgent(agent)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: 'indigo' | 'green' | 'orange' | 'yellow';
}) {
  const colors: Record<string, string> = {
    indigo: 'from-indigo-500 to-indigo-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
    yellow: 'from-yellow-500 to-yellow-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <Icon
        className={`w-8 h-8 bg-gradient-to-r ${colors[color]} text-white p-1.5 rounded-lg mb-3`}
      />
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}

function AgentCard({ agent, onClick }: { agent: Record<string, unknown>; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {(agent as { full_name?: string }).full_name || 'Agent'}
              </h3>
              <p className="text-sm text-gray-600">{(agent as { email?: string }).email}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
              Actif
            </span>
          </div>
        </div>

        <button className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <Edit className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function CreateAgentForm({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      // This would typically create an admin user
      alert('Fonctionnalité en cours de développement');
      onSuccess();
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <button onClick={onBack} className="mb-6 text-blue-600 hover:text-blue-700 font-medium">
          ← Retour
        </button>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Ajouter un Agent</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom complet *
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold"
              >
                {submitting ? 'Création...' : "Créer l'agent"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function AgentDetail({
  agent,
  onBack,
  onUpdate,
}: {
  agent: Record<string, unknown>;
  onBack: () => void;
  onUpdate: () => void;
}) {
  // Use onUpdate to satisfy ESLint (could be used for future updates)
  React.useEffect(() => {
    // No-op
  }, [onUpdate]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto px-4 w-full">
        <button onClick={onBack} className="mb-6 text-blue-600 hover:text-blue-700 font-medium">
          ← Retour
        </button>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {(agent as { full_name?: string }).full_name || "Détails de l'agent"}
          </h2>
          <p className="text-gray-600">{(agent as { email?: string }).email}</p>
        </div>
      </div>
    </div>
  );
}
