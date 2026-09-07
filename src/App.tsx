import './App.css'

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import PublicLayout from '@/layouts/PublicLayout';
import AdminLayout from '@/layouts/AdminLayout';
import ProtectedRoute from '@/routes/ProtectedRoute';
import HomePage from '@/pages/public/HomePage';
import PerspectivesPage from '@/pages/public/PerspectivesPage';
import ProjectsPage from '@/pages/public/ProjectsPage';
import ProjectDetailPage from '@/pages/public/ProjectDetailPage';
import FaqPage from '@/pages/public/FaqPage';
import ContactPage from '@/pages/public/ContactPage';
import LoginPage from '@/pages/admin/LoginPage';
import DashboardPage from '@/pages/admin/DashboardPage';
import AdminProjectsPage from '@/pages/admin/projects/ProjectsPage';
import ProjectWizardPage from '@/pages/admin/projects/wizard/ProjectWizardPage';
import ProjectZonePage from '@/pages/admin/projects/ProjectZonePage';
import FinancementsPage from '@/pages/admin/financements/FinancementsPage';
import RapportPage from '@/pages/admin/rapports/RapportPage';
import UsersPage from '@/pages/admin/users/UsersPage';
import CmsPage from '@/pages/admin/cms/CmsPage';
import ChatbotAdminPage from '@/pages/admin/chatbot/ChatbotAdminPage';
import SettingsPage from '@/pages/admin/settings/SettingsPage';
import ActivityPage from '@/pages/admin/activity/ActivityPage';
import ProjectAdminDetailPage from '@/pages/admin/projects/ProjectAdminDetailPage';

import RapportsNationauxPage  from '@/pages/admin/rapports/RapportsNationauxPage';
import ProjectIdeasListPage from '@/pages/admin/project-ideas/ProjectIdeasListPage';
import ProjectIdeaWizardPage from '@/pages/admin/project-ideas/ProjectIdeaWizardPage';
import ProjectIdeaDetailPage from '@/pages/admin/project-ideas/ProjectIdeaDetailPage';
import ProjectIdeaDashboardPage from '@/pages/admin/project-ideas/ProjectIdeaDashboardPage';
import StakeholdersListPage from '@/pages/admin/stakeholders/StakeholdersListPage';
import StakeholderFormPage from '@/pages/admin/stakeholders/StakeholderFormPage';
import StakeholderDetailPage from '@/pages/admin/stakeholders/StakeholderDetailPage';
import NotFoundPage from '@/pages/errors/NotFoundPage';
import { useAuthStore } from '@/store/authStore';

// Rôles ayant accès aux données métier (dashboard, projets, parties
// prenantes, pipeline de projet...). gestionnaire_cms en est exclu à
// dessein : ce rôle ne gère que le site vitrine (CMS/chatbot/paramètres).
const BUSINESS_ROLES: Array<'super_admin' | 'admin' | 'gestionnaire' | 'utilisateur'> =
  ['super_admin', 'admin', 'gestionnaire', 'utilisateur'];

/** Page d'accueil de /admin, différente selon le rôle connecté. */
function AdminIndexRedirect() {
  const { user } = useAuthStore();
  const target = user?.role === 'gestionnaire_cms' ? '/admin/cms' : '/admin/dashboard';
  return <Navigate to={target} replace />;
}

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/perspectives" element={<PerspectivesPage />} />
            <Route path="/projets" element={<ProjectsPage />} />
            <Route path="/projets/:id" element={<ProjectDetailPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/contact" element={<ContactPage />} />
          </Route>
          <Route path="/adminlog" element={<LoginPage />} />
          <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminIndexRedirect />} />
            <Route path="dashboard" element={<ProtectedRoute roles={BUSINESS_ROLES}><DashboardPage /></ProtectedRoute>} />
            <Route path="project-ideas" element={<ProtectedRoute roles={BUSINESS_ROLES}><ProjectIdeasListPage /></ProtectedRoute>} />
            <Route path="project-ideas/dashboard" element={<ProtectedRoute roles={BUSINESS_ROLES}><ProjectIdeaDashboardPage /></ProtectedRoute>} />
            <Route path="project-ideas/new" element={<ProtectedRoute roles={BUSINESS_ROLES}><ProjectIdeaWizardPage /></ProtectedRoute>} />
            <Route path="project-ideas/:id/edit" element={<ProtectedRoute roles={BUSINESS_ROLES}><ProjectIdeaWizardPage /></ProtectedRoute>} />
            <Route path="project-ideas/:id" element={<ProtectedRoute roles={BUSINESS_ROLES}><ProjectIdeaDetailPage /></ProtectedRoute>} />
            <Route path="stakeholders" element={<ProtectedRoute roles={BUSINESS_ROLES}><StakeholdersListPage /></ProtectedRoute>} />
            <Route path="stakeholders/new" element={<ProtectedRoute roles={BUSINESS_ROLES}><StakeholderFormPage /></ProtectedRoute>} />
            <Route path="stakeholders/:id/edit" element={<ProtectedRoute roles={BUSINESS_ROLES}><StakeholderFormPage /></ProtectedRoute>} />
            <Route path="stakeholders/:id" element={<ProtectedRoute roles={BUSINESS_ROLES}><StakeholderDetailPage /></ProtectedRoute>} />
            <Route path="projects" element={<ProtectedRoute roles={BUSINESS_ROLES}><AdminProjectsPage /></ProtectedRoute>} />
            <Route path="projects/new" element={<ProtectedRoute roles={BUSINESS_ROLES}><ProjectWizardPage /></ProtectedRoute>} />
            <Route path="projects/:id/wizard" element={<ProtectedRoute roles={BUSINESS_ROLES}><ProjectWizardPage /></ProtectedRoute>} />
            <Route path="projects/:id/edit" element={<ProtectedRoute roles={BUSINESS_ROLES}><ProjectWizardPage /></ProtectedRoute>} />
            <Route path="projects/:id/zone" element={<ProtectedRoute roles={BUSINESS_ROLES}><ProjectZonePage /></ProtectedRoute>} />
            <Route path="financements" element={<ProtectedRoute roles={['super_admin', 'admin', 'gestionnaire']}><FinancementsPage /></ProtectedRoute>} />
            <Route path="rapports-nationaux" element={<ProtectedRoute roles={['super_admin', 'admin', 'gestionnaire']}><RapportsNationauxPage /></ProtectedRoute>} />
            <Route path="rapports/:id" element={<ProtectedRoute roles={['super_admin', 'admin', 'gestionnaire']}><RapportPage /></ProtectedRoute>} />
            <Route path="users" element={<ProtectedRoute roles={['super_admin', 'admin']}><UsersPage /></ProtectedRoute>} />
            <Route path="cms" element={<ProtectedRoute roles={['super_admin', 'admin', 'gestionnaire_cms']}><CmsPage /></ProtectedRoute>} />
            <Route path="chatbot" element={<ProtectedRoute roles={['super_admin', 'admin', 'gestionnaire_cms']}><ChatbotAdminPage /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute roles={['super_admin', 'admin', 'gestionnaire_cms']}><SettingsPage /></ProtectedRoute>} />
            <Route path="activity" element={<ProtectedRoute roles={['super_admin', 'admin', 'gestionnaire']}><ActivityPage /></ProtectedRoute>} />
            <Route path="projects/:id/details" element={<ProtectedRoute roles={BUSINESS_ROLES}><ProjectAdminDetailPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFoundPage adminContext />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3500, style: { borderRadius: '10px', fontSize: '14px' }, success: { style: { background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' } }, error: { style: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' } } }} />
    </QueryClientProvider>
  );
}

export default App
