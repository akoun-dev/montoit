import { ReactNode } from 'react';
import { Search, X, Filter as FilterIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

export interface FilterGroup {
  id: string;
  label: string;
  type: 'radio' | 'checkbox';
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}

export interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  groups?: FilterGroup[];
  activeFiltersCount?: number;
  onClearFilters?: () => void;
  className?: string;
}

export function FilterBar({
  searchPlaceholder = 'Rechercher...',
  searchValue = '',
  onSearchChange,
  groups,
  activeFiltersCount = 0,
  onClearFilters,
  className = '',
}: FilterBarProps) {
  const hasFilters = groups && groups.length > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Bar */}
      {onSearchChange && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Effacer la recherche"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      )}

      {/* Filter Groups */}
      {hasFilters && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {groups?.map((group) => (
              <div key={group.id} className="flex flex-wrap gap-2">
                {group.options.map((option) => {
                  const isSelected = group.selected.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        const newSelection = isSelected
                          ? group.selected.filter((v) => v !== option.value)
                          : group.type === 'radio'
                          ? [option.value]
                          : [...group.selected, option.value];
                        group.onChange(newSelection);
                      }}
                      className={cn(
                        'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
                        isSelected
                          ? 'bg-primary-500 text-white shadow-sm'
                          : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      {option.icon && <span className={isSelected ? 'text-white' : 'text-gray-500'}>{option.icon}</span>}
                      <span>{option.label}</span>
                      {option.count !== undefined && (
                        <span className={cn(
                          'text-xs px-1.5 py-0.5 rounded-full',
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-100 text-gray-500'
                        )}>
                          {option.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Clear Filters */}
          {activeFiltersCount > 0 && onClearFilters && (
            <button
              onClick={onClearFilters}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
              Effacer ({activeFiltersCount})
            </button>
          )}
        </div>
      )}

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && hasFilters && (
        <div className="flex flex-wrap gap-2">
          {groups?.map((group) =>
            group.selected
              .map((value) => {
                const option = group.options.find((o) => o.value === value);
                return option ? (
                  <span
                    key={`${group.id}-${value}`}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm font-medium"
                  >
                    <FilterIcon className="h-3 w-3" />
                    {option.label}
                    <button
                      onClick={() => {
                        const newSelection = group.selected.filter((v) => v !== value);
                        group.onChange(newSelection);
                      }}
                      className="ml-1 hover:text-primary-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ) : null;
              })
              .filter(Boolean)
          )}
        </div>
      )}
    </div>
  );
}
