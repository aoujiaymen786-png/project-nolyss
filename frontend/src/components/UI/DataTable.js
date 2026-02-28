import React, { useState, useMemo } from 'react';
import './DataTable.css';

/**
 * DataTable : tableau avec tri, filtrage (recherche) et export CSV.
 * @param {Array} columns - [{ key, label, sortable?, render?(value, row) }]
 * @param {Array} data - lignes
 * @param {string} searchPlaceholder - placeholder du champ recherche
 * @param {string} exportFilename - nom du fichier CSV (sans .csv)
 * @param {string} emptyMessage - message si aucune donnée
 */
const DataTable = ({
  columns,
  data = [],
  searchPlaceholder = 'Rechercher…',
  exportFilename = 'export',
  emptyMessage = 'Aucune donnée',
}) => {
  const [sortKey, setSortKey] = useState(columns[0]?.key || '');
  const [sortDir, setSortDir] = useState('asc');
  const [filterText, setFilterText] = useState('');

  const filteredData = useMemo(() => {
    if (!filterText.trim()) return data;
    const lower = filterText.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        if (val == null) return false;
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return str.toLowerCase().includes(lower);
      })
    );
  }, [data, filterText, columns]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const cmp = aVal == null && bVal == null ? 0 : (aVal == null ? 1 : bVal == null ? -1 : (aVal < bVal ? -1 : aVal > bVal ? 1 : 0));
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const s = String(aVal).localeCompare(String(bVal));
        return sortDir === 'asc' ? s : -s;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const exportCSV = () => {
    const headers = columns.map((c) => c.label);
    const rows = sortedData.map((row) =>
      columns.map((c) => {
        const val = row[c.key];
        if (val == null) return '';
        if (c.render && typeof c.render === 'function') {
          const rendered = c.render(val, row);
          if (typeof rendered === 'string') return `"${rendered.replace(/"/g, '""')}"`;
          return `"${String(rendered).replace(/"/g, '""')}"`;
        }
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
      })
    );
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportFilename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ui-datatable">
      <div className="ui-datatable-toolbar">
        <input
          type="search"
          className="ui-datatable-search"
          placeholder={searchPlaceholder}
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          aria-label="Filtrer le tableau"
        />
        <button type="button" className="ui-datatable-export" onClick={exportCSV} aria-label="Exporter en CSV">
          Exporter CSV
        </button>
      </div>
      <div className="ui-datatable-wrap">
        <table className="ui-datatable-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>
                  {col.sortable !== false ? (
                    <button
                      type="button"
                      className="ui-datatable-th-btn"
                      onClick={() => handleSort(col.key)}
                      aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                      {col.label}
                      {sortKey === col.key && <span className="ui-datatable-sort-icon">{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="ui-datatable-empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, idx) => (
                <tr key={row._id || row.id || idx}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '–')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
