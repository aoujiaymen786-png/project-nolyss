import React, { useContext, useEffect, useState } from 'react';
import API from '../../utils/api';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import './ProjectList.css';

const STATUS_LABELS = {
  prospecting: 'Prospection',
  quotation: 'Devis',
  inProgress: 'En cours',
  validation: 'Validation',
  completed: 'Terminé',
  archived: 'Archivé',
};

const PRIORITY_LABELS = { low: 'Basse', medium: 'Moyenne', high: 'Haute' };

const ProjectList = () => {
  const { user } = useContext(AuthContext);
  const role = user?.role;
  const canManageProjects = ['admin', 'coordinator', 'projectManager'].includes(role);
  const isDirectorViewOnly = role === 'director';
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    client: '',
    manager: '',
    startDateFrom: '',
    startDateTo: '',
    sort: 'updatedAt',
    sortOrder: 'desc',
  });
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.client) params.set('client', filters.client);
      if (filters.manager) params.set('manager', filters.manager);
      if (filters.startDateFrom) params.set('startDateFrom', filters.startDateFrom);
      if (filters.startDateTo) params.set('startDateTo', filters.startDateTo);
      params.set('sort', filters.sort);
      params.set('sortOrder', filters.sortOrder);
      const { data } = await API.get(`/projects?${params}`);
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [filters]);

  useEffect(() => {
    if (!canManageProjects && !isDirectorViewOnly) return;
    API.get('/clients')
      .then((r) => setClients(r.data))
      .catch((e) => {
        console.error('Erreur chargement clients:', e);
        setClients([]);
      });
    API.get('/users')
      .then((r) => setUsers(r.data))
      .catch((e) => {
        console.error('Erreur chargement utilisateurs:', e);
        setUsers([]);
      });
  }, [canManageProjects]);

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce projet ?')) return;
    try {
      await API.delete(`/projects/${id}`);
      setProjects(projects.filter((p) => p._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const updateFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  const getCalendarDays = () => {
    const { year, month } = calendarMonth;
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = first.getDay() === 0 ? 6 : first.getDay() - 1;
    const daysInMonth = last.getDate();
    const total = Math.ceil((startPad + daysInMonth) / 7) * 7;
    const days = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    while (days.length < total) days.push(null);
    return days;
  };

  const getProjectsForDate = (date) => {
    if (!date) return [];
    const d = date.toISOString().slice(0, 10);
    return projects.filter((p) => {
      const start = p.startDate ? new Date(p.startDate).toISOString().slice(0, 10) : null;
      const end = p.endDate ? new Date(p.endDate).toISOString().slice(0, 10) : null;
      if (!start && !end) return false;
      if (start && end) return d >= start && d <= end;
      if (start) return d >= start;
      return d <= end;
    });
  };

  const monthLabel = () => {
    const d = new Date(calendarMonth.year, calendarMonth.month, 1);
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const prevMonth = () => {
    setCalendarMonth((m) => (m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 }));
  };

  const nextMonth = () => {
    setCalendarMonth((m) => (m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 }));
  };

  if (loading && projects.length === 0) return <div className="project-list-loading">Chargement...</div>;

  return (
    <div className="project-list-page invoices-container">
      <div className="page-header project-list-header">
        <h1>{isDirectorViewOnly ? 'Consulter les projets' : 'Projets'}</h1>
        {canManageProjects && <Link to="/projects/new" className="btn btn-primary">Nouveau projet</Link>}
      </div>

      <div className="project-list-toolbar">
        <div className="toolbar-search">
          <input
            type="text"
            placeholder="Recherche (nom, description…)"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="search-input"
          />
        </div>
        <div className="toolbar-filters">
          <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {(canManageProjects || isDirectorViewOnly) && (
            <select value={filters.client} onChange={(e) => updateFilter('client', e.target.value)}>
              <option value="">Tous les clients</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          )}
          {(canManageProjects || isDirectorViewOnly) && (
            <select value={filters.manager} onChange={(e) => updateFilter('manager', e.target.value)}>
              <option value="">Tous les responsables</option>
              {users.filter((u) => u.role === 'projectManager' || u.role === 'admin' || u.role === 'director').map((u) => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>
          )}
          <input
            type="date"
            value={filters.startDateFrom}
            onChange={(e) => updateFilter('startDateFrom', e.target.value)}
            title="Début après"
          />
          <input
            type="date"
            value={filters.startDateTo}
            onChange={(e) => updateFilter('startDateTo', e.target.value)}
            title="Début avant"
          />
        </div>
        <div className="toolbar-sort">
          <select value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)}>
            <option value="updatedAt">Modification</option>
            <option value="startDate">Date début</option>
            <option value="deadline">Échéance</option>
            <option value="name">Nom</option>
            <option value="status">Statut</option>
            <option value="estimatedBudget">Budget</option>
          </select>
          <select value={filters.sortOrder} onChange={(e) => updateFilter('sortOrder', e.target.value)}>
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
        <div className="toolbar-views">
          <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} title="Liste">☰</button>
          <button type="button" className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} title="Grille">▦</button>
          <button type="button" className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')} title="Calendrier">📅</button>
        </div>
      </div>

      {view === 'list' && (
        <div className="project-list-table-wrap">
          <table className="project-list-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Client</th>
                <th>Type</th>
                <th>Statut</th>
                <th>Priorité</th>
                <th>Début</th>
                <th>Échéance</th>
                <th>Budget</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr><td colSpan={9} className="empty-row">Aucun projet</td></tr>
              ) : (
                projects.map((p) => (
                  <tr key={p._id}>
                    <td><Link to={`/projects/${p._id}`} className="project-name-link">{p.name}</Link></td>
                    <td>{p.client?.name || '–'}</td>
                    <td>{p.type || '–'}</td>
                    <td><span className={`status-badge status-${p.status}`}>{STATUS_LABELS[p.status] || p.status}</span></td>
                    <td><span className={`priority-badge priority-${p.priority}`}>{PRIORITY_LABELS[p.priority]}</span></td>
                    <td>{p.startDate ? new Date(p.startDate).toLocaleDateString('fr-FR') : '–'}</td>
                    <td>{p.deadline ? new Date(p.deadline).toLocaleDateString('fr-FR') : '–'}</td>
                    <td>{p.estimatedBudget != null ? `${p.estimatedBudget} TND` : '–'}</td>
                    <td className="actions-cell">
                      <Link to={`/projects/${p._id}`}>Voir</Link>
                      {canManageProjects && <><Link to={`/projects/edit/${p._id}`}>Modifier</Link><button type="button" className="btn-delete" onClick={() => handleDelete(p._id)}>Supprimer</button></>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === 'grid' && (
        <div className="project-grid">
          {projects.length === 0 ? (
            <p className="empty-row">Aucun projet</p>
          ) : (
            projects.map((p) => (
              <div key={p._id} className="project-card">
                <div className="project-card-header">
                  <Link to={`/projects/${p._id}`} className="project-card-title">{p.name}</Link>
                  <span className={`status-badge status-${p.status}`}>{STATUS_LABELS[p.status] || p.status}</span>
                </div>
                <p className="project-card-client">{p.client?.name || '–'}</p>
                {p.type && <p className="project-card-type">{p.type}</p>}
                <div className="project-card-meta">
                  <span>{p.startDate ? new Date(p.startDate).toLocaleDateString('fr-FR') : '–'}</span>
                  <span>{p.estimatedBudget != null ? `${p.estimatedBudget} TND` : '–'}</span>
                </div>
                <div className="project-card-actions">
                  <Link to={`/projects/${p._id}`}>Ouvrir</Link>
                  {canManageProjects && <Link to={`/projects/edit/${p._id}`}>Modifier</Link>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {view === 'calendar' && (
        <div className="project-calendar">
          <div className="calendar-header">
            <button type="button" onClick={prevMonth}>←</button>
            <h3>{monthLabel()}</h3>
            <button type="button" onClick={nextMonth}>→</button>
          </div>
          <div className="calendar-weekdays">
            <span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span>
          </div>
          <div className="calendar-grid">
            {getCalendarDays().map((date, i) => (
              <div key={i} className="calendar-day">
                {date ? (
                  <>
                    <span className="day-num">{date.getDate()}</span>
                    {getProjectsForDate(date).slice(0, 3).map((p) => (
                      <Link key={p._id} to={`/projects/${p._id}`} className="calendar-project-dot" title={p.name}>
                        {p.name}
                      </Link>
                    ))}
                    {getProjectsForDate(date).length > 3 && (
                      <span className="calendar-more">+{getProjectsForDate(date).length - 3}</span>
                    )}
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
