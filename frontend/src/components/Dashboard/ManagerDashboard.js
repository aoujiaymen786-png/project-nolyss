import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import API from '../../utils/api';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DashboardWidgetGrid from './DashboardWidgetGrid';
import KpiIcon from '../UI/KpiIcon';
import { MessageSquare } from 'lucide-react';
import './Dashboard.css';

const MANAGER_WIDGET_LAYOUT = [
  { i: 'kpi-1', x: 0, y: 0, w: 2, h: 2 },
  { i: 'kpi-2', x: 2, y: 0, w: 2, h: 2 },
  { i: 'kpi-3', x: 4, y: 0, w: 2, h: 2 },
  { i: 'kpi-4', x: 6, y: 0, w: 2, h: 2 },
  { i: 'kpi-5', x: 8, y: 0, w: 2, h: 2 },
  { i: 'kpi-6', x: 10, y: 0, w: 2, h: 2 },
  { i: 'chart-1', x: 0, y: 2, w: 4, h: 4 },
  { i: 'chart-2', x: 4, y: 2, w: 4, h: 4 },
  { i: 'chart-3', x: 8, y: 2, w: 4, h: 4 },
];

const PROJECT_STATUS_LABELS = {
  prospecting: 'Prospection',
  quotation: 'Devis',
  inProgress: 'En cours',
  validation: 'Validation',
  completed: 'Terminé',
  archived: 'Archivé',
};

const TASK_STATUS_LABELS = {
  todo: 'A faire',
  inProgress: 'En cours',
  review: 'En review',
  done: 'Terminé',
};

const PRIORITY_LABELS = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
};

const ManagerDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyProjectsStats = async () => {
      try {
        const { data } = await API.get('/dashboard/my-projects-stats');
        setStats(data);
        setLoading(false);
      } catch (error) {
        console.error('Erreur stats manager:', error);
        setLoading(false);
      }
    };
    fetchMyProjectsStats();
  }, [user]);

  if (loading) return <div className="dashboard-loading">Chargement...</div>;
  if (!stats) return <div className="dashboard-error">Erreur lors du chargement</div>;

  const COLORS = ['rgb(223, 48, 0)', 'rgb(255, 145, 37)', 'rgb(0, 67, 115)', 'rgb(20, 163, 214)', 'rgb(114, 224, 232)'];
  const tasksByStatusForChart = (stats.tasksByStatus || []).map((s) => ({
    ...s,
    label: TASK_STATUS_LABELS[s._id] || s._id,
  }));

  const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const downloadCsv = (filename, headers, rows) => {
    const csvContent = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTeamLoadCsv = () => {
    const headers = ['Membre', 'Nombre de tâches'];
    const rows = (stats.tasksByMember || []).map((m) => [m.member || '-', m.taskCount || 0]);
    downloadCsv('rapport-charge-equipe.csv', headers, rows);
  };

  const exportProjectProgressCsv = () => {
    const headers = ['Projet', 'Client', 'Statut', 'Progression (%)', 'Tâches', 'Échéance'];
    const rows = (stats.myProjects || []).map((p) => [
      p.name,
      p.client?.name || '-',
      PROJECT_STATUS_LABELS[p.status] || p.status,
      p.progressPercentage || 0,
      p.taskCount || 0,
      p.deadline ? new Date(p.deadline).toLocaleDateString('fr-FR') : (p.endDate ? new Date(p.endDate).toLocaleDateString('fr-FR') : '-'),
    ]);
    downloadCsv('rapport-avancement-projets.csv', headers, rows);
  };

  const exportManagerPdf = () => {
    const html = `
      <html>
        <head>
          <title>Rapport Chef de Projet</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { margin-bottom: 4px; }
            p { color: #555; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #f7f7f7; }
          </style>
        </head>
        <body>
          <h1>Rapport Chef de Projet</h1>
          <p>Date: ${new Date().toLocaleDateString('fr-FR')}</p>
          <h2>KPIs</h2>
          <table>
            <tr><th>Projets actifs</th><th>Projets en retard</th><th>Tâches en retard</th><th>Avancement global</th><th>Charge équipe</th><th>Temps (estimé / consommé)</th></tr>
            <tr><td>${stats.activeProjectsCount ?? 0}</td><td>${stats.overdueProjectsCount ?? 0}</td><td>${stats.overdueTasksCount ?? 0}</td><td>${stats.globalProgressPercent ?? 0}%</td><td>${stats.teamMemberCount ?? 0}</td><td>${stats.timeEstimated ?? 0}h / ${stats.timeConsumed ?? 0}h</td></tr>
          </table>
          <h2>Projets assignés</h2>
          <table>
            <tr><th>Projet</th><th>Client</th><th>Statut</th><th>Progression</th><th>Tâches</th><th>Échéance</th></tr>
            ${(stats.myProjects || []).map((p) => `<tr><td>${p.name || '-'}</td><td>${p.client?.name || '-'}</td><td>${PROJECT_STATUS_LABELS[p.status] || p.status || '-'}</td><td>${p.progressPercentage || 0}%</td><td>${p.taskCount || 0}</td><td>${p.deadline ? new Date(p.deadline).toLocaleDateString('fr-FR') : (p.endDate ? new Date(p.endDate).toLocaleDateString('fr-FR') : '-')}</td></tr>`).join('')}
          </table>
          <h2>Charge équipe</h2>
          <table>
            <tr><th>Membre</th><th>Tâches</th></tr>
            ${(stats.tasksByMember || []).map((m) => `<tr><td>${m.member || '-'}</td><td>${m.taskCount || 0}</td></tr>`).join('')}
          </table>
        </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1> Dashboard Chef de Projet</h1>
        <p>Pilotage opérationnel, planification et suivi de vos projets assignés</p>
      </div>

      <DashboardWidgetGrid storageKey="manager" defaultLayout={MANAGER_WIDGET_LAYOUT}>
        <div key="kpi-1" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="chart" />
            <div className="kpi-content">
              <h3>Projets actifs</h3>
              <p className="kpi-value">{stats.activeProjectsCount ?? stats.myProjectCount ?? 0}</p>
            </div>
          </div>
        </div>
        <div key="kpi-2" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="warning" />
            <div className="kpi-content">
              <h3>Projets en retard</h3>
              <p className="kpi-value">{stats.overdueProjectsCount ?? 0}</p>
            </div>
          </div>
        </div>
        <div key="kpi-3" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="check" />
            <div className="kpi-content">
              <h3>Tâches en retard</h3>
              <p className="kpi-value">{stats.overdueTasksCount ?? 0}</p>
            </div>
          </div>
        </div>
        <div key="kpi-4" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="trending" />
            <div className="kpi-content">
              <h3>Avancement global</h3>
              <p className="kpi-value">{stats.globalProgressPercent ?? 0}%</p>
            </div>
          </div>
        </div>
        <div key="kpi-5" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="users" />
            <div className="kpi-content">
              <h3>Charge équipe</h3>
              <p className="kpi-value">{stats.teamMemberCount ?? 0}</p>
            </div>
          </div>
        </div>
        <div key="kpi-6" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="clock" />
            <div className="kpi-content">
              <h3>Temps (estimé / consommé)</h3>
              <p className="kpi-value">{stats.timeEstimated ?? 0}h / {stats.timeConsumed ?? 0}h</p>
            </div>
          </div>
        </div>
        <div key="chart-1" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="chart-card">
            <h3>Progression des Projets</h3>
            {stats.projectTimeline && stats.projectTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats.projectTimeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="inProgress" stroke="#f59e0b" strokeWidth={2} />
                  <Line type="monotone" dataKey="pending" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="chart-empty">Pas de données</p>}
          </div>
        </div>
        <div key="chart-2" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="chart-card">
            <h3>Tâches par Statut</h3>
            {tasksByStatusForChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={tasksByStatusForChart}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {tasksByStatusForChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="chart-empty">Pas de données</p>}
          </div>
        </div>
        <div key="chart-3" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="chart-card">
            <h3>Charge par Membre</h3>
            {stats.tasksByMember && stats.tasksByMember.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.tasksByMember}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="member" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="taskCount" fill="rgb(223, 48, 0)" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="chart-empty">Pas de données</p>}
          </div>
        </div>
      </DashboardWidgetGrid>

      {/* Gérer les tâches */}
      <div className="table-section">
        <h3>Gérer les tâches</h3>
        <p className="muted">
          Commenter les tâches, mettre à jour le statut, affecter une tâche, créer une tâche, suivre le temps : ouvrez une tâche depuis le Kanban ou la liste des tâches d&apos;un projet. Créez une tâche en choisissant un projet puis « Nouvelle tâche ».
        </p>
        <div className="manager-task-actions">
          <Link to="/kanban" className="btn-dashboard">Tableau Kanban</Link>
          {stats.myProjects && stats.myProjects.length > 0 && (
            <span className="manager-create-task-wrap">
              <span className="manager-create-task-label">Créer une tâche :</span>
              <select
                className="manager-create-task-select"
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) navigate(`/projects/${id}/tasks/new`);
                }}
              >
                <option value="">Choisir un projet</option>
                {stats.myProjects.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </span>
          )}
        </div>
      </div>

      {/* Liste des projets assignés */}
      <div className="table-section">
        <h3>Projets assignés</h3>
        {stats.myProjects && stats.myProjects.length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nom du Projet</th>
                  <th>Client</th>
                  <th>Statut</th>
                  <th>Progression</th>
                  <th>Tâches</th>
                  <th>Échéance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.myProjects.map((project) => (
                  <tr key={project._id}>
                    <td><Link to={`/projects/${project._id}`} className="project-name-link">{project.name}</Link></td>
                    <td>{project.client?.name || 'N/A'}</td>
                    <td><span className={`status-${project.status.toLowerCase()}`}>{PROJECT_STATUS_LABELS[project.status] || project.status}</span></td>
                    <td>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${project.progressPercentage || 0}%` }}></div>
                      </div>
                      <span>{project.progressPercentage || 0}%</span>
                    </td>
                    <td>{project.taskCount || 0}</td>
                    <td>{(project.deadline || project.endDate) ? new Date(project.deadline || project.endDate).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="manager-project-actions">
                      <Link to={`/projects/${project._id}`}>Voir</Link>
                      <Link to={`/projects/${project._id}/kanban`}>Kanban</Link>
                      <Link to={`/projects/${project._id}/tasks/new`}>Nouvelle tâche</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>Aucun projet</p>}
      </div>

      {/* Tâches urgentes */}
      <div className="table-section">
        <h3> Tâches Urgentes</h3>
        {stats.urgentTasks && stats.urgentTasks.length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tâche</th>
                  <th>Projet</th>
                  <th>Assignée à</th>
                  <th>Priorité</th>
                  <th>Échéance</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {stats.urgentTasks.map((task) => (
                  <tr key={task._id} className={task.priority === 'high' ? 'row-alert' : ''}>
                    <td>{task.title}</td>
                    <td>{task.project?.name || 'N/A'}</td>
                    <td>{Array.isArray(task.assignedTo) ? (task.assignedTo[0]?.name ? task.assignedTo.map(u => u.name).join(', ') : 'Non assignée') : (task.assignedTo?.name || 'Non assignée')}</td>
                    <td><span className={`priority-${task.priority.toLowerCase()}`}>{PRIORITY_LABELS[task.priority] || task.priority}</span></td>
                    <td>{new Date(task.dueDate).toLocaleDateString('fr-FR')}</td>
                    <td><span className={`status-${task.status.toLowerCase()}`}>{TASK_STATUS_LABELS[task.status] || task.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>Aucune tâche urgente</p>}
      </div>

      {/* Prochaines deadlines */}
      <div className="table-section">
        <h3> Prochaines échéances</h3>
        {stats.upcomingDeadlines && stats.upcomingDeadlines.length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tâche</th>
                  <th>Projet</th>
                  <th>Échéance</th>
                  <th>Priorité</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {stats.upcomingDeadlines.map((task) => (
                  <tr key={task._id}>
                    <td>{task.title}</td>
                    <td>{task.project?.name || 'N/A'}</td>
                    <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('fr-FR') : '—'}</td>
                    <td><span className={`priority-${(task.priority || '').toLowerCase()}`}>{PRIORITY_LABELS[task.priority] || task.priority}</span></td>
                    <td><span className={`status-${(task.status || '').toLowerCase()}`}>{TASK_STATUS_LABELS[task.status] || task.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>Aucune échéance proche</p>}
      </div>

      {/* Alertes blocages */}
      <div className="table-section">
        <h3> Alertes blocages</h3>
        {stats.blockedAlerts && stats.blockedAlerts.length > 0 ? (
          <ul className="notifications-list">
            {stats.blockedAlerts.map((a, idx) => (
              <li key={idx}>
                <strong>{a.project || 'Projet'}</strong> — {a.title}
                {a.assignedTo && a.assignedTo.length > 0 ? ` (${a.assignedTo.join(', ')})` : ''}
                {a.dueDate ? ` — échéance ${new Date(a.dueDate).toLocaleDateString('fr-FR')}` : ''}
              </li>
            ))}
          </ul>
        ) : <p>Aucune alerte de blocage</p>}
      </div>

      {/* Derniers commentaires */}
      {stats.recentComments && stats.recentComments.length > 0 && (
        <div className="table-section">
          <h3 className="section-title-with-icon"><MessageSquare size={18} /> Derniers commentaires</h3>
          <ul className="notifications-list">
            {stats.recentComments.map((c, idx) => (
              <li key={idx}>
                <strong>{c.projectName}</strong> — {c.taskTitle} : {c.text}
                {c.author && <span className="comment-meta"> — {c.author}, {c.createdAt ? new Date(c.createdAt).toLocaleDateString('fr-FR') : ''}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notifications */}
      {stats.notifications && stats.notifications.length > 0 && (
        <div className="table-section">
          <h3> Notifications</h3>
          <ul className="notifications-list">
            {stats.notifications.map((n, idx) => (
              <li key={idx}>{n.message || n.text || JSON.stringify(n)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Reporting */}
      <div className="table-section">
        <h3>Reporting</h3>
        <p className="muted">Export rapide des rapports d'avancement et de charge équipe.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={exportProjectProgressCsv}>Exporter avancement (CSV)</button>
          <button type="button" onClick={exportTeamLoadCsv}>Exporter charge équipe (CSV)</button>
          <button type="button" onClick={exportManagerPdf}>Exporter rapport (PDF)</button>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
