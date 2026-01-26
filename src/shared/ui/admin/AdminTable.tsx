/**
 * AdminTable - Tableau admin réutilisable avec actions et pagination
 */

import { useState } from 'react';
import { ChevronLeft, ChevronRight, MoreVertical, Search, SlidersHorizontal } from 'lucide-react';
import { ColumnConfig, SortConfig, PaginatedResult } from '@/types/admin';

export interface AdminTableProps<T = any> {
  columns: ColumnConfig[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  rowKey?: string | ((record: T) => string);
  onRowClick?: (record: T) => void;
  sortable?: boolean;
  onSort?: (sort: SortConfig) => void;
  pagination?: PaginatedResult<T>;
  onPageChange?: (page: number) => void;
  rowActions?: Array<{
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    onClick: (record: T) => void;
    danger?: boolean;
    disabled?: (record: T) => boolean;
  }>;
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  className?: string;
  showHeaderActions?: boolean;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  onFilter?: () => void;
}

export function AdminTable<T = any>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Aucune donnée disponible',
  rowKey = 'id',
  onRowClick,
  sortable = true,
  onSort,
  pagination,
  onPageChange,
  rowActions,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  className = '',
  showHeaderActions = false,
  onSearch,
  searchPlaceholder = 'Rechercher...',
  onFilter,
}: AdminTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return (record as any)[rowKey] || String(index);
  };

  const handleSort = (column: ColumnConfig) => {
    if (!sortable || !column.sortable || !onSort) return;

    let newSort: SortConfig;
    if (sortConfig?.key === column.key) {
      if (sortConfig.direction === 'asc') {
        newSort = { key: column.key, direction: 'desc' };
      } else {
        setSortConfig(null);
        return;
      }
    } else {
      newSort = { key: column.key, direction: 'asc' };
    }

    setSortConfig(newSort);
    onSort(newSort);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange(data.map((record, index) => getRowKey(record, index)));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (key: string, checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange([...selectedKeys, key]);
    } else {
      onSelectionChange(selectedKeys.filter((k) => k !== key));
    }
  };

  const isAllSelected = data.length > 0 && selectedKeys.length === data.length;
  const isIndeterminate = selectedKeys.length > 0 && selectedKeys.length < data.length;

  const getSortIcon = (column: ColumnConfig) => {
    if (sortConfig?.key !== column.key) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <div className={`bg-white rounded-2xl border border-[#EFEBE9] overflow-hidden ${className}`}>
      {/* Header Actions */}
      {showHeaderActions && (onSearch || onFilter) && (
        <div className="p-4 border-b border-[#EFEBE9] flex flex-col sm:flex-row items-center gap-3">
          {onSearch && (
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B5A4E]" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522]"
              />
            </div>
          )}
          {onFilter && (
            <button
              onClick={onFilter}
              className="flex items-center gap-2 px-4 py-2 border border-[#EFEBE9] rounded-xl text-[#6B5A4E] hover:border-[#F16522] hover:text-[#F16522] transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtres
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#FAF7F4] border-b border-[#EFEBE9]">
            <tr>
              {selectable && (
                <th className="p-4 w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input && isIndeterminate) {
                        input.indeterminate = true;
                      }
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-[#EFEBE9] text-[#F16522] focus:ring-[#F16522]"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    p-4 text-sm font-semibold text-[#2C1810]
                    ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                    ${sortable && column.sortable ? 'cursor-pointer hover:text-[#F16522]' : ''}
                  `}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center gap-1">
                    {column.title}
                    {sortable && column.sortable && (
                      <span className="text-[#6B5A4E] text-xs">{getSortIcon(column)}</span>
                    )}
                  </div>
                </th>
              ))}
              {rowActions && <th className="p-4 w-12" />}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} className="p-8">
                  <div className="flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-[#F16522] border-t-transparent rounded-full animate-spin" />
                  </div>
                </td>
              </tr>
            ) : data.length > 0 ? (
              data.map((record, index) => {
                const key = getRowKey(record, index);
                const isSelected = selectedKeys.includes(key);

                return (
                  <tr
                    key={key}
                    className={`
                      border-b border-[#EFEBE9] last:border-0 hover:bg-[#FAF7F4] transition-colors
                      ${onRowClick ? 'cursor-pointer' : ''}
                      ${isSelected ? 'bg-[#FFF5F0]' : ''}
                    `}
                    onClick={() => onRowClick && !openMenuIndex && onRowClick(record)}
                  >
                    {selectable && (
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(key, e.target.checked)}
                          className="w-4 h-4 rounded border-[#EFEBE9] text-[#F16522] focus:ring-[#F16522]"
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`
                          p-4 text-sm text-[#2C1810]
                          ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                        `}
                      >
                        {column.render
                          ? column.render((record as any)[column.dataIndex || column.key], record, index)
                          : (record as any)[column.dataIndex || column.key] ?? '-'}
                      </td>
                    ))}
                    {rowActions && (
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuIndex(openMenuIndex === index ? null : index)}
                            className="p-2 text-[#6B5A4E] hover:text-[#F16522] rounded-lg hover:bg-[#FAF7F4] transition-colors"
                            aria-label="Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMenuIndex === index && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl border border-[#EFEBE9] shadow-lg z-10 py-1">
                              {rowActions.map((action, actionIndex) => {
                                const Icon = action.icon;
                                const isDisabled = action.disabled?.(record);
                                return (
                                  <button
                                    key={actionIndex}
                                    onClick={() => {
                                      if (!isDisabled) {
                                        action.onClick(record);
                                        setOpenMenuIndex(null);
                                      }
                                    }}
                                    disabled={isDisabled}
                                    className={`
                                      w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                                      ${action.danger ? 'text-red-600 hover:bg-red-50' : 'text-[#6B5A4E] hover:bg-[#FAF7F4]'}
                                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'transition-colors'}
                                    `}
                                  >
                                    {Icon && <Icon className="w-4 h-4" />}
                                    {action.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                  className="p-12 text-center"
                >
                  <p className="text-[#6B5A4E]">{emptyMessage}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-[#EFEBE9] flex items-center justify-between">
          <p className="text-sm text-[#6B5A4E]">
            Affichage de {(pagination.page - 1) * pagination.limit + 1} à{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total} résultats
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={!pagination.hasPreviousPage}
              className="p-2 rounded-lg border border-[#EFEBE9] hover:border-[#F16522] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Page précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange?.(pageNum)}
                    className={`
                      w-8 h-8 rounded-lg text-sm font-medium transition-colors
                      ${pageNum === pagination.page
                        ? 'bg-[#F16522] text-white'
                        : 'border border-[#EFEBE9] text-[#6B5A4E] hover:border-[#F16522] hover:text-[#F16522]'
                      }
                    `}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
              className="p-2 rounded-lg border border-[#EFEBE9] hover:border-[#F16522] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Page suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
