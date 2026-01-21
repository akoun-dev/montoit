import { useState, ChangeEvent } from 'react';
import { Input } from '@/shared/ui';
import { Switch } from '@/shared/ui/switch';
import { Button } from '@/shared/ui';
import { Textarea } from '@/shared/ui/textarea';
import { Check, X, Edit2, Loader2 } from 'lucide-react';
import type { SystemSetting } from '../hooks/useSystemSettings';
import type { Json } from '@/integrations/supabase/types';

interface SettingRowProps {
  setting: SystemSetting;
  onSave: (value: Json) => Promise<void>;
  type?: 'number' | 'text' | 'boolean' | 'textarea';
  valueKey?: string;
}

export function SettingRow({
  setting,
  onSave,
  type = 'number',
  valueKey = 'value',
}: SettingRowProps) {
  const settingObj = setting.setting_value as Record<string, unknown> | null;
  const currentValue = settingObj?.[valueKey];
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<string | number | boolean>(
    currentValue as string | number | boolean
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ ...settingObj, [valueKey]: value } as Json);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(currentValue as string | number | boolean);
    setIsEditing(false);
  };

  const handleToggle = async (checked: boolean) => {
    setIsSaving(true);
    try {
      await onSave({ ...settingObj, [valueKey]: checked } as Json);
      setValue(checked);
    } finally {
      setIsSaving(false);
    }
  };

  const getLabel = (key: string) => {
    const labels: Record<string, string> = {
      maintenance_mode: 'Mode maintenance',
      session_duration_hours: 'Durée de session (heures)',
      otp_expiry_minutes: 'Expiration OTP (minutes)',
      otp_max_attempts: 'Tentatives OTP max',
      rate_limit_seconds: 'Rate limiting (secondes)',
      max_file_size_mb: 'Taille fichier max (Mo)',
      max_photos_per_property: 'Photos par annonce max',
      max_message_chars: 'Caractères message max',
      default_currency: 'Devise par défaut',
      default_timezone: 'Fuseau horaire',
      default_language: 'Langue par défaut',
    };
    return labels[key] || key;
  };

  return (
    <div className="flex items-center justify-between py-4 border-b border-neutral-100 last:border-0">
      <div className="flex-1">
        <h4 className="font-medium text-neutral-900">{getLabel(setting.setting_key)}</h4>
        <p className="text-sm text-neutral-500">{setting.description}</p>
      </div>

      <div className="flex items-center gap-2 ml-4">
        {type === 'boolean' ? (
          <Switch checked={value as boolean} onCheckedChange={handleToggle} disabled={isSaving} />
        ) : isEditing ? (
          <>
            {type === 'textarea' ? (
              <Textarea
                value={value as string}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value)}
                className="w-64 h-20"
              />
            ) : (
              <Input
                type={type}
                value={value as string | number}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setValue(type === 'number' ? Number(e.target.value) : e.target.value)
                }
                className="w-32"
              />
            )}
            <Button size="small" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </Button>
            <Button size="small" variant="ghost" onClick={handleCancel} disabled={isSaving}>
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <span className="font-mono text-neutral-700 bg-neutral-100 px-3 py-1 rounded">
              {String(currentValue ?? '')}
            </span>
            <Button size="small" variant="ghost" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
