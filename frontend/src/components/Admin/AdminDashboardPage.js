import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import './AdminCommon.css';

const AdminDashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchMetrics = async (opts = { silent: false }) => {
      const silent = !!opts?.silent;
      try {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        const { data } = await API.get('/admin/metrics');
        if (mounted) setMetrics(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    fetchMetrics();

    // Rafraîchit à la reprise de focus (utile après suppression/édition d'utilisateurs dans un autre écran)
    const onFocus = () => fetchMetrics({ silent: true });
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchMetrics({ silent: true });
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Rafraîchissement léger périodique
    const intervalId = setInterval(() => fetchMetrics({ silent: true }), 30000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
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
            {i === 0 && refreshing && <div className="admin-metric-sub">Mise à jour…</div>}
          </Link>
        ))}
      </div>

      
    </div>
  );
};

export default AdminDashboardPage;
