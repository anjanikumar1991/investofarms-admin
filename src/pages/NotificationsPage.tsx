import { FormEvent, useEffect, useState } from 'react';
import { api, unwrap } from '../api/client';

type FarmProject = { id: number; project_name: string };
type Notification = {
  id: number;
  title: string;
  message: string;
  type: string;
  category: string;
  image_emoji: string;
  project_id?: number | null;
  user_id?: number | null;
  created_at?: string;
};

const CATEGORIES = ['general', 'harvest', 'irrigation', 'financial', 'weather', 'alert'];

export function NotificationsPage() {
  const [projects, setProjects] = useState<FarmProject[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [emoji, setEmoji] = useState('🌱');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [projectRows, notificationRows] = await Promise.all([
        api.get('/admin/farm-projects/').then(unwrap<FarmProject[]>),
        api.get('/admin/notifications').then(unwrap<Notification[]>),
      ]);
      setProjects(projectRows ?? []);
      setNotifications(notificationRows ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function sendBroadcast(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    await api.post('/admin/notifications/broadcast', {
      title: title.trim(),
      message: message.trim(),
      type: projectId ? 'project_update' : 'broadcast',
      category,
      image_emoji: emoji || '🌱',
      project_id: projectId ? Number(projectId) : null,
    });
    setTitle('');
    setMessage('');
    setProjectId('');
    setCategory('general');
    setEmoji('🌱');
    await fetchData();
  }

  return (
    <div>
      <header className="page-header">
        <span>Communications</span>
        <h1>Notifications</h1>
        <p>Broadcast app-level announcements or project-specific updates to investors.</p>
      </header>

      <section className="panel">
        <h2>Create Broadcast</h2>
        <form className="form-grid" onSubmit={sendBroadcast}>
          <label>
            Scope
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">App-level broadcast</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.project_name}</option>
              ))}
            </select>
          </label>
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Emoji
            <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} />
          </label>
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Harvest update" />
          </label>
          <label className="full-width">
            Message
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Write the notification message" />
          </label>
          <div className="form-actions full-width">
            <button type="submit" disabled={loading || !title.trim() || !message.trim()}>Send Notification</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Recent Notifications</h2>
        {loading ? <p>Loading...</p> : (
          <table className="data-table">
            <thead>
              <tr><th>Title</th><th>Scope</th><th>Category</th><th>Created</th></tr>
            </thead>
            <tbody>
              {notifications.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.image_emoji} {item.title}</strong><br /><span>{item.message}</span></td>
                  <td>{item.project_id ? `Project #${item.project_id}` : 'App'}</td>
                  <td>{item.category}</td>
                  <td>{item.created_at ? new Date(item.created_at).toLocaleString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
