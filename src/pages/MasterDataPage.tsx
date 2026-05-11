import { useEffect, useState } from 'react';
import { ChevronLeft, Database, Edit2, RefreshCw, Trash2 } from 'lucide-react';
import { api, unwrap } from '../api/client';

type ColType = 'pk' | 'string' | 'number' | 'date' | 'bool' | 'enum' | 'fk';

interface ColDef {
  key: string;
  label: string;
  type: ColType;
  options?: string[];
  refTable?: string;
  refApi?: string;
  refDisplay?: string;
  refValueKey?: string;
  readonly?: boolean;
  nullable?: boolean;
}

interface TableDef {
  name: string;
  label: string;
  group: string;
  columns: ColDef[];
  color?: string;
  apiGet?: string;
  apiUpdate?: (id: number) => string;
  apiDelete?: (id: number) => string;
}

// ─── Group colour tokens ──────────────────────────────────────────────────────
const GROUP_META: Record<string, { color: string; icon: string }> = {
  'Auth & Users':  { color: '#174a2a', icon: '👤' },
  'KYC':           { color: '#4a7c59', icon: '🪪' },
  'Farm Projects': { color: '#c8963e', icon: '🌾' },
  'Investments':   { color: '#2e7d32', icon: '💰' },
  'Documents':     { color: '#3c5a7c', icon: '📄' },
  'Distribution':  { color: '#5e35b1', icon: '📢' },
  'Monitoring':    { color: '#00695c', icon: '📡' },
  'Other':         { color: '#7a7268', icon: '⚙️' },
};

// ─── Admin API endpoints for each table ──────────────────────────────────────
const TABLE_API_ENDPOINTS: Record<string, {
  get?: string;
  update?: (id: number) => string;
  delete?: (id: number) => string;
}> = {
  // Auth & Users
  'users':                   { get: '/admin/users/', update: id => `/admin/users/${id}/role` },
  // Farm Projects
  'farm_projects':           { get: '/admin/farm-projects/', update: id => `/admin/farm-projects/${id}`, delete: id => `/admin/farm-projects/${id}` },
  // Crop planning
  'project_crop_cycles':     { get: '/admin/crop-cycles/',     delete: id => `/v1/admin/project-crop-cycles/${id}` },
  'project_crop_activities': { get: '/admin/crop-activities/', update: id => `/v1/admin/project-crop-activities/${id}`, delete: id => `/v1/admin/project-crop-activities/${id}` },
  // Investments
  'user_projects':           { get: '/admin/investments/' },
  'transactions':            { get: '/admin/investments/transactions' },
  // Distribution
  'distribution_groups':     { get: '/admin/distribution-groups-list/' },
  'user_group_associations': { get: '/admin/user-group-associations/', delete: id => `/admin/user-group-associations/${id}` },
  // Monitoring
  'farm_media':              { get: '/admin/farm-media/',  delete: id => `/admin/farm-media/${id}` },
  'farm_alerts':             { get: '/admin/farm-alerts/', update: id => `/admin/farm-alerts/${id}` },
};

