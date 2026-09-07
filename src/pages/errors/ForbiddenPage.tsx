// src/pages/errors/ForbiddenPage.tsx
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-20">
      <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="text-4xl font-extrabold text-gray-800 mb-2">403</h1>
      <p className="text-gray-500 mb-6">
        Vous n'avez pas les permissions nécessaires pour accéder à cette page.
      </p>
      <Link
        to="/admin/dashboard"
        className="btn btn-primary"
        style={{ background: 'var(--gcf-green)', color: 'white', padding: '10px 20px', borderRadius: '10px' }}
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
}
