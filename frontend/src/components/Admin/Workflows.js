import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import API from '../../utils/api';
import './AdminCommon.css';
import './Workflows.css';

const ENTITY_TYPES = [
  { value: 'project', label: 'Projet' },
  { value: 'quote', label: 'Devis' },
  { value: 'invoice', label: 'Facture' },
  { value: 'task', label: 'Tâche' },
];

const TRIGGERS = [
  { value: 'on_create', label: 'À la création' },
  { value: 'on_status_change', label: 'Changement de statut' },
  { value: 'on_approval', label: 'À l\'approbation' },
];

const Workflows = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    entityType: 'project',
    trigger: 'on_create',
    isActive: true,
    steps: [],
  });

  useEffect(() => {
    const fetchList = async () => {
      try {
        const { data } = await API.get('/admin/workflows');
        setList(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, []);

  const openCreate = () => {
    setForm({
      name: '',
      description: '',
      entityType: 'project',
      trigger: 'on_create',
      isActive: true,
      steps: [],
    });
    setModal('create');
  };

  const openEdit = (item) => {
    setForm({
      _id: item._id,
      name: item.name || '',
      description: item.description || '',
      entityType: item.entityType || 'project',
      trigger: item.trigger || 'on_create',
      isActive: item.isActive !== false,
      steps: item.steps || [],
    });
    setModal('edit');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      delete payload._id;
      if (modal === 'create') {
        await API.post('/admin/workflows', payload);
      } else {
        await API.put(`/admin/workflows/${form._id}`, payload);
      }
      setModal(null);
      const { data } = await API.get('/admin/workflows');
      setList(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce workflow ?')) return;
    try {
      await API.delete(`/admin/workflows/${id}`);
      setList(list.filter((w) => w._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Workflows & processus métier</h1>
        <button type="button" className="btn-primary" onClick={openCreate}>Nouveau workflow</button>
      </div>
      <p className="admin-page-subtitle">
        Définir les étapes d&#39;approbation et les processus (projet, devis, facture, tâche).
      </p>

      <div className="admin-card admin-table-wrap">
        {loading ? (
          <div className="admin-loading">Chargement</div>
        ) : list.length === 0 ? (
          <p className="admin-empty">Aucun workflow. Cliquez sur &quot;Nouveau workflow&quot; pour en créer.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Entité</th>
                <th>Déclencheur</th>
                <th>Actif</th>
                <th>Étapes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item._id}>
                  <td>{item.name}</td>
                  <td>{ENTITY_TYPES.find((e) => e.value === item.entityType)?.label || item.entityType}</td>
                  <td>{TRIGGERS.find((t) => t.value === item.trigger)?.label || item.trigger}</td>
                  <td>{item.isActive !== false ? 'Oui' : 'Non'}</td>
                  <td>{(item.steps || []).length}</td>
                  <td>
                    <button type="button" className="btn-sm" onClick={() => openEdit(item)}>Modifier</button>
                    <button type="button" className="btn-sm btn-danger" onClick={() => handleDelete(item._id)}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && createPortal(
        <div className="admin-modal-overlay workflow-modal-overlay" onClick={() => setModal(null)} role="dialog" aria-modal="true">
          <div className="admin-modal workflow-modal" onClick={(e) => e.stopPropagation()}>
            <div className="workflow-modal-header">
              <h2>{modal === 'create' ? 'Nouveau workflow' : 'Modifier le workflow'}</h2>
              <p className="admin-modal-subtitle">Définir quand le workflow s’exécute (entité et déclencheur). Les étapes (approbations, notifications) se configurent après enregistrement.</p>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="admin-form-group">
                <label htmlFor="workflow-name">Nom <span className="required">*</span></label>
                <input
                  id="workflow-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="ex: Validation des projets"
                  required
                />
              </div>
              <div className="admin-form-group">
                <label htmlFor="workflow-description">Description</label>
                <input
                  id="workflow-description"
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optionnel"
                />
              </div>
              <div className="admin-form-group">
                <label htmlFor="workflow-entity">Entité</label>
                <select
                  id="workflow-entity"
                  value={form.entityType}
                  onChange={(e) => setForm({ ...form, entityType: e.target.value })}
                >
                  {ENTITY_TYPES.map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>
              <div className="admin-form-group">
                <label htmlFor="workflow-trigger">Déclencheur</label>
                <select
                  id="workflow-trigger"
                  value={form.trigger}
                  onChange={(e) => setForm({ ...form, trigger: e.target.value })}
                >
                  {TRIGGERS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="admin-form-group">
                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  {' '}Actif
                </label>
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Annuler</button>
                <button type="submit" className="btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Workflows;
