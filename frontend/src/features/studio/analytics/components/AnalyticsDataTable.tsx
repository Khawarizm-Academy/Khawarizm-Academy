import React from 'react';

export const AnalyticsDataTable: React.FC<{
  label?: string;
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
}> = ({ label = 'عرض البيانات', headers, rows }) => (
  <details className="studio-analytics-data-details">
    <summary>{label}</summary>
    <div className="studio-analytics-table-wrap">
      <table className="studio-analytics-data-table">
        <thead><tr>{headers.map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead>
        <tbody>
          {rows.length ? rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length}>لا بيانات كافية بعد</td></tr>}
        </tbody>
      </table>
    </div>
  </details>
);
