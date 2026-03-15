import React, { useEffect, useState } from 'react';
import API from '../../utils/api';
import './AdminCommon.css';

const ROLES = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'director', label: 'Directeur' },
  { value: 'coordinator', label: 'Coordinateur' },
  { value: 'projectManager', label: 'Chef de projet' },
  { value: 'teamMember', label: 'Équipe' },
  { value: 'client', label: 'Client' },
];

const ROLE_LABELS = {
  admin: 'Administrateur',
  director: 'Directeur',
  coordinator: 'Coordinateur',
  projectManager: 'Chef de projet',
  teamMember: 'Équipe',
  client: 'Client',
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'teamMember', isActive: true });
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const { data } = await API.get('/users');
      setUsers(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRegistrations = async () => {
    try {
      const { data } = await API.get('/users/pending/registrations');
      setPendingRegistrations(data || []);
    } catch (err) {
      setPendingRegistrations([]);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPendingRegistrations();
  }, []);

  const refreshAll = () => {
    fetchUsers();
    fetchPendingRegistrations();
  };

  const openCreate = () => {
    setForm({ name: '', email: '', password: '', phone: '', role: 'teamMember', isActive: true });
    setModal('create');
    setError('');
  };

  const openEdit = (u) => {
    setForm({
      _id: u._id,
      name: u.name,
      email: u.email,
      password: '',
      phone: u.phone || '',
      role: u.role,
      isActive: u.isActive !== false,
    });
    setModal('edit');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (modal === 'create') {
        await API.post('/users', {
          name: form.name,
          email: form.email,
          password: form.password || undefined,
          phone: form.phone,
          role: form.role,
          isActive: form.isActive,
        });
      } else {
        const payload = { name: form.name, email: form.email, phone: form.phone, role: form.role, isActive: form.isActive };
        if (form.password) payload.password = form.password;
        await API.put(`/users/${form._id}`, payload);
      }
      setModal(null);
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Erreur');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet utilisateur ?')) return;
    try {
      await API.delete(`/users/${id}`);
      refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur suppression');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await API.patch(`/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const handleApproveRegistration = async (userId) => {
    try {
      await API.post(`/users/${userId}/approve-registration`);
      refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const handleRejectRegistration = async (userId) => {
    if (!window.confirm('Refuser cette demande d\'inscription ?')) return;
    try {
      await API.post(`/users/${userId}/reject-registration`);
      refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  if (loading) return <div className="admin-page"><div className="admin-loading">Chargement</div></div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Gestion des utilisateurs</h1>
        <button type="button" className="btn-primary" onClick={openCreate}>Nouvel utilisateur</button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {pendingRegistrations.length > 0 && (
        <div className="admin-card admin-pending-section">
          <h2 className="admin-section-title">Demandes d&apos;inscription en attente</h2>
          <p className="admin-section-desc">Ces utilisateurs ont créé un compte et attendent votre validation pour pouvoir se connecter.</p>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle demandé</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingRegistrations.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{ROLE_LABELS[u.role] || u.role}</td>
                  <td>{u.createdAt ? new Date(u.createdAt).toLocaleString('fr-FR') : '-'}</td>
                  <td>
                    <button type="button" className="btn-sm btn-success" onClick={() => handleApproveRegistration(u._id)}>Accepter</button>
                    {' '}
                    <button type="button" className="btn-sm btn-danger" onClick={() => handleRejectRegistration(u._id)}>Refuser</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-card admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Actif</th>
              <th>Inscription</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                    className="admin-select-inline"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </td>
                <td>{u.isActive !== false ? 'Oui' : 'Non'}</td>
                <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : '-'}</td>
                <td>
                  <button type="button" className="btn-sm" onClick={() => openEdit(u)}> Modifier </button>
                  <button type="button" className="btn-sm btn-danger" onClick={() => handleDelete(u._id)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="admin-modal-overlay" onClick={() => setModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{modal === 'create' ? 'Nouvel utilisateur' : 'Modifier l\'utilisateur'}</h2>
            {error && <div className="admin-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="admin-form-group">
                <label>Nom</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="admin-form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  readOnly={modal === 'edit'}
                />
              </div>
              <div className="admin-form-group">
                <label>Mot de passe {modal === 'edit' && '(laisser vide pour ne pas changer)'}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={6}
                  placeholder={modal === 'edit' ? '••••••••' : ''}
                />
              </div>
              <div className="admin-form-group">
                <label>Téléphone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="admin-form-group">
                <label>Rôle</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              {modal === 'edit' && (
                <div className="admin-form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                    {' '}Compte actif
                  </label>
                </div>
              )}
              <div className="admin-modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Annuler</button>
                <button type="submit" className="btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
