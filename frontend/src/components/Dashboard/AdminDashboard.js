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

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.projects.byStatus}
                    dataKey="count"
                    nameKey="_id"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {stats.projects.byStatus.map((entry, index) => (
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
        <div key="chart-2" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="chart-card">
            <h3>Statut des Tâches</h3>
            {stats.tasks && stats.tasks.byStatus && stats.tasks.byStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.tasks.byStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="rgb(223, 48, 0)" />
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
                <BarChart data={stats.tasks.byPriority}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="rgb(255, 145, 37)" />
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
                <BarChart data={stats.projects.byManager}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="manager" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#123c4f" />
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
                    <td><span className={`role-badge role-${u.role.toLowerCase()}`}>{u.role}</span></td>
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
                    <td><span className={`status-${p.status.toLowerCase()}`}>{p.status}</span></td>
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
