import { MessageSquare, Shield } from 'lucide-react';

export function EmptyConversation() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#2C1810] p-8 relative z-10">
      {/* Glow effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#F16522] rounded-full blur-[120px] opacity-10 animate-pulse" />
      </div>

      {/* Icon */}
      <div className="relative mb-8">
        <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl">
          <MessageSquare className="w-10 h-10 text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-3">Vos discussions</h2>

      <p className="text-[#E8D4C5]/70 text-center max-w-sm leading-relaxed mb-8">
        Sélectionnez une conversation pour échanger avec les propriétaires, les agences ou notre
        support.
      </p>

      {/* Security notice */}
      <div className="flex items-center gap-2 text-[#E8D4C5]/40 text-xs font-medium uppercase tracking-widest">
        <Shield className="w-3 h-3" />
        <span>Messagerie Sécurisée</span>
      </div>
    </div>
  );
}
