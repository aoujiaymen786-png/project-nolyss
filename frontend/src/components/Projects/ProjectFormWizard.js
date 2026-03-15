import React, { useContext, useEffect, useState, useRef } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import API from '../../utils/api';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import './ProjectFormWizard.css';

const STATUS_OPTIONS = [
  { value: 'prospecting', label: 'Prospection' },
  { value: 'inProgress', label: 'En cours' },
  { value: 'validation', label: 'Validation' },
  { value: 'completed', label: 'Terminé' },
  { value: 'archived', label: 'Archivé' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Basse' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Haute' },
];

const PROJECT_TYPES = ['Site web', 'Application', 'Conseil', 'Formation', 'Maintenance', 'Autre'];

const ProjectFormWizard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [step, setStep] = useState(1);
  const stepRef = useRef(1);
  const [canSubmit, setCanSubmit] = useState(false);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const isEdit = !!id;

  const formik = useFormik({
    initialValues: {
      name: '',
      client: '',
      type: '',
      status: 'prospecting',
      priority: 'medium',
      startDate: '',
      endDate: '',
      deadline: '',
      estimatedBudget: '',
      estimatedHours: '',
      description: '',
      objectives: '',
      manager: user?.role === 'projectManager' ? (user?._id || '') : '',
      team: [],
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Nom requis'),
      client: Yup.string().required('Client requis'),
    }),
    onSubmit: async (values) => {
      try {
        const payload = { ...values };
        if (payload.estimatedBudget === '') delete payload.estimatedBudget;
        else payload.estimatedBudget = Number(payload.estimatedBudget);
        if (payload.estimatedHours === '') delete payload.estimatedHours;
        else payload.estimatedHours = Number(payload.estimatedHours);
        if (id) {
          await API.put(`/projects/${id}`, payload);
          navigate('/projects');
        } else {
          const { data: created } = await API.post('/projects', payload);
          navigate(`/projects/${created._id}/kanban`, { state: { message: 'Projet créé. Une tâche de lancement a été ajoutée. Vous pouvez en créer d\'autres.' } });
        }
      } catch (err) {
        formik.setStatus(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Erreur');
      }
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, usersRes] = await Promise.all([
          API.get('/clients'),
          API.get('/users'),
        ]);
        setClients(clientsRes.data);
        setUsers(usersRes.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
    if (id) {
      API.get(`/projects/${id}`).then(({ data }) => {
        formik.setValues({
          name: data.name || '',
          client: data.client?._id || data.client || '',
          type: data.type || '',
          status: data.status || 'prospecting',
          priority: data.priority || 'medium',
          startDate: data.startDate ? data.startDate.slice(0, 10) : '',
          endDate: data.endDate ? data.endDate.slice(0, 10) : '',
          deadline: data.deadline ? data.deadline.slice(0, 10) : '',
          estimatedBudget: data.estimatedBudget ?? '',
          estimatedHours: data.estimatedHours ?? '',
          description: data.description || '',
          objectives: data.objectives || '',
          manager: data.manager?._id || data.manager || '',
          team: data.team?.map((t) => t._id || t) || [],
        });
      });
    }
  }, [id]);

  const nextStep = () => {
    if (step === 1 && (!formik.values.name || !formik.values.client)) {
      formik.setTouched({ name: true, client: true });
      return;
    }
    setStep((s) => {
      const next = Math.min(s + 1, 3);
      stepRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    if (step === 3) {
      const t = setTimeout(() => setCanSubmit(true), 400);
      return () => clearTimeout(t);
    } else {
      setCanSubmit(false);
    }
  }, [step]);

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="project-wizard">
      <div className="project-wizard-header">
        <h1>{isEdit ? 'Modifier le projet' : 'Nouveau projet – Assistant guidé'}</h1>
        <Link to="/projects" className="back-link">← Liste des projets</Link>
      </div>

      {!isEdit && (
        <div className="wizard-steps">
          <div className={`wizard-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>1. Infos générales</div>
          <div className={`wizard-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}>2. Dates & budget</div>
          <div className={`wizard-step ${step >= 3 ? 'active' : ''}`}>3. Description & équipe</div>
        </div>
      )}

      {formik.status && <div className="wizard-error">{formik.status}</div>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (stepRef.current < 3) {
            nextStep();
          } else {
            formik.handleSubmit(e);
          }
        }}
        className="wizard-form"
      >
        {step === 1 && (
          <section className="wizard-section">
            <h2>Informations générales</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Nom du projet *</label>
                <input name="name" value={formik.values.name} onChange={formik.handleChange} onBlur={formik.handleBlur} />
                {formik.touched.name && formik.errors.name && <span className="error">{formik.errors.name}</span>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Client *</label>
                <select name="client" value={formik.values.client} onChange={formik.handleChange} onBlur={formik.handleBlur}>
                  <option value="">Sélectionnez un client</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                {formik.touched.client && formik.errors.client && <span className="error">{formik.errors.client}</span>}
              </div>
            </div>
            <div className="form-row two-cols">
              <div className="form-group">
                <label>Type de projet</label>
                <select name="type" value={formik.values.type} onChange={formik.handleChange}>
                  <option value="">–</option>
                  {PROJECT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Priorité</label>
                <select name="priority" value={formik.values.priority} onChange={formik.handleChange}>
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {isEdit && (
              <div className="form-row">
                <div className="form-group">
                  <label>Statut (cycle de vie)</label>
                  <select name="status" value={formik.values.status} onChange={formik.handleChange}>
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <section className="wizard-section">
            <h2>Dates prévisionnelles et enveloppe</h2>
            <div className="form-row two-cols">
              <div className="form-group">
                <label>Date de début</label>
                <input type="date" name="startDate" value={formik.values.startDate} onChange={formik.handleChange} />
              </div>
              <div className="form-group">
                <label>Date de fin</label>
                <input type="date" name="endDate" value={formik.values.endDate} onChange={formik.handleChange} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Date limite (deadline)</label>
                <input type="date" name="deadline" value={formik.values.deadline} onChange={formik.handleChange} />
              </div>
            </div>
            <div className="form-row two-cols">
              <div className="form-group">
                <label>Budget prévisionnel (TND)</label>
                <input type="number" min={0} step={100} name="estimatedBudget" value={formik.values.estimatedBudget} onChange={formik.handleChange} />
              </div>
              <div className="form-group">
                <label>Enveloppe horaire (heures)</label>
                <input type="number" min={0} step={0.5} name="estimatedHours" value={formik.values.estimatedHours} onChange={formik.handleChange} />
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="wizard-section">
            <h2>Description, objectifs et équipe</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Description détaillée</label>
                <textarea name="description" value={formik.values.description} onChange={formik.handleChange} rows={4} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Objectifs</label>
                <textarea name="objectives" value={formik.values.objectives} onChange={formik.handleChange} rows={3} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Responsable (manager)</label>
                <select name="manager" value={formik.values.manager} onChange={formik.handleChange}>
                  <option value="">–</option>
                  {users.filter((u) => ['projectManager', 'admin', 'director', 'coordinator'].includes(u.role)).map((u) => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Équipe</label>
                <select
                  multiple
                  name="team"
                  value={formik.values.team}
                  onChange={(e) => formik.setFieldValue('team', Array.from(e.target.selectedOptions, (o) => o.value))}
                  className="team-select"
                >
                  {users.filter((u) => u.role === 'teamMember' || u.role === 'projectManager').map((u) => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
                <span className="hint">Maintenez Ctrl pour sélectionner plusieurs</span>
              </div>
            </div>
            {isEdit && (
              <div className="form-row">
                <div className="form-group">
                  <label>Statut</label>
                  <select name="status" value={formik.values.status} onChange={formik.handleChange}>
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </section>
        )}

        <div className="wizard-actions">
          {step > 1 ? (
            <button type="button" className="btn-secondary" onClick={prevStep}>Précédent</button>
          ) : (
            <Link to="/projects" className="btn-secondary">Annuler</Link>
          )}
          {step < 3 ? (
            <button type="button" className="btn-primary" onClick={nextStep}>Suivant</button>
          ) : (
            <button type="submit" className="btn-primary" disabled={!canSubmit}>Enregistrer</button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ProjectFormWizard;
