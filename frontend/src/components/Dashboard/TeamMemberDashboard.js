import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import DashboardWidgetGrid from './DashboardWidgetGrid';
import KpiIcon from '../UI/KpiIcon';
import { MessageSquare } from 'lucide-react';
import './Dashboard.css';

const TEAM_MEMBER_WIDGET_LAYOUT = [
  { i: 'kpi-tasks', x: 0, y: 0, w: 3, h: 2 },
  { i: 'kpi-overdue', x: 3, y: 0, w: 3, h: 2 },
  { i: 'kpi-projects', x: 6, y: 0, w: 3, h: 2 },
  { i: 'kpi-time', x: 9, y: 0, w: 3, h: 2 },
];

const TIMER_STORAGE_KEY = 'team-member-task-timers';

const TASK_STATUS_LABELS = {
  todo: 'A faire',
  inProgress: 'En cours',
  review: 'En review',
  done: 'Termine',
};

const PROJECT_STATUS_LABELS = {
  prospecting: 'Prospection',
  quotation: 'Devis',
  inProgress: 'En cours',
  validation: 'Validation',
  completed: 'Termine',
  archived: 'Archive',
};

const PRIORITY_LABELS = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
};

const TeamMemberDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingTaskId, setSavingTaskId] = useState('');
  const [taskDrafts, setTaskDrafts] = useState({});
  const [activeTimers, setActiveTimers] = useState(() => {
    try {
      const raw = localStorage.getItem(TIMER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  });
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: res } = await API.get('/dashboard/team-member-stats');
        setData(res);
        const drafts = {};
        (res.myTasksInProgress || []).forEach((t) => {
          drafts[t._id] = { status: t.status || 'todo', actualHours: t.actualHours || 0 };
        });
        setTaskDrafts(drafts);
      } catch (err) {
        console.error('Erreur tableau de bord membre:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(activeTimers));
    } catch (_) {}
  }, [activeTimers]);

  if (loading) return <div className="dashboard-loading">Chargement...</div>;
  if (!data) return <div className="dashboard-error">Erreur lors du chargement</div>;

  const { myTasksInProgress, overdueTasks, assignedProjects, timeWorked, upcomingDeadlines, notifications, timeHistory, recentComments } = data;

  const updateTaskDraft = (taskId, field, value) => {
    setTaskDrafts((prev) => ({
      ...prev,
      [taskId]: {
        ...(prev[taskId] || {}),
        [field]: value,
      },
    }));
  };

  const saveTaskQuickUpdate = async (taskId) => {
    try {
      const draft = taskDrafts[taskId];
      if (!draft) return;
      setSavingTaskId(taskId);
      await API.put(`/tasks/${taskId}`, {
        status: draft.status,
        actualHours: Number(draft.actualHours || 0),
      });
      const { data: res } = await API.get('/dashboard/team-member-stats');
      setData(res);
    } catch (e) {
      console.error('Erreur mise a jour rapide tâche:', e);
      alert(e.response?.data?.message || 'Impossible de mettre à jour la tâche.');
    } finally {
      setSavingTaskId('');
    }
  };

  const startTimer = (taskId) => {
    setActiveTimers((prev) => ({ ...prev, [taskId]: Date.now() }));
  };

  const stopTimer = async (taskId) => {
    const startedAt = activeTimers[taskId];
    if (!startedAt) return;
    const elapsedHours = (Date.now() - Number(startedAt)) / (1000 * 60 * 60);
    const current = Number(taskDrafts[taskId]?.actualHours || 0);
    updateTaskDraft(taskId, 'actualHours', (current + elapsedHours).toFixed(2));
    setActiveTimers((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
    await saveTaskQuickUpdate(taskId);
  };

  const formatTimer = (taskId) => {
    const startedAt = activeTimers[taskId];
    if (!startedAt) return '00:00:00';
    const sec = Math.max(0, Math.floor((nowMs - Number(startedAt)) / 1000));
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Mon tableau de bord</h1>
        <p>Vos tâches, projets assignés et temps travaillé</p>
      </div>

      <DashboardWidgetGrid storageKey="team-member" defaultLayout={TEAM_MEMBER_WIDGET_LAYOUT}>
        <div key="kpi-tasks" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="clipboard" />
            <div className="kpi-content">
              <h3>Tâches en cours</h3>
              <p className="kpi-value">{myTasksInProgress?.length ?? 0}</p>
            </div>
          </div>
        </div>
        <div key="kpi-overdue" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="warning" />
            <div className="kpi-content">
              <h3>En retard</h3>
              <p className="kpi-value">{overdueTasks?.length ?? 0}</p>
            </div>
          </div>
        </div>
        <div key="kpi-projects" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="folder" />
            <div className="kpi-content">
              <h3>Projets assignés</h3>
              <p className="kpi-value">{assignedProjects?.length ?? 0}</p>
            </div>
          </div>
        </div>
        <div key="kpi-time" className="dashboard-widget-wrapper">
          <div className="dashboard-widget-drag-handle" aria-hidden="true">⋮⋮</div>
          <div className="kpi-card">
            <KpiIcon name="clock" />
            <div className="kpi-content">
              <h3>Temps travaillé (h)</h3>
              <p className="kpi-value">{Number(timeWorked || 0).toFixed(1)}</p>
            </div>
          </div>
        </div>
      </DashboardWidgetGrid>

      <div className="table-section">
        <h3>Mes tâches en cours</h3>
        {myTasksInProgress?.length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tâche</th>
                  <th>Projet</th>
                  <th>Statut</th>
                  <th>Priorité</th>
                  <th>Temps (h)</th>
                  <th>Timer</th>
                  <th>Échéance</th>
                  <th>Actions rapides</th>
                </tr>
              </thead>
              <tbody>
                {myTasksInProgress.map((task) => (
                  <tr key={task._id}>
                    <td>{task.title}</td>
                    <td>{task.project?.name || '–'}</td>
                    <td>
                      <select
                        value={taskDrafts[task._id]?.status || task.status}
                        onChange={(e) => updateTaskDraft(task._id, 'status', e.target.value)}
                      >
                        <option value="todo">A faire</option>
                        <option value="inProgress">En cours</option>
                        <option value="review">En review</option>
                        <option value="done">Termine</option>
                      </select>
                    </td>
                    <td><span className={`priority-${(task.priority || 'medium').toLowerCase()}`}>{PRIORITY_LABELS[task.priority] || task.priority}</span></td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.25"
                        value={taskDrafts[task._id]?.actualHours ?? task.actualHours ?? 0}
                        onChange={(e) => updateTaskDraft(task._id, 'actualHours', e.target.value)}
                        style={{ width: 84 }}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ minWidth: 70, fontFamily: 'monospace' }}>{formatTimer(task._id)}</span>
                        {!activeTimers[task._id] ? (
                          <button type="button" onClick={() => startTimer(task._id)}>
                            Démarrer
                          </button>
                        ) : (
                          <button type="button" onClick={() => stopTimer(task._id)}>
                            Arrêter
                          </button>
                        )}
                      </div>
                    </td>
                    <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('fr-FR') : '–'}</td>
                    <td>
                      {task.project?._id && <Link to={`/tasks/edit/${task._id}`}>Détails</Link>}{' '}
                      <button type="button" onClick={() => saveTaskQuickUpdate(task._id)} disabled={savingTaskId === task._id}>
                        {savingTaskId === task._id ? 'Enregistrement…' : 'Enregistrer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Aucune tâche en cours</p>
        )}
      </div>

      {overdueTasks?.length > 0 && (
        <div className="table-section">
          <h3>Tâches en retard</h3>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tâche</th>
                  <th>Projet</th>
                  <th>Échéance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {overdueTasks.map((task) => (
                  <tr key={task._id} className="row-alert">
                    <td>{task.title}</td>
                    <td>{task.project?.name || '–'}</td>
                    <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('fr-FR') : '–'}</td>
                    <td>
                      <Link to={task.project?._id ? `/projects/${task.project._id}` : '#'}>Voir</Link>
                      {task.project?._id && <Link to={`/tasks/edit/${task._id}`}> Modifier</Link>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="table-section">
        <h3>Projets assignés</h3>
        {assignedProjects?.length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Projet</th>
                  <th>Client</th>
                  <th>Manager</th>
                  <th>Statut</th>
                  <th>Début</th>
                  <th>Fin</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignedProjects.map((project) => (
                  <tr key={project._id}>
                    <td><Link to={`/projects/${project._id}`} className="project-name-link">{project.name}</Link></td>
                    <td>{project.client?.name || '–'}</td>
                    <td>{project.manager?.name || '–'}</td>
                    <td><span className={`status-${(project.status || '').toLowerCase()}`}>{PROJECT_STATUS_LABELS[project.status] || project.status}</span></td>
                    <td>{project.startDate ? new Date(project.startDate).toLocaleDateString('fr-FR') : '–'}</td>
                    <td>{(project.deadline || project.endDate) ? new Date(project.deadline || project.endDate).toLocaleDateString('fr-FR') : '–'}</td>
                    <td>
                      <Link to={`/projects/${project._id}`}>Ouvrir</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Aucun projet assigné</p>
        )}
      </div>

      <div className="table-section">
        <h3> Prochaines deadlines</h3>
        {upcomingDeadlines?.length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tâche</th>
                  <th>Projet</th>
                  <th>Priorité</th>
                  <th>Échéance</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {upcomingDeadlines.map((task) => (
                  <tr key={task._id}>
                    <td>{task.title}</td>
                    <td>{task.project?.name || '–'}</td>
                    <td><span className={`priority-${(task.priority || '').toLowerCase()}`}>{PRIORITY_LABELS[task.priority] || task.priority}</span></td>
                    <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('fr-FR') : '–'}</td>
                    <td><span className={`status-${(task.status || '').toLowerCase()}`}>{TASK_STATUS_LABELS[task.status] || task.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Aucune deadline proche</p>
        )}
      </div>

      <div className="table-section">
        <h3>Historique du temps travaillé</h3>
        {timeHistory?.length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tâche</th>
                  <th>Projet</th>
                  <th>Heures</th>
                  <th>Statut</th>
                  <th>Mis à jour</th>
                </tr>
              </thead>
              <tbody>
                {timeHistory.map((t) => (
                  <tr key={t._id}>
                    <td>{t.title}</td>
                    <td>{t.project?.name || '–'}</td>
                    <td>{Number(t.actualHours || 0).toFixed(2)} h</td>
                    <td><span className={`status-${(t.status || '').toLowerCase()}`}>{TASK_STATUS_LABELS[t.status] || t.status}</span></td>
                    <td>{t.updatedAt ? new Date(t.updatedAt).toLocaleDateString('fr-FR') : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Aucun historique de temps pour le moment</p>
        )}
      </div>

      <div className="table-section">
        <h3 className="section-title-with-icon"><MessageSquare size={18} /> Collaboration (commentaires récents)</h3>
        {recentComments?.length > 0 ? (
          <ul className="notifications-list">
            {recentComments.map((c, idx) => (
              <li key={idx}>
                <strong>{c.projectName || 'Projet'}</strong> — {c.taskTitle}: {c.text}
                {c.author ? <span className="comment-meta"> — {c.author}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Aucun commentaire récent</p>
        )}
      </div>

      <div className="table-section">
        <h3> Outils visuels</h3>
        {assignedProjects?.length > 0 ? (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Projet</th>
                  <th>Kanban</th>
                  <th>Gantt (lecture)</th>
                </tr>
              </thead>
              <tbody>
                {assignedProjects.map((p) => (
                  <tr key={p._id}>
                    <td>{p.name}</td>
                    <td><Link to={`/projects/${p._id}/kanban`}>Ouvrir Kanban</Link></td>
                    <td><Link to={`/projects/${p._id}/gantt`}>Ouvrir Gantt</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Aucun projet assigné pour les outils visuels</p>
        )}
      </div>

      <div className="table-section">
        <h3> Notifications récentes</h3>
        {notifications?.length > 0 ? (
          <ul className="notifications-list">
            {notifications.map((n, idx) => (
              <li key={idx}>
                {n.text}{n.project ? ` (${n.project})` : ''}{n.dueDate ? ` — ${new Date(n.dueDate).toLocaleDateString('fr-FR')}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Aucune notification récente</p>
        )}
      </div>
    </div>
  );
};

export default TeamMemberDashboard;