// ─── Main component ───────────────────────────────────────────────────────────
export function MasterDataPage() {
  const [tables, setTables]           = useState<TableDef[]>([]);
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [activeTable, setActiveTable] = useState<TableDef | null>(null);
  const [rows, setRows]               = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [editingRow, setEditingRow]   = useState<any | null>(null);
  const [editForm, setEditForm]       = useState<any>({});
  const [saving, setSaving]           = useState(false);
  const [fkOptions, setFkOptions]     = useState<Record<string, any[]>>({});
  const [fkSearch, setFkSearch]       = useState<Record<string, string>>({});
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [search, setSearch]           = useState('');

  useEffect(() => { loadSchema(); }, []);

  const loadSchema = async () => {
    setLoadingSchema(true);
    setSchemaError(null);
    try {
      const response = await api.get('/admin/schema/tables');
      const schemas = unwrap<any[]>(response) || [];
      const enriched: TableDef[] = schemas.map(s => ({
        name:      s.name,
        label:     s.label,
        group:     s.group || 'Other',
        columns:   s.columns,
        color:     GROUP_META[s.group || 'Other']?.color,
        apiGet:    TABLE_API_ENDPOINTS[s.name]?.get,
        apiUpdate: TABLE_API_ENDPOINTS[s.name]?.update,
        apiDelete: TABLE_API_ENDPOINTS[s.name]?.delete,
      }));
      setTables(enriched);
    } catch (err: any) {
      setSchemaError(err?.response?.data?.detail || 'Failed to load schema');
    } finally {
      setLoadingSchema(false);
    }
  };

  const openTable = async (table: TableDef) => {
    setActiveTable(table);
    setEditingRow(null);
    setRows([]);
    if (!table.apiGet) return;
    setLoadingData(true);
    try {
      const r = await api.get(table.apiGet);
      setRows(unwrap<any[]>(r) || []);
    } catch {
      setRows([]);
    } finally {
      setLoadingData(false);
    }
    // Pre-load FK option lists
    const fkCols = table.columns.filter(c => c.type === 'fk' && c.refApi);
    const opts: Record<string, any[]> = { ...fkOptions };
    await Promise.all(fkCols.map(async col => {
      if (!opts[col.key]) {
        try { opts[col.key] = unwrap<any[]>(await api.get(col.refApi!)) || []; }
        catch { opts[col.key] = []; }
      }
    }));
    setFkOptions(opts);
  };

  const startEdit  = (row: any) => { setEditingRow(row); setEditForm({ ...row }); };
  const cancelEdit = ()         => { setEditingRow(null); setEditForm({}); };

  const saveEdit = async () => {
    if (!activeTable || !editingRow || !activeTable.apiUpdate) return;
    setSaving(true);
    try {
      const payload = activeTable.name === 'users' ? { role: editForm.role } : editForm;
      await api.patch(activeTable.apiUpdate(editingRow.id), payload);
      await openTable(activeTable);
      setEditingRow(null);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (row: any) => {
    if (!activeTable?.apiDelete) return;
    if (!confirm(`Delete row ID ${row.id}?`)) return;
    await api.delete(activeTable.apiDelete(row.id));
    await openTable(activeTable);
  };

  const fmtCell = (col: ColDef, value: any): string => {
    if (value === null || value === undefined) return '—';
    if (col.type === 'bool') return value ? '✓' : '✗';
    const s = String(value);
    return s.length > 60 ? s.slice(0, 58) + '…' : s;
  };

  // Group tables
  const groupOrder = Object.keys(GROUP_META);
  const groups = Array.from(new Set(tables.map(t => t.group)))
    .sort((a, b) => groupOrder.indexOf(a) - groupOrder.indexOf(b))
    .map(name => ({ name, tables: tables.filter(t => t.group === name) }));

  // Filter by search
  const filteredGroups = search.trim()
    ? groups
        .map(g => ({ ...g, tables: g.tables.filter(t => t.label.toLowerCase().includes(search.toLowerCase()) || t.name.toLowerCase().includes(search.toLowerCase())) }))
        .filter(g => g.tables.length > 0)
    : groups;

  // ── FK selector
  const FkSelect = ({ col, value, onChange }: { col: ColDef; value: any; onChange: (v: any) => void }) => {
    const opts      = fkOptions[col.key] || [];
    const searchVal = fkSearch[col.key] || '';
    const filtered  = opts.filter(o => String(o[col.refDisplay || 'id'] || '').toLowerCase().includes(searchVal.toLowerCase()));
    return (
      <div>
        <input placeholder={`Search ${col.label}…`} value={searchVal}
          onChange={e => setFkSearch(p => ({ ...p, [col.key]: e.target.value }))}
          className="fk-search-input" />
        <select value={value ?? ''} onChange={e => onChange(Number(e.target.value) || e.target.value)}
          size={Math.min(filtered.length + 1, 5)} style={{ width: '100%', height: 'auto', borderRadius: 8, padding: 6 }}>
          <option value="">— none —</option>
          {filtered.map(o => (
            <option key={o[col.refValueKey || 'id']} value={o[col.refValueKey || 'id']}>
              {o[col.refDisplay || 'id']} (id:{o[col.refValueKey || 'id']})
            </option>
          ))}
        </select>
      </div>
    );
  };

  // ── Loading / error states
  if (loadingSchema) return (
    <section>
      <div className="page-header">
        <span className="breadcrumb">System</span>
        <h1>Master Data</h1>
      </div>
      <div className="schema-loading">
        <RefreshCw size={18} className="spin-icon" />
        <span>Loading database schema…</span>
      </div>
    </section>
  );

  if (schemaError) return (
    <section>
      <div className="page-header">
        <span className="breadcrumb">System</span>
        <h1>Master Data</h1>
      </div>
      <div className="schema-error">
        <p>⚠ {schemaError}</p>
        <button onClick={loadSchema}>Retry</button>
      </div>
    </section>
  );

  // ── Main render
  return (
    <section>
      {/* Page header */}
      <div className="page-header">
        <span className="breadcrumb">System</span>
        <h1>Master Data</h1>
        <p>Live database schema for all mobile app models. Click a table to view and edit records.</p>
      </div>

      {/* Table browser */}
      {!activeTable ? (
        <div className="md-browser">
          {/* Toolbar */}
          <div className="md-toolbar">
            <input
              className="md-search"
              placeholder="Search tables…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="md-stats">
              {tables.length} tables · {groups.length} groups
            </div>
            <button className="md-refresh-btn" onClick={loadSchema}>
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>

          {/* Groups + table cards */}
          {filteredGroups.map(group => {
            const meta = GROUP_META[group.name] || GROUP_META['Other'];
            return (
              <div key={group.name} className="md-group">
                <div className="md-group-header">
                  <span className="md-group-dot" style={{ background: meta.color }} />
                  <span className="md-group-icon">{meta.icon}</span>
                  <span className="md-group-name">{group.name}</span>
                  <span className="md-group-count">{group.tables.length} table{group.tables.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="md-table-grid">
                  {group.tables.map(table => (
                    <div
                      key={table.name}
                      className="md-table-card"
                      style={{ '--card-color': meta.color } as React.CSSProperties}
                      onClick={() => openTable(table)}
                    >
                      {/* Card header */}
                      <div className="md-card-header" style={{ background: meta.color }}>
                        <span className="md-card-title">
                          <Database size={11} />
                          {table.label}
                        </span>
                        <span className={`md-card-badge ${table.apiGet ? 'editable' : 'schema'}`}>
                          {table.apiGet ? 'LIVE' : 'SCHEMA'}
                        </span>
                      </div>

                      {/* Column list */}
                      <div className="md-card-cols">
                        {table.columns.slice(0, 8).map(col => (
                          <div key={col.key} className="md-col-row">
                            <span className="md-col-name">
                              {col.type === 'pk' && <span className="col-badge pk">PK</span>}
                              {col.type === 'fk' && <span className="col-badge fk">FK</span>}
                              {col.key}
                            </span>
                            <span className="md-col-type">{col.type}</span>
                          </div>
                        ))}
                        {table.columns.length > 8 && (
                          <div className="md-col-more">+{table.columns.length - 8} more cols</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Table Editor ─────────────────────────────────────────────────── */
        <div className="md-editor">
          {/* Editor header */}
          <div className="md-editor-header">
            <button
              className="md-back-btn"
              onClick={() => { setActiveTable(null); setEditingRow(null); }}
            >
              <ChevronLeft size={14} />
              All Tables
            </button>
            <div className="md-editor-title">
              <span
                className="md-editor-dot"
                style={{ background: GROUP_META[activeTable.group]?.color }}
              />
              {activeTable.label}
              {loadingData && <span className="md-loading-tag">loading…</span>}
            </div>
            <div className="md-editor-meta">
              <span className="badge">{rows.length} rows</span>
              {activeTable.apiGet && <span className="badge green">LIVE</span>}
            </div>
          </div>

          {!editingRow ? (
            <div className="md-table-wrap">
              <table className="md-data-table">
                <thead>
                  <tr>
                    {activeTable.columns.map(col => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                    {(activeTable.apiUpdate || activeTable.apiDelete) && <th className="actions-col">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx}>
                      {activeTable.columns.map(col => (
                        <td key={col.key} title={String(row[col.key] ?? '')}>
                          {col.type === 'bool'
                            ? <span className={`bool-badge ${row[col.key] ? 'true' : 'false'}`}>{row[col.key] ? '✓' : '✗'}</span>
                            : fmtCell(col, row[col.key])
                          }
                        </td>
                      ))}
                      {(activeTable.apiUpdate || activeTable.apiDelete) && (
                        <td className="actions-col">
                          {activeTable.apiUpdate && (
                            <button className="row-btn edit" onClick={() => startEdit(row)} title="Edit">
                              <Edit2 size={12} />
                            </button>
                          )}
                          {activeTable.apiDelete && (
                            <button className="row-btn del" onClick={() => deleteRow(row)} title="Delete">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && !loadingData && (
                <div className="md-empty">No records in this table</div>
              )}
            </div>
          ) : (
            /* ── Edit form ── */
            <div className="md-edit-form">
              <h3>Edit · ID {editingRow.id}</h3>
              <div className="md-form-grid">
                {activeTable.columns.filter(c => !c.readonly).map(col => (
                  <div key={col.key} className="md-form-field">
                    <label>
                      {col.label}
                      {!col.nullable && <span className="required">*</span>}
                    </label>
                    {col.type === 'fk' ? (
                      <FkSelect col={col} value={editForm[col.key]} onChange={v => setEditForm((p: any) => ({ ...p, [col.key]: v }))} />
                    ) : col.type === 'bool' ? (
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={editForm[col.key] ?? false}
                          onChange={e => setEditForm((p: any) => ({ ...p, [col.key]: e.target.checked }))}
                        />
                        <span>{editForm[col.key] ? 'Yes' : 'No'}</span>
                      </label>
                    ) : col.type === 'date' ? (
                      <input type="date" value={editForm[col.key] ?? ''}
                        onChange={e => setEditForm((p: any) => ({ ...p, [col.key]: e.target.value }))} />
                    ) : col.type === 'number' ? (
                      <input type="number" value={editForm[col.key] ?? ''}
                        onChange={e => setEditForm((p: any) => ({ ...p, [col.key]: e.target.value ? Number(e.target.value) : '' }))} />
                    ) : col.options ? (
                      <select value={editForm[col.key] ?? ''} onChange={e => setEditForm((p: any) => ({ ...p, [col.key]: e.target.value }))}>
                        <option value="">— select —</option>
                        {col.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={editForm[col.key] ?? ''}
                        onChange={e => setEditForm((p: any) => ({ ...p, [col.key]: e.target.value }))} />
                    )}
                  </div>
                ))}
              </div>
              <div className="md-form-actions">
                <button onClick={saveEdit} disabled={saving} className="md-save-btn">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button onClick={cancelEdit} disabled={saving} className="md-cancel-btn">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
