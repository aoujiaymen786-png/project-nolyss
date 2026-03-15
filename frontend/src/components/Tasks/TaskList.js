import React, { useEffect, useState, useContext } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import API from '../../utils/api';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import TaskDetailModal from './TaskDetailModal';
import './TaskList.css';

const STATUS_LABELS = { todo: 'À faire', inProgress: 'En cours', review: 'En revue', done: 'Terminé' };
const PRIORITY_LABELS = { low: 'Basse', medium: 'Moyenne', high: 'Haute' };

const TaskList = ({ projectId }) => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailTaskId, setDetailTaskId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const isTeamMember = user?.role === 'teamMember';
  const canDelete = ['admin', 'director', 'coordinator', 'projectManager'].includes(user?.role);
  const canCreateTask = !isTeamMember;
  const isAssignedToMe = (task) => {
    const uid = (user?._id || user?.id)?.toString();
    if (!uid) return false;
    const assignedTo = task.assignedTo || [];
    return Array.isArray(assignedTo)
      ? assignedTo.some((a) => (a?._id || a)?.toString() === uid)
      : (assignedTo?._id || assignedTo)?.toString() === uid;
  };
  const canEditTask = (task) => !isTeamMember || isAssignedToMe(task);

  const fetchTasks = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const { data } = await API.get(`/tasks?project=${projectId}`);
      setTasks(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (taskIdToDelete) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) return;
    setDeletingId(taskIdToDelete);
    try {
      await API.delete(`/tasks/${taskIdToDelete}`);
      await fetchTasks();
      if (detailTaskId === taskIdToDelete) setDetailTaskId(null);
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || 'Impossible de supprimer la tâche.');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (projectId) fetchTasks();
  }, [projectId]);

  return (
    <div className="task-list-block">
      <div className="task-list-header">
        <h3>Tâches</h3>
        {canCreateTask && <Link to={`/projects/${projectId}/tasks/new`} className="btn-add-task">Nouvelle tâche</Link>}
      </div>
      {loading ? (
        <p className="task-list-empty">Chargement des tâches...</p>
      ) : tasks.length === 0 ? (
        <div className="task-list-empty-state">
          <p className="task-list-empty">Aucune tâche pour ce projet.</p>
          {canCreateTask && <Link to={`/projects/${projectId}/tasks/new`} className="btn-add-task task-list-empty-cta">Créer une tâche</Link>}
        </div>
      ) : (
        <div className="task-list-table-wrap">
          <table className="task-list-table">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Statut</th>
                <th>Priorité</th>
                <th>Assigné(s)</th>
                <th>Estimé / Réel (h)</th>
                <th>Échéance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task._id}>
                  <td>
                    <button type="button" className="task-title-link btn-link" onClick={() => setDetailTaskId(task._id)}>{task.title}</button>
                  </td>
                  <td><span className={`task-status status-${task.status}`}>{STATUS_LABELS[task.status] || task.status}</span></td>
                  <td><span className={`task-priority priority-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span></td>
                  <td>{task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo.map((u) => u.name).join(', ') : '–'}</td>
                  <td>{task.estimatedHours != null ? task.estimatedHours : '–'} / {task.actualHours != null ? task.actualHours : '–'}</td>
                  <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('fr-FR') : '–'}</td>
                  <td className="task-list-actions-cell">
                    <button type="button" className="btn-icon" onClick={() => setDetailTaskId(task._id)} title="Voir"><Eye size={18} /></button>
                    {canEditTask(task) && (
                      <Link to={`/tasks/edit/${task._id}`} className="btn-icon" title="Modifier"><Pencil size={18} /></Link>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className="btn-icon btn-danger"
                        onClick={() => handleDelete(task._id)}
                        disabled={deletingId === task._id}
                        title={deletingId === task._id ? 'Suppression…' : 'Supprimer'}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {detailTaskId && (
        <TaskDetailModal
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
          onTaskUpdated={() => fetchTasks()}
        />
      )}
    </div>
  );
};

export default TaskList;
