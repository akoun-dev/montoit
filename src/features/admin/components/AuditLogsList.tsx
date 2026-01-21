import { Clock, Shield, UserPlus, UserMinus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_email: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface AuditLogsListProps {
  logs: AuditLog[];
  loading?: boolean;
}

const getActionIcon = (action: string) => {
  if (action.includes('ASSIGNED')) return UserPlus;
  if (action.includes('REVOKED')) return UserMinus;
  return Shield;
};

const getActionColor = (action: string) => {
  if (action.includes('ASSIGNED')) return 'green';
  if (action.includes('REVOKED')) return 'red';
  return 'blue';
};

export function AuditLogsList({ logs, loading }: AuditLogsListProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-32 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Aucune action récente</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Historique des Actions
        </h3>
      </div>
      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {logs.map((log) => {
          const Icon = getActionIcon(log.action);
          const color = getActionColor(log.action);
          const details = log.details as {
            role?: string;
            user_email?: string;
            user_name?: string;
          } | null;

          return (
            <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full bg-${color}-100`}>
                  <Icon className={`h-4 w-4 text-${color}-600`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">
                      {log.action === 'ROLE_ASSIGNED' ? 'Rôle attribué' : 'Rôle révoqué'}
                    </span>
                    {details?.role && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${color}-100 text-${color}-700`}
                      >
                        {details.role}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {details?.user_name || details?.user_email || log.entity_id}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    <span>Par {log.user_email || 'Système'}</span>
                    <span>•</span>
                    <span>
                      {format(new Date(log.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AuditLogsList;
