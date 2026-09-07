// src/pages/admin/stakeholders/StakeholdersListPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Eye, Pencil, Trash2, Filter, ChevronLeft, ChevronRight,
  Loader2, HeartHandshake, X, Link as LinkIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { stakeholderApi, stakeholderCategoryApi, stakeholderRoleApi } from '@/api/services';
import { useAuthStore } from '@/store/authStore';
import { STATUT_STAKEHOLDER_LABELS, type Stakeholder, type StatutStakeholder } from '@/types';
import { getErrorMessage } from '@/utils/apiError';

const STATUT_STYLES: Record<StatutStakeholder, string> = {
  actif: 'bg-green-50 text-green-700 border-green-200',
  en_attente: 'bg-amber-50 text-amber-700 border-amber-200',
  suspendu: 'bg-red-50 text-red-700 border-red-200',
  termine: 'bg-gray-100 text-gray-600 border-gray-200',
};

const fmtDate = (d?: string | null) => (d ? format(new Date(d), 'dd/MM/yyyy') : '—');

function ConfirmDeleteModal({ open, onClose, onConfirm, isPending, nom }: {
  open: boolean; onClose: () => void; onConfirm: () => void; isPending: boolean; nom: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-5">
        <h3 className="font-bold text-gray-800 mb-2">Supprimer cette partie prenante ?</h3>
        <p className="text-sm text-gray-500 mb-4">
          « <strong>{nom}</strong> » sera définitivement supprimée. Cette action est irréversible.
        </p>
        <div className="flex justify-end gap-2">
          <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={isPending}>Annuler</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm} disabled={isPending}>
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────
export default function StakeholdersListPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canWrite = ['admin', 'super_admin', 'gestionnaire'].includes(user?.role ?? '');

  const [search, setSearch] = useState('');
  const [categorieFilter, setCategorieFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statutFilter, setStatutFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Stakeholder | null>(null);

  const params = {
    search: search || undefined,
    categorie_id: categorieFilter ? Number(categorieFilter) : undefined,
    role_id: roleFilter ? Number(roleFilter) : undefined,
    statut: statutFilter || undefined,
    page,
    per_page: 15,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['stakeholders', params],
    queryFn: () => stakeholderApi.list(params).then(r => r.data),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['stakeholder-categories'],
    queryFn: () => stakeholderCategoryApi.list().then(r => r.data),
  });
  const { data: roles = [] } = useQuery({
    queryKey: ['stakeholder-roles'],
    queryFn: () => stakeholderRoleApi.list().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => stakeholderApi.delete(id),
    onSuccess: () => {
      toast.success('Partie prenante supprimée');
      qc.invalidateQueries({ queryKey: ['stakeholders'] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de la suppression')),
  });

  const stakeholders: Stakeholder[] = data?.data ?? [];
  const meta = data;
  const hasActiveFilters = !!(categorieFilter || roleFilter || statutFilter);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-100 flex items-center justify-center">
            <HeartHandshake className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Parties prenantes</h1>
            <p className="text-sm text-gray-400">Gestion des acteurs intervenant dans les projets GCF</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://docs.google.com/spreadsheets/d/1z80JInNbnlDPy_kLbAK9g34RBBK2HlmQ/edit?gid=610409557#gid=610409557"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            <LinkIcon className="w-3.5 h-3.5" /> Partie prenantes
          </a>
          {canWrite && (
            <Link to="/admin/stakeholders/new" className="btn btn-primary btn-sm">
              <Plus className="w-3.5 h-3.5" /> Ajouter une partie prenante
            </Link>
          )}
        </div>
      </div>

      {/* Recherche + filtres */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="form-input pl-9"
              placeholder="Rechercher par nom ou organisation…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button
            className={`btn btn-sm ${hasActiveFilters ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFilters(f => !f)}
          >
            <Filter className="w-3.5 h-3.5" /> Filtres {hasActiveFilters && '•'}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
            <select className="form-input" value={categorieFilter} onChange={e => { setCategorieFilter(e.target.value); setPage(1); }}>
              <option value="">Toutes les catégories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.designation}</option>)}
            </select>
            <select className="form-input" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
              <option value="">Tous les rôles</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.designation}</option>)}
            </select>
            <select className="form-input" value={statutFilter} onChange={e => { setStatutFilter(e.target.value); setPage(1); }}>
              <option value="">Tous les statuts</option>
              {Object.entries(STATUT_STAKEHOLDER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {hasActiveFilters && (
              <button
                className="btn btn-secondary btn-sm justify-self-start"
                onClick={() => { setCategorieFilter(''); setRoleFilter(''); setStatutFilter(''); setPage(1); }}
              >
                <X className="w-3.5 h-3.5" /> Réinitialiser
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tableau */}
      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
          </div>
        ) : stakeholders.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <HeartHandshake className="w-10 h-10 opacity-20 mb-2" />
            <p className="font-semibold text-gray-500">Aucune partie prenante trouvée</p>
            <p className="text-xs text-gray-400">Essayez d'autres filtres, ou ajoutez-en une nouvelle.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Organisation</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Type de contribution</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Date de début</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stakeholders.map(s => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <Link to={`/admin/stakeholders/${s.id}`} className="font-semibold text-gray-700 hover:text-green-700">
                      {s.nom}
                    </Link>
                    {s.acronyme && <span className="text-gray-400 ml-1.5 text-xs">({s.acronyme})</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.organisation || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{s.categorie?.designation || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{s.role?.designation || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{s.type_contribution?.designation || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${STATUT_STYLES[s.statut]}`}>
                      {STATUT_STAKEHOLDER_LABELS[s.statut]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{fmtDate(s.date_debut)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button title="Voir" onClick={() => navigate(`/admin/stakeholders/${s.id}`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {canWrite && (
                        <button title="Modifier" onClick={() => navigate(`/admin/stakeholders/${s.id}/edit`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canWrite && (
                        <button title="Supprimer" onClick={() => setDeleteTarget(s)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <p>{meta.from}–{meta.to} sur {meta.total} parties prenantes</p>
          <div className="flex items-center gap-1">
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2">{page} / {meta.last_page}</span>
            <button className="btn btn-secondary btn-sm" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isPending={deleteMutation.isPending}
        nom={deleteTarget?.nom ?? ''}
      />
    </div>
  );
}
