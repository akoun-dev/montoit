import { Shield, Settings, User, Clock } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';

interface TrustAgentHeaderProps {
  title: string;
  subtitle?: string;
  showStatus?: boolean;
  showSettings?: boolean;
}

export default function TrustAgentHeader({
  title,
  subtitle = 'Agent tiers de confiance certifié',
  showStatus = true,
  showSettings = true,
}: TrustAgentHeaderProps) {
  const { profile } = useAuth();

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <Shield className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              <div className="flex items-center gap-3">
                <p className="text-gray-600">{subtitle}</p>
                {showStatus && (
                  <>
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-sm text-green-700 font-medium">En ligne</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {showSettings && (
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            )}

            <div className="text-right">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {profile?.full_name || 'Agent'}
                  </p>
                  <p className="text-xs text-gray-600">Agent Certifié Niv. 3</p>
                </div>
              </div>

              {showStatus && (
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">Dernière activité: Maintenant</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
