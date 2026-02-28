import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const res = await API.post('/auth/forgot-password', { email });
      setMessage(res.data.message);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la réinitialisation');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-title">Réinitialiser mot de passe</div>
          <div className="auth-subtitle">Entrez votre e-mail pour recevoir les instructions.</div>
        </div>

        {!submitted ? (
          <form className="auth-form" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Votre e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {error && <div style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</div>}

            <div className="auth-actions">
              <button type="submit" className="btn">Envoyer les instructions</button>
              <Link to="/" className="auth-link">Retour à la connexion</Link>
            </div>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
            <p>{message}</p>
            <Link to="/" className="auth-link" style={{ display: 'inline-block', marginTop: '16px' }}>
              Retour à la connexion
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
