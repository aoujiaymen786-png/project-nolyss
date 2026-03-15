import React, { useContext, useEffect, useState } from 'react';
import { useParams, Link, useLocation, NavLink } from 'react-router-dom';
import API from '../../utils/api';
import { useSocket } from '../../contexts/SocketContext';
import { AuthContext } from '../../contexts/AuthContext';
import TaskList from '../Tasks/TaskList';
import KanbanBoard from '../Tasks/KanbanBoard';
import GanttChart from '../Tasks/GanttChart';
import ProjectCollaboration from './ProjectCollaboration';
import './ProjectDetails.css';

const STATUS_LABELS = {
  prospecting: 'Prospection',
  inProgress: 'En cours',
  validation: 'Validation',
  completed: 'Terminé',
  archived: 'Archivé',
};

const canEditProject = (u) => u && ['admin', 'coordinator', 'projectManager'].includes(u.role);

const ProjectDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const isDirectorViewOnly = user?.role === 'director';
  const isCollaboration = location.pathname.endsWith('/collaboration');
  const [project, setProject] = useState(null);
  const [progress, setProgress] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({ name: '', dueDate: '', description: '' });
  const [sprintForm, setSprintForm] = useState({ name: '', startDate: '', endDate: '', goal: '' });
  const socket = useSocket();

  useEffect(() => {
    const fetchProject = async () => {
      const { data } = await API.get(`/projects/${id}`);
      setProject(data);
    };
    fetchProject();
  }, [id]);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const { data } = await API.get(`/projects/${id}/progress`);
        setProgress(data);
      } catch (e) {
        console.error(e);
      }
    };
    if (id) fetchProgress();
  }, [id]);

  useEffect(() => {
    if (socket && id) {
      socket.emit('joinProject', id);
      socket.on('taskCreated', (task) => {
        setProgress((p) => p && { ...p, totalTasks: (p.totalTasks || 0) + 1 });
      });
      socket.on('taskUpdated', () => {
        API.get(`/projects/${id}/progress`).then((r) => setProgress(r.data));
      });
      return () => {
        socket.emit('leaveProject', id);
        socket.off('taskCreated');
        socket.off('taskUpdated');
      };
    }
  }, [id, socket]);

  const refreshProject = () => {
    API.get(`/projects/${id}`).then((r) => setProject(r.data));
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!milestoneForm.name.trim()) return;
    const milestones = [...(project.milestones || []), { name: milestoneForm.name.trim(), dueDate: milestoneForm.dueDate || undefined, description: milestoneForm.description?.trim() || '', completed: false }];
    try {
      await API.put(`/projects/${id}`, { name: project.name, client: project.client?._id || project.client, milestones });
      setMilestoneForm({ name: '', dueDate: '', description: '' });
      refreshProject();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleMilestone = async (idx) => {
    const milestones = (project.milestones || []).map((m, i) => (i === idx ? { ...m, completed: !m.completed } : m));
    try {
      await API.put(`/projects/${id}`, { name: project.name, client: project.client?._id || project.client, milestones });
      refreshProject();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSprint = async (e) => {
    e.preventDefault();
    if (!sprintForm.name.trim()) return;
    const sprints = [...(project.sprints || []), { name: sprintForm.name.trim(), startDate: sprintForm.startDate || undefined, endDate: sprintForm.endDate || undefined, goal: sprintForm.goal?.trim() || '' }];
    try {
      await API.put(`/projects/${id}`, { name: project.name, client: project.client?._id || project.client, sprints });
      setSprintForm({ name: '', startDate: '', endDate: '', goal: '' });
      refreshProject();
    } catch (err) {
      console.error(err);
    }
  };

  const handleValidateAttachment = async (attachmentIndex) => {
    try {
      await API.patch(`/projects/${id}/attachments/${attachmentIndex}/validate`);
      refreshProject();
    } catch (err) {
      console.error(err);
    }
  };

  if (!project) return <div className="project-detail-loading">Chargement...</div>;

  const progressPercent = progress ? progress.progressPercent : 0;

  return (
    <div className="project-detail-page">
      <div className="project-detail-header">
        <div>
          <Link to="/projects" className="back-link">← Projets</Link>
          <h1>{project.name}</h1>
          <div className="project-detail-meta">
            <span className={`status-badge status-${project.status}`}>
              {STATUS_LABELS[project.status] || project.status}
            </span>
            {project.type && <span className="project-type">{project.type}</span>}
            <span>Client : {project.client && project.client.name ? project.client.name : '–'}</span>
          </div>
        </div>
        {!isDirectorViewOnly && (
          <div className="project-detail-actions">
            <Link to={`/projects/edit/${id}`} className="btn-primary">Modifier le projet</Link>
          </div>
        )}
      </div>

      <div className="project-detail-summary">
        <div className="summary-card">
          <span className="summary-label">Avancement tâches</span>
          <span className="summary-value">{progressPercent} %</span>
          <div className="progress-bar-thin">
            <div className="progress-fill-thin" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
        <div className="summary-card">
          <span className="summary-label">Heures (estimé / réel)</span>
          <span className="summary-value">{progress ? progress.taskEstimatedHours : 0} h / {progress ? progress.taskActualHours : 0} h</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Budget (estimé / réel)</span>
          <span className="summary-value">{project.estimatedBudget != null ? project.estimatedBudget : '–'} TND / {project.actualBudget != null ? project.actualBudget : '–'} TND</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Tâches</span>
          <span className="summary-value">{progress ? progress.totalTasks : 0} ({progress ? progress.doneCount : 0} terminées)</span>
        </div>
      </div>

      <div className="project-detail-content">
        {(project.description || project.objectives) && (
          <section className="project-detail-section">
            <h2>Description et objectifs</h2>
            {project.description && <p>{project.description}</p>}
            {project.objectives && <p><strong>Objectifs :</strong> {project.objectives}</p>}
          </section>
        )}

        <section className="project-detail-section">
          <h2>Dates et délais</h2>
          <p>Début : {project.startDate ? new Date(project.startDate).toLocaleDateString('fr-FR') : '–'} | Fin : {project.endDate ? new Date(project.endDate).toLocaleDateString('fr-FR') : '–'} | Échéance : {project.deadline ? new Date(project.deadline).toLocaleDateString('fr-FR') : '–'}</p>
        </section>

        {project.attachments && project.attachments.length > 0 && (
          <section className="project-detail-section">
            <h2>Livrables / Documents</h2>
            <ul className="documents-list">
              {project.attachments.map((a, i) => (
                <li key={i} className="document-item">
                  {a.url ? <a href={a.url} target="_blank" rel="noopener noreferrer">{a.name || 'Document'}</a> : <span>{a.name || 'Document'}</span>}
                  {a.validated ? <span className="badge-validated">Validé</span> : canEditProject(user) && (
                    <button type="button" className="btn-sm btn-validate-doc" onClick={() => handleValidateAttachment(i)}>Marquer validé</button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {canEditProject(user) && (
          <>
            <section className="project-detail-section">
              <h2>Jalons</h2>
              {(project.milestones || []).length > 0 && (
                <ul className="milestones-list">
                  {(project.milestones || []).map((m, i) => (
                    <li key={i} className={m.completed ? 'milestone-done' : ''}>
                      <input type="checkbox" checked={!!m.completed} onChange={() => handleToggleMilestone(i)} />
                      <span>{m.name}</span>
                      {m.dueDate && <span className="milestone-date">{new Date(m.dueDate).toLocaleDateString('fr-FR')}</span>}
                      {m.description && <span className="milestone-desc">{m.description}</span>}
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={handleAddMilestone} className="inline-form">
                <input type="text" placeholder="Nom du jalon" value={milestoneForm.name} onChange={(e) => setMilestoneForm((f) => ({ ...f, name: e.target.value }))} />
                <input type="date" value={milestoneForm.dueDate} onChange={(e) => setMilestoneForm((f) => ({ ...f, dueDate: e.target.value }))} />
                <input type="text" placeholder="Description (opt.)" value={milestoneForm.description} onChange={(e) => setMilestoneForm((f) => ({ ...f, description: e.target.value }))} />
                <button type="submit" className="btn-sm btn-primary">Ajouter jalon</button>
              </form>
            </section>
            <section className="project-detail-section">
              <h2>Sprints</h2>
              {(project.sprints || []).length > 0 && (
                <ul className="sprints-list">
                  {(project.sprints || []).map((s, i) => (
                    <li key={i}>
                      <strong>{s.name}</strong>
                      {s.startDate && <span> {new Date(s.startDate).toLocaleDateString('fr-FR')}</span>}
                      {s.endDate && <span> → {new Date(s.endDate).toLocaleDateString('fr-FR')}</span>}
                      {s.goal && <span className="sprint-goal"> — {s.goal}</span>}
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={handleAddSprint} className="inline-form">
                <input type="text" placeholder="Nom du sprint" value={sprintForm.name} onChange={(e) => setSprintForm((f) => ({ ...f, name: e.target.value }))} />
                <input type="date" placeholder="Début" value={sprintForm.startDate} onChange={(e) => setSprintForm((f) => ({ ...f, startDate: e.target.value }))} />
                <input type="date" placeholder="Fin" value={sprintForm.endDate} onChange={(e) => setSprintForm((f) => ({ ...f, endDate: e.target.value }))} />
                <input type="text" placeholder="Objectif (opt.)" value={sprintForm.goal} onChange={(e) => setSprintForm((f) => ({ ...f, goal: e.target.value }))} />
                <button type="submit" className="btn-sm btn-primary">Ajouter sprint</button>
              </form>
            </section>
          </>
        )}

        {!isDirectorViewOnly && (
          <section className="project-detail-tabs">
            <nav className="tabs-nav">
              <NavLink to={`/projects/${id}`} end className={({ isActive }) => 'tab-link' + (isActive ? ' active' : '')}>
                Vue liste
              </NavLink>
              <NavLink to={`/projects/${id}/kanban`} className={({ isActive }) => 'tab-link' + (isActive ? ' active' : '')}>
                Kanban
              </NavLink>
              <NavLink to={`/projects/${id}/gantt`} className={({ isActive }) => 'tab-link' + (isActive ? ' active' : '')}>
                Gantt
              </NavLink>
              <NavLink to={`/projects/${id}/collaboration`} className={({ isActive }) => 'tab-link' + (isActive ? ' active' : '')}>
                Collaboration
              </NavLink>
            </nav>
            <div className="tabs-content">
              {isCollaboration ? (
                <ProjectCollaboration projectId={id} project={project} onProjectUpdate={setProject} />
              ) : (
                <TaskList projectId={id} />
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProjectDetails;
