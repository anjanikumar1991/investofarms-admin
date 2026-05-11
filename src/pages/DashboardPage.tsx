import { useEffect, useState } from 'react';
import { Activity, FolderKanban, Sprout, TrendingUp } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { FarmProject } from '../types';

export function DashboardPage() {
  const [projects, setProjects] = useState<FarmProject[]>([]);

  useEffect(() => {
    api.get('/admin/farm-projects/').then((response) => setProjects(unwrap<FarmProject[]>(response) || [])).catch(() => setProjects([]));
  }, []);

  const openProjects = projects.filter((project) => project.status === 'open').length;
  const avgRoi = projects.length ? (projects.reduce((sum, project) => sum + Number(project.roi_percentage || 0), 0) / projects.length).toFixed(1) : '0';

  return (
    <section>
      <div className="page-header">
        <span>Operations Overview</span>
        <h1>Admin Dashboard</h1>
        <p>Monitor portfolio health and manage farm investment operations.</p>
      </div>
      <div className="stats-grid">
        <div className="stat-card"><FolderKanban /><span>Total Projects</span><strong>{projects.length}</strong></div>
        <div className="stat-card"><Sprout /><span>Open Projects</span><strong>{openProjects}</strong></div>
        <div className="stat-card"><TrendingUp /><span>Average ROI</span><strong>{avgRoi}%</strong></div>
        <div className="stat-card"><Activity /><span>Planner</span><strong>Live</strong></div>
      </div>
      <div className="panel">
        <h2>Recent Projects</h2>
        <div className="project-grid">
          {projects.slice(0, 6).map((project) => (
            <div className="mini-project" key={project.id}>
              <strong>{project.project_name}</strong>
              <span>{project.crop_name} • {project.roi_percentage}% ROI</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
