import React, { useState, useEffect } from 'react';
import Login from './Login';
import Register from './Register';
import DraggableAuthCard from './DraggableAuthCard';
import './IndexPage.css';
import './Auth.css';
import './DraggableAuthCard.css';

const AUTH_GRADIENT = 'linear-gradient(315deg, rgb(223, 48, 0) 0%, rgb(255, 145, 37) 16.667%, rgb(218, 217, 154) 33.333%, rgb(114, 224, 232) 50%, rgb(20, 163, 214) 66.667%, rgb(0, 67, 115) 83.333%, rgb(58, 0, 5) 100%)';

const IndexPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  useEffect(() => {
    const prev = document.body.style.background;
    const root = document.getElementById('root');
    const prevRoot = root?.style?.background;
    document.body.style.background = AUTH_GRADIENT;
    if (root) root.style.background = AUTH_GRADIENT;
    return () => {
      document.body.style.background = prev;
      if (root) root.style.background = prevRoot || '';
    };
  }, []);

  return (
    <div className="index-page">
      <div className="animated-gradient-background"></div>
      
      <DraggableAuthCard className="index-container">
        <div className="index-header">
          <img src="/logo-black.png" alt="Nolyss Logo" className="index-logo" />
         
          <p className="index-subtitle">Gestion des Projets </p>
        </div>

        <div className="index-content">
          {isLogin ? (
            <div className="auth-section">
              <Login />
              <div className="auth-toggle">
                <p>Pas encore de compte? 
                  <button 
                    onClick={() => setIsLogin(false)}
                    className="toggle-button"
                  >
                    S'inscrire
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <div className="auth-section">
              <Register />
              <div className="auth-toggle">
                <p>Vous avez déjà un compte? 
                  <button 
                    onClick={() => setIsLogin(true)}
                    className="toggle-button"
                  >
                    Se connecter
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="index-footer">
          <p>&copy; 2026 Nolyss Digital. Tous droits réservés.</p>
        </div>
      </DraggableAuthCard>
    </div>
  );
};

export default IndexPage;
