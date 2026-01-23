import { Clock, X, AlertCircle, Calendar, CreditCard, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PaymentAlert {
  id: string;
  property_id: string;
  property_title: string;
  amount: number;
  due_date: string;
  daysUntilDue: number;
  isOverdue: boolean;
}

interface PaymentAlertsBannerProps {
  alerts: PaymentAlert[];
  onDismiss: (alertId: string) => void;
  onPayNow?: (propertyId: string, amount: number, alertId: string) => void;
}

export default function PaymentAlertsBanner({ alerts, onDismiss, onPayNow }: PaymentAlertsBannerProps) {
  if (alerts.length === 0) return null;

  const getAlertConfig = (alert: PaymentAlert) => {
    if (alert.isOverdue) {
      return {
        bgColor: 'bg-red-50 border-red-200',
        icon: XCircle,
        iconColor: 'text-red-600',
        textColor: 'text-red-700',
        badgeColor: 'bg-red-100 text-red-700',
      };
    }

    if (alert.daysUntilDue === 1) {
      return {
        bgColor: 'bg-orange-50 border-orange-200',
        icon: AlertCircle,
        iconColor: 'text-orange-600',
        textColor: 'text-orange-700',
        badgeColor: 'bg-orange-100 text-orange-700',
      };
    }

    return {
      bgColor: 'bg-amber-50 border-amber-200',
      icon: Clock,
      iconColor: 'text-amber-600',
      textColor: 'text-amber-700',
      badgeColor: 'bg-amber-100 text-amber-700',
    };
  };

  const getUrgencyLabel = (alert: PaymentAlert) => {
    if (alert.isOverdue) return 'En retard';
    if (alert.daysUntilDue === 1) return 'Dernier jour !';
    if (alert.daysUntilDue === 3) return 'Dans 3 jours';
    return `Dans ${alert.daysUntilDue} jours`;
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const config = getAlertConfig(alert);
        const Icon = config.icon;

        return (
          <div
            key={alert.id}
            className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${config.bgColor}`}
          >
            <div className={`p-2 rounded-full ${config.badgeColor}`}>
              <Icon className={`h-5 w-5 ${config.iconColor}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className={`font-semibold ${config.textColor}`}>
                  {getUrgencyLabel(alert)}
                </p>
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-sm font-medium text-[#2C1810] mb-1">
                {alert.property_title}
              </p>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(alert.due_date), 'd MMMM yyyy', { locale: fr })}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[#F16522] font-semibold">
                  <CreditCard className="h-4 w-4" />
                  <span>{alert.amount.toLocaleString()} FCFA</span>
                </div>
              </div>

              {onPayNow && (
                <button
                  onClick={() => onPayNow(alert.property_id, alert.amount, alert.id)}
                  className="mt-2 text-sm font-medium text-[#F16522] hover:underline flex items-center gap-1"
                >
                  Payer maintenant →
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
