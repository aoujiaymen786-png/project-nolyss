import React, { useState } from 'react';
import API from '../../utils/api';
import { useNavigate, Link } from 'react-router-dom';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('teamMember');
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/auth/register', { name, email, password, phone, role });
      alert('Inscription réussie ! Vous pouvez maintenant vous connecter.');
      navigate('/');
    } catch (error) {
      alert('Erreur lors de l\'inscription');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-title">Créer un compte</div>
          <div className="auth-subtitle">Rejoignez votre équipe et commencez à gérer vos projets.</div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input type="text" placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} required />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          <PhoneInput
            country={'tn'}
            value={phone}
            onChange={setPhone}
            placeholder="Téléphone"
            enableAreaCodes={true}
            preferredCountries={['tn', 'fr', 'us', 'de', 'gb', 'be', 'ch']}
          />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="teamMember">Membre d'équipe</option>
            <option value="projectManager">Chef de projet</option>
            <option value="coordinator">Coordinatrice</option>
            <option value="director">Directeur</option>
          </select>

          <div className="auth-actions">
            <button type="submit" className="btn">S'inscrire</button>
           
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;