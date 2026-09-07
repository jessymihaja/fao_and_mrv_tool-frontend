// src/layouts/AdminLayout.tsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, FolderKanban, DollarSign,
  Users, Globe, Bot, Settings, Activity, BarChart2,
  Leaf, Menu, LogOut, ChevronRight, Lightbulb, HeartHandshake, ExternalLink
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/services';
import toast from 'react-hot-toast';

/*
|──────────────────────────────────────────────────────────
| Matrice de visibilité du menu par rôle :
|
| super_admin      → tout (même chose que admin visuellement)
| admin            → tout
| gestionnaire     → Dashboard, Projets (incl. Composantes/Indicateurs/Documents via le Wizard), Financements, Activité
| gestionnaire_cms → Site vitrine (CMS), Chatbot, Paramètres — uniquement
| utilisateur      → Dashboard, Projets uniquement
|──────────────────────────────────────────────────────────
*/
const navItems = [
  {
    to: '/admin/dashboard',
    icon: LayoutDashboard,
    label: 'Tableau de bord',
    roles: ['super_admin', 'admin', 'gestionnaire', 'utilisateur'],
  },
  {
    to: '/admin/project-ideas',
    icon: Lightbulb,
    label: 'Pipeline de projet',
    roles: ['super_admin', 'admin', 'gestionnaire', 'utilisateur'],
  },
  {
    to: '/admin/stakeholders',
    icon: HeartHandshake,
    label: 'Parties prenantes',
    roles: ['super_admin', 'admin', 'gestionnaire', 'utilisateur'],
  },
  {
    to: '/admin/projects',
    icon: FolderKanban,
    label: 'Projets',
    roles: ['super_admin', 'admin', 'gestionnaire', 'utilisateur'],
  },
  {
    to: '/admin/financements',
    icon: DollarSign,
    label: 'Financements',
    roles: ['super_admin', 'admin', 'gestionnaire'],
  },
  {
    to:    '/admin/rapports-nationaux',
    icon:  BarChart2,
    label: 'Rapports nationaux',
    roles: ['super_admin', 'admin', 'gestionnaire'],
  },
  {
    to: '/admin/cms',
    icon: Globe,
    label: 'Site vitrine (CMS)',
    roles: ['super_admin', 'admin', 'gestionnaire_cms'],
  },
  {
    to: '/admin/users',
    icon: Users,
    label: 'Utilisateurs',
    roles: ['super_admin', 'admin'],
  },
  {
    to: '/admin/chatbot',
    icon: Bot,
    label: 'Chatbot',
    roles: ['super_admin', 'admin', 'gestionnaire_cms'],
  },
  {
    to: '/admin/activity',
    icon: Activity,
    label: 'Activité',
    roles: ['super_admin', 'admin', 'gestionnaire'],
  },
  {
    to: '/admin/settings',
    icon: Settings,
    label: 'Paramètres',
    roles: ['super_admin', 'admin', 'gestionnaire_cms'],
  },
];

// ─── Sidebar (module-level : évite un remount complet à chaque render de
// AdminLayout, qui ferait perdre le focus/scroll dans la nav — voir
// react-hooks/static-components) ─────────────────────────────────────────
interface SidebarProps {
  mobile?: boolean;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  setMobileOpen: (v: boolean) => void;
  filteredNav: typeof navItems;
  user: { name?: string; role?: string } | null;
  handleLogout: () => void;
}

function Sidebar({ mobile = false, collapsed, setCollapsed, setMobileOpen, filteredNav, user, handleLogout }: SidebarProps) {
  return (
    <div
      style={{ background: 'var(--gcf-sidebar)', minHeight: '100vh' }}
      className={`flex flex-col ${mobile ? 'w-64' : collapsed ? 'w-16' : 'w-64'} transition-all duration-300`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        {(!collapsed || mobile) && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--gcf-green)' }}>
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white text-sm font-bold leading-tight">L'Autorité Nationale Désignée</div>
              <div className="text-green-400 text-xs">Back-office</div>
            </div>
          </div>
        )}
        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-green-400 hover:text-white p-1 rounded transition-colors"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const { to, icon: Icon, label } = item;
          if ('external' in item && item.external) {
            return (
              <a
                key={to}
                href={to}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => mobile && setMobileOpen(false)}
                className="nav-item"
                title={collapsed && !mobile ? label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {(!collapsed || mobile) && (
                  <span className="flex items-center gap-1.5 flex-1">
                    {label}
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </span>
                )}
              </a>
            );
          }
          return (
            <NavLink
              key={to}
              to={to}
              onClick={() => mobile && setMobileOpen(false)}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
              title={collapsed && !mobile ? label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {(!collapsed || mobile) && <span>{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/10">
        {(!collapsed || mobile) ? (
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'var(--gcf-green)' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{user?.name}</div>
              <div className="text-green-400 text-xs truncate capitalize">
                {user?.role?.replace('_', ' ')}
              </div>
            </div>
            <button onClick={handleLogout} className="text-green-400 hover:text-red-400 transition-colors" title="Déconnexion">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={handleLogout} className="nav-item w-full justify-center" title="Déconnexion">
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Si le serveur ne répond pas, on déconnecte quand même côté client :
      // la session locale ne doit pas rester active indéfiniment.
    }
    clearAuth();
    toast.success('Déconnexion réussie');
    navigate('/adminlog');
  };

  // Filtrer selon le rôle de l'utilisateur connecté
  const filteredNav = navItems.filter(item =>
    item.roles.includes(user?.role || '')
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} setMobileOpen={setMobileOpen} filteredNav={filteredNav} user={user} handleLogout={handleLogout} />
      </div>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="flex-shrink-0">
            <Sidebar mobile collapsed={collapsed} setCollapsed={setCollapsed} setMobileOpen={setMobileOpen} filteredNav={filteredNav} user={user} handleLogout={handleLogout} />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-500">
              Bienvenue, <strong className="text-gray-800">{user?.name}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NavLink
              to="/"
              target="_blank"
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5" />
              Voir le site
            </NavLink>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" style={{ background: 'var(--gcf-bg)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}