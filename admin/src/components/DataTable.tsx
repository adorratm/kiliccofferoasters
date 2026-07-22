type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  /** Düzenlenen / seçili satır — tabloda vurgulanır */
  selectedRowKey?: string | null;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'Kayıt yok',
  onRowClick,
  selectedRowKey = null,
}: DataTableProps<T>) {
  if (!rows.length) {
    return (
      <div className="animate-fade-up border border-border-muted bg-surface px-4 py-10 text-center text-sm text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="animate-fade-up overflow-x-auto border border-border-muted">
      <table className="w-full min-w-180 border-collapse text-left text-sm">
        <thead className="bg-surface-high">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`mono px-3 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const selected = Boolean(selectedRowKey && selectedRowKey === key);
            const clickable = Boolean(onRowClick);
            return (
              <tr
                key={key}
                onClick={
                  onRowClick
                    ? (e) => {
                        const target = e.target as HTMLElement | null;
                        if (
                          target?.closest(
                            'button, a, input, select, textarea, label',
                          )
                        ) {
                          return;
                        }
                        onRowClick(row);
                      }
                    : undefined
                }
                aria-selected={selected || undefined}
                className={[
                  'row-motion border-t border-border-muted',
                  selected
                    ? 'bg-accent/15 ring-1 ring-inset ring-accent/50'
                    : 'bg-surface hover:bg-surface-high',
                  clickable ? 'cursor-pointer' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-2.5 ${col.className || ''}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
