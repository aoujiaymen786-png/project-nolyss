import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import './GanttChart.css';

const GanttChart = () => {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [zoom, setZoom] = useState('month');
  const [sprintFilter, setSprintFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    fetchTasks(selectedProject);
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const { data } = await API.get('/projects');
      setProjects(data);
      if (data.length > 0) setSelectedProject(data[0]._id);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      setLoading(false);
    }
  };

  const fetchTasks = async (projectId) => {
    try {
      const { data } = await API.get('/tasks', { params: { project: projectId } });
      setTasks(data || []);
    } catch (error) {
      console.error('Erreur tâches gantt:', error);
      setTasks([]);
    }
  };

  const selectedProjectObj = projects.find((p) => p._id === selectedProject);
  const today = new Date();

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (sprintFilter === 'all') return true;
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    const day = today.getDay() || 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - day + 1);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    if (sprintFilter === 'current') return due >= monday && due <= sunday;
    if (sprintFilter === 'next') {
      const nextMonday = new Date(monday);
      nextMonday.setDate(monday.getDate() + 7);
      const nextSunday = new Date(nextMonday);
      nextSunday.setDate(nextMonday.getDate() + 6);
      return due >= nextMonday && due <= nextSunday;
    }
    return true;
  });

  const getProgressPercentage = (task) => {
    if (task.status === 'done') return 100;
    const checklist = task.checklist || [];
    if (checklist.length) {
      const done = checklist.filter((c) => c.completed).length;
      return Math.round((done / checklist.length) * 100);
    }
    if (task.status === 'review') return 75;
    if (task.status === 'inProgress') return 50;
    return 15;
  };

  if (loading) {
    return (
      <div className="gantt-loading">
        <div className="gantt-loading-spinner" aria-hidden="true"/>
        <p>Chargement du planning...</p>
      </div>
    );
  }

  const daysPerZoom = { week: 21, month: 75, quarter: 140 };
  const rangeDays = daysPerZoom[zoom] || 75;
  const startOfRange = new Date(today);
  startOfRange.setDate(today.getDate() - Math.floor(rangeDays * 0.2));
  startOfRange.setHours(0, 0, 0, 0);
  const endOfRange = new Date(startOfRange);
  endOfRange.setDate(startOfRange.getDate() + rangeDays);
  endOfRange.setHours(23, 59, 59, 999);
  const totalDays = Math.ceil((endOfRange - startOfRange) / (1000 * 60 * 60 * 24));

  const chartTasks = filteredTasks.length ? filteredTasks : tasks;

  const statusLabels = { todo: 'À faire', inProgress: 'En cours', review: 'Review', done: 'Terminé' };

  return (
    <div className="gantt-container">
      <header className="gantt-header">
        <div className="gantt-header-content">
          <div className="gantt-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <h1>Planification temporelle</h1>
            <p className="gantt-subtitle">Diagramme de Gantt — dépendances et suivi d'avancement</p>
          </div>
        </div>
        <div className="gantt-toolbar">
          <div className="gantt-select-wrap">
            <label className="gantt-select-label">Projet</label>
            <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="gantt-select">
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="gantt-select-wrap">
            <label className="gantt-select-label">Zoom</label>
            <select value={zoom} onChange={(e) => setZoom(e.target.value)} className="gantt-select">
              <option value="week">Semaine</option>
              <option value="month">Mois</option>
              <option value="quarter">Trimestre</option>
            </select>
          </div>
          <div className="gantt-select-wrap">
            <label className="gantt-select-label">Itération</label>
            <select value={sprintFilter} onChange={(e) => setSprintFilter(e.target.value)} className="gantt-select">
              <option value="all">Toutes</option>
              <option value="current">Sprint en cours</option>
              <option value="next">Sprint suivant</option>
            </select>
          </div>
          <div className="gantt-select-wrap">
            <label className="gantt-select-label">Statut</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="gantt-select">
              <option value="">Tous</option>
              {Object.entries(statusLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {selectedProjectObj && (
        <div className="gantt-chart">
          <div className="gantt-left">
            <div className="gantt-label-header">
              <span>Tâches</span>
              <span className="task-counter">{chartTasks.length}</span>
            </div>
            <div className="gantt-tasks">
              {chartTasks.map((task) => (
                <div key={task._id} className="gantt-task-row">
                  <div className="task-main">
                    <span className="task-name">{task.title}</span>
                    <span className={`task-status-badge status-${task.status}`}>{statusLabels[task.status] || task.status}</span>
                  </div>
                  <div className="task-sub">
                    <span>{task.estimatedHours || 0}h estimé / {task.actualHours || 0}h réel</span>
                    {(task.dependencies || []).length > 0 && <span className="task-deps">{(task.dependencies || []).length} dépendance(s)</span>}
                  </div>
                </div>
              ))}
              {chartTasks.length === 0 && (
                <div className="gantt-empty-state">
                  <p>Aucune tâche à afficher</p>
                  <span>Créez des tâches dans ce projet pour les voir sur le planning</span>
                </div>
              )}
            </div>
          </div>

          <div className="gantt-right">
            <div className="gantt-timeline">
              <div className="timeline-header">
                <div className="timeline-months">
                  {Array.from({ length: Math.ceil(totalDays / 7) }, (_, i) => {
                    const date = new Date(startOfRange);
                    date.setDate(startOfRange.getDate() + i * 7);
                    return (
                      <div key={i} className="month-label" style={{ width: `${(7 / totalDays) * 100}%` }}>
                        {date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </div>
                    );
                  })}
                </div>
                <div className="timeline-today" style={{ left: `${((today - startOfRange) / (endOfRange - startOfRange)) * 100}%` }}>
                  <span>Aujourd'hui</span>
                </div>
              </div>

              <div className="timeline-bars">
                {chartTasks.map((task) => {
                  const taskStart = new Date(task.startDate || task.createdAt || today);
                  const taskEnd = new Date(task.dueDate || new Date(taskStart.getTime() + 7 * 24 * 60 * 60 * 1000));
                  const startOffset = Math.max(0, (taskStart - startOfRange) / (endOfRange - startOfRange)) * 100;
                  const dWidth = ((taskEnd - taskStart) / (endOfRange - startOfRange)) * 100;
                  const progress = getProgressPercentage(task);

                  return (
                    <div key={task._id} className="gantt-bar-row">
                      <div
                        className={`gantt-bar status-${task.status}`}
                        style={{
                          left: `${startOffset}%`,
                          width: `${Math.max(dWidth, 2)}%`,
                        }}
                      >
                        <div className="gantt-bar-progress" style={{ width: `${progress}%` }}/>
                        <span className="bar-label">{task.title}</span>
                        {progress > 0 && progress < 100 && <span className="bar-progress-pct">{progress}%</span>}
                      </div>
                    </div>
                  );
                })}
                {chartTasks.length === 0 && <div className="gantt-bar-row gantt-bar-row-empty"><span className="gantt-empty-hint">—</span></div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GanttChart;