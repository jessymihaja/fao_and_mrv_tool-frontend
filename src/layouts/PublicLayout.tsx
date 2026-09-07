// src/layouts/PublicLayout.tsx
import { Outlet, NavLink, Link } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, Leaf } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/api/services';
import ChatbotWidget from '@/components/public/ChatbotWidget';

// Hook centralisé — utilisable dans tout composant enfant via props ou context
function usePublicSettings() {
  const { data } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => settingsApi.public().then(r =>
      Object.fromEntries(r.data.map(s => [s.key, s.value])) as Record<string, string>
    ),
    staleTime: 5 * 60_000, // 5 min
  });
  const get = (key: string, fallback = '') => data?.[key] || fallback;
  return { get, data };
}

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { get } = usePublicSettings();

  const siteName    = get('site_name',      'GCF Madagascar');
  const email       = get('contact_email',  'info@gcf-madagascar.org');
  const phone       = get('contact_phone',  '+261 20 22 XXX XX');
  const address     = get('contact_address','Antananarivo, Madagascar');

  const navLinks = [
    { to: '/', label: 'Accueil' },
    { to: '/projets', label: ' AND FVC' },
    { to: '/faq', label: 'FAQ' },
    { to: '/contact', label: 'Contact' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* NAVBAR — version compacte */}
<nav style={{ background: '#f0f0f0', borderBottom: '2px solid #e5e7eb' }}
  className="sticky top-0 z-50 shadow-sm">
  <div className="max-w-7xl mx-auto px-3 sm:px-4">
    <div className="grid grid-cols-3 items-center py-2 min-h-fit">

      {/* Colonne 1 — Logo compact */}
      <Link to="/" className="flex flex-col items-center justify-center w-fit">
        <img
          src="/logo/logoMEDD.png"
          alt={siteName}
          className="h-20 w-auto object-contain"  /* ← réduit de h-20 à h-12 */
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
          }}
        />
        <div className="w-7 h-7 rounded-lg flex items-center justify-center mt-1" style={{ background: 'var(--gcf-green)', display: 'none' }}>
          <Leaf className="w-4 h-4 text-white" />
        </div>
      </Link>

      {/* Colonne 2 — Titre réduit */}
      <div className="flex flex-col items-center justify-center text-center px-2">
        <span className="text-gray-800 font-bold text-sm leading-tight">
          Plateforme MRV des Financements Climatiques
        </span>
      </div>

      {/* Colonne 3 — Navigation compacte */}
      <div className="flex items-center justify-end gap-0.5">
        <div className="hidden md:flex items-center gap-0.5">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-green-100 text-green-800'
                    : 'text-gray-600 hover:text-green-800 hover:bg-green-50'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
        <button
          className="md:hidden text-gray-700 p-1.5 rounded-lg hover:bg-gray-100"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>
    </div>
  </div>

  {/* Menu mobile — compact */}
  {menuOpen && (
    <div className="md:hidden border-t border-gray-200 bg-white px-3 py-2 flex flex-col gap-0.5">
      {navLinks.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            `px-3 py-1.5 rounded-md text-xs font-medium ${
              isActive ? 'bg-green-100 text-green-800' : 'text-gray-600'
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </div>
  )}
</nav>

      {/* CONTENT */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* FOOTER — données dynamiques depuis l'API settings */}
      <footer style={{ background: 'var(--gcf-green-dark)', color: '#9dc9aa' }} className="mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

            {/* Colonne 1 — Nom du site */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img
                  src="/partners/logo-GCF.png"
                  alt={siteName}
                  className="h-6 w-auto object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    (e.currentTarget.nextSibling as HTMLElement).style.display = 'inline-block';
                  }}
                />
                <Leaf className="w-5 h-5 text-green-400" style={{ display: 'none' }} />
                <span className="text-white font-bold text-lg">{siteName}</span>
              </div>
              <p className="text-sm leading-relaxed">
                Plateforme nationale de coordination des financements climatiques pour le développement durable et résilient de Madagascar.
              </p>
            </div>

            {/* Colonne 2 — Navigation */}
            <div>
              <h4 className="text-white font-semibold mb-4">Navigation</h4>
              <div className="flex flex-col gap-2 text-sm">
                {navLinks.map(({ to, label }) => (
                  <Link key={to} to={to} className="hover:text-white transition-colors">{label}</Link>
                ))}
              </div>
            </div>

            {/* Colonne 3 — Contact dynamique */}
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <div className="text-sm space-y-1">
                <div>📧 {email}</div>
                <div>📞 {phone}</div>
                <div>📍 {address}</div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 mt-10 pt-6 text-center text-xs">
            © {new Date().getFullYear()} {siteName} — Tous droits réservés
          </div>
        </div>
      </footer>

      {/* CHATBOT */}
      <ChatbotWidget />
    </div>
  );
}