import React, { useEffect, useState } from 'react';
import { Eye, Pencil, LayoutGrid } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
  inProgress: 'En cours',
  validation: 'Validation',
};

const CoordinatorDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProjectSlice, setActiveProjectSlice] = useState(null);

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

  const escapeCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const downloadCsv = (filename, headers, rows) => {
    const csv = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const exportRapportAvancement = () => {
    const overview = data.projectsOverview || [];
    const headers = ['Projet', 'Client', 'Responsable', 'Statut', 'Avancement %', 'Tâches terminées', 'Tâches total', 'Échéance', 'Heures estimées', 'Heures réalisées'];
    const rows = overview.map((p) => [
      p.name,
      p.client || '-',
      p.manager || '-',
      p.status || '-',
      p.progress ?? 0,
      p.doneTasks ?? 0,
      p.totalTasks ?? 0,
      p.deadline ? new Date(p.deadline).toLocaleDateString('fr-FR') : '-',
      p.estimatedHours ?? 0,
      p.actualHours ?? 0,
    ]);
    downloadCsv('rapport-avancement-coordinateur.csv', headers, rows);
  };
  const exportRapportTemps = () => {
    const report = data.timeReport || [];
    const headers = ['Projet', 'Tâche', 'Assigné(s)', 'Heures estimées', 'Heures réalisées'];
    const rows = report.map((r) => [r.project || '-', r.task || '-', r.assignedTo || '-', r.estimatedHours ?? 0, r.actualHours ?? 0]);
    downloadCsv('rapport-temps-coordinateur.csv', headers, rows);
  };

  if (loading) return <div className="dashboard-loading">Chargement...</div>;
  if (!data) return <div className="dashboard-error">Erreur lors du chargement</div>;

  const COLORS = ['rgb(223, 48, 0)', 'rgb(0, 67, 115)', 'rgb(20, 163, 214)', 'rgb(255, 145, 37)', 'rgb(114, 224, 232)'];
  const kpis = data.kpis || {};

  const renderChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="chart-tooltip">
        {label && <div className="chart-tooltip-label">{label}</div>}
        {payload.map((entry, index) => (
          <div key={index} className="chart-tooltip-item">
            <span className="chart-tooltip-name">{entry.name}</span>
            <span className="chart-tooltip-value">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard Coordinatrice</h1>
        <p>Supervision opérationnelle globale, ressources et avancement multi-projets</p>
      </div>

      {/* Section Gérer projet et tâches */}
      <div className="table-section coordinator-gerer-section">
        <h3>Projets et tâches</h3>
        <p className="muted">
          Création et configuration de projets, affectation des ressources, planification (jalons, sprints). Gestion des tâches : création, modification et suivi dans chaque projet (Vue liste, Kanban, Gantt).
        </p>
        <div className="manager-task-actions coordinator-gerer-actions">
          <Link to="/projects" className="btn-dashboard">Projets — suivi avancement</Link>
          <Link to="/kanban" className="btn-dashboard btn-dashboard-secondary">Kanban — tâches</Link>
          <Link to="/projects" className="btn-dashboard btn-dashboard-secondary">Affecter ressources</Link>
          <Link to="/projects/new" className="btn-dashboard btn-dashboard-secondary">Créer un projet</Link>
          <Link to="/clients/new" className="btn-dashboard btn-dashboard-secondary">Créer un client</Link>
          <Link to="/projects" className="btn-dashboard btn-dashboard-secondary">Créer / modifier tâches</Link>
          <Link to="/projects" className="btn-dashboard btn-dashboard-secondary">Documents & communication</Link>
          <span className="coordinator-reports-wrap">
            <span className="coordinator-reports-label">Rapports :</span>
            <button type="button" className="btn-dashboard btn-dashboard-secondary" onClick={exportRapportAvancement}>Export avancement (CSV)</button>
            <button type="button" className="btn-dashboard btn-dashboard-secondary" onClick={exportRapportTemps}>Export temps (CSV)</button>
          </span>
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
          <div className="kpi-card kpi-widget"><KpiIcon name="folder" /><div className="kpi-content"><h3>Projets actifs</h3><p className="kpi-value">{kpis.totalActiveProjects ?? 0}</p></div></div>
        </div>
        <div key="kpi-2" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card kpi-widget"><KpiIcon name="warning" /><div className="kpi-content"><h3>Projets en retard</h3><p className="kpi-value">{kpis.overdueProjects ?? 0}</p></div></div>
        </div>
        <div key="kpi-3" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card kpi-widget"><KpiIcon name="clock" /><div className="kpi-content"><h3>Proches deadline</h3><p className="kpi-value">{kpis.nearDeadlineProjects ?? 0}</p></div></div>
        </div>
        <div key="kpi-4" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card kpi-widget"><KpiIcon name="users" /><div className="kpi-content"><h3>Charge globale</h3><p className="kpi-value">{kpis.globalTeamLoad ?? 0}</p></div></div>
        </div>
        <div key="kpi-5" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card kpi-widget"><KpiIcon name="chart" /><div className="kpi-content"><h3>Taux occupation</h3><p className="kpi-value">{kpis.occupancyRate ?? 0}%</p></div></div>
        </div>
        <div key="kpi-6" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card kpi-widget"><KpiIcon name="clock" /><div className="kpi-content"><h3>Temps (estimé/réel)</h3><p className="kpi-value">{kpis.estimatedHours ?? 0}h / {kpis.consumedHours ?? 0}h</p></div></div>
        </div>
        <div key="chart-1" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="chart-card chart-card-coordinator-pie">
            <h3>Répartition des projets actifs</h3>
            {(data.projectsByStatus || []).length > 0 ? (
              <div className="chart-card-inner chart-card-inner-pie">
                <ResponsiveContainer width="100%" height={340} minHeight={320}>
                  <PieChart margin={{ top: 20, right: 24, bottom: 64, left: 24 }}>
                    <Pie
                      data={data.projectsByStatus.map((s) => ({ ...s, label: STATUS_LABELS[s._id] || s._id }))}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="42%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={2}
                      stroke="var(--surface)"
                      strokeWidth={2}
                      label={({ label, percent }) => (percent >= 0.01 ? `${label} ${(percent * 100).toFixed(0)}%` : '')}
                      labelLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1 }}
                      isAnimationActive
                      animationDuration={800}
                      activeIndex={activeProjectSlice}
                      onMouseEnter={(_, index) => setActiveProjectSlice(index)}
                    >
                      {(data.projectsByStatus || []).map((entry, idx) => (
                        <Cell key={entry._id || idx} fill={['#94a3b8', '#f59e0b', '#0ea5e9', '#8b5cf6', '#22c55e', '#64748b'][idx % 6]} />
                      ))}
                    </Pie>
                    <Tooltip content={renderChartTooltip} />
                    <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: 12, paddingBottom: 4 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="chart-empty">Pas de données</p>}
          </div>
        </div>
        <div key="chart-2" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="chart-card">
            <h3>Répartition des ressources</h3>
            {(data.resourceDistribution || []).length > 0 ? (
              <div className="chart-card-inner">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={(data.resourceDistribution || []).slice(0, 12)}
                    barCategoryGap={20}
                    barGap={8}
                    margin={{ top: 12, right: 20, bottom: 32, left: 12 }}
                  >
                    <defs>
                      <linearGradient id="coordBarResources" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" />
                        <stop offset="100%" stopColor="var(--primary-hover, #c23d14)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="name" angle={-35} textAnchor="end" height={72} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                    <YAxis width={32} allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                    <Tooltip content={renderChartTooltip} />
                    <Bar dataKey="openTasks" name="Tâches ouvertes" fill="url(#coordBarResources)" radius={[8, 8, 0, 0]} maxBarSize={48} animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
                      <Link to={`/projects/${p._id}`} className="btn-icon" title="Voir"><Eye size={18} /></Link>
                      <Link to={`/projects/edit/${p._id}`} className="btn-icon" title="Modifier"><Pencil size={18} /></Link>
                      <Link to={`/projects/${p._id}/kanban`} className="btn-icon" title="Kanban"><LayoutGrid size={18} /></Link>
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
