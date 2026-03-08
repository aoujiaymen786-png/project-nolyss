import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthContext, AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout/Layout';
import IndexPage from './components/Auth/IndexPage';
import AuthLayout from './components/Auth/AuthLayout';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';
import VerifyEmail from './components/Auth/VerifyEmail';
import Dashboard from './components/Dashboard/Dashboard';
import ClientList from './components/Clients/ClientList';
import ClientForm from './components/Clients/ClientForm';
import ClientDetail from './components/Clients/ClientDetail';
import ProjectList from './components/Projects/ProjectList';
import ProjectFormWizard from './components/Projects/ProjectFormWizard';
import ProjectDetails from './components/Projects/ProjectDetails';
import TaskForm from './components/Tasks/TaskForm';
import KanbanBoard from './components/Tasks/KanbanBoard';
import GanttChart from './components/Tasks/GanttChart';
import InvoiceList from './components/Invoices/InvoiceList';
import InvoiceForm from './components/Invoices/InvoiceForm';
import QuoteList from './components/Quotes/QuoteList';
import QuoteForm from './components/Quotes/QuoteForm';
import ClientDashboard from './components/ClientPortal/ClientDashboard';
import ClaimsList from './components/Claims/ClaimsList';
import ProfilePage from './components/Profile/ProfilePage';
import AdminLayout from './components/Admin/AdminLayout';
import AdminDashboardPage from './components/Admin/AdminDashboardPage';
import UserManagement from './components/Admin/UserManagement';
import AdminSettings from './components/Admin/AdminSettings';
import EmailNotifications from './components/Admin/EmailNotifications';
import Integrations from './components/Admin/Integrations';
import Workflows from './components/Admin/Workflows';
import AuditLogs from './components/Admin/AuditLogs';

// Route privée avec chargement
const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Chargement...</div>;
  return user ? children : <Navigate to="/login" />;
};

// Route avec restriction de rôle
const RoleRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Chargement...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/dashboard" />;
  return children;
};

// Composant pour la page d'accueil ou tableau de bord selon l'authentification
const HomeRoute = () => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Chargement...</div>;
  return user ? <Navigate to="/dashboard" /> : <IndexPage />;
};

