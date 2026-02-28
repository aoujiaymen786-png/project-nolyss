import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import API from '../../utils/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const type = searchParams.get('type');

  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Vérification de votre adresse e-mail...');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Lien de vérification invalide');
        return;
      }

      try {
        const res = await API.post('/auth/verify-email', { token, type });
        setStatus('success');
        setMessage(res.data.message);
        setTimeout(() => navigate('/login'), 3000);
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Erreur lors de la vérification');
      }
    };

    verifyToken();
  }, [token, type, navigate]);

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center', padding: '40px 28px' }}>
        <div className="auth-header">
          <div className="auth-title">Vérification de votre e-mail</div>
        </div>

        <div style={{ padding: '20px 0', minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {status === 'verifying' && (
            <>
              <Loader2 size={48} className="verify-spinner" style={{ marginBottom: '16px' }} />
              <p>{message}</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle2 size={48} color="var(--success)" style={{ marginBottom: '16px' }} />
              <p style={{ color: 'var(--primary)', fontWeight: '600' }}>{message}</p>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '8px' }}>Redirection vers la connexion...</p>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
              <p style={{ color: 'var(--danger)' }}>{message}</p>
              <Link to="/login" className="auth-link" style={{ display: 'inline-block', marginTop: '16px' }}>
                Retour à la connexion
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
