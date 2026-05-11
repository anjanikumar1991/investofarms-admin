import { FormEvent, useEffect, useState } from 'react';
import {
  CalendarPlus, ChevronDown, ChevronRight,
  ClipboardList, Edit2, Plus, Save, Trash2, X,
} from 'lucide-react';
import { api, unwrap } from '../api/client';
import { CropActivity, CropCycle, FarmProject, ProjectPayoutSchedule } from '../types';

// ─── Default form values ─────────────────────────────────────────────────────

const emptyCycle = () => ({
  crop_name: '',
  crop_type: 'main' as 'main' | 'intercrop',
  start_date: '',
  end_date: '',
  season_name: '',
  cycle_year: '',
  expected_yield: '',
  expected_yield_unit: 'quintal',
  notes: '',
  status: 'planned',
});

const emptyActivity = () => ({
  activity_name: '',
  activity_type: '',
  planned_start_date: '',
  planned_end_date: '',
  priority: 'medium',
  status: 'scheduled',
  assigned_to: '',
  estimated_cost: '',
  remarks: '',
});

const emptyPayoutSchedule = () => ({
  payout_number: '1',
  label: '',
  scheduled_date: '',
  expected_amount: '',
  payout_type: 'regular',
});

// ─── Date validation helpers ─────────────────────────────────────────────────

function validateCycleDates(
  startDate: string, endDate: string,
  project: FarmProject | null,
): string | null {
  if (!startDate || !endDate) return null;
  if (endDate < startDate) return 'End date must be on or after start date.';
  if (project?.project_start_date && startDate < project.project_start_date)
    return `Crop start (${startDate}) must be ≥ project start (${project.project_start_date}).`;
  if (project?.project_end_date && startDate >= project.project_end_date)
    return `Crop start (${startDate}) must be before project end (${project.project_end_date}).`;
  if (project?.project_end_date && endDate > project.project_end_date)
    return `Crop end (${endDate}) must be ≤ project end (${project.project_end_date}).`;
  return null;
}

function validateActivityDates(
  startDate: string, endDate: string,
  project: FarmProject | null,
): string | null {
  if (startDate && endDate && endDate < startDate)
    return 'End date must be on or after start date.';
  if (project?.project_start_date && startDate && startDate < project.project_start_date)
    return `Activity start (${startDate}) must be ≥ project start (${project.project_start_date}).`;
  if (project?.project_end_date && endDate && endDate > project.project_end_date)
    return `Activity end (${endDate}) must be ≤ project end (${project.project_end_date}).`;
  return null;
}

// ─── Small reusable label wrapper ────────────────────────────────────────────

function FL({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#75664b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Priority badge colour ────────────────────────────────────────────────────

function priorityStyle(priority: string) {
  if (priority === 'critical') return { background: '#ffeaea', color: '#7b0000', border: '1px solid #f5c0c0' };
  if (priority === 'high')     return { background: '#fff3e0', color: '#7b3600', border: '1px solid #f5d9b0' };
  if (priority === 'low')      return { background: '#e8f5e9', color: '#174a2a', border: '1px solid #c8e6c9' };
  return { background: '#fffde7', color: '#5c4a00', border: '1px solid #f5e79e' }; // medium
}

// ─── Main component ──────────────────────────────────────────────────────────

export function CropPlannerPage() {
  // Projects
  const [projects, setProjects] = useState<FarmProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<FarmProject | null>(null);

  // Cycles
  const [cycles, setCycles] = useState<CropCycle[]>([]);
  const [showAddCycleForm, setShowAddCycleForm] = useState(false);
  const [newCycleForm, setNewCycleForm] = useState<any>(emptyCycle());
  const [savingCycle, setSavingCycle] = useState(false);
  const [cycleError, setCycleError] = useState('');

  // Inline cycle editing
  const [editingCycleId, setEditingCycleId] = useState<number | null>(null);
  const [editCycleForm, setEditCycleForm] = useState<any>({});
  const [savingCycleEdit, setSavingCycleEdit] = useState(false);
  const [cycleEditError, setCycleEditError] = useState('');

  // Activities per cycle
  const [expandedCycleId, setExpandedCycleId] = useState<number | null>(null);
  const [activities, setActivities] = useState<Record<number, CropActivity[]>>({});
  const [showAddActivityForCycle, setShowAddActivityForCycle] = useState<number | null>(null);
  const [newActivityForm, setNewActivityForm] = useState<any>(emptyActivity());
  const [savingActivity, setSavingActivity] = useState(false);
  const [activityError, setActivityError] = useState('');

  // Inline activity editing
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
  const [editActivityForm, setEditActivityForm] = useState<any>({});
  const [savingActivityEdit, setSavingActivityEdit] = useState(false);
  const [activityEditError, setActivityEditError] = useState('');

  // Payout schedules
  const [payoutSchedules, setPayoutSchedules] = useState<ProjectPayoutSchedule[]>([]);
  const [showAddPayoutForm, setShowAddPayoutForm] = useState(false);
  const [newPayoutForm, setNewPayoutForm] = useState<any>(emptyPayoutSchedule());
  const [payoutError, setPayoutError] = useState('');
  const [editingPayoutId, setEditingPayoutId] = useState<number | null>(null);
  const [editPayoutForm, setEditPayoutForm] = useState<any>({});

  // ── Load projects on mount ──────────────────────────────────────────────────
  useEffect(() => {
    api.get('/admin/farm-projects/').then(r => {
      const list = unwrap<FarmProject[]>(r) || [];
      setProjects(list);
      if (list.length > 0) setSelectedProject(list[0]);
    });
  }, []);

  // ── Load cycles when project changes ───────────────────────────────────────
  useEffect(() => {
    if (!selectedProject) return;
    loadCycles(selectedProject.id);
    loadPayoutSchedules(selectedProject.id);
    setExpandedCycleId(null);
    setActivities({});
    setEditingCycleId(null);
    setShowAddCycleForm(false);
    setNewCycleForm(emptyCycle());
    setCycleError('');
    setShowAddPayoutForm(false);
    setNewPayoutForm(emptyPayoutSchedule());
    setEditingPayoutId(null);
    setPayoutError('');
  }, [selectedProject?.id]);

  const loadCycles = async (projectId: number) => {
    const r = await api.get(`/v1/projects/${projectId}/crop-cycles`);
    setCycles(unwrap<CropCycle[]>(r) || []);
  };

  const loadActivities = async (cycleId: number) => {
    const r = await api.get(`/v1/project-crop-cycles/${cycleId}/activities`);
    setActivities(prev => ({ ...prev, [cycleId]: unwrap<CropActivity[]>(r) || [] }));
  };

  const loadPayoutSchedules = async (projectId: number) => {
    const r = await api.get(`/admin/payouts/schedules?project_id=${projectId}`);
    setPayoutSchedules(unwrap<ProjectPayoutSchedule[]>(r) || []);
  };

  const createPayoutSchedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setPayoutError('');
    try {
      await api.post('/admin/payouts/schedules', {
        project_id: selectedProject.id,
        payout_number: Number(newPayoutForm.payout_number),
        label: newPayoutForm.label,
        scheduled_date: newPayoutForm.scheduled_date,
        expected_amount: Number(newPayoutForm.expected_amount),
        payout_type: newPayoutForm.payout_type,
      });
      setNewPayoutForm(emptyPayoutSchedule());
      setShowAddPayoutForm(false);
      await loadPayoutSchedules(selectedProject.id);
    } catch (err: any) {
      setPayoutError(err?.response?.data?.detail || 'Could not create payout schedule');
    }
  };

  const startEditPayout = (schedule: ProjectPayoutSchedule) => {
    setEditingPayoutId(schedule.id);
    setEditPayoutForm({ ...schedule });
    setPayoutError('');
  };

  const savePayoutSchedule = async () => {
    if (!selectedProject || !editingPayoutId) return;
    setPayoutError('');
    try {
      await api.patch(`/admin/payouts/schedules/${editingPayoutId}`, {
        project_id: selectedProject.id,
        payout_number: Number(editPayoutForm.payout_number),
        label: editPayoutForm.label,
        scheduled_date: editPayoutForm.scheduled_date,
        expected_amount: Number(editPayoutForm.expected_amount),
        payout_type: editPayoutForm.payout_type,
      });
      setEditingPayoutId(null);
      await loadPayoutSchedules(selectedProject.id);
    } catch (err: any) {
      setPayoutError(err?.response?.data?.detail || 'Could not update payout schedule');
    }
  };

  const deletePayoutSchedule = async (scheduleId: number) => {
    if (!selectedProject || !confirm('Delete this payout schedule?')) return;
    try {
      await api.delete(`/admin/payouts/schedules/${scheduleId}`);
      await loadPayoutSchedules(selectedProject.id);
    } catch (err: any) {
      setPayoutError(err?.response?.data?.detail || 'Could not delete payout schedule');
    }
  };

  // ── Toggle cycle expand ────────────────────────────────────────────────────
  const toggleCycle = (cycleId: number) => {
    if (editingCycleId === cycleId) return; // don't collapse while editing
    if (expandedCycleId === cycleId) {
      setExpandedCycleId(null);
      setShowAddActivityForCycle(null);
    } else {
      setExpandedCycleId(cycleId);
      if (!activities[cycleId]) loadActivities(cycleId);
    }
  };

  // ── Create cycle ───────────────────────────────────────────────────────────
  const createCycle = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    const dateErr = validateCycleDates(newCycleForm.start_date, newCycleForm.end_date, selectedProject);
    if (dateErr) { setCycleError(dateErr); return; }
    setSavingCycle(true); setCycleError('');
    try {
      await api.post(`/v1/admin/projects/${selectedProject.id}/crop-cycles`, {
        ...newCycleForm,
        cycle_year: newCycleForm.cycle_year ? Number(newCycleForm.cycle_year) : null,
        expected_yield: newCycleForm.expected_yield ? Number(newCycleForm.expected_yield) : null,
      });
      setNewCycleForm(emptyCycle());
      setShowAddCycleForm(false);
      await loadCycles(selectedProject.id);
    } catch (err: any) {
      setCycleError(err?.response?.data?.detail || 'Could not create crop cycle');
    } finally {
      setSavingCycle(false);
    }
  };

  // ── Start editing cycle ────────────────────────────────────────────────────
  const startEditCycle = (cycle: CropCycle) => {
    setEditingCycleId(cycle.id);
    setEditCycleForm({ ...cycle });
    setCycleEditError('');
    setExpandedCycleId(null); // collapse activities while editing
  };

  const saveCycleEdit = async () => {
    if (!selectedProject) return;
    const dateErr = validateCycleDates(editCycleForm.start_date, editCycleForm.end_date, selectedProject);
    if (dateErr) { setCycleEditError(dateErr); return; }
    setSavingCycleEdit(true); setCycleEditError('');
    try {
      await api.patch(`/v1/admin/project-crop-cycles/${editingCycleId}`, {
        ...editCycleForm,
        cycle_year: editCycleForm.cycle_year ? Number(editCycleForm.cycle_year) : null,
        expected_yield: editCycleForm.expected_yield ? Number(editCycleForm.expected_yield) : null,
      });
      setEditingCycleId(null);
      await loadCycles(selectedProject.id);
    } catch (err: any) {
      setCycleEditError(err?.response?.data?.detail || 'Could not update cycle');
    } finally {
      setSavingCycleEdit(false);
    }
  };

  // ── Delete cycle ───────────────────────────────────────────────────────────
  const deleteCycle = async (cycleId: number) => {
    if (!confirm('Delete this crop cycle and all its activities?')) return;
    await api.delete(`/v1/admin/project-crop-cycles/${cycleId}`);
    if (expandedCycleId === cycleId) setExpandedCycleId(null);
    if (editingCycleId === cycleId) setEditingCycleId(null);
    if (selectedProject) await loadCycles(selectedProject.id);
  };

  // ── Create activity ────────────────────────────────────────────────────────
  const createActivity = async (e: FormEvent, cycleId: number) => {
    e.preventDefault();
    const dateErr = validateActivityDates(newActivityForm.planned_start_date, newActivityForm.planned_end_date, selectedProject);
    if (dateErr) { setActivityError(dateErr); return; }
    setSavingActivity(true); setActivityError('');
    try {
      await api.post(`/v1/admin/project-crop-cycles/${cycleId}/activities`, {
        ...newActivityForm,
        estimated_cost: newActivityForm.estimated_cost ? Number(newActivityForm.estimated_cost) : null,
      });
      setNewActivityForm(emptyActivity());
      setShowAddActivityForCycle(null);
      await loadActivities(cycleId);
    } catch (err: any) {
      setActivityError(err?.response?.data?.detail || 'Could not add activity');
    } finally {
      setSavingActivity(false);
    }
  };

  // ── Start editing activity ─────────────────────────────────────────────────
  const startEditActivity = (act: CropActivity) => {
    setEditingActivityId(act.id);
    setEditActivityForm({ ...act });
    setActivityEditError('');
  };

  const saveActivityEdit = async (cycleId: number) => {
    const dateErr = validateActivityDates(editActivityForm.planned_start_date, editActivityForm.planned_end_date, selectedProject);
    if (dateErr) { setActivityEditError(dateErr); return; }
    setSavingActivityEdit(true); setActivityEditError('');
    try {
      await api.patch(`/v1/admin/project-crop-activities/${editingActivityId}`, {
        ...editActivityForm,
        estimated_cost: editActivityForm.estimated_cost ? Number(editActivityForm.estimated_cost) : null,
      });
      setEditingActivityId(null);
      await loadActivities(cycleId);
    } catch (err: any) {
      setActivityEditError(err?.response?.data?.detail || 'Could not update activity');
    } finally {
      setSavingActivityEdit(false);
    }
  };

  // ── Delete activity ────────────────────────────────────────────────────────
  const deleteActivity = async (cycleId: number, activityId: number) => {
    if (!confirm('Delete this activity?')) return;
    await api.delete(`/v1/admin/project-crop-activities/${activityId}`);
    if (editingActivityId === activityId) setEditingActivityId(null);
    await loadActivities(cycleId);
  };

  // ── Update activity status (quick-change) ─────────────────────────────────
  const updateActivityStatus = async (cycleId: number, activityId: number, status: string) => {
    await api.patch(`/v1/admin/project-crop-activities/${activityId}`, { status });
    await loadActivities(cycleId);
  };

  // ─────────────────────────────────── RENDER ─────────────────────────────────

  const panelStyle = { background: '#fffdf8', border: '1px solid #e9e2d2', borderRadius: 18, overflow: 'hidden' };

  // Inline form for adding a new activity
  const renderAddActivityForm = (cycleId: number) => (
    <form onSubmit={e => createActivity(e, cycleId)} style={{ background: '#f4f1e8', border: '1px dashed #c5b89a', borderRadius: 14, padding: 16, marginBottom: 8 }}>
      <div style={{ fontWeight: 800, color: '#174a2a', fontSize: 13, marginBottom: 10 }}>New Activity</div>
      {activityError && <div style={{ color: '#9f1d1d', fontSize: 12, background: '#fff0f0', padding: '6px 10px', borderRadius: 8, marginBottom: 10 }}>{activityError}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <FL label="Activity Name">
          <input value={newActivityForm.activity_name} onChange={e => setNewActivityForm((p: any) => ({ ...p, activity_name: e.target.value }))} placeholder="e.g. Fertiliser Application" required />
        </FL>
        <FL label="Type">
          <input value={newActivityForm.activity_type} onChange={e => setNewActivityForm((p: any) => ({ ...p, activity_type: e.target.value }))} placeholder="sowing, watering…" />
        </FL>
        <FL label="Priority">
          <select value={newActivityForm.priority} onChange={e => setNewActivityForm((p: any) => ({ ...p, priority: e.target.value }))}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </FL>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <FL label="Planned Start">
          <input type="date" value={newActivityForm.planned_start_date} onChange={e => setNewActivityForm((p: any) => ({ ...p, planned_start_date: e.target.value }))} />
        </FL>
        <FL label="Planned End">
          <input type="date" value={newActivityForm.planned_end_date} onChange={e => setNewActivityForm((p: any) => ({ ...p, planned_end_date: e.target.value }))} />
        </FL>
        <FL label="Assigned To">
          <input value={newActivityForm.assigned_to} onChange={e => setNewActivityForm((p: any) => ({ ...p, assigned_to: e.target.value }))} placeholder="Name or team" />
        </FL>
        <FL label="Est. Cost (₹)">
          <input type="number" min="0" value={newActivityForm.estimated_cost} onChange={e => setNewActivityForm((p: any) => ({ ...p, estimated_cost: e.target.value }))} />
        </FL>
      </div>
      <FL label="Remarks">
        <textarea rows={2} value={newActivityForm.remarks} onChange={e => setNewActivityForm((p: any) => ({ ...p, remarks: e.target.value }))} placeholder="Optional notes…" />
      </FL>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button type="submit" disabled={savingActivity}>{savingActivity ? 'Adding…' : 'Add Activity'}</button>
        <button type="button" onClick={() => { setShowAddActivityForCycle(null); setActivityError(''); setNewActivityForm(emptyActivity()); }}
          style={{ background: '#f0ece3', color: '#174a2a' }}>
          Cancel
        </button>
      </div>
    </form>
  );

  // Inline edit form for an existing activity
  const renderEditActivityForm = (act: CropActivity, cycleId: number) => (
    <div style={{ background: '#f4f1e8', border: '1px dashed #c5b89a', borderRadius: 14, padding: 16, marginBottom: 8 }}>
      <div style={{ fontWeight: 800, color: '#174a2a', fontSize: 13, marginBottom: 10 }}>Edit Activity</div>
      {activityEditError && <div style={{ color: '#9f1d1d', fontSize: 12, background: '#fff0f0', padding: '6px 10px', borderRadius: 8, marginBottom: 10 }}>{activityEditError}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <FL label="Activity Name">
          <input value={editActivityForm.activity_name} onChange={e => setEditActivityForm((p: any) => ({ ...p, activity_name: e.target.value }))} required />
        </FL>
        <FL label="Type">
          <input value={editActivityForm.activity_type || ''} onChange={e => setEditActivityForm((p: any) => ({ ...p, activity_type: e.target.value }))} />
        </FL>
        <FL label="Priority">
          <select value={editActivityForm.priority || 'medium'} onChange={e => setEditActivityForm((p: any) => ({ ...p, priority: e.target.value }))}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </FL>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <FL label="Planned Start">
          <input type="date" value={editActivityForm.planned_start_date || ''} onChange={e => setEditActivityForm((p: any) => ({ ...p, planned_start_date: e.target.value }))} />
        </FL>
        <FL label="Planned End">
          <input type="date" value={editActivityForm.planned_end_date || ''} onChange={e => setEditActivityForm((p: any) => ({ ...p, planned_end_date: e.target.value }))} />
        </FL>
        <FL label="Actual Start">
          <input type="date" value={editActivityForm.actual_start_date || ''} onChange={e => setEditActivityForm((p: any) => ({ ...p, actual_start_date: e.target.value }))} />
        </FL>
        <FL label="Actual End">
          <input type="date" value={editActivityForm.actual_end_date || ''} onChange={e => setEditActivityForm((p: any) => ({ ...p, actual_end_date: e.target.value }))} />
        </FL>
        <FL label="Status">
          <select value={editActivityForm.status || 'scheduled'} onChange={e => setEditActivityForm((p: any) => ({ ...p, status: e.target.value }))}>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="delayed">Delayed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </FL>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <FL label="Assigned To">
          <input value={editActivityForm.assigned_to || ''} onChange={e => setEditActivityForm((p: any) => ({ ...p, assigned_to: e.target.value }))} />
        </FL>
        <FL label="Est. Cost (₹)">
          <input type="number" min="0" value={editActivityForm.estimated_cost ?? ''} onChange={e => setEditActivityForm((p: any) => ({ ...p, estimated_cost: e.target.value }))} />
        </FL>
      </div>
      <FL label="Remarks">
        <textarea rows={2} value={editActivityForm.remarks || ''} onChange={e => setEditActivityForm((p: any) => ({ ...p, remarks: e.target.value }))} />
      </FL>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button onClick={() => saveActivityEdit(cycleId)} disabled={savingActivityEdit}>
          <Save size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />
          {savingActivityEdit ? 'Saving…' : 'Save'}
        </button>
        <button onClick={() => { setEditingActivityId(null); setActivityEditError(''); }}
          style={{ background: '#f0ece3', color: '#174a2a' }}>Cancel</button>
      </div>
    </div>
  );

  // Inline edit form for a cycle row
  const renderEditCycleForm = (cycle: CropCycle) => (
    <div style={{ padding: '16px 18px', background: '#f4f1e8' }}>
      {cycleEditError && <div style={{ color: '#9f1d1d', fontSize: 12, background: '#fff0f0', padding: '6px 10px', borderRadius: 8, marginBottom: 12 }}>{cycleEditError}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FL label="Crop Name">
          <input value={editCycleForm.crop_name} onChange={e => setEditCycleForm((p: any) => ({ ...p, crop_name: e.target.value }))} required />
        </FL>
        <FL label="Crop Type">
          <select value={editCycleForm.crop_type} onChange={e => setEditCycleForm((p: any) => ({ ...p, crop_type: e.target.value }))}>
            <option value="main">Main Crop</option>
            <option value="intercrop">Intercrop</option>
          </select>
        </FL>
        <FL label="Status">
          <select value={editCycleForm.status} onChange={e => setEditCycleForm((p: any) => ({ ...p, status: e.target.value }))}>
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </FL>
        <FL label="Cycle Year">
          <input type="number" value={editCycleForm.cycle_year ?? ''} onChange={e => setEditCycleForm((p: any) => ({ ...p, cycle_year: e.target.value }))} />
        </FL>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FL label="Start Date">
          <input type="date" value={editCycleForm.start_date} onChange={e => setEditCycleForm((p: any) => ({ ...p, start_date: e.target.value }))} required />
        </FL>
        <FL label="End Date">
          <input type="date" value={editCycleForm.end_date} onChange={e => setEditCycleForm((p: any) => ({ ...p, end_date: e.target.value }))} required />
        </FL>
        <FL label="Season Name">
          <input value={editCycleForm.season_name || ''} onChange={e => setEditCycleForm((p: any) => ({ ...p, season_name: e.target.value }))} />
        </FL>
        <FL label="Expected Yield">
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="number" style={{ flex: 1 }} value={editCycleForm.expected_yield ?? ''} onChange={e => setEditCycleForm((p: any) => ({ ...p, expected_yield: e.target.value }))} />
            <input style={{ width: 80 }} value={editCycleForm.expected_yield_unit || 'quintal'} onChange={e => setEditCycleForm((p: any) => ({ ...p, expected_yield_unit: e.target.value }))} placeholder="unit" />
          </div>
        </FL>
      </div>
      <FL label="Notes">
        <textarea rows={2} value={editCycleForm.notes || ''} onChange={e => setEditCycleForm((p: any) => ({ ...p, notes: e.target.value }))} />
      </FL>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button onClick={saveCycleEdit} disabled={savingCycleEdit}>
          <Save size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />
          {savingCycleEdit ? 'Saving…' : 'Save Cycle'}
        </button>
        <button onClick={() => { setEditingCycleId(null); setCycleEditError(''); }}
          style={{ background: '#f0ece3', color: '#174a2a' }}>Cancel</button>
      </div>
    </div>
  );

  return (
    <section>
      <div className="page-header">
        <span>Crop Planner</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1>Crop Cycles &amp; Activities</h1>
            <p>Plan crop timelines and schedule activity rosters for any project.</p>
          </div>
        </div>
      </div>

      {/* ── Project selector ── */}
      <div className="panel" style={{ marginBottom: 22, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontWeight: 800, color: '#75664b', fontSize: 14, whiteSpace: 'nowrap' }}>Project:</span>
        <select
          style={{ flex: 1, maxWidth: 480, fontWeight: 700 }}
          value={selectedProject?.id ?? ''}
          onChange={e => {
            const p = projects.find(p => p.id === Number(e.target.value));
            setSelectedProject(p || null);
          }}
        >
          {projects.length === 0 && <option>Loading…</option>}
          {projects.map(p => <option key={p.id} value={p.id}>{p.project_name} — {p.crop_name}</option>)}
        </select>
        {selectedProject && (
          <span className="badge green">{selectedProject.status}</span>
        )}
        {selectedProject?.project_start_date && (
          <span style={{ fontSize: 12, color: '#75664b' }}>
            📅 {selectedProject.project_start_date} → {selectedProject.project_end_date || '?'}
          </span>
        )}
      </div>

      {selectedProject && (
        <>
        <div className="panel" style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2 style={{ margin: 0 }}>
              Payout Schedule — {selectedProject.project_name}
              <span style={{ fontWeight: 400, fontSize: 14, color: '#75664b', marginLeft: 10 }}>
                ({payoutSchedules.length} {payoutSchedules.length === 1 ? 'schedule' : 'schedules'})
              </span>
            </h2>
            <button onClick={() => { setShowAddPayoutForm(v => !v); setPayoutError(''); setNewPayoutForm(emptyPayoutSchedule()); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {showAddPayoutForm ? <><X size={14} /> Cancel</> : <><CalendarPlus size={14} /> Add Payout Schedule</>}
            </button>
          </div>

          {payoutError && <div style={{ color: '#9f1d1d', fontSize: 12, background: '#fff0f0', padding: '6px 10px', borderRadius: 8, marginBottom: 12 }}>{payoutError}</div>}

          {showAddPayoutForm && (
            <form onSubmit={createPayoutSchedule} style={{ background: '#f4f1e8', border: '1px dashed #c5b89a', borderRadius: 14, padding: 18, marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr', gap: 12 }}>
                <FL label="Payout #"><input required type="number" value={newPayoutForm.payout_number} onChange={e => setNewPayoutForm((p: any) => ({ ...p, payout_number: e.target.value }))} /></FL>
                <FL label="Label"><input required value={newPayoutForm.label} onChange={e => setNewPayoutForm((p: any) => ({ ...p, label: e.target.value }))} placeholder="1st Payout" /></FL>
                <FL label="Date"><input required type="date" value={newPayoutForm.scheduled_date} onChange={e => setNewPayoutForm((p: any) => ({ ...p, scheduled_date: e.target.value }))} /></FL>
                <FL label="Amount"><input required type="number" value={newPayoutForm.expected_amount} onChange={e => setNewPayoutForm((p: any) => ({ ...p, expected_amount: e.target.value }))} /></FL>
                <FL label="Type"><select value={newPayoutForm.payout_type} onChange={e => setNewPayoutForm((p: any) => ({ ...p, payout_type: e.target.value }))}><option value="regular">Regular</option><option value="partial">Partial</option><option value="final">Final</option><option value="bonus">Bonus</option></select></FL>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button type="submit">Create Schedule</button>
                <button type="button" onClick={() => { setShowAddPayoutForm(false); setPayoutError(''); }} style={{ background: '#f0ece3', color: '#174a2a' }}>Cancel</button>
              </div>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {payoutSchedules.length === 0 && !showAddPayoutForm && (
              <p style={{ color: '#75664b', textAlign: 'center', padding: '20px 0' }}>No payout schedules yet. Click "Add Payout Schedule" to get started.</p>
            )}
            {payoutSchedules.map(schedule => (
              <div key={schedule.id} style={panelStyle}>
                {editingPayoutId === schedule.id ? (
                  <div style={{ padding: '16px 18px', background: '#f4f1e8' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr', gap: 12 }}>
                      <FL label="Payout #"><input type="number" value={editPayoutForm.payout_number} onChange={e => setEditPayoutForm((p: any) => ({ ...p, payout_number: e.target.value }))} /></FL>
                      <FL label="Label"><input value={editPayoutForm.label || ''} onChange={e => setEditPayoutForm((p: any) => ({ ...p, label: e.target.value }))} /></FL>
                      <FL label="Date"><input type="date" value={editPayoutForm.scheduled_date || ''} onChange={e => setEditPayoutForm((p: any) => ({ ...p, scheduled_date: e.target.value }))} /></FL>
                      <FL label="Amount"><input type="number" value={editPayoutForm.expected_amount ?? ''} onChange={e => setEditPayoutForm((p: any) => ({ ...p, expected_amount: e.target.value }))} /></FL>
                      <FL label="Type"><select value={editPayoutForm.payout_type || 'regular'} onChange={e => setEditPayoutForm((p: any) => ({ ...p, payout_type: e.target.value }))}><option value="regular">Regular</option><option value="partial">Partial</option><option value="final">Final</option><option value="bonus">Bonus</option></select></FL>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      <button onClick={savePayoutSchedule}><Save size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />Save</button>
                      <button onClick={() => setEditingPayoutId(null)} style={{ background: '#f0ece3', color: '#174a2a' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', gap: 12 }}>
                    <span className={`badge ${schedule.payout_type === 'final' ? 'gold' : 'green'}`}>{schedule.payout_type}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, color: '#174a2a', fontSize: 15 }}>{schedule.label}</div>
                      <div style={{ fontSize: 12, color: '#75664b', marginTop: 2 }}>
                        #{schedule.payout_number} · {schedule.scheduled_date} · ₹{Number(schedule.expected_amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <button onClick={() => startEditPayout(schedule)} style={{ background: '#e8f5e9', color: '#174a2a', padding: '6px 10px', borderRadius: 10, border: 'none', cursor: 'pointer' }}><Edit2 size={13} /></button>
                    <button className="danger-button" style={{ padding: '6px 10px', borderRadius: 10, fontSize: 12 }} onClick={() => deletePayoutSchedule(schedule.id)}><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          {/* ── Timeline header ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2 style={{ margin: 0 }}>
              Crop Timeline — {selectedProject.project_name}
              <span style={{ fontWeight: 400, fontSize: 14, color: '#75664b', marginLeft: 10 }}>
                ({cycles.length} {cycles.length === 1 ? 'cycle' : 'cycles'})
              </span>
            </h2>
            <button onClick={() => { setShowAddCycleForm(v => !v); setCycleError(''); setNewCycleForm(emptyCycle()); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {showAddCycleForm ? <><X size={14} /> Cancel</> : <><CalendarPlus size={14} /> Add Crop Cycle</>}
            </button>
          </div>

          {/* ── Add cycle inline form ── */}
          {showAddCycleForm && (
            <form onSubmit={createCycle} style={{ background: '#f4f1e8', border: '1px dashed #c5b89a', borderRadius: 14, padding: 18, marginBottom: 20 }}>
              <div style={{ fontWeight: 800, color: '#174a2a', fontSize: 14, marginBottom: 12 }}>New Crop Cycle</div>
              {cycleError && <div style={{ color: '#9f1d1d', fontSize: 12, background: '#fff0f0', padding: '6px 10px', borderRadius: 8, marginBottom: 12 }}>{cycleError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <FL label="Crop Name">
                  <input value={newCycleForm.crop_name} onChange={e => setNewCycleForm((p: any) => ({ ...p, crop_name: e.target.value }))} placeholder="e.g. Alphonso Mango" required />
                </FL>
                <FL label="Crop Type">
                  <select value={newCycleForm.crop_type} onChange={e => setNewCycleForm((p: any) => ({ ...p, crop_type: e.target.value }))}>
                    <option value="main">Main Crop</option>
                    <option value="intercrop">Intercrop</option>
                  </select>
                </FL>
                <FL label="Status">
                  <select value={newCycleForm.status} onChange={e => setNewCycleForm((p: any) => ({ ...p, status: e.target.value }))}>
                    <option value="planned">Planned</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                </FL>
                <FL label="Cycle Year">
                  <input type="number" value={newCycleForm.cycle_year} onChange={e => setNewCycleForm((p: any) => ({ ...p, cycle_year: e.target.value }))} placeholder="e.g. 1" />
                </FL>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <FL label="Start Date">
                  <input type="date" value={newCycleForm.start_date} onChange={e => setNewCycleForm((p: any) => ({ ...p, start_date: e.target.value }))} required />
                </FL>
                <FL label="End Date">
                  <input type="date" value={newCycleForm.end_date} onChange={e => setNewCycleForm((p: any) => ({ ...p, end_date: e.target.value }))} required />
                </FL>
                <FL label="Season Name">
                  <input value={newCycleForm.season_name} onChange={e => setNewCycleForm((p: any) => ({ ...p, season_name: e.target.value }))} placeholder="Kharif 2025" />
                </FL>
                <FL label="Expected Yield">
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="number" style={{ flex: 1 }} value={newCycleForm.expected_yield} onChange={e => setNewCycleForm((p: any) => ({ ...p, expected_yield: e.target.value }))} placeholder="0" />
                    <input style={{ width: 80 }} value={newCycleForm.expected_yield_unit} onChange={e => setNewCycleForm((p: any) => ({ ...p, expected_yield_unit: e.target.value }))} placeholder="unit" />
                  </div>
                </FL>
              </div>
              <FL label="Notes">
                <textarea rows={2} value={newCycleForm.notes} onChange={e => setNewCycleForm((p: any) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes about this cycle" />
              </FL>
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button type="submit" disabled={savingCycle}>{savingCycle ? 'Creating…' : 'Create Cycle'}</button>
                <button type="button" onClick={() => { setShowAddCycleForm(false); setCycleError(''); }}
                  style={{ background: '#f0ece3', color: '#174a2a' }}>Cancel</button>
              </div>
            </form>
          )}

          {/* ── Cycles list ── */}
          {cycles.length === 0 && !showAddCycleForm && (
            <p style={{ color: '#75664b', textAlign: 'center', padding: '30px 0' }}>
              No crop cycles yet. Click "Add Crop Cycle" to get started.
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cycles.map(cycle => (
              <div key={cycle.id} style={panelStyle}>

                {/* ── Cycle row: view or edit mode ── */}
                {editingCycleId === cycle.id ? (
                  renderEditCycleForm(cycle)
                ) : (
                  <div
                    style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', cursor: 'pointer', gap: 12 }}
                    onClick={() => toggleCycle(cycle.id)}
                  >
                    {/* Expand chevron */}
                    <div onClick={e => { e.stopPropagation(); toggleCycle(cycle.id); }}>
                      {expandedCycleId === cycle.id
                        ? <ChevronDown size={17} color="#174a2a" />
                        : <ChevronRight size={17} color="#75664b" />}
                    </div>

                    {/* Type badge */}
                    <span className={`badge ${cycle.crop_type === 'main' ? 'green' : 'gold'}`}>
                      {cycle.crop_type === 'main' ? 'Main' : 'Intercrop'}
                    </span>

                    {/* Name + dates */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, color: '#174a2a', fontSize: 15 }}>{cycle.crop_name}</div>
                      <div style={{ fontSize: 12, color: '#75664b', marginTop: 2 }}>
                        {cycle.start_date} → {cycle.end_date}
                        {cycle.season_name ? ` · ${cycle.season_name}` : ''}
                        {cycle.cycle_year ? ` · Year ${cycle.cycle_year}` : ''}
                        {cycle.expected_yield ? ` · Yield: ${cycle.expected_yield} ${cycle.expected_yield_unit || ''}` : ''}
                      </div>
                    </div>

                    {/* Status */}
                    <span className="badge gray" style={{ fontSize: 11 }}>{cycle.status}</span>

                    {/* Activity count hint */}
                    <span style={{ fontSize: 12, color: '#75664b', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ClipboardList size={13} /> Activities
                    </span>

                    {/* Edit / Delete */}
                    <button
                      onClick={e => { e.stopPropagation(); startEditCycle(cycle); }}
                      style={{ background: '#e8f5e9', color: '#174a2a', padding: '6px 10px', borderRadius: 10, border: 'none', cursor: 'pointer' }}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="danger-button"
                      style={{ padding: '6px 10px', borderRadius: 10, fontSize: 12 }}
                      onClick={e => { e.stopPropagation(); deleteCycle(cycle.id); }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                {/* ── Activity roster (expanded) ── */}
                {expandedCycleId === cycle.id && editingCycleId !== cycle.id && (
                  <div style={{ borderTop: '1px solid #e9e2d2', padding: '14px 18px', background: '#faf8f1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: 14, color: '#174a2a' }}>
                        <ClipboardList size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                        Activity Roster
                      </h3>
                      <button
                        onClick={() => {
                          setShowAddActivityForCycle(showAddActivityForCycle === cycle.id ? null : cycle.id);
                          setActivityError('');
                          setNewActivityForm(emptyActivity());
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                      >
                        {showAddActivityForCycle === cycle.id
                          ? <><X size={12} /> Cancel</>
                          : <><Plus size={12} /> Add Activity</>}
                      </button>
                    </div>

                    {/* Add activity form */}
                    {showAddActivityForCycle === cycle.id && renderAddActivityForm(cycle.id)}

                    {/* Activity rows */}
                    {(activities[cycle.id] || []).length === 0 && showAddActivityForCycle !== cycle.id && (
                      <p style={{ color: '#75664b', fontSize: 13, margin: 0 }}>No activities yet. Click "Add Activity" to create one.</p>
                    )}

                    {(activities[cycle.id] || []).map(act => (
                      <div key={act.id}>
                        {editingActivityId === act.id ? (
                          renderEditActivityForm(act, cycle.id)
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #e9e2d2', borderRadius: 10, padding: '6px 10px', marginBottom: 6, gap: 8, minHeight: 0 }}>
                            {/* Priority badge */}
                            <span style={{ ...priorityStyle(act.priority || 'medium'), borderRadius: 6, padding: '1px 7px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                              {act.priority || 'medium'}
                            </span>

                            {/* Activity name */}
                            <span style={{ fontWeight: 800, fontSize: 13, color: '#174a2a', whiteSpace: 'nowrap', flexShrink: 0 }}>
                              {act.activity_name}
                            </span>

                            {/* Dates + meta — fills remaining space, truncates if needed */}
                            <span style={{ fontSize: 11, color: '#75664b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {act.planned_start_date || 'TBD'} → {act.planned_end_date || 'TBD'}
                              {act.activity_type ? ` · ${act.activity_type}` : ''}
                              {act.assigned_to ? ` · ${act.assigned_to}` : ''}
                              {act.estimated_cost ? ` · ₹${act.estimated_cost}` : ''}
                            </span>

                            {/* Status quick-change */}
                            <select
                              value={act.status}
                              onChange={e => updateActivityStatus(cycle.id, act.id, e.target.value)}
                              style={{ fontSize: 11, padding: '3px 6px', borderRadius: 7, border: '1px solid #d4ccbc', flexShrink: 0, width: 112 }}
                              onClick={e => e.stopPropagation()}
                            >
                              <option value="scheduled">Scheduled</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="delayed">Delayed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>

                            {/* Edit */}
                            <button
                              onClick={() => startEditActivity(act)}
                              style={{ background: '#e8f5e9', color: '#174a2a', padding: '4px 7px', borderRadius: 7, border: 'none', cursor: 'pointer', flexShrink: 0 }}
                            >
                              <Edit2 size={11} />
                            </button>

                            {/* Delete */}
                            <button
                              className="danger-button"
                              style={{ padding: '4px 7px', borderRadius: 7, fontSize: 11, flexShrink: 0 }}
                              onClick={() => deleteActivity(cycle.id, act.id)}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        </>
      )}
    </section>
  );
}
