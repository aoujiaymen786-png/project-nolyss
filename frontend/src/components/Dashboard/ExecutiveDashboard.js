import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DashboardWidgetGrid from './DashboardWidgetGrid';
import KpiIcon from '../UI/KpiIcon';
import './Dashboard.css';

const EXECUTIVE_WIDGET_LAYOUT = [
  { i: 'kpi-ca', x: 0, y: 0, w: 2, h: 2 },
  { i: 'kpi-projets', x: 2, y: 0, w: 2, h: 2 },
  { i: 'kpi-clients', x: 4, y: 0, w: 2, h: 2 },
  { i: 'kpi-devis', x: 6, y: 0, w: 2, h: 2 },
  { i: 'kpi-factures', x: 8, y: 0, w: 2, h: 2 },
  { i: 'chart-financial', x: 0, y: 2, w: 6, h: 4 },
  { i: 'chart-workload', x: 6, y: 2, w: 6, h: 4 },
];

const COLORS = ['rgb(223, 48, 0)', 'rgb(255, 145, 37)', 'rgb(0, 67, 115)', 'rgb(20, 163, 214)', 'rgb(114, 224, 232)'];

const formatCurrency = (n) => (n != null ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'TND' }).format(n) : '0 TND');

const ExecutiveDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(null);
  const [activeFinancialSlice, setActiveFinancialSlice] = useState(null);

  const fetchDirector = async () => {
    try {
      const { data: res } = await API.get('/dashboard/director');
      setData(res);
    } catch (err) {
      console.error('Erreur tableau de bord directeur:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirector();
  }, []);

  const handleValidateQuote = async (quoteId, action) => {
    setValidating(quoteId);
    try {
      await API.patch(`/quotes/${quoteId}/validate`, { action });
      await fetchDirector();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    } finally {
      setValidating(null);
    }
  };

  const handleValidateInvoice = async (invoiceId) => {
    setValidating(invoiceId);
    try {
      await API.patch(`/invoices/${invoiceId}/validate`, { status: 'paid' });
      await fetchDirector();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    } finally {
      setValidating(null);
    }
  };

  if (loading) return <div className="dashboard-loading">Chargement...</div>;
  if (!data) return <div className="dashboard-error">Erreur lors du chargement</div>;

  const { kpis, financialSummary, projectsOverview, workloadByTeam, clientPortfolio, pendingValidations } = data;

  const renderChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="chart-tooltip">
        {label && <div className="chart-tooltip-label">{label}</div>}
        {payload.map((entry, index) => (
          <div key={index} className="chart-tooltip-item">
            <span className="chart-tooltip-name">{entry.name}</span>
            <span className="chart-tooltip-value">
              {typeof entry.value === 'number' ? formatCurrency(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const escapeCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const downloadCsv = (filename, headers, rows) => {
    const csv = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const exportDirectorCsv = () => {
    const headers = ['Projet', 'Client', 'Responsable', 'Statut', 'Budget estimé', 'Budget réel', 'Écart'];
    const rows = (projectsOverview || []).map((p) => [
      p.name,
      p.client || '-',
      p.manager || '-',
      p.status || '-',
      p.estimatedBudget ?? '',
      p.actualBudget ?? '',
      (p.actualBudget != null && p.estimatedBudget != null) ? (p.actualBudget - p.estimatedBudget) : '',
    ]);
    downloadCsv('rapport-directeur-projets.csv', headers, rows);
  };
  const exportWorkloadCsv = () => {
    const headers = ['Membre', 'Nombre de tâches', 'Heures estimées', 'Heures réalisées'];
    const rows = (workloadByTeam || []).map((w) => [
      w.name || '-',
      w.taskCount ?? 0,
      w.estimatedHours ?? 0,
      w.actualHours ?? 0,
    ]);
    downloadCsv('rapport-directeur-charge-travail.csv', headers, rows);
  };
  const exportDirectorPdf = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head><title>Rapport Directeur</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;} table{width:100%;border-collapse:collapse;margin:12px 0;} th,td{border:1px solid #ddd;padding:8px;text-align:left;} th{background:#f5f5f5;}</style>
      </head><body>
      <h1>Rapport Directeur</h1>
      <p>${new Date().toLocaleDateString('fr-FR')}</p>
      <h2>KPIs</h2>
      <p>CA: ${formatCurrency(kpis?.totalRevenue)} | Projets: ${kpis?.totalProjects ?? 0} | Clients: ${kpis?.totalClients ?? 0} | Devis en attente: ${kpis?.pendingQuotesCount ?? 0} | Factures en attente: ${kpis?.pendingInvoicesCount ?? 0}</p>
      <h2>Projets</h2>
      <table><tr><th>Projet</th><th>Client</th><th>Statut</th><th>Budget estimé</th><th>Budget réel</th></tr>
      ${(projectsOverview || []).map((p) => `<tr><td>${p.name}</td><td>${p.client || '-'}</td><td>${p.status || '-'}</td><td>${formatCurrency(p.estimatedBudget)}</td><td>${formatCurrency(p.actualBudget)}</td></tr>`).join('')}
      </table>
      <h2>Validations requises</h2>
      <p>Devis: ${(pendingValidations?.quotes || []).length} | Factures: ${(pendingValidations?.invoices || []).length}</p>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="dashboard-container invoices-container">
      <div className="dashboard-header">
        <h1>Mon Tableau de bord </h1>
        <p>Vision stratégique, pilotage de l&apos;activité et validation des engagements</p>
      </div>

      {/* Section Superviser */}
      <div className="table-section executive-supervise-section">
        <h3>Superviser</h3>
        <p className="muted">
         
        </p>
        <div className="manager-task-actions executive-supervise-actions">
          <a href="#kpis" className="btn-dashboard">Voir les KPIs</a>
          <Link to="/projects" className="btn-dashboard btn-dashboard-secondary">Consulter les projets</Link>
          <Link to="/invoices" className="btn-dashboard btn-dashboard-secondary">Factures</Link>
          <Link to="/quotes" className="btn-dashboard btn-dashboard-secondary">Devis</Link>
          <a href="#rentabilite" className="btn-dashboard btn-dashboard-secondary">Analyser rentabilité</a>
          <a href="#validations-required" className="btn-dashboard btn-dashboard-secondary">Valider (devis / factures)</a>
          <span className="manager-create-task-wrap">
            <span className="manager-create-task-label">Rapports :</span>
            <button type="button" className="btn-dashboard btn-dashboard-secondary" onClick={exportDirectorCsv}>Export CSV (projets)</button>
            <button type="button" className="btn-dashboard btn-dashboard-secondary" onClick={exportWorkloadCsv}>Export CSV (charge de travail)</button>
            <button type="button" className="btn-dashboard btn-dashboard-secondary" onClick={exportDirectorPdf}>Export PDF</button>
          </span>
        </div>
      </div>

      {/* KPIs et graphiques — widgets réorganisables (optionnel) */}
      <DashboardWidgetGrid id="kpis" storageKey="executive" defaultLayout={EXECUTIVE_WIDGET_LAYOUT}>
        <div key="kpi-ca" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="wallet" />
            <div className="kpi-content">
              <h3>Chiffre d&apos;affaires</h3>
              <p className="kpi-value">{formatCurrency(kpis?.totalRevenue)}</p>
            </div>
          </div>
        </div>
        <div key="kpi-projets" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="folder" />
            <div className="kpi-content">
              <h3>Projets</h3>
              <p className="kpi-value">{kpis?.totalProjects ?? 0}</p>
            </div>
          </div>
        </div>
        <div key="kpi-clients" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="users" />
            <div className="kpi-content">
              <h3>Clients</h3>
              <p className="kpi-value">{kpis?.totalClients ?? 0}</p>
            </div>
          </div>
        </div>
        <div key="kpi-devis" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="file" />
            <div className="kpi-content">
              <h3>Devis en attente (&gt; seuil)</h3>
              <p className="kpi-value">{kpis?.pendingQuotesCount ?? 0}</p>
            </div>
          </div>
        </div>
        <div key="kpi-factures" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="receipt" />
            <div className="kpi-content">
              <h3>Factures en attente (&gt; seuil)</h3>
              <p className="kpi-value">{kpis?.pendingInvoicesCount ?? 0}</p>
            </div>
          </div>
        </div>
        <div key="chart-financial" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="chart-card">
            <h3>Répartition CA par statut factures</h3>
            {financialSummary?.byStatus?.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <defs>
                    <linearGradient id="execPieGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="50%" stopColor="#0ea5e9" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={financialSummary.byStatus.map((s) => ({ name: s._id, value: s.total || 0 }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={2}
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    isAnimationActive
                    animationDuration={900}
                    activeIndex={activeFinancialSlice}
                    onMouseEnter={(_, index) => setActiveFinancialSlice(index)}
                  >
                    {financialSummary.byStatus.map((_, i) => (
                      <Cell key={i} fill="url(#execPieGradient)" />
                    ))}
                  </Pie>
                  <Tooltip content={renderChartTooltip} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="chart-empty">Aucune donnée</p>
            )}
          </div>
        </div>
        <div key="chart-workload" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="chart-card">
            <h3>Charge de travail par équipe / membre</h3>
            {workloadByTeam?.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={workloadByTeam}
                  layout="vertical"
                  margin={{ left: 80 }}
                  barCategoryGap={20}
                  barGap={6}
                >
                  <defs>
                    <linearGradient id="execBarEstimated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#0f766e" />
                    </linearGradient>
                    <linearGradient id="execBarActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#b91c1c" />
                    </linearGradient>
                  </defs>
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip content={renderChartTooltip} />
                  <Legend />
                  <Bar
                    dataKey="estimatedHours"
                    name="Heures estimées"
                    fill="url(#execBarEstimated)"
                    radius={[10, 10, 10, 10]}
                    animationDuration={900}
                  />
                  <Bar
                    dataKey="actualHours"
                    name="Heures réalisées"
                    fill="url(#execBarActual)"
                    radius={[10, 10, 10, 10]}
                    animationDuration={900}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="chart-empty">Aucune donnée</p>
            )}
          </div>
        </div>
      </DashboardWidgetGrid>

      {/* Projets par statut */}
      {kpis?.projectsByStatus?.length > 0 && (
        <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
          <h3>Projets par statut</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={kpis.projectsByStatus} barCategoryGap={28} barGap={6}>
              <defs>
                <linearGradient id="execBarProjects" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ade80" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
              <XAxis dataKey="_id" />
              <YAxis />
              <Tooltip content={renderChartTooltip} />
              <Bar
                dataKey="count"
                fill="url(#execBarProjects)"
                name="Nombre"
                radius={[10, 10, 0, 0]}
                animationDuration={900}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Analyser rentabilité : budget estimé vs réel */}
      <div id="rentabilite" className="table-section">
        <h3>Analyser rentabilité (budget estimé vs réel)</h3>
        <p className="muted"></p>
        {projectsOverview?.length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Projet</th>
                  <th>Client</th>
                  <th>Responsable</th>
                  <th>Statut</th>
                  <th>Budget estimé</th>
                  <th>Budget réel</th>
                  <th>Écart</th>
                </tr>
              </thead>
              <tbody>
                {projectsOverview.map((p) => {
                  const estimated = p.estimatedBudget != null ? Number(p.estimatedBudget) : null;
                  const actual = p.actualBudget != null ? Number(p.actualBudget) : null;
                  const ecart = estimated != null && actual != null ? actual - estimated : null;
                  return (
                    <tr key={p._id}>
                      <td><Link to={`/projects/${p._id}`}>{p.name}</Link></td>
                      <td>{p.client || '–'}</td>
                      <td>{p.manager || '–'}</td>
                      <td><span className={`status-${(p.status || '').toLowerCase()}`}>{p.status || '–'}</span></td>
                      <td>{formatCurrency(p.estimatedBudget)}</td>
                      <td>{formatCurrency(p.actualBudget)}</td>
                      <td className={ecart != null && ecart > 0 ? 'variance-positive' : ecart != null && ecart < 0 ? 'variance-negative' : ''}>
                        {ecart != null ? `${ecart >= 0 ? '+' : ''}${formatCurrency(ecart)}` : '–'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="chart-empty">Aucun projet</p>
        )}
      </div>

      {/* Vue d'ensemble des projets */}
      <div className="table-section">
        <h3>Vue d&apos;ensemble des projets</h3>
        {projectsOverview?.length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Projet</th>
                  <th>Client</th>
                  <th>Responsable</th>
                  <th>Statut</th>
                  <th>Budget estimé</th>
                  <th>Budget réel</th>
                </tr>
              </thead>
              <tbody>
                {projectsOverview.map((p) => (
                  <tr key={p._id}>
                    <td><Link to={`/projects/${p._id}`}>{p.name}</Link></td>
                    <td>{p.client || '–'}</td>
                    <td>{p.manager || '–'}</td>
                    <td><span className={`status-${(p.status || '').toLowerCase()}`}>{p.status || '–'}</span></td>
                    <td>{formatCurrency(p.estimatedBudget)}</td>
                    <td>{formatCurrency(p.actualBudget)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="chart-empty">Aucun projet</p>
        )}
      </div>

      {/* Portefeuille clients */}
      <div className="table-section">
        <h3>Portefeuille clients et opportunités</h3>
        {clientPortfolio?.length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Secteur</th>
                  <th>Projets</th>
                  <th>CA total</th>
                  <th>En attente</th>
                  <th>Dernier projet</th>
                </tr>
              </thead>
              <tbody>
                {clientPortfolio.map((c) => (
                  <tr key={c._id}>
                    <td><Link to={`/clients/edit/${c._id}`}>{c.name}</Link></td>
                    <td>{c.sector || '–'}</td>
                    <td>{c.projectCount}</td>
                    <td>{formatCurrency(c.totalRevenue)}</td>
                    <td>{formatCurrency(c.pendingAmount)}</td>
                    <td>{c.lastProject || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="chart-empty">Aucun client</p>
        )}
      </div>

      {/* Validations : devis et factures au-dessus du seuil */}
      <div id="validations-required" className="table-section">
        <h3>Validations requises (devis &gt; {formatCurrency(pendingValidations?.quoteValidationThreshold)} / factures &gt; {formatCurrency(pendingValidations?.invoiceValidationThreshold)})</h3>
        <div className="charts-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="table-container">
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>Devis en attente</h4>
            {pendingValidations?.quotes?.length > 0 ? (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Client</th>
                    <th>Montant TTC</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingValidations.quotes.map((q) => (
                    <tr key={q._id}>
                      <td>{q.number}</td>
                      <td>{q.client}</td>
                      <td>{formatCurrency(q.totalTTC)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-sm"
                          disabled={validating === q._id}
                          onClick={() => handleValidateQuote(q._id, 'accept')}
                        >
                          Accepter
                        </button>
                        <button
                          type="button"
                          className="btn-sm btn-danger"
                          disabled={validating === q._id}
                          onClick={() => handleValidateQuote(q._id, 'refuse')}
                        >
                          Refuser
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="chart-empty">Aucun devis en attente au-dessus du seuil</p>
            )}
          </div>
          <div className="table-container">
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>Factures en attente</h4>
            {pendingValidations?.invoices?.length > 0 ? (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Client</th>
                    <th>Montant TTC</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingValidations.invoices.map((i) => (
                    <tr key={i._id}>
                      <td>{i.number}</td>
                      <td>{i.client}</td>
                      <td>{formatCurrency(i.totalTTC)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-sm"
                          disabled={validating === i._id}
                          onClick={() => handleValidateInvoice(i._id)}
                        >
                          Marquer payée
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="chart-empty">Aucune facture en attente au-dessus du seuil</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
