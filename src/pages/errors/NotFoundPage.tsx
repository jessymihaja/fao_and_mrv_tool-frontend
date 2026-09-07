// src/pages/errors/NotFoundPage.tsx
import { Link } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';

export default function NotFoundPage({ adminContext = false }: { adminContext?: boolean }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-20">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
        <MapPinOff className="w-8 h-8 text-gray-400" />
      </div>
      <h1 className="text-4xl font-extrabold text-gray-800 mb-2">404</h1>
      <p className="text-gray-500 mb-6">Cette page n'existe pas ou a été déplacée.</p>
      <Link
        to={adminContext ? '/admin/dashboard' : '/'}
        className="btn btn-primary"
        style={{ background: 'var(--gcf-green)', color: 'white', padding: '10px 20px', borderRadius: '10px' }}
      >
        {adminContext ? 'Retour au tableau de bord' : "Retour à l'accueil"}
      </Link>
    </div>
  );
}
