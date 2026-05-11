import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit2, Plus, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { DataTable } from '../components/DataTable';
import { FarmProject, PAYOUT_TENURES } from '../types';

const RISK_LEVELS = ['Low', 'Medium', 'High'];
const STATUSES = ['open', 'upcoming', 'closed', 'completed'];

const emptyProject = {
  project_name: '',
  description: '',
  image_url: '',
  crop_name: '',
  roi_percentage: '',
  risk_level: 'Low',
  harvest_date: '',
  total_plots: '',
  available_plots: '',
  acre_per_plot: '',
  price_per_acre: '',
  status: 'open',
  project_start_date: '',
  project_end_date: '',
  documentation_fee_per_acre: '',
  farm_manage_fee_per_acre: '',
  lease_fee_per_acre: '',
  payout_tenure: '',
};

// ─── Shared label + input wrapper ───────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#75664b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Shared form body (used in both create and edit) ──────────────────────
// Defined at module level so React always sees the same component type and
// never unmounts it mid-edit (which would cause inputs to lose focus).
function FormFields({ f, update }: { f: any; update: (k: string, v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Basic info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Project Name">
          <input value={f.project_name} onChange={e => update('project_name', e.target.value)} placeholder="e.g. Mango Farm Phase 1" required />
        </Field>
        <Field label="Crop Name">
          <input value={f.crop_name} onChange={e => update('crop_name', e.target.value)} placeholder="e.g. Alphonso Mango" required />
        </Field>
      </div>
      <Field label="Description">
        <textarea rows={2} value={f.description || ''} onChange={e => update('description', e.target.value)} placeholder="Short description visible to investors" />
      </Field>
      <Field label="Image URL">
        <input value={f.image_url || ''} onChange={e => update('image_url', e.target.value)} placeholder="https://..." />
      </Field>

      {/* Timeline */}
      <div style={{ borderTop: '1px solid #e8e2d5', paddingTop: 12 }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#75664b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Project Timeline</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="Project Start Date">
            <input type="date" value={f.project_start_date || ''} onChange={e => update('project_start_date', e.target.value)} />
          </Field>
          <Field label="Project End Date">
            <input type="date" value={f.project_end_date || ''} onChange={e => update('project_end_date', e.target.value)} />
          </Field>
          <Field label="Harvest Date & Time">
            <input type="datetime-local" value={f.harvest_date || ''} onChange={e => update('harvest_date', e.target.value)} required />
          </Field>
        </div>
      </div>

      {/* Financials */}
      <div style={{ borderTop: '1px solid #e8e2d5', paddingTop: 12 }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#75664b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Financials & Returns</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          <Field label="ROI (%)">
            <input type="number" step="0.01" min="0" value={f.roi_percentage} onChange={e => update('roi_percentage', e.target.value)} placeholder="e.g. 18.5" required />
          </Field>
          <Field label="Risk Level">
            <select value={f.risk_level} onChange={e => update('risk_level', e.target.value)}>
              {RISK_LEVELS.map(r => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Payout Tenure">
            <select value={f.payout_tenure || ''} onChange={e => update('payout_tenure', e.target.value)}>
              <option value="">— select —</option>
              {PAYOUT_TENURES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={f.status} onChange={e => update('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {/* Plots */}
      <div style={{ borderTop: '1px solid #e8e2d5', paddingTop: 12 }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#75664b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Plot Configuration</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          <Field label="Total Plots">
            <input type="number" min="0" value={f.total_plots} onChange={e => update('total_plots', e.target.value)} required />
          </Field>
          <Field label="Available Plots">
            <input type="number" min="0" value={f.available_plots} onChange={e => update('available_plots', e.target.value)} required />
          </Field>
          <Field label="Acres per Plot">
            <input type="number" step="0.01" min="0" value={f.acre_per_plot} onChange={e => update('acre_per_plot', e.target.value)} required />
          </Field>
          <Field label="Price per Acre (₹)">
            <input type="number" min="0" value={f.price_per_acre} onChange={e => update('price_per_acre', e.target.value)} required />
          </Field>
        </div>
      </div>

      {/* Fee structure */}
      <div style={{ borderTop: '1px solid #e8e2d5', paddingTop: 12 }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#75664b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fee Structure (per acre, optional)</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="Documentation Fee (₹)">
            <input type="number" step="0.01" min="0" value={f.documentation_fee_per_acre} onChange={e => update('documentation_fee_per_acre', e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Farm Management Fee (₹)">
            <input type="number" step="0.01" min="0" value={f.farm_manage_fee_per_acre} onChange={e => update('farm_manage_fee_per_acre', e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Lease Fee (₹)">
            <input type="number" step="0.01" min="0" value={f.lease_fee_per_acre} onChange={e => update('lease_fee_per_acre', e.target.value)} placeholder="0.00" />
          </Field>
        </div>
      </div>
    </div>
  );
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<FarmProject[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState<any>(emptyProject);
  const [saving, setSaving] = useState(false);

  // Edit modal
  const [editingProject, setEditingProject] = useState<FarmProject | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadProjects = async () => {
    const response = await api.get('/admin/farm-projects/');
    setProjects(unwrap<FarmProject[]>(response) || []);
  };

  useEffect(() => { loadProjects(); }, []);

  const updateField = (field: string, value: string) =>
    setForm((c: any) => ({ ...c, [field]: value }));

  const editField = (field: string, value: string) =>
    setEditForm((c: any) => ({ ...c, [field]: value }));

  const toPayload = (f: any) => ({
    ...f,
    roi_percentage: Number(f.roi_percentage),
    total_plots: Number(f.total_plots),
    available_plots: Number(f.available_plots),
    acre_per_plot: Number(f.acre_per_plot),
    price_per_acre: Number(f.price_per_acre),
    documentation_fee_per_acre: f.documentation_fee_per_acre !== '' ? Number(f.documentation_fee_per_acre) : null,
    farm_manage_fee_per_acre: f.farm_manage_fee_per_acre !== '' ? Number(f.farm_manage_fee_per_acre) : null,
    lease_fee_per_acre: f.lease_fee_per_acre !== '' ? Number(f.lease_fee_per_acre) : null,
    project_start_date: f.project_start_date || null,
    project_end_date: f.project_end_date || null,
    payout_tenure: f.payout_tenure || null,
  });

  const createProject = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/farm-projects/', toPayload(form));
      setForm(emptyProject);
      setShowCreateForm(false);
      await loadProjects();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (project: FarmProject) => {
    setEditingProject(project);
    setEditForm({
      ...project,
      harvest_date: project.harvest_date ? project.harvest_date.substring(0, 16) : '',
      project_start_date: project.project_start_date || '',
      project_end_date: project.project_end_date || '',
      documentation_fee_per_acre: project.documentation_fee_per_acre ?? '',
      farm_manage_fee_per_acre: project.farm_manage_fee_per_acre ?? '',
      lease_fee_per_acre: project.lease_fee_per_acre ?? '',
      payout_tenure: project.payout_tenure || '',
    });
  };

  const saveEdit = async () => {
    if (!editingProject) return;
    setEditSaving(true);
    try {
      await api.patch(`/admin/farm-projects/${editingProject.id}`, toPayload(editForm));
      setEditingProject(null);
      await loadProjects();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update project');
    } finally {
      setEditSaving(false);
    }
  };

  const executeDelete = async () => {
    if (deletingId === null) return;
    await api.delete(`/admin/farm-projects/${deletingId}`);
    setDeletingId(null);
    await loadProjects();
  };

  return (
    <section>
      <div className="page-header">
        <span>Projects</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1>Farm Project Management</h1>
            <p>Manage investment projects and open the Crop Planner to build crop cycles.</p>
          </div>
          <button
            onClick={() => setShowCreateForm(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
          >
            {showCreateForm ? <><ChevronUp size={16} /> Hide Form</> : <><Plus size={16} /> New Project</>}
          </button>
        </div>
      </div>

      {/* ── Delete confirmation ── */}
      {deletingId !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fffdf8', borderRadius: 24, padding: 32, maxWidth: 420, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <Trash2 size={42} color="#9f1d1d" style={{ marginBottom: 16 }} />
            <h2 style={{ color: '#174a2a', margin: '0 0 10px' }}>Delete Project?</h2>
            <p style={{ color: '#75664b', margin: '0 0 24px' }}>
              This will permanently remove the project and all its crop cycles and activities. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="danger-button" onClick={executeDelete}>Yes, Delete</button>
              <button onClick={() => setDeletingId(null)} style={{ background: '#f0ece3', color: '#174a2a' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit modal ── */}
      {editingProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fffdf8', borderRadius: 24, padding: 28, width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: '#174a2a' }}>Edit Project</h2>
              <button onClick={() => setEditingProject(null)} style={{ background: '#f0ece3', color: '#174a2a', padding: '6px 10px', borderRadius: 10 }}>
                <X size={16} />
              </button>
            </div>
            <FormFields f={editForm} update={editField} />
            <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
              <button onClick={saveEdit} disabled={editSaving}>{editSaving ? 'Saving…' : 'Save Changes'}</button>
              <button onClick={() => setEditingProject(null)} style={{ background: '#f0ece3', color: '#174a2a' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create form (collapsible) ── */}
      {showCreateForm && (
        <form className="panel" onSubmit={createProject} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2 style={{ margin: 0 }}><Plus size={17} style={{ verticalAlign: 'middle', marginRight: 6 }} />Create New Project</h2>
            <button type="button" onClick={() => setShowCreateForm(false)} style={{ background: '#f0ece3', color: '#174a2a', padding: '6px 10px', borderRadius: 10 }}>
              <X size={15} />
            </button>
          </div>
          <FormFields f={form} update={updateField} />
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Project'}</button>
            <button type="button" onClick={() => { setForm(emptyProject); setShowCreateForm(false); }} style={{ background: '#f0ece3', color: '#174a2a' }}>Cancel</button>
          </div>
        </form>
      )}

      {/* ── Projects table ── */}
      <div className="panel">
        <h2>All Projects ({projects.length})</h2>
        <DataTable
          rows={projects}
          getKey={project => project.id}
          columns={[
            { header: 'Project', render: p => <strong>{p.project_name}</strong> },
            { header: 'Crop', render: p => p.crop_name },
            { header: 'ROI', render: p => `${p.roi_percentage}%` },
            { header: 'Plots', render: p => `${p.available_plots}/${p.total_plots}` },
            { header: 'Tenure', render: p => p.payout_tenure || '—' },
            { header: 'Timeline', render: p => p.project_start_date ? `${p.project_start_date} → ${p.project_end_date || '?'}` : '—' },
            { header: 'Status', render: p => <span className={`badge ${p.status === 'open' ? 'green' : 'gray'}`}>{p.status}</span> },
            {
              header: 'Actions',
              render: p => (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link className="link-button" to={`/projects/${p.id}/planner`} style={{ padding: '6px 12px', fontSize: 12 }}>Planner</Link>
                  <button
                    onClick={() => openEdit(p)}
                    style={{ background: '#e8f5e9', color: '#174a2a', padding: '6px 10px', borderRadius: 10, fontSize: 12, border: 'none', cursor: 'pointer', fontWeight: 800 }}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    className="danger-button"
                    onClick={() => setDeletingId(p.id)}
                    style={{ padding: '6px 10px', borderRadius: 10, fontSize: 12 }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>
    </section>
  );
}
