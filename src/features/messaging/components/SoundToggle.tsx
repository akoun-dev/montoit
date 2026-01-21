import { Volume2, VolumeX } from 'lucide-react';
import { useMessageSettingsStore } from '@/store/messageSettingsStore';

interface SoundToggleProps {
  className?: string;
}

export function SoundToggle({ className }: SoundToggleProps) {
  const { soundEnabled, toggleSound } = useMessageSettingsStore();

  return (
    <button
      onClick={toggleSound}
      className={`p-2 rounded-full transition-colors ${className ?? ''} ${
        soundEnabled ? 'text-[#25D366] hover:bg-[#25D366]/10' : 'text-[#8696A0] hover:bg-[#374248]'
      }`}
      title={soundEnabled ? 'Désactiver les sons' : 'Activer les sons'}
    >
      {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
    </button>
  );
}
