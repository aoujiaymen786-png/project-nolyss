import React, { useEffect, useState } from 'react';
import { useParams, Link, Routes, Route, NavLink } from 'react-router-dom';
import API from '../../utils/api';
import { useSocket } from '../../contexts/SocketContext';
import TaskList from '../Tasks/TaskList';
import KanbanBoard from '../Tasks/KanbanBoard';
import GanttChart from '../Tasks/GanttChart';
import ProjectCollaboration from './ProjectCollaboration';
import './ProjectDetails.css';

const STATUS_LABELS = {
  prospecting: 'Prospection',
  quotation: 'Devis',
  inProgress: 'En cours',
  validation: 'Validation',
  completed: 'Terminé',
  archived: 'Archivé',
};

const ProjectDetails = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [progress, setProgress] = useState(null);
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
        <div className="project-detail-actions">
          <Link to={`/projects/edit/${id}`} className="btn-primary">Modifier le projet</Link>
        </div>
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
            <h2>Documents</h2>
            <ul className="documents-list">
              {project.attachments.map((a, i) => (
                <li key={i}>
                  {a.url ? <a href={a.url} target="_blank" rel="noopener noreferrer">{a.name || 'Document'}</a> : <span>{a.name || 'Document'}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

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
            <Routes>
              <Route path="/projects/:projectId/collaboration" element={<ProjectCollaboration projectId={id} project={project} onProjectUpdate={setProject} />} />
              <Route path="/projects/:projectId" element={<TaskList projectId={id} />} />
            </Routes>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProjectDetails;
