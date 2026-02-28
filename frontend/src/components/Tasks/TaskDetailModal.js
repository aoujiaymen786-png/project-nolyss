import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import { AuthContext } from '../../contexts/AuthContext';
import './TaskDetailModal.css';

const STATUS_LABELS = { todo: 'À faire', inProgress: 'En cours', review: 'En revue', done: 'Terminé' };
const PRIORITY_LABELS = { low: 'Basse', medium: 'Moyenne', high: 'Haute' };

const TaskDetailModal = ({ taskId, onClose, onTaskUpdated }) => {
  const { user } = useContext(AuthContext);
  const [task, setTask] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [hoursToAdd, setHoursToAdd] = useState('');
  const [localStatus, setLocalStatus] = useState('');
  const [localAssignedTo, setLocalAssignedTo] = useState([]);

  const canEdit = ['admin', 'director', 'coordinator', 'projectManager'].includes(user?.role) ||
    (task?.assignedTo || []).some((u) => (u?._id || u)?.toString() === user?._id);

  useEffect(() => {
    if (!taskId) return;
    const fetchTask = async () => {
      setLoading(true);
      try {
        const { data } = await API.get(`/tasks/${taskId}`);
        setTask(data);
        setLocalStatus(data.status || 'todo');
        setLocalAssignedTo((data.assignedTo || []).map((u) => (u._id || u).toString()));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [taskId]);

  useEffect(() => {
    if (taskId && canEdit) {
      API.get('/users').then((r) => setUsers(r.data || [])).catch(() => setUsers([]));
    }
  }, [taskId, canEdit]);

  useEffect(() => {
    if (task) {
      setLocalStatus(task.status || 'todo');
      setLocalAssignedTo((task.assignedTo || []).map((u) => (u._id || u).toString()));
    }
  }, [task?._id]);

  const refreshTask = async () => {
    if (!taskId) return;
    try {
      const { data } = await API.get(`/tasks/${taskId}`);
      setTask(data);
      setLocalStatus(data.status || 'todo');
      setLocalAssignedTo((data.assignedTo || []).map((u) => (u._id || u).toString()));
      onTaskUpdated?.(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setLocalStatus(newStatus);
    setSaving(true);
    try {
      await API.put(`/tasks/${taskId}`, { status: newStatus });
      await refreshTask();
    } catch (e) {
      console.error(e);
      setLocalStatus(task?.status);
    } finally {
      setSaving(false);
    }
  };

  const handleAssignedToChange = async (e) => {
    const selected = Array.from(e.target.selectedOptions, (o) => o.value);
    setLocalAssignedTo(selected);
    setSaving(true);
    try {
      await API.put(`/tasks/${taskId}`, { assignedTo: selected });
      await refreshTask();
    } catch (e) {
      console.error(e);
      setLocalAssignedTo((task?.assignedTo || []).map((u) => (u._id || u).toString()));
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSaving(true);
    try {
      await API.post(`/tasks/${taskId}/comments`, { text: commentText.trim() });
      setCommentText('');
      await refreshTask();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleLogTime = async (e) => {
    e.preventDefault();
    const hours = parseFloat(hoursToAdd, 10);
    if (Number.isNaN(hours) || hours <= 0) return;
    setSaving(true);
    try {
      const current = Number(task?.actualHours) || 0;
      await API.put(`/tasks/${taskId}`, { actualHours: current + hours });
      setHoursToAdd('');
      await refreshTask();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleChecklistToggle = async (index) => {
    const checklist = [...(task?.checklist || [])];
    if (!checklist[index]) return;
    checklist[index] = { ...checklist[index], completed: !checklist[index].completed };
    setSaving(true);
    try {
      await API.put(`/tasks/${taskId}`, { checklist });
      await refreshTask();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!taskId) return null;

  return (
    <div className="task-detail-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="task-detail-title">
      <div className="task-detail-modal" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className="task-detail-loading">Chargement...</div>
        ) : !task ? (
          <div className="task-detail-error">Tâche introuvable</div>
        ) : (
          <>
            <div className="task-detail-header">
              <h2 id="task-detail-title">{task.title}</h2>
              <button type="button" className="task-detail-close" onClick={onClose} aria-label="Fermer">×</button>
            </div>
            {task.project && (
              <p className="task-detail-project">Projet : {task.project.name}</p>
            )}
            <div className="task-detail-grid">
              <div className="task-detail-main">
                {task.description && <div className="task-detail-section"><p>{task.description}</p></div>}
                <div className="task-detail-section">
                  <h4>Statut</h4>
                  {canEdit ? (
                    <select value={localStatus} onChange={handleStatusChange} disabled={saving} className="task-detail-select">
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  ) : (
                    <span className={`task-status status-${task.status}`}>{STATUS_LABELS[task.status] || task.status}</span>
                  )}
                </div>
                <div className="task-detail-section">
                  <h4>Affectation</h4>
                  {canEdit && users.length > 0 ? (
                    <select multiple value={localAssignedTo} onChange={handleAssignedToChange} disabled={saving} className="task-detail-select task-detail-select-multi">
                      {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                    </select>
                  ) : (
                    <p>{(task.assignedTo || []).map((u) => u.name).filter(Boolean).join(', ') || 'Non assignée'}</p>
                  )}
                </div>
                <div className="task-detail-section task-detail-meta">
                  <span>Priorité : <strong>{PRIORITY_LABELS[task.priority] || task.priority}</strong></span>
                  <span>Estimé : {task.estimatedHours != null ? `${task.estimatedHours} h` : '–'}</span>
                  <span>Temps passé : <strong>{task.actualHours != null ? `${task.actualHours} h` : '0 h'}</strong></span>
                  <span>Échéance : {task.dueDate ? new Date(task.dueDate).toLocaleDateString('fr-FR') : '–'}</span>
                </div>
                {canEdit && (
                  <div className="task-detail-section task-detail-log-time">
                    <h4>Ajouter du temps</h4>
                    <form onSubmit={handleLogTime} className="task-detail-inline-form">
                      <input type="number" min="0.25" step="0.25" placeholder="Heures" value={hoursToAdd} onChange={(e) => setHoursToAdd(e.target.value)} className="task-detail-input-hours" />
                      <button type="submit" disabled={saving || !hoursToAdd}>Enregistrer</button>
                    </form>
                  </div>
                )}
                {(task.checklist || []).length > 0 && (
                  <div className="task-detail-section">
                    <h4>Checklist</h4>
                    <ul className="task-detail-checklist">
                      {task.checklist.map((item, index) => (
                        <li key={index}>
                          {canEdit ? (
                            <label>
                              <input type="checkbox" checked={!!item.completed} onChange={() => handleChecklistToggle(index)} disabled={saving} />
                              <span className={item.completed ? 'completed' : ''}>{item.item}</span>
                            </label>
                          ) : (
                            <span className={item.completed ? 'completed' : ''}>{item.item}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="task-detail-section">
                  <h4>Commentaires ({(task.comments || []).length})</h4>
                  <ul className="task-detail-comments">
                    {(task.comments || []).map((c, idx) => (
                      <li key={idx}>
                        <strong>{c.user?.name || 'Utilisateur'}</strong>
                        <span className="task-detail-comment-date">{c.createdAt ? new Date(c.createdAt).toLocaleString('fr-FR') : ''}</span>
                        <p>{c.text}</p>
                      </li>
                    ))}
                  </ul>
                  {canEdit && (
                    <form onSubmit={handleAddComment} className="task-detail-comment-form">
                      <textarea placeholder="Ajouter un commentaire..." value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={2} className="task-detail-comment-input" />
                      <button type="submit" disabled={saving || !commentText.trim()}>Publier</button>
                    </form>
                  )}
                </div>
              </div>
            </div>
            <div className="task-detail-footer">
              <Link to={`/tasks/edit/${taskId}`} className="task-detail-link-edit">Modifier (formulaire complet)</Link>
              <button type="button" onClick={onClose}>Fermer</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TaskDetailModal;
