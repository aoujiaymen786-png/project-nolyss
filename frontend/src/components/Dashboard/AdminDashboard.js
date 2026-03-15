import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import API from '../../utils/api';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DashboardWidgetGrid from './DashboardWidgetGrid';
import KpiIcon from '../UI/KpiIcon';
import './Dashboard.css';

const ADMIN_WIDGET_LAYOUT = [
  { i: 'kpi-1', x: 0, y: 0, w: 3, h: 2 },
  { i: 'kpi-2', x: 3, y: 0, w: 3, h: 2 },
  { i: 'kpi-3', x: 6, y: 0, w: 3, h: 2 },
  { i: 'kpi-4', x: 9, y: 0, w: 3, h: 2 },
  { i: 'chart-1', x: 0, y: 2, w: 6, h: 4 },
  { i: 'chart-2', x: 6, y: 2, w: 6, h: 4 },
  { i: 'chart-3', x: 0, y: 6, w: 6, h: 4 },
  { i: 'chart-4', x: 6, y: 6, w: 6, h: 4 },
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
  todo: 'À faire',
  inProgress: 'En cours',
  review: 'En revue',
  done: 'Terminé',
};

const TASK_PRIORITY_LABELS = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
};

const ROLE_LABELS = {
  admin: 'Administrateur',
  director: 'Directeur',
  coordinator: 'Coordinateur',
  projectmanager: 'Chef de projet',
  teammember: 'Équipe',
  client: 'Client',
};

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeProjectStatusIndex, setActiveProjectStatusIndex] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await API.get('/dashboard/admin-stats');
        setStats(data);
        setLoading(false);
      } catch (error) {
        console.error('Erreur stats:', error);
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="dashboard-loading">Chargement...</div>;
  if (!stats) return <div className="dashboard-error">Erreur lors du chargement</div>;

  const COLORS = ['rgb(223, 48, 0)', 'rgb(255, 145, 37)', 'rgb(0, 67, 115)', 'rgb(20, 163, 214)', 'rgb(114, 224, 232)'];

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
        <h1>Tableau de Bord Admin</h1>
        <p>Vue globale de tous les projets, tâches et utilisateurs</p>
      </div>

      <DashboardWidgetGrid storageKey="admin" defaultLayout={ADMIN_WIDGET_LAYOUT}>
        <div key="kpi-1" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="users" />
            <div className="kpi-content">
              <h3>Utilisateurs Actifs</h3>
              <p className="kpi-value">{stats.totalUsers || 0}</p>
            </div>
          </div>
        </div>
        <div key="kpi-2" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="folder" />
            <div className="kpi-content">
              <h3>Projets Totaux</h3>
              <p className="kpi-value">{stats.totalProjects || 0}</p>
            </div>
          </div>
        </div>
        <div key="kpi-3" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="check" />
            <div className="kpi-content">
              <h3>Tâches Complétées</h3>
              <p className="kpi-value">{stats.completedTasks || 0}</p>
            </div>
          </div>
        </div>
        <div key="kpi-4" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="clock" />
            <div className="kpi-content">
              <h3>Tâches en Cours</h3>
              <p className="kpi-value">{stats.inProgressTasks || 0}</p>
            </div>
          </div>
        </div>
        <div key="chart-1" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="chart-card">
            <h3>Statut des Projets</h3>
            {stats.projects && stats.projects.byStatus && stats.projects.byStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={340}>
                <PieChart>
                  <defs>
                    <linearGradient id="adminPieGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="50%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={stats.projects.byStatus.map((e) => ({ ...e, label: PROJECT_STATUS_LABELS[e._id] || e._id }))}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={115}
                    paddingAngle={2}
                    label
                    isAnimationActive
                    animationDuration={800}
                    activeIndex={activeProjectStatusIndex}
                    onMouseEnter={(_, index) => setActiveProjectStatusIndex(index)}
                  >
                    {stats.projects.byStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#f97316', '#ef4444', '#7c3aed', '#0ea5e9', '#22c55e'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip content={renderChartTooltip} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="chart-empty">Pas de données</p>}
          </div>
        </div>
        <div key="chart-2" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="chart-card">
            <h3>Statut des Tâches</h3>
            {stats.tasks && stats.tasks.byStatus && stats.tasks.byStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={(stats.tasks.byStatus || []).map((e) => ({ ...e, label: TASK_STATUS_LABELS[e._id] || e._id }))} barCategoryGap={28} barGap={6}>
                  <defs>
                    <linearGradient id="adminBarStatus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip content={renderChartTooltip} />
                  <Bar
                    dataKey="count"
                    fill="url(#adminBarStatus)"
                    radius={[10, 10, 0, 0]}
                    animationDuration={900}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="chart-empty">Pas de données</p>}
          </div>
        </div>
        <div key="chart-3" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="chart-card">
            <h3>Priorité des Tâches</h3>
            {stats.tasks && stats.tasks.byPriority && stats.tasks.byPriority.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={(stats.tasks.byPriority || []).map((e) => ({ ...e, label: TASK_PRIORITY_LABELS[e._id] || e._id }))} barCategoryGap={28} barGap={6}>
                  <defs>
                    <linearGradient id="adminBarPriority" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#16a34a" />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip content={renderChartTooltip} />
                  <Bar
                    dataKey="count"
                    fill="url(#adminBarPriority)"
                    radius={[10, 10, 0, 0]}
                    animationDuration={900}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="chart-empty">Pas de données</p>}
          </div>
        </div>
        <div key="chart-4" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="chart-card">
            <h3>Projets par Responsable</h3>
            {stats.projects && stats.projects.byManager && stats.projects.byManager.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.projects.byManager} barCategoryGap={32} barGap={8}>
                  <defs>
                    <linearGradient id="adminBarManager" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" />
                      <stop offset="100%" stopColor="#0369a1" />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="manager" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip content={renderChartTooltip} />
                  <Bar
                    dataKey="count"
                    fill="url(#adminBarManager)"
                    radius={[10, 10, 0, 0]}
                    animationDuration={900}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="chart-empty">Pas de données</p>}
          </div>
        </div>
      </DashboardWidgetGrid>

      {/* Tableau - Utilisateurs */}
      <div className="table-section">
        <h3>Utilisateurs Récents</h3>
        {stats.recentUsers && stats.recentUsers.length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Inscription</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentUsers.map((u) => (
                  <tr key={u._id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className={`role-badge role-${(u.role || '').toLowerCase()}`}>{ROLE_LABELS[(u.role || '').toLowerCase()] || u.role}</span></td>
                    <td><span className={`status-${u.isVerified ? 'verified' : 'pending'}`}>{u.isVerified ? 'Vérifié' : 'En attente'}</span></td>
                    <td>{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>Aucun utilisateur</p>}
      </div>

      {/* Tableau - Projets */}
      <div className="table-section">
        <h3>Projets en Cours</h3>
        {stats.activeProjects && stats.activeProjects.length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Client</th>
                  <th>Responsable</th>
                  <th>Statut</th>
                  <th>Tâches</th>
                  <th>Début</th>
                </tr>
              </thead>
              <tbody>
                {stats.activeProjects.map((p) => (
                  <tr key={p._id}>
                    <td>{p.name}</td>
                    <td>{p.client?.name || 'N/A'}</td>
                    <td>{p.manager?.name || 'N/A'}</td>
                    <td><span className={`status-${(p.status || '').toLowerCase()}`}>{PROJECT_STATUS_LABELS[p.status] || p.status}</span></td>
                    <td>{p.taskCount || 0}</td>
                    <td>{new Date(p.startDate).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>Aucun projet actif</p>}
      </div>
    </div>
  );
};

export default AdminDashboard;
