import React, { useState, useEffect, useContext } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import API from '../../utils/api';
import { AuthContext } from '../../contexts/AuthContext';
import TaskDetailModal from './TaskDetailModal';
import './KanbanBoard.css';

const KanbanBoard = ({ projectId: projectIdProp }) => {
  const { projectId: projectIdParam } = useParams();
  const location = useLocation();
  const projectId = projectIdProp || projectIdParam;
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState({});
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState(projectId || '');
  const [projects, setProjects] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState(user?.role === 'teamMember' ? 'mine' : 'all');
  const [sprintFilter, setSprintFilter] = useState('all');

  const statuses = ['todo', 'inProgress', 'review', 'done'];
  const statusLabels = {
    todo: 'A faire',
    inProgress: 'En cours',
    review: 'En review',
    done: 'Terminé',
  };

  const priorityColors = {
    'low': '#10b981',
    'medium': '#f59e0b',
    'high': '#ef4444'
  };

  useEffect(() => {
    if (projectId) setProjectFilter(projectId);
  }, [projectId]);

  useEffect(() => {
    fetchTasksAndProjects();
  }, [projectFilter]);

  useEffect(() => {
    const grouped = {};
    statuses.forEach((status) => {
      grouped[status] = filteredTasks().filter((task) => task.status === status);
    });
    setTasks(grouped);
  }, [allTasks, priorityFilter, assigneeFilter, sprintFilter]);

  const fetchTasksAndProjects = async () => {
    try {
      const { data: projectsData } = await API.get('/projects');
      setProjects(projectsData);

      const params = projectFilter ? { project: projectFilter } : {};
      const { data: tasksData } = await API.get('/tasks', { params });
      setAllTasks(tasksData || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      setLoading(false);
    }
  };

  const isTaskInSprint = (task) => {
    if (sprintFilter === 'all') return true;
    const now = new Date();
    const due = task.dueDate ? new Date(task.dueDate) : null;
    if (!due) return false;
    const day = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + 1);
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
      nextSunday.setHours(23, 59, 59, 999);
      return due >= nextMonday && due <= nextSunday;
    }
    return true;
  };

  const filteredTasks = () => {
    return (allTasks || []).filter((task) => {
      if (priorityFilter && task.priority !== priorityFilter) return false;
      if (assigneeFilter === 'mine') {
        const uid = (user?._id || user?.id)?.toString();
        const mine = Array.isArray(task.assignedTo)
          ? task.assignedTo.some((a) => (a?._id || a)?.toString() === uid)
          : (task.assignedTo?._id || task.assignedTo)?.toString() === uid;
        if (!mine) return false;
      }
      if (!isTaskInSprint(task)) return false;
      return true;
    });
  };

  const getChecklistProgress = (task) => {
    const checklist = task.checklist || [];
    if (!checklist.length) return 0;
    const done = checklist.filter((c) => c.completed).length;
    return Math.round((done / checklist.length) * 100);
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
      return;
    }

    const task = tasks[source.droppableId][source.index];

    if (task) {
      const isMine = Array.isArray(task.assignedTo)
        ? task.assignedTo.some((a) => (a?._id || a).toString() === user?._id)
        : (task.assignedTo?._id || task.assignedTo)?.toString() === user?._id;
      if (user?.role === 'teamMember' && !isMine) return;
      try {
        await API.put(`/tasks/${draggableId}`, { status: destination.droppableId });

        const newTasks = { ...tasks };
        newTasks[source.droppableId] = newTasks[source.droppableId].filter((_, i) => i !== source.index);
        newTasks[destination.droppableId] = [...newTasks[destination.droppableId]];
        newTasks[destination.droppableId].splice(destination.index, 0, { ...task, status: destination.droppableId });

        setTasks(newTasks);
        setAllTasks((prev) => prev.map((t) => (t._id === draggableId ? { ...t, status: destination.droppableId } : t)));
      } catch (error) {
        console.error('Erreur:', error);
        fetchTasksAndProjects();
      }
    }
  };

  if (loading) return <div className="kanban-loading">Chargement...</div>;

  const successMessage = location.state?.message;
  const totalTasks = filteredTasks().length;
  const overdueCount = filteredTasks().filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length;

  return (
    <div className="kanban-container">
      {successMessage && (
        <div className="kanban-success-banner">
          {successMessage}
        </div>
      )}
      <div className="kanban-header">
        <div>
          <h1>Tableau Kanban</h1>
          <p>Gestion des tâches, sprints et charge équipe</p>
        </div>
        <div className="kanban-controls">
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="project-filter">
            <option value="">Tous les projets</option>
            {projects.map(p => (<option key={p._id} value={p._id}>{p.name}</option>))}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="project-filter">
            <option value="">Toutes priorités</option>
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Basse</option>
          </select>
          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="project-filter">
            <option value="all">Toute l'équipe</option>
            <option value="mine">Mes tâches</option>
          </select>
          <select value={sprintFilter} onChange={(e) => setSprintFilter(e.target.value)} className="project-filter">
            <option value="all">Toutes itérations</option>
            <option value="current">Sprint en cours</option>
            <option value="next">Sprint suivant</option>
          </select>
          <span className="task-count">Total: {totalTasks} tâches</span>
          <span className="task-count alert">Retards: {overdueCount}</span>
          {projectId && (
            <Link to={`/projects/${projectId}/tasks/new`} className="btn btn-primary kanban-add-task">
              + Nouvelle tâche
            </Link>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {statuses.map((status) => (
            <Droppable key={status} droppableId={status}>
              {(provided, snapshot) => (
                <div className={`kanban-column ${snapshot.isDraggingOver ? 'dragging-over' : ''}`} ref={provided.innerRef} {...provided.droppableProps}>
                  <div className="column-header">
                    <h3>{statusLabels[status]}</h3>
                    <span className="task-counter">{tasks[status]?.length || 0}</span>
                  </div>

                  <div className="tasks-list">
                    {tasks[status]?.map((task, index) => {
                      const isMine = Array.isArray(task.assignedTo)
                        ? task.assignedTo.some((a) => (a?._id || a).toString() === user?._id)
                        : (task.assignedTo?._id || task.assignedTo)?.toString() === user?._id;
                      const dragDisabled = user?.role === 'teamMember' && !isMine;
                      return (
                      <Draggable key={task._id} draggableId={task._id} index={index} isDragDisabled={dragDisabled}>
                        {(provided, snapshot) => (
                          <div className={`task-card ${snapshot.isDragging ? 'dragging' : ''}`} ref={provided.innerRef} {...provided.draggableProps}>
                            <div className="task-header" {...provided.dragHandleProps}>
                              <h4>{task.title}</h4>
                              {task.priority && <span className="priority-badge" style={{ background: priorityColors[task.priority] }}>{task.priority}</span>}
                              <button type="button" className="kanban-card-view-btn" onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task._id); }} title="Voir détail">Voir</button>
                            </div>
                            {task.description && <p className="task-description">{task.description}</p>}
                            <div className="task-meta">
                              {task.assignedTo && (
                                <div className="task-assignee">
                                  <span className="assignee-avatar">
                                    {(Array.isArray(task.assignedTo) ? task.assignedTo[0]?.name : task.assignedTo?.name)?.charAt(0)?.toUpperCase() || '?'}
                                  </span>
                                  <span>
                                    {Array.isArray(task.assignedTo)
                                      ? task.assignedTo.map((a) => a.name).filter(Boolean).join(', ')
                                      : task.assignedTo?.name}
                                  </span>
                                </div>
                              )}
                              {task.dueDate && (
                                <div className={`task-date ${new Date(task.dueDate) < new Date() ? 'overdue' : ''}`}>
                                  📅 {new Date(task.dueDate).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                                </div>
                              )}
                            </div>
                            {task.project && <div className="task-project"><span>{task.project.name}</span></div>}
                            <div className="task-stats">
                              <span>Checklist: {getChecklistProgress(task)}%</span>
                              <span>Estimé: {task.estimatedHours || 0}h</span>
                              <span>Réel: {task.actualHours || 0}h</span>
                            </div>
                            <div className="task-stats">
                              <span>Dépendances: {(task.dependencies || []).length}</span>
                              <span>Commentaires: {(task.comments || []).length}</span>
                              <span>Fichiers: {(task.attachments || []).length}</span>
                            </div>
                            <div className="task-id">#{task._id.slice(-5)}</div>
                          </div>
                        )}
                      </Draggable>
                    );})}
                    {provided.placeholder}
                    {(!tasks[status] || tasks[status].length === 0) && <div className="empty-column"><p>Aucune tâche</p></div>}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={() => fetchTasksAndProjects()}
        />
      )}
    </div>
  );
};

export default KanbanBoard;