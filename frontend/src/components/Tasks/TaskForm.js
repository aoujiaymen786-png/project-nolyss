import React, { useState, useEffect, useContext } from 'react';
import API from '../../utils/api';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import RichTextEditor from '../UI/RichTextEditor';
import { ArrowLeft, ClipboardList, Users, Calendar, ListChecks, Save } from 'lucide-react';
import './TaskForm.css';

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

  // Construire la liste des utilisateurs assignables : chef de projet + membres de l'équipe du projet
  const buildAssignableUsersFromProject = (projectData) => {
    if (!projectData || isTeamMember) return [];
    const list = [];
    const seen = new Set();
    const add = (u) => {
      if (!u) return;
      const id = (u._id || u).toString();
      if (seen.has(id)) return;
      seen.add(id);
      list.push(typeof u === 'object' && u.name != null ? u : { _id: id, name: id });
    };
    if (projectData.manager) add(projectData.manager);
    (projectData.team || []).forEach(add);
    return list;
  };

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
        setUsers(buildAssignableUsersFromProject(data));
      }
    };
    fetchProject();

    if (taskId) {
      const fetchTask = async () => {
        const { data } = await API.get(`/tasks/${taskId}`);
        if (!projectId && data.project) {
          const proj = typeof data.project === 'object' ? data.project : null;
          setProject(proj);
          if (!isTeamMember && proj) {
            const projectIdFromTask = proj._id || proj;
            const { data: projectData } = await API.get(`/projects/${projectIdFromTask}`);
            setProject(projectData);
            setUsers(buildAssignableUsersFromProject(projectData));
          }
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
            actualHours: formData.actualHours ? Number(formData.actualHours) : 0,
            dueDate: formData.dueDate || undefined,
            checklist: (formData.checklist || []).filter((i) => i && String(i.item || '').trim()),
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
      const msg = error.response?.data?.message || 'Erreur lors de l\'enregistrement';
      alert(msg);
    }
  };

  const resolvedProjectId =
    projectId ||
    (typeof formData.project === 'string' ? formData.project : formData.project?._id) ||
    (typeof project === 'object' && project?._id) ||
    (typeof project === 'string' ? project : null);
  const backUrl = resolvedProjectId ? `/projects/${resolvedProjectId}` : '/projects';

  return (
    <div className="task-form-container">
      <div className="task-form-header">
        <Link to={backUrl} className="task-form-back">
          <ArrowLeft size={18} /> {resolvedProjectId ? 'Retour au projet' : 'Liste des projets'}
        </Link>
        <h1>{taskId ? 'Modifier' : 'Créer'} une tâche</h1>
      </div>
      <form className="task-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h3><ClipboardList size={20} /> Informations principales</h3>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Titre</label>
              <input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Titre de la tâche"
                required
              />
            </div>
            <div className="form-group full-width">
              <label>Description</label>
              <div className="rte-wrapper">
                <RichTextEditor
                  value={formData.description}
                  onChange={(html) => setFormData({ ...formData, description: html })}
                  placeholder="Décrivez la tâche..."
                  minHeight={140}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3><Users size={20} /> Attribution et statut</h3>
          <div className="form-grid">
            {!isTeamMember && (
              <div className="form-group">
                <label>Assigné à</label>
                <select multiple value={formData.assignedTo} onChange={handleAssignedToChange}>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Statut</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="todo">À faire</option>
                <option value="inProgress">En cours</option>
                <option value="review">En révision</option>
                <option value="done">Terminé</option>
              </select>
            </div>
            <div className="form-group">
              <label>Priorité</label>
              <select name="priority" value={formData.priority} onChange={handleChange}>
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3><Calendar size={20} /> Dates et temps</h3>
          <div className="form-grid">
            {!isTeamMember && (
              <div className="form-group">
                <label>Heures estimées</label>
                <input
                  type="number"
                  name="estimatedHours"
                  value={formData.estimatedHours}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  step="0.25"
                />
              </div>
            )}
            <div className="form-group">
              <label>Temps passé (heures)</label>
              <input
                type="number"
                name="actualHours"
                value={formData.actualHours}
                onChange={handleChange}
                placeholder="0"
                min="0"
                step="0.25"
              />
            </div>
            <div className="form-group">
              <label>Date d&apos;échéance</label>
              <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3><ListChecks size={20} /> Checklist</h3>
          <div className="checklist-list">
            {formData.checklist.map((item, index) => (
              <div key={index} className="checklist-item">
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={(e) => handleChecklistChange(index, 'completed', e.target.checked)}
                />
                <input
                  type="text"
                  value={item.item}
                  onChange={(e) => handleChecklistChange(index, 'item', e.target.value)}
                  placeholder="Élément de la checklist"
                />
                <span className="checklist-completed">Complété</span>
                <button type="button" className="btn-remove-item" onClick={() => removeChecklistItem(index)}>
                  Supprimer
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn-add-checklist" onClick={addChecklistItem}>
            <ListChecks size={18} /> Ajouter un élément
          </button>
        </div>

        <div className="form-actions">
          <Link to={backUrl} className="btn-cancel">Annuler</Link>
          <button type="submit" className="btn-save">
            <Save size={18} /> Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskForm;