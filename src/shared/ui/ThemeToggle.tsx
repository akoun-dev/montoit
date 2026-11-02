import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useState } from 'react';

export default function ThemeToggle() {
  const { theme, actualTheme, setTheme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);

  const themes = [
    { value: 'light' as const, label: 'Clair', icon: Sun },
    { value: 'dark' as const, label: 'Sombre', icon: Moon },
    { value: 'system' as const, label: 'Système', icon: Monitor },
  ];

  const currentThemeIcon = themes.find((t) => t.value === theme)?.icon || Sun;
  const Icon = currentThemeIcon;

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        onBlur={() => setTimeout(() => setShowMenu(false), 200)}
        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Changer le thème"
      >
        <Icon
          className={`h-5 w-5 ${actualTheme === 'dark' ? 'text-yellow-400' : 'text-gray-700'}`}
        />
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 animate-scale-in">
          {themes.map((themeOption) => {
            const ThemeIcon = themeOption.icon;
            const isActive = theme === themeOption.value;

            return (
              <button
                key={themeOption.value}
                onClick={() => {
                  setTheme(themeOption.value);
                  setShowMenu(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <ThemeIcon className="h-4 w-4" />
                <span>{themeOption.label}</span>
                {isActive && <span className="ml-auto text-blue-600 dark:text-blue-400">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Version compacte pour mobile
export function CompactThemeToggle() {
  const { toggleTheme, actualTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 transform active:scale-95"
      aria-label="Changer le thème"
    >
      {actualTheme === 'dark' ? (
        <Sun className="h-5 w-5 text-yellow-400" />
      ) : (
        <Moon className="h-5 w-5 text-gray-700" />
      )}
    </button>
  );
}