// Composant pour les routes avec layout et authentification
const PrivateLayout = ({ children }) => (
  <PrivateRoute>
    <Layout>{children}</Layout>
  </PrivateRoute>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
            <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />
            <Route path="/forgot" element={<AuthLayout><ForgotPassword /></AuthLayout>} />
            <Route path="/reset-password" element={<AuthLayout><ResetPassword /></AuthLayout>} />
            <Route path="/verify-email" element={<AuthLayout><VerifyEmail /></AuthLayout>} />
            
            {/* Routes avec layout */}
            <Route path="/dashboard" element={<PrivateLayout><Dashboard /></PrivateLayout>} />
            <Route path="/profile" element={<PrivateLayout><ProfilePage /></PrivateLayout>} />
            
            <Route path="/clients" element={<PrivateLayout><ClientList /></PrivateLayout>} />
            <Route path="/clients/claims" element={<RoleRoute allowedRoles={['director', 'coordinator', 'admin']}><PrivateLayout><ClaimsList /></PrivateLayout></RoleRoute>} />
            <Route path="/clients/new" element={<PrivateLayout><ClientForm /></PrivateLayout>} />
            <Route path="/clients/edit/:id" element={<PrivateLayout><ClientForm /></PrivateLayout>} />
            <Route path="/clients/:id" element={<PrivateLayout><ClientDetail /></PrivateLayout>} />
            
            <Route path="/projects" element={<RoleRoute allowedRoles={['director', 'coordinator', 'projectManager', 'teamMember']}><PrivateLayout><ProjectList /></PrivateLayout></RoleRoute>} />
            <Route path="/projects/new" element={<RoleRoute allowedRoles={['director', 'coordinator', 'projectManager']}><PrivateLayout><ProjectFormWizard /></PrivateLayout></RoleRoute>} />
            <Route path="/projects/edit/:id" element={<RoleRoute allowedRoles={['director', 'coordinator', 'projectManager']}><PrivateLayout><ProjectFormWizard /></PrivateLayout></RoleRoute>} />
            <Route path="/projects/:id" element={<RoleRoute allowedRoles={['director', 'coordinator', 'projectManager', 'teamMember']}><PrivateLayout><ProjectDetails /></PrivateLayout></RoleRoute>} />
            <Route path="/projects/:id/collaboration" element={<RoleRoute allowedRoles={['director', 'coordinator', 'projectManager', 'teamMember']}><PrivateLayout><ProjectDetails /></PrivateLayout></RoleRoute>} />
            
            <Route path="/projects/:projectId/tasks/new" element={<RoleRoute allowedRoles={['director', 'coordinator', 'projectManager', 'teamMember']}><PrivateLayout><TaskForm /></PrivateLayout></RoleRoute>} />
            <Route path="/tasks/edit/:taskId" element={<RoleRoute allowedRoles={['director', 'coordinator', 'projectManager', 'teamMember']}><PrivateLayout><TaskForm /></PrivateLayout></RoleRoute>} />
            <Route path="/kanban" element={<RoleRoute allowedRoles={['director', 'coordinator', 'projectManager', 'teamMember']}><PrivateLayout><KanbanBoard /></PrivateLayout></RoleRoute>} />
            <Route path="/projects/:projectId/kanban" element={<RoleRoute allowedRoles={['director', 'coordinator', 'projectManager', 'teamMember']}><PrivateLayout><KanbanBoard /></PrivateLayout></RoleRoute>} />
            <Route path="/projects/:projectId/gantt" element={<RoleRoute allowedRoles={['director', 'coordinator', 'projectManager', 'teamMember']}><PrivateLayout><GanttChart /></PrivateLayout></RoleRoute>} />
            
            <Route path="/invoices" element={<RoleRoute allowedRoles={['director']}><PrivateLayout><InvoiceList /></PrivateLayout></RoleRoute>} />
            <Route path="/invoices/new" element={<RoleRoute allowedRoles={['director']}><PrivateLayout><InvoiceForm /></PrivateLayout></RoleRoute>} />
            <Route path="/invoices/:id" element={<RoleRoute allowedRoles={['director']}><PrivateLayout><InvoiceForm /></PrivateLayout></RoleRoute>} />
            <Route path="/invoices/:id/edit" element={<RoleRoute allowedRoles={['director']}><PrivateLayout><InvoiceForm /></PrivateLayout></RoleRoute>} />
            
<Route path="/quotes" element={<RoleRoute allowedRoles={['director']}><PrivateLayout><QuoteList /></PrivateLayout></RoleRoute>} />
            <Route path="/quotes/new" element={<RoleRoute allowedRoles={['director']}><PrivateLayout><QuoteForm /></PrivateLayout></RoleRoute>} />
            <Route path="/quotes/:id" element={<RoleRoute allowedRoles={['director']}><PrivateLayout><QuoteForm /></PrivateLayout></RoleRoute>} />
            <Route path="/quotes/:id/edit" element={<RoleRoute allowedRoles={['director']}><PrivateLayout><QuoteForm /></PrivateLayout></RoleRoute>} />

            <Route path="/client" element={
              <RoleRoute allowedRoles={['client']}>
                <Layout><ClientDashboard /></Layout>
              </RoleRoute>
            } />

            {/* Administration (réservé admin) */}
            <Route path="/admin" element={
              <RoleRoute allowedRoles={['admin']}>
                <Layout><AdminLayout /></Layout>
              </RoleRoute>
            }>
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="notifications" element={<EmailNotifications />} />
              <Route path="integrations" element={<Integrations />} />
              <Route path="workflows" element={<Workflows />} />
              <Route path="audit" element={<AuditLogs />} />
            </Route>
          </Routes>
          <ToastContainer
            position="top-right"
            autoClose={4000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            theme="colored"
            className="toast-accessible"
          />
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;