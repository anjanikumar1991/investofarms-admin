import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarPlus } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { CropCycle } from '../types';

const emptyCycle = {
  crop_name: '',
  crop_type: 'main',
  start_date: '',
  end_date: '',
  season_name: '',
  cycle_year: 1,
  expected_yield: '',
  expected_yield_unit: 'quintal',
  notes: '',
  status: 'planned',
};

export function ProjectPlannerPage() {
  const { projectId } = useParams();
  const [cycles, setCycles] = useState<CropCycle[]>([]);
  const [form, setForm] = useState<any>(emptyCycle);
  const [message, setMessage] = useState('');

  const loadCycles = async () => {
    const response = await api.get(`/v1/projects/${projectId}/crop-cycles`);
    setCycles(unwrap<CropCycle[]>(response) || []);
  };

  useEffect(() => { loadCycles(); }, [projectId]);

  const createCycle = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    try {
      await api.post(`/v1/admin/projects/${projectId}/crop-cycles`, {
        ...form,
        cycle_year: Number(form.cycle_year),
        expected_yield: form.expected_yield ? Number(form.expected_yield) : null,
      });
      setForm(emptyCycle);
      await loadCycles();
    } catch (error: any) {
      setMessage(error?.response?.data?.detail || 'Unable to create crop cycle');
    }
  };

  const deleteCycle = async (cycleId: number) => {
    await api.delete(`/v1/admin/project-crop-cycles/${cycleId}`);
    await loadCycles();
  };

  return (
    <section>
      <div className="page-header"><span>Project Planner</span><h1>Crop Timeline</h1><p>Plan main crops and intercrops across the project duration.</p></div>
      <div className="two-column">
        <form className="panel form-panel" onSubmit={createCycle}>
          <h2><CalendarPlus size={18} /> Add Crop Cycle</h2>
          {message && <div className="error-box">{message}</div>}
          <input placeholder="Crop name" value={form.crop_name} onChange={(e) => setForm({ ...form, crop_name: e.target.value })} required />
          <select value={form.crop_type} onChange={(e) => setForm({ ...form, crop_type: e.target.value })}>
            <option value="main">Main Crop</option>
            <option value="intercrop">Intercrop</option>
          </select>
          <div className="form-grid">
            <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
            <input placeholder="Season" value={form.season_name} onChange={(e) => setForm({ ...form, season_name: e.target.value })} />
            <input type="number" placeholder="Year" value={form.cycle_year} onChange={(e) => setForm({ ...form, cycle_year: e.target.value })} />
            <input type="number" placeholder="Expected yield" value={form.expected_yield} onChange={(e) => setForm({ ...form, expected_yield: e.target.value })} />
            <input placeholder="Yield unit" value={form.expected_yield_unit} onChange={(e) => setForm({ ...form, expected_yield_unit: e.target.value })} />
          </div>
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button>Create Cycle</button>
        </form>
        <div className="panel wide-panel">
          <h2>Timeline</h2>
          <div className="timeline-list">
            {cycles.map((cycle) => (
              <div className="cycle-card" key={cycle.id}>
                <div>
                  <span className={`badge ${cycle.crop_type === 'main' ? 'green' : 'gold'}`}>{cycle.crop_type}</span>
                  <h3>{cycle.crop_name}</h3>
                  <p>{cycle.start_date} → {cycle.end_date} • {cycle.season_name || 'No season'}</p>
                </div>
                <div className="row-actions">
                  <Link className="link-button" to={`/cycles/${cycle.id}/activities`}>Activities</Link>
                  <button className="danger-button" onClick={() => deleteCycle(cycle.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
