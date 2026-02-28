import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import AdminDashboard from './AdminDashboard';
import ExecutiveDashboard from './ExecutiveDashboard';
import ManagerDashboard from './ManagerDashboard';
import CoordinatorDashboard from './CoordinatorDashboard';
import TeamMemberDashboard from './TeamMemberDashboard';
import ClientDashboard from './ClientDashboard';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  let content = <div className="dashboard-error">Rôle utilisateur non reconnu</div>;
  if (user?.role === 'admin') content = <AdminDashboard />;
  if (user?.role === 'director') content = <ExecutiveDashboard />;
  if (user?.role === 'coordinator') content = <CoordinatorDashboard />;
  if (user?.role === 'projectManager') content = <ManagerDashboard />;
  if (user?.role === 'teamMember') content = <TeamMemberDashboard />;
  if (user?.role === 'client') content = <ClientDashboard />;

  return (
    <div>
      
      {content}
    </div>
  );
};

export default Dashboard;