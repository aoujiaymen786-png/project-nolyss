import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DashboardWidgetGrid from './DashboardWidgetGrid';
import KpiIcon from '../UI/KpiIcon';
import DonutCenterLabel from './DonutCenterLabel';
import { INVOICE_STATUS_COLORS, INVOICE_STATUS_ORDER, sortByKeyOrder } from './chartTheme';
import './Dashboard.css';

const EXECUTIVE_WIDGET_LAYOUT = [
  { i: 'kpi-ca', x: 0, y: 0, w: 2, h: 2, static: true },
  { i: 'kpi-projets', x: 2, y: 0, w: 2, h: 2, static: true },
  { i: 'kpi-clients', x: 4, y: 0, w: 2, h: 2, static: true },
  { i: 'kpi-devis', x: 6, y: 0, w: 2, h: 2, static: true },
  { i: 'kpi-factures', x: 8, y: 0, w: 2, h: 2, static: true },
  { i: 'chart-financial', x: 0, y: 2, w: 5, h: 4, static: true },
  { i: 'chart-workload', x: 5, y: 2, w: 5, h: 4, static: true },
];

const COLORS = ['rgb(223, 48, 0)', 'rgb(255, 145, 37)', 'rgb(0, 67, 115)', 'rgb(20, 163, 214)', 'rgb(114, 224, 232)'];

const INVOICE_STATUS_LABELS = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  partial: 'Partiel',
  paid: 'Payé',
  cancelled: 'Annulé',
};

const INVOICE_STATUS_CHART_COLORS = {
  paid: '#22c55e',
  sent: '#0ea5e9',
  partial: '#f59e0b',
  draft: '#94a3b8',
  cancelled: '#64748b',
};

const PROJECT_STATUS_LABELS = {
  prospecting: 'Prospection',
  inProgress: 'En cours',
  validation: 'Validation',
  completed: 'Terminé',
  archived: 'Archivé',
};

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

  const projectsByStatusForChart = (kpis?.projectsByStatus || []).map((s) => ({
    ...s,
    label: PROJECT_STATUS_LABELS[s._id] || s._id,
  }));

  const renderChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const isHours = (name) => name === 'Heures estimées' || name === 'Heures réalisées';
    const isCount = (name) => name === 'Nombre';
    return (
      <div className="chart-tooltip">
        {label && <div className="chart-tooltip-label">{label}</div>}
        {payload.map((entry, index) => (
          <div key={index} className="chart-tooltip-item">
            <span className="chart-tooltip-name">{entry.name}</span>
            <span className="chart-tooltip-value">
              {typeof entry.value === 'number'
                ? isHours(entry.name)
                  ? `${Number(entry.value).toLocaleString('fr-FR')} h`
                  : isCount(entry.name)
                    ? Number(entry.value).toLocaleString('fr-FR')
                    : formatCurrency(entry.value)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };
  const financialByStatusSorted = sortByKeyOrder((financialSummary?.byStatus || []).map((s) => ({
    _id: s._id,
    name: INVOICE_STATUS_LABELS[s._id] || s._id,
    value: s.total || 0,
  })), '_id', INVOICE_STATUS_ORDER);


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
          <div className="kpi-card kpi-widget">
            <KpiIcon name="wallet" />
            <div className="kpi-content">
              <h3>Chiffre d&apos;affaires</h3>
              <p className="kpi-value">{formatCurrency(kpis?.totalRevenue)}</p>
            </div>
          </div>
        </div>
        <div key="kpi-projets" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card kpi-widget">
            <KpiIcon name="folder" />
            <div className="kpi-content">
              <h3>Projets</h3>
              <p className="kpi-value">{kpis?.totalProjects ?? 0}</p>
            </div>
          </div>
        </div>
        <div key="kpi-clients" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card kpi-widget">
            <KpiIcon name="users" />
            <div className="kpi-content">
              <h3>Clients</h3>
              <p className="kpi-value">{kpis?.totalClients ?? 0}</p>
            </div>
          </div>
        </div>
        <div key="kpi-devis" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card kpi-widget">
            <KpiIcon name="file" />
            <div className="kpi-content">
              <h3>Devis en attente (&gt; seuil)</h3>
              <p className="kpi-value">{kpis?.pendingQuotesCount ?? 0}</p>
            </div>
          </div>
        </div>
        <div key="kpi-factures" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card kpi-widget">
            <KpiIcon name="receipt" />
            <div className="kpi-content">
              <h3>Factures en attente (&gt; seuil)</h3>
              <p className="kpi-value">{kpis?.pendingInvoicesCount ?? 0}</p>
            </div>
          </div>
        </div>
        <div key="chart-financial" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="chart-card chart-card-compact chart-card-donut">
            <h3>Répartition CA par statut factures</h3>
            {financialSummary?.byStatus?.length > 0 ? (
              <div className="chart-card-inner">
                <div className="chart-card-donut-wrap">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                      <Pie
                        data={financialByStatusSorted}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={2}
                        stroke="var(--surface)"
                        strokeWidth={2}
                        label={false}
                        isAnimationActive
                        animationDuration={800}
                        activeIndex={activeFinancialSlice}
                        onMouseEnter={(_, index) => setActiveFinancialSlice(index)}
                      >
                        {financialByStatusSorted.map((s, i) => (
                          <Cell key={s._id || i} fill={INVOICE_STATUS_COLORS[s._id] || COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <DonutCenterLabel
                        data={financialByStatusSorted}
                        activeIndex={activeFinancialSlice}
                        activeColor={INVOICE_STATUS_COLORS[financialByStatusSorted[activeFinancialSlice ?? 0]?._id]}
                        cx="50%"
                        cy="45%"
                      />
                      <Tooltip content={renderChartTooltip} />
                      <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <p className="chart-empty">Aucune donnée</p>
            )}
          </div>
        </div>
        <div key="chart-workload" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="chart-card">
            <h3>Projets par statut</h3>
            {projectsByStatusForChart.length > 0 ? (
              <div className="chart-card-inner">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={projectsByStatusForChart} barCategoryGap={20} barGap={8} margin={{ top: 12, right: 20, bottom: 28, left: 12 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} height={40} />
                    <YAxis width={32} allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                    <Tooltip content={renderChartTooltip} />
                    <Bar dataKey="count" name="Nombre" fill="var(--primary)" radius={[8, 8, 0, 0]} maxBarSize={56} animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="chart-empty">Aucune donnée</p>
            )}
          </div>
        </div>
      </DashboardWidgetGrid>

      {/* Charge de travail par équipe / membre */}
      <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
        <h3>Charge de travail par équipe / membre</h3>
        {workloadByTeam?.length > 0 ? (
          <div className="chart-card-inner">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={workloadByTeam}
                layout="vertical"
                margin={{ top: 16, right: 24, bottom: 16, left: 100 }}
                barCategoryGap={24}
                barGap={12}
              >
                <defs>
                  <linearGradient id="execBarEstimated" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#0369a1" />
                  </linearGradient>
                  <linearGradient id="execBarActual" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="var(--primary-hover, #c23d14)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="rgba(148, 163, 184, 0.25)" />
                <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 12, fill: 'var(--text-primary)' }} />
                <Tooltip content={renderChartTooltip} />
                <Legend wrapperStyle={{ paddingTop: 12 }} />
                <Bar dataKey="estimatedHours" name="Heures estimées" fill="url(#execBarEstimated)" radius={[0, 8, 8, 0]} maxBarSize={32} animationDuration={800} />
                <Bar dataKey="actualHours" name="Heures réalisées" fill="url(#execBarActual)" radius={[0, 8, 8, 0]} maxBarSize={32} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="chart-empty">Aucune donnée</p>
        )}
      </div>

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
                      <td><span className={`status-${(p.status || '').toLowerCase()}`}>{PROJECT_STATUS_LABELS[p.status] || p.status || '–'}</span></td>
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
                    <td><span className={`status-${(p.status || '').toLowerCase()}`}>{PROJECT_STATUS_LABELS[p.status] || p.status || '–'}</span></td>
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
