import React, { useEffect, useState } from 'react';
import API from '../../utils/api';
import { Link } from 'react-router-dom';
import TaskDetailModal from './TaskDetailModal';
import './TaskList.css';

const STATUS_LABELS = { todo: 'À faire', inProgress: 'En cours', review: 'En revue', done: 'Terminé' };
const PRIORITY_LABELS = { low: 'Basse', medium: 'Moyenne', high: 'Haute' };

const TaskList = ({ projectId }) => {
  const [tasks, setTasks] = useState([]);
  const [detailTaskId, setDetailTaskId] = useState(null);

  const fetchTasks = async () => {
    if (!projectId) return;
    try {
      const { data } = await API.get(`/tasks?project=${projectId}`);
      setTasks(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (projectId) fetchTasks();
  }, [projectId]);

  return (
    <div className="task-list-block">
      <div className="task-list-header">
        <h3>Tâches</h3>
        <Link to={`/projects/${projectId}/tasks/new`} className="btn-add-task">Nouvelle tâche</Link>
      </div>
      {tasks.length === 0 ? (
        <p className="task-list-empty">Aucune tâche. Créez une tâche pour commencer.</p>
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
                  <td>
                    <button type="button" className="btn-link" onClick={() => setDetailTaskId(task._id)}>Voir</button>
                    {' '}
                    <Link to={`/tasks/edit/${task._id}`}>Modifier</Link>
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
