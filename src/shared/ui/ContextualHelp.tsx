import { useState } from 'react';
import { HelpCircle, X, Lightbulb, AlertCircle, CheckCircle } from 'lucide-react';

interface HelpTip {
  title: string;
  description: string;
  type: 'info' | 'tip' | 'warning' | 'success';
}

interface ContextualHelpProps {
  tips: HelpTip[];
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export default function ContextualHelp({
  tips,
  position = 'right',
  className = '',
}: ContextualHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = (type: HelpTip['type']) => {
    switch (type) {
      case 'tip':
        return <Lightbulb className="h-5 w-5 text-amber-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <HelpCircle className="h-5 w-5 text-cyan-500" />;
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full mb-2 left-1/2 transform -translate-x-1/2';
      case 'bottom':
        return 'top-full mt-2 left-1/2 transform -translate-x-1/2';
      case 'left':
        return 'right-full mr-2 top-1/2 transform -translate-y-1/2';
      case 'right':
        return 'left-full ml-2 top-1/2 transform -translate-y-1/2';
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors group"
        aria-label="Aide contextuelle"
      >
        <HelpCircle className="h-5 w-5 text-gray-400 group-hover:text-terracotta-500 transition-colors" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className={`absolute z-50 w-80 bg-white rounded-2xl shadow-2xl border-2 border-gray-100 ${getPositionClasses()}`}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-terracotta-50 to-coral-50">
              <div className="flex items-center space-x-2">
                <HelpCircle className="h-5 w-5 text-terracotta-600" />
                <h3 className="font-bold text-gray-900">Aide</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-white transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {tips.map((tip, index) => (
                <div
                  key={index}
                  className="p-3 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-100"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">{getIcon(tip.type)}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-sm mb-1">{tip.title}</h4>
                      <p className="text-gray-600 text-xs leading-relaxed">{tip.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
