import { ReactNode } from 'react';

export function DataTable<T>({
  columns,
  rows,
  getKey,
}: {
  columns: { header: string; render: (row: T) => ReactNode }[];
  rows: T[];
  getKey: (row: T) => string | number;
}) {
  return (
    <div className="table-card">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column.header}>{column.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getKey(row)}>{columns.map((column) => <td key={column.header}>{column.render(row)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
