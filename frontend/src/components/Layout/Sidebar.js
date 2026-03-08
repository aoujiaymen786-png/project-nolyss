import React, { useContext, useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AuthContext } from '../../contexts/AuthContext';

const ADMIN_ITEMS = [
  { to: '/admin', end: true, label: 'Tableau de bord' },
  { to: '/admin/users', end: false, label: 'Utilisateurs' },
  { to: '/admin/settings', end: false, label: 'Paramètres' },
  { to: '/admin/notifications', end: false, label: 'Emails & Notifications' },
  { to: '/admin/integrations', end: false, label: 'Intégrations' },
  { to: '/admin/workflows', end: false, label: 'Workflows' },
  { to: '/admin/audit', end: false, label: 'Audit & Conformité' },
];

const Sidebar = () => {
  const { user } = useContext(AuthContext);
  const { pathname } = useLocation();
  const role = user?.role;
  const isAdminSection = pathname.startsWith('/admin');
  const [adminExpanded, setAdminExpanded] = useState(isAdminSection);

  useEffect(() => {
    if (isAdminSection) setAdminExpanded(true);
  }, [isAdminSection]);

  const linkClass = ({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link');

  return (
    <aside className="app-sidebar" aria-label="Menu de navigation">
      <ul className="menu">
        <li>
          <NavLink to="/dashboard" className={linkClass}>Tableau de bord</NavLink>
        </li>
        <li>
          <NavLink to="/profile" className={linkClass}>Mon profil</NavLink>
        </li>
        {(role === 'director' || role === 'coordinator') && (
          <li>
            <NavLink to="/clients" className={linkClass}>Clients</NavLink>
          </li>
        )}
        {role !== 'client' && role !== 'admin' && role !== 'director' && (
          <li>
            <NavLink to="/projects" className={linkClass}>Projets</NavLink>
          </li>
        )}
        {role !== 'client' && role !== 'admin' && (
          <li>
            <NavLink to="/kanban" className={linkClass}>Kanban</NavLink>
          </li>
        )}
        {role === 'director' && (
          <li>
            <NavLink to="/invoices" className={linkClass}>Factures</NavLink>
          </li>
        )}
        {role === 'director' && (
          <li>
            <NavLink to="/quotes" className={linkClass}>Devis</NavLink>
          </li>
        )}
        {role === 'director' && (
          <li>
            <NavLink to="/projects" className={linkClass}>Consulter les projets</NavLink>
          </li>
        )}
        {role === 'admin' && (
          <li className="sidebar-menu-group">
            <button
              type="button"
              className={`sidebar-group-trigger ${adminExpanded ? 'expanded' : ''}`}
              onClick={() => setAdminExpanded((e) => !e)}
              aria-expanded={adminExpanded}
            >
              <span>{adminExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
              <span>Administration</span>
            </button>
            {adminExpanded && (
              <ul className="sidebar-submenu">
                {ADMIN_ITEMS.map(({ to, end, label }) => (
                  <li key={to}>
                    <NavLink to={to} end={end} className={linkClass}>{label}</NavLink>
                  </li>
                ))}
              </ul>
            )}
          </li>
        )}
        {role === 'client' && (
          <li>
            <NavLink to="/client" className={linkClass}>Mon espace</NavLink>
          </li>
        )}
      </ul>
    </aside>
  );
};

export default Sidebar;