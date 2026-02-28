import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="app-container">
      <a href="#main-content" className="skip-link">Aller au contenu principal</a>
      <Navbar />
      <div className="app-main">
        <Sidebar />
        <div id="main-content" className="app-content" role="main" tabIndex={-1}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;