import React, { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import API from '../../utils/api';
import { useNavigate, useParams } from 'react-router-dom';
import RichTextEditor from '../UI/RichTextEditor';

const ProjectForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);

  const formik = useFormik({
    initialValues: {
      name: '',
      client: '',
      status: 'prospecting',
      priority: 'medium',
      description: '',
      startDate: '',
      deadline: '',
      estimatedBudget: '',
      estimatedHours: '',
      manager: '',
      team: [],
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Nom requis'),
      client: Yup.string().required('Client requis'),
    }),
    onSubmit: async (values) => {
      try {
        if (id) {
          await API.put(`/projects/${id}`, values);
        } else {
          await API.post('/projects', values);
        }
        navigate('/projects');
      } catch (error) {
        alert('Erreur lors de l\'enregistrement');
      }
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      const clientsRes = await API.get('/clients');
      setClients(clientsRes.data);
      const usersRes = await API.get('/users');
      setUsers(usersRes.data);
    };
    fetchData();
    if (id) {
      const fetchProject = async () => {
        const { data } = await API.get(`/projects/${id}`);
        formik.setValues({
          ...data,
          startDate: data.startDate ? data.startDate.substring(0,10) : '',
          deadline: data.deadline ? data.deadline.substring(0,10) : '',
        });
      };
      fetchProject();
    }
  }, [id]);

  return (
    <form onSubmit={formik.handleSubmit}>
      <h2>{id ? 'Modifier' : 'Créer'} un projet</h2>
      <div>
        <label>Nom</label>
        <input name="name" value={formik.values.name} onChange={formik.handleChange} />
        {formik.touched.name && formik.errors.name && <div style={{ color: 'red' }}>{formik.errors.name}</div>}
      </div>
      <div>
        <label>Client</label>
        <select name="client" value={formik.values.client} onChange={formik.handleChange}>
          <option value="">Sélectionnez un client</option>
          {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        {formik.touched.client && formik.errors.client && <div style={{ color: 'red' }}>{formik.errors.client}</div>}
      </div>
      <div>
        <label>Statut</label>
        <select name="status" value={formik.values.status} onChange={formik.handleChange}>
          <option value="prospecting">Prospection</option>
          <option value="quotation">Devis</option>
          <option value="inProgress">En cours</option>
          <option value="validation">Validation</option>
          <option value="completed">Terminé</option>
          <option value="archived">Archivé</option>
        </select>
      </div>
      <div>
        <label>Priorité</label>
        <select name="priority" value={formik.values.priority} onChange={formik.handleChange}>
          <option value="low">Basse</option>
          <option value="medium">Moyenne</option>
          <option value="high">Haute</option>
        </select>
      </div>
      <div>
        <label>Description</label>
        <RichTextEditor
          value={formik.values.description}
          onChange={(html) => formik.setFieldValue('description', html)}
          placeholder="Décrivez le projet..."
          minHeight={120}
        />
      </div>
      <div>
        <label>Date de début</label>
        <input type="date" name="startDate" value={formik.values.startDate} onChange={formik.handleChange} />
      </div>
      <div>
        <label>Date d'échéance</label>
        <input type="date" name="deadline" value={formik.values.deadline} onChange={formik.handleChange} />
      </div>
      <div>
        <label>Budget estimé (TND)</label>
        <input type="number" name="estimatedBudget" value={formik.values.estimatedBudget} onChange={formik.handleChange} />
      </div>
      <div>
        <label>Heures estimées</label>
        <input type="number" name="estimatedHours" value={formik.values.estimatedHours} onChange={formik.handleChange} />
      </div>
      <div>
        <label>Manager</label>
        <select name="manager" value={formik.values.manager} onChange={formik.handleChange}>
          <option value="">Sélectionnez un manager</option>
          {users.filter(u => u.role === 'projectManager' || u.role === 'admin').map(u => (
            <option key={u._id} value={u._id}>{u.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label>Équipe</label>
        <select multiple name="team" value={formik.values.team} onChange={(e) => {
          const selected = Array.from(e.target.selectedOptions, option => option.value);
          formik.setFieldValue('team', selected);
        }}>
          {users.filter(u => u.role === 'teamMember' || u.role === 'projectManager').map(u => (
            <option key={u._id} value={u._id}>{u.name}</option>
          ))}
        </select>
      </div>
      <button type="submit">Enregistrer</button>
    </form>
  );
};

export default ProjectForm;