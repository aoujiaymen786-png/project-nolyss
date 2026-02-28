import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardWidgetGrid from './DashboardWidgetGrid';
import KpiIcon from '../UI/KpiIcon';
import './Dashboard.css';

const COORDINATOR_WIDGET_LAYOUT = [
  { i: 'kpi-1', x: 0, y: 0, w: 2, h: 2 },
  { i: 'kpi-2', x: 2, y: 0, w: 2, h: 2 },
  { i: 'kpi-3', x: 4, y: 0, w: 2, h: 2 },
  { i: 'kpi-4', x: 6, y: 0, w: 2, h: 2 },
  { i: 'kpi-5', x: 8, y: 0, w: 2, h: 2 },
  { i: 'kpi-6', x: 10, y: 0, w: 2, h: 2 },
  { i: 'chart-1', x: 0, y: 2, w: 6, h: 4 },
  { i: 'chart-2', x: 6, y: 2, w: 6, h: 4 },
];

const STATUS_LABELS = {
  prospecting: 'Prospection',
  quotation: 'Devis',
  inProgress: 'En cours',
  validation: 'Validation',
};

const CoordinatorDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resStats, resProjects] = await Promise.all([
          API.get('/dashboard/coordinator-stats'),
          API.get('/projects'),
        ]);
        setData(resStats.data);
        setProjects(resProjects.data || []);
      } catch (error) {
        console.error('Erreur dashboard coordinatrice:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="dashboard-loading">Chargement...</div>;
  if (!data) return <div className="dashboard-error">Erreur lors du chargement</div>;

  const COLORS = ['rgb(223, 48, 0)', 'rgb(0, 67, 115)', 'rgb(20, 163, 214)', 'rgb(255, 145, 37)', 'rgb(114, 224, 232)'];
  const kpis = data.kpis || {};

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard Coordinatrice</h1>
        <p>Supervision opérationnelle globale, ressources et avancement multi-projets</p>
      </div>

      {/* Section Gérer projet */}
      <div className="table-section coordinator-gerer-section">
        <h3>Gérer projet</h3>
        <p className="muted">
         
        </p>
        <div className="manager-task-actions coordinator-gerer-actions">
          <Link to="/projects" className="btn-dashboard">Suivre avancement</Link>
          <Link to="/kanban" className="btn-dashboard btn-dashboard-secondary">Planifier / Kanban</Link>
          <Link to="/projects" className="btn-dashboard btn-dashboard-secondary">Affecter ressources</Link>
          <Link to="/projects/new" className="btn-dashboard btn-dashboard-secondary">Créer un projet</Link>
          <Link to="/clients/new" className="btn-dashboard btn-dashboard-secondary">Créer un client</Link>
          
          
          <select
            className="manager-create-task-select coordinator-select-project"
            defaultValue=""
            onChange={(e) => {
              const id = e.target.value;
              if (id) navigate(`/projects/edit/${id}`);
            }}
          >
            <option value="">Modifier projet</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <DashboardWidgetGrid storageKey="coordinator" defaultLayout={COORDINATOR_WIDGET_LAYOUT}>
        <div key="kpi-1" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card"><KpiIcon name="folder" /><div className="kpi-content"><h3>Projets actifs</h3><p className="kpi-value">{kpis.totalActiveProjects ?? 0}</p></div></div>
        </div>
        <div key="kpi-2" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card"><KpiIcon name="warning" /><div className="kpi-content"><h3>Projets en retard</h3><p className="kpi-value">{kpis.overdueProjects ?? 0}</p></div></div>
        </div>
        <div key="kpi-3" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card"><KpiIcon name="clock" /><div className="kpi-content"><h3>Proches deadline</h3><p className="kpi-value">{kpis.nearDeadlineProjects ?? 0}</p></div></div>
        </div>
        <div key="kpi-4" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card"><KpiIcon name="users" /><div className="kpi-content"><h3>Charge globale</h3><p className="kpi-value">{kpis.globalTeamLoad ?? 0}</p></div></div>
        </div>
        <div key="kpi-5" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card"><KpiIcon name="chart" /><div className="kpi-content"><h3>Taux occupation</h3><p className="kpi-value">{kpis.occupancyRate ?? 0}%</p></div></div>
        </div>
        <div key="kpi-6" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card"><KpiIcon name="clock" /><div className="kpi-content"><h3>Temps (estimé/réel)</h3><p className="kpi-value">{kpis.estimatedHours ?? 0}h / {kpis.consumedHours ?? 0}h</p></div></div>
        </div>
        <div key="chart-1" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="chart-card">
            <h3>Répartition des projets actifs</h3>
            {(data.projectsByStatus || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data.projectsByStatus.map((s) => ({ ...s, label: STATUS_LABELS[s._id] || s._id }))} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90} label>
                    {(data.projectsByStatus || []).map((entry, idx) => <Cell key={entry._id || idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="chart-empty">Pas de données</p>}
          </div>
        </div>
        <div key="chart-2" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="chart-card">
            <h3>Répartition des ressources</h3>
            {(data.resourceDistribution || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={(data.resourceDistribution || []).slice(0, 12)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-30} textAnchor="end" height={70} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="openTasks" fill="rgb(223, 48, 0)" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="chart-empty">Pas de données</p>}
          </div>
        </div>
      </DashboardWidgetGrid>

      <div className="table-section">
        <h3> Projets critiques</h3>
        {(data.criticalProjects || []).length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Projet</th>
                  <th>Client</th>
                  <th>Manager</th>
                  <th>Statut</th>
                  <th>Progression</th>
                  <th>Deadline</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data.criticalProjects || []).map((p) => (
                  <tr key={p._id}>
                    <td><Link to={`/projects/${p._id}`} className="project-name-link">{p.name}</Link></td>
                    <td>{p.client || 'N/A'}</td>
                    <td>{p.manager || 'N/A'}</td>
                    <td><span className={`status-${(p.status || '').toLowerCase()}`}>{STATUS_LABELS[p.status] || p.status}</span></td>
                    <td>{p.progress ?? 0}%</td>
                    <td>{p.deadline ? new Date(p.deadline).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="manager-project-actions">
                      <Link to={`/projects/${p._id}`}>Voir</Link>
                      <Link to={`/projects/edit/${p._id}`}>Modifier</Link>
                      <Link to={`/projects/${p._id}/kanban`}>Kanban</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>Aucun projet critique</p>}
      </div>

      <div className="table-section">
        <h3>Alertes retards</h3>
        {(data.delayAlerts || []).length > 0 ? (
          <ul className="notifications-list">
            {(data.delayAlerts || []).map((a, idx) => (
              <li key={idx}>{a.title}{a.project ? ` (${a.project})` : ''} — {a.date ? new Date(a.date).toLocaleDateString('fr-FR') : '—'}</li>
            ))}
          </ul>
        ) : <p>Aucune alerte de retard</p>}
      </div>

      <div className="table-section">
        <h3> Prochaines échéances</h3>
        {(data.upcomingDeadlines || []).length > 0 ? (
          <ul className="notifications-list">
            {(data.upcomingDeadlines || []).map((d, idx) => (
              <li key={idx}>{d.type === 'project' ? 'Projet' : 'Tâche'} — {d.name}{d.project ? ` (${d.project})` : ''} — {d.date ? new Date(d.date).toLocaleDateString('fr-FR') : '—'}</li>
            ))}
          </ul>
        ) : <p>Aucune échéance à venir</p>}
      </div>

      <div className="table-section">
        <h3> Activité récente</h3>
        {(data.recentActivity || []).length > 0 ? (
          <ul className="notifications-list">
            {(data.recentActivity || []).map((e, idx) => (
              <li key={idx}>{e.text}{e.project ? ` (${e.project})` : ''} — {e.date ? new Date(e.date).toLocaleDateString('fr-FR') : '—'}</li>
            ))}
          </ul>
        ) : <p>Pas d’activité récente</p>}
      </div>
    </div>
  );
};

export default CoordinatorDashboard;
