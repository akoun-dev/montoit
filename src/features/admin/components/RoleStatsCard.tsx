import { Shield, UserCheck, Eye, Users } from 'lucide-react';

interface RoleStats {
  admin: number;
  trust_agent: number;
  moderator: number;
  total: number;
}

interface RoleStatsCardProps {
  stats: RoleStats;
  loading?: boolean;
}

const roleConfig = [
  {
    key: 'admin' as const,
    label: 'Admins',
    icon: Shield,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    iconColor: 'text-red-600',
  },
  {
    key: 'trust_agent' as const,
    label: 'Trust Agents',
    icon: UserCheck,
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    iconColor: 'text-purple-600',
  },
  {
    key: 'moderator' as const,
    label: 'Modérateurs',
    icon: Eye,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-600',
  },
  {
    key: 'total' as const,
    label: 'Total Utilisateurs',
    icon: Users,
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    iconColor: 'text-gray-600',
  },
];

export function RoleStatsCard({ stats, loading }: RoleStatsCardProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
            <div className="h-10 w-10 bg-gray-200 rounded-lg mb-3" />
            <div className="h-8 w-16 bg-gray-200 rounded mb-1" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {roleConfig.map(({ key, label, icon: Icon, bgColor, textColor, iconColor }) => (
        <div
          key={key}
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className={`inline-flex p-2.5 rounded-lg ${bgColor} mb-3`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats[key]}</p>
          <p className={`text-sm ${textColor}`}>{label}</p>
        </div>
      ))}
    </div>
  );
}

export default RoleStatsCard;
