import React, { useState, useEffect, useContext } from 'react';
import API from '../../utils/api';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import RichTextEditor from '../UI/RichTextEditor';

const TaskForm = () => {
  const { user } = useContext(AuthContext);
  const isTeamMember = user?.role === 'teamMember';
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: [],
    status: 'todo',
    priority: 'medium',
    estimatedHours: '',
    actualHours: '',
    dueDate: '',
    checklist: [],
  });
  const [project, setProject] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) {
        if (!isTeamMember) {
          const usersRes = await API.get('/users');
          setUsers(usersRes.data);
        }
        return;
      }
      const { data } = await API.get(`/projects/${projectId}`);
      setProject(data);
      if (!isTeamMember) {
        const usersRes = await API.get('/users');
        setUsers(usersRes.data);
      }
    };
    fetchProject();

    if (taskId) {
      const fetchTask = async () => {
        const { data } = await API.get(`/tasks/${taskId}`);
        if (!projectId && data.project) {
          setProject(typeof data.project === 'object' ? data.project : null);
        }
        setFormData({
          ...data,
          assignedTo: (data.assignedTo || []).map((u) => u._id || u),
          dueDate: data.dueDate ? data.dueDate.substring(0,10) : '',
        });
      };
      fetchTask();
    }
  }, [projectId, taskId, isTeamMember]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAssignedToChange = (e) => {
    const selected = Array.from(e.target.selectedOptions, option => option.value);
    setFormData({ ...formData, assignedTo: selected });
  };

  const handleChecklistChange = (index, field, value) => {
    const newChecklist = [...formData.checklist];
    newChecklist[index][field] = value;
    setFormData({ ...formData, checklist: newChecklist });
  };

  const addChecklistItem = () => {
    setFormData({
      ...formData,
      checklist: [...formData.checklist, { item: '', completed: false }],
    });
  };

  const removeChecklistItem = (index) => {
    const newChecklist = formData.checklist.filter((_, i) => i !== index);
    setFormData({ ...formData, checklist: newChecklist });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = isTeamMember
        ? {
            status: formData.status,
            actualHours: formData.actualHours,
            checklist: formData.checklist,
          }
        : { ...formData, project: projectId };
      if (taskId) {
        await API.put(`/tasks/${taskId}`, dataToSend);
      } else {
        await API.post('/tasks', dataToSend);
      }
      const resolvedProjectId =
        projectId ||
        (typeof formData.project === 'string' ? formData.project : formData.project?._id) ||
        (typeof project === 'string' ? project : project?._id);
      if (resolvedProjectId) {
        navigate(`/projects/${resolvedProjectId}`);
      } else {
        navigate('/projects');
      }
    } catch (error) {
      alert('Erreur lors de l\'enregistrement');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>{taskId ? 'Modifier' : 'Créer'} une tâche</h2>
      <div>
        <label>Titre</label>
        <input name="title" value={formData.title} onChange={handleChange} required />
      </div>
      <div>
        <label>Description</label>
        <RichTextEditor
          value={formData.description}
          onChange={(html) => setFormData({ ...formData, description: html })}
          placeholder="Décrivez la tâche..."
          minHeight={120}
        />
      </div>
      {!isTeamMember && (
        <div>
          <label>Assigné à</label>
          <select multiple value={formData.assignedTo} onChange={handleAssignedToChange}>
            {users.map(user => (
              <option key={user._id} value={user._id}>{user.name}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label>Statut</label>
        <select name="status" value={formData.status} onChange={handleChange}>
          <option value="todo">À faire</option>
          <option value="inProgress">En cours</option>
          <option value="review">En révision</option>
          <option value="done">Terminé</option>
        </select>
      </div>
      <div>
        <label>Priorité</label>
        <select name="priority" value={formData.priority} onChange={handleChange}>
          <option value="low">Basse</option>
          <option value="medium">Moyenne</option>
          <option value="high">Haute</option>
        </select>
      </div>
      {!isTeamMember && (
        <div>
          <label>Heures estimées</label>
          <input type="number" name="estimatedHours" value={formData.estimatedHours} onChange={handleChange} />
        </div>
      )}
      <div>
        <label>Temps passé (heures)</label>
        <input type="number" name="actualHours" value={formData.actualHours} onChange={handleChange} min="0" step="0.25" />
      </div>
      <div>
        <label>Date d'échéance</label>
        <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} />
      </div>
      <div>
        <label>Checklist</label>
        {formData.checklist.map((item, index) => (
          <div key={index}>
            <input
              type="text"
              value={item.item}
              onChange={(e) => handleChecklistChange(index, 'item', e.target.value)}
              placeholder="Élément"
            />
            <label>
              <input
                type="checkbox"
                checked={item.completed}
                onChange={(e) => handleChecklistChange(index, 'completed', e.target.checked)}
              />
              Complété
            </label>
            <button type="button" onClick={() => removeChecklistItem(index)}>Supprimer</button>
          </div>
        ))}
        <button type="button" onClick={addChecklistItem}>Ajouter un élément</button>
      </div>
      <button type="submit">Enregistrer</button>
    </form>
  );
};

export default TaskForm;