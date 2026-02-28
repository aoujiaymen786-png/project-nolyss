import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import API from '../../utils/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Lien de réinitialisation invalide');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    try {
      await API.post('/auth/reset-password', { token, password });
      setSuccess('Mot de passe réinitialisé. Redirection vers la connexion...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-title">Créer un nouveau mot de passe</div>
          <div className="auth-subtitle">Entrez votre nouveau mot de passe ci-dessous.</div>
        </div>

        {!error && !success ? (
          <form className="auth-form" onSubmit={handleSubmit}>
            <input
              type="password"
              placeholder="Nouveau mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {error && <div style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</div>}

            <div className="auth-actions">
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Mise à jour...' : 'Réinitialiser'}
              </button>
              <Link to="/login" className="auth-link">Retour à la connexion</Link>
            </div>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            {success && <p style={{ color: 'var(--primary)', marginBottom: '16px' }}>{success}</p>}
            {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
            <Link to="/login" className="auth-link" style={{ display: 'inline-block', marginTop: '16px' }}>
              Aller à la connexion
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
