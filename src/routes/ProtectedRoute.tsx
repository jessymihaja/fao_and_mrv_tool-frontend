// src/routes/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import ForbiddenPage from '@/pages/errors/ForbiddenPage';
import type { User } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Rôles autorisés à accéder à cette route. Si omis, toute personne
   * authentifiée peut accéder (comportement historique).
   *
   * Rappel sécurité : ce contrôle n'est qu'une aide UX pour éviter
   * d'afficher des pages/actions non autorisées. Le backend reste seul
   * responsable de vérifier les permissions sur chaque requête — voir
   * ProjectAdminDetailPage / ProjectsPage / FinancementsPage etc. qui
   * dérivent déjà canWrite/canDelete côté UI de la même façon.
   */
  roles?: User['role'][];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/adminlog" replace />;

  if (roles && roles.length > 0 && (!user || !roles.includes(user.role))) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
