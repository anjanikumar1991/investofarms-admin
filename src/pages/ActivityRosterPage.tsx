import { FormEvent, useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { api, unwrap } from '../api/client';
import { CropActivity } from '../types';

const emptyActivity = {
  activity_name: '',
  activity_type: 'sowing',
  planned_start_date: '',
  planned_end_date: '',
  priority: 'medium',
  status: 'scheduled',
  assigned_to: '',
  estimated_cost: '',
  remarks: '',
};

export function ActivityRosterPage() {
  const { cycleId } = useParams();
  const [activities, setActivities] = useState<CropActivity[]>([]);
  const [form, setForm] = useState<any>(emptyActivity);

  const loadActivities = async () => {
    const response = await api.get(`/v1/project-crop-cycles/${cycleId}/activities`);
    setActivities(unwrap<CropActivity[]>(response) || []);
  };

  useEffect(() => { loadActivities(); }, [cycleId]);

  const createActivity = async (event: FormEvent) => {
    event.preventDefault();
    await api.post(`/v1/admin/project-crop-cycles/${cycleId}/activities`, {
      ...form,
      estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null,
    });
    setForm(emptyActivity);
    await loadActivities();
  };

  const updateStatus = async (activity: CropActivity, status: string) => {
    await api.patch(`/v1/admin/project-crop-activities/${activity.id}`, { status });
    await loadActivities();
  };

  return (
    <section>
      <div className="page-header"><span>Activity Roster</span><h1>Crop Operations</h1><p>Schedule and track activity execution for this crop cycle.</p></div>
      <div className="two-column">
        <form className="panel form-panel" onSubmit={createActivity}>
          <h2><ClipboardList size={18} /> Add Activity</h2>
          <input placeholder="Activity name" value={form.activity_name} onChange={(e) => setForm({ ...form, activity_name: e.target.value })} required />
          <div className="form-grid">
            <input placeholder="Type" value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })} />
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option>low</option><option>medium</option><option>high</option><option>critical</option></select>
            <input type="date" value={form.planned_start_date} onChange={(e) => setForm({ ...form, planned_start_date: e.target.value })} />
            <input type="date" value={form.planned_end_date} onChange={(e) => setForm({ ...form, planned_end_date: e.target.value })} />
            <input placeholder="Assigned to" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
            <input type="number" placeholder="Estimated cost" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })} />
          </div>
          <textarea placeholder="Remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          <button>Add Activity</button>
        </form>
        <div className="panel wide-panel">
          <h2>Roster</h2>
          <div className="timeline-list">
            {activities.map((activity) => (
              <div className="cycle-card" key={activity.id}>
                <div>
                  <span className="badge gold">{activity.priority || 'medium'}</span>
                  <h3>{activity.activity_name}</h3>
                  <p>{activity.planned_start_date || 'No date'} → {activity.planned_end_date || 'No end'} • {activity.status}</p>
                </div>
                <select value={activity.status} onChange={(e) => updateStatus(activity, e.target.value)}>
                  <option>scheduled</option><option>in_progress</option><option>completed</option><option>delayed</option><option>cancelled</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
