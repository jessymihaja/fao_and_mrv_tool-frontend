// src/pages/public/PerspectivesPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Compass } from 'lucide-react';
import { projectPerspectiveApi, perspectiveTypeApi } from '@/api/services';
import { STATUT_PERSPECTIVE_LABELS } from '@/types';

export default function PerspectivesPage() {
  const [typeId, setTypeId] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data: types = [] } = useQuery({
    queryKey: ['perspective-types'],
    queryFn: () => perspectiveTypeApi.list().then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['public-perspectives', typeId, page],
    queryFn: () => projectPerspectiveApi.publicList({ type_id: typeId ? Number(typeId) : undefined, page, per_page: 9 }).then(r => r.data),
  });

  const items = data?.data ?? [];
  const meta = data;

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-700 mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Retour à l'accueil
      </Link>

      <div className="text-center mb-10">
        <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--gcf-green)' }}>
          Vision future
        </span>
        <h1 className="text-3xl font-extrabold text-gray-800 mt-2">Perspectives des projets</h1>
        <p className="text-gray-500 mt-2 max-w-xl mx-auto">
          Extensions envisagées, pérennisation, recherche de nouveaux financements : la vision future des projets
          enregistrés sur la plateforme.
        </p>
      </div>

      <div className="flex justify-center gap-2 mb-10 flex-wrap">
        <button
          onClick={() => { setTypeId(''); setPage(1); }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            typeId === '' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Tous
        </button>
        {types.map(t => (
          <button
            key={t.id}
            onClick={() => { setTypeId(String(t.id)); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              typeId === String(t.id) ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t.designation}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Compass className="w-10 h-10 opacity-20 mx-auto mb-2" />
          <p className="font-semibold text-gray-500">Aucune perspective enregistrée pour l'instant.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((p) => (
            <div key={p.id} className="rounded-2xl p-6 bg-white border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-green-50">
                  <Compass className="w-5 h-5 text-green-700" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">{p.titre}</p>
                  {p.project?.titre && <p className="text-xs text-gray-400 truncate">{p.project.titre}</p>}
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700">
                {p.type?.designation ?? '—'} · {STATUT_PERSPECTIVE_LABELS[p.statut as keyof typeof STATUT_PERSPECTIVE_LABELS]}
              </span>
              {p.description && <p className="text-sm text-gray-600 mt-3 line-clamp-3">{p.description}</p>}
              {p.zone_extension_envisagee && (
                <p className="text-xs text-gray-500 mt-2"><strong>Zone envisagée :</strong> {p.zone_extension_envisagee}</p>
              )}
              {p.impact_futur_attendu && (
                <p className="text-xs text-gray-500 mt-2"><strong>Impact attendu :</strong> {p.impact_futur_attendu}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-sm text-gray-500 px-2">{page} / {meta.last_page}</span>
          <button className="btn btn-secondary btn-sm" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
