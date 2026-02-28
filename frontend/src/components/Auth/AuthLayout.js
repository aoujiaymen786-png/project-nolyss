import React, { useEffect } from 'react';
import DraggableAuthCard from './DraggableAuthCard';
import './AuthLayout.css';
import './DraggableAuthCard.css';

const AUTH_GRADIENT = 'linear-gradient(315deg, rgb(223, 48, 0) 0%, rgb(255, 145, 37) 16.667%, rgb(218, 217, 154) 33.333%, rgb(114, 224, 232) 50%, rgb(20, 163, 214) 66.667%, rgb(0, 67, 115) 83.333%, rgb(58, 0, 5) 100%)';

const AuthLayout = ({ children }) => {
  useEffect(() => {
    const prev = document.body.style.background;
    const prevRoot = document.getElementById('root')?.style?.background;
    document.body.style.background = AUTH_GRADIENT;
    const root = document.getElementById('root');
    if (root) root.style.background = AUTH_GRADIENT;
    return () => {
      document.body.style.background = prev;
      if (root) root.style.background = prevRoot || '';
    };
  }, []);

  return (
    <div className="auth-layout">
      <div className="animated-gradient-background"></div>
      <DraggableAuthCard className="auth-layout-container">
        <div className="auth-layout-content">
          {children}
        </div>
      </DraggableAuthCard>
    </div>
  );
};

export default AuthLayout;
