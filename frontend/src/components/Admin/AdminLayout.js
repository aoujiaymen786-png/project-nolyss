import React from 'react';
import { Outlet } from 'react-router-dom';
import './AdminLayout.css';

const AdminLayout = () => (
  <div className="admin-layout">
    <main className="admin-main">
      <Outlet />
    </main>
  </div>
);

export default AdminLayout;
