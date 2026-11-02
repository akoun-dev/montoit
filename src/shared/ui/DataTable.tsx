/**
 * Table Component - Tableau réutilisable avec tri et pagination
 */

import { HTMLAttributes, ReactNode } from 'react';

export interface Column<T = any> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (value: any, record: T, index: number) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T = any> extends HTMLAttributes<HTMLTableElement> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  rowKey?: string | ((record: T) => string);
  onRowClick?: (record: T, index: number) => void;
  className?: string;
}

export function Table<T = any>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Aucune donnée disponible',
  rowKey = 'id',
  onRowClick,
  className = '',
  ...props
}: TableProps<T>) {
  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return (record as any)[rowKey] || String(index);
  };

  const handleRowClick = (record: T, index: number) => {
    if (onRowClick) {
      onRowClick(record, index);
    }
  };

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  if (loading) {
    return (
      <div className="bg-background-page rounded-xl border border-neutral-100 overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-neutral-100" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-neutral-50 border-t border-neutral-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-background-page rounded-xl border border-neutral-100 overflow-hidden ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full" {...props}>
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    px-6 py-4 text-sm font-semibold text-text-primary
                    ${column.align ? alignClasses[column.align] : 'text-left'}
                    ${column.width ? `w-${column.width}` : ''}
                  `}
                >
                  {column.title}
                  {column.sortable && (
                    <button className="ml-2 text-text-disabled hover:text-text-primary">↕️</button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.length > 0 ? (
              data.map((record, index) => (
                <tr
                  key={getRowKey(record, index)}
                  className={`
                    hover:bg-neutral-50 transition-colors duration-150
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                  onClick={() => handleRowClick(record, index)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`
                        px-6 py-4 text-sm text-text-primary
                        ${column.align ? alignClasses[column.align] : 'text-left'}
                      `}
                    >
                      {column.render
                        ? column.render(
                            column.dataIndex ? (record as any)[column.dataIndex] : undefined,
                            record,
                            index
                          )
                        : column.dataIndex
                          ? (record as any)[column.dataIndex]
                          : ''}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-text-secondary">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Composants spécialisés pour les tableaux de données du dashboard
export function StatsTable({
  data,
}: {
  data: Array<{ label: string; value: number; change?: number }>;
}) {
  const columns: Column<{ label: string; value: number; change?: number }>[] = [
    {
      key: 'label',
      title: 'Métrique',
      dataIndex: 'label',
    },
    {
      key: 'value',
      title: 'Valeur',
      dataIndex: 'value',
      align: 'right',
      render: (value: number) => value.toLocaleString(),
    },
    {
      key: 'change',
      title: 'Évolution',
      dataIndex: 'change',
      align: 'center',
      render: (change?: number) => {
        if (change === undefined) return '-';
        const isPositive = change >= 0;
        return (
          <span
            className={`
            inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
            ${isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}
          `}
          >
            {isPositive ? '↗️' : '↘️'} {Math.abs(change)}%
          </span>
        );
      },
    },
  ];

  return <Table columns={columns} data={data} />;
}
