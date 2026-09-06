import styles from './DataTable.module.css';
import EmptyState from './EmptyState';

export default function DataTable({
  columns,
  rows,
  emptyMessage = '데이터가 없습니다.',
  compact = false,
  className = '',
}) {
  if (!rows.length) return <EmptyState message={emptyMessage} />;

  return (
    <div
      className={[styles.wrap, compact ? styles.wrapCompact : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <table
        className={`${styles.table} ${compact ? styles.tableCompact : ''}`.trim()}
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                title={col.label}
                style={col.width ? { width: col.width } : undefined}
                className={[
                  compact ? styles.compactHeader : '',
                  col.headerClassName || '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`r-${rowIndex}`}>
              {columns.map((col) => {
                const value = String(row?.[col.key] ?? '');
                return (
                  <td
                    key={`${rowIndex}-${col.key}`}
                    style={col.width ? { width: col.width } : undefined}
                    className={[
                      styles.cellText,
                      compact ? styles.cellTextCompact : '',
                      col.cellClassName || '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    title={value}
                  >
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
