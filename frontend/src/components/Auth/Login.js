import React, { useState, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import SocialAuthButtons from './SocialAuthButtons';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      const msg = error.response?.data?.message || 'Erreur de connexion';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-title">Se connecter</div>
          <div className="auth-subtitle">Entrez vos identifiants pour accéder à votre tableau de bord.</div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
            required
          />
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Cacher le mot de passe' : 'Voir le mot de passe'}
            >
              {showPassword ? 'Cacher' : 'Voir'}
            </button>
          </div>

          <div className="auth-actions">
            <button type="submit" className="btn">Se connecter</button>
          </div>
          {errorMessage ? <div className="error-message">{errorMessage}</div> : null}

          <div className="auth-footer">
            <span className="auth-aux">Mot de passe oublié ? </span>
            <Link to="/forgot" className="auth-link">Réinitialiser</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;