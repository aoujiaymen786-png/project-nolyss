import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import './AdminCommon.css';

const AdminDashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data } = await API.get('/admin/metrics');
        setMetrics(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) return <div className="admin-page"><div className="admin-loading">Chargement</div></div>;
  if (!metrics) return <div className="admin-page"><div className="admin-error">Impossible de charger les métriques.</div></div>;

  const cards = [
    { label: 'Utilisateurs', value: metrics.totalUsers, sub: `${metrics.activeUsers} actifs`, link: '/admin/users' },
    { label: 'Projets', value: metrics.totalProjects, link: '/projects' },
    { label: 'Clients', value: metrics.totalClients, link: '/clients' },
    { label: 'Tâches', value: metrics.totalTasks, link: '/projects' },
    { label: 'Factures', value: metrics.totalInvoices, link: '/invoices' },
    { label: 'Logs (24h)', value: metrics.recentLogsCount, link: '/admin/audit' },
    { label: 'Intégrations actives', value: metrics.integrationsCount, link: '/admin/integrations' },
    { label: 'Workflows', value: metrics.workflowsCount, link: '/admin/workflows' },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Tableau de bord administrateur</h1>
      </div>
      <p className="admin-page-subtitle">
        Gestion technique et configuration du système.
      </p>

      <div className="admin-metrics-grid">
        {cards.map((c, i) => (
          <Link
            key={c.label}
            to={c.link || '#'}
            className="admin-metric-card"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="admin-metric-value">{c.value ?? 0}</div>
            <div className="admin-metric-label">{c.label}</div>
            {c.sub && <div className="admin-metric-sub">{c.sub}</div>}
          </Link>
        ))}
      </div>

      
    </div>
  );
};

export default AdminDashboardPage;
