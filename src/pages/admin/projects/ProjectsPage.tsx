// src/pages/admin/projects/ProjectsPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { projectApi, depenseApi, statusApi } from '@/api/services';
import {
  Plus, Edit, Trash2, MapPin, 
  FolderKanban, Filter, ChevronLeft, ChevronRight,
  Loader2, Calendar, Globe, Tag, Info, ArrowUpRight,
  X, DollarSign, TrendingDown, CheckCircle2,
  Building2, Layers, LayoutGrid, List,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import type { Project } from '@/types';
import { getErrorMessage } from '@/utils/apiError';
import { useAuthStore } from '@/store/authStore';
import { blendSectorColors, sectorMapColor } from '@/utils/sectorColors';
import { normalizePagination } from '@/utils/pagination';


const STATUT_STYLES: Record<string, { pill: string; dot: string }> = {
  'Concept Note':     { pill: 'bg-blue-50 text-blue-700 border-blue-200',   dot: 'bg-blue-400' },
  'Funding Proposal': { pill: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-400' },
  'En cours':         { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
  'Clôturé':          { pill: 'bg-gray-100 text-gray-500 border-gray-200',  dot: 'bg-gray-400' },
};


const CLASSIFICATION_ICON: Record<string, string> = {
  'Readiness':                        '🌱',
  'SAP (Simplified Approval Process)':'⚡',
  'FP (Funding Proposal)':            '📋',
};

// ─── MODAL GÉNÉRIQUE ──────────────────────────────────────────
function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean; onClose: () => void;
  title?: string; children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl w-full ${widths[size]} shadow-2xl max-h-[90vh] overflow-y-auto`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ─── FORMULAIRE DÉPENSE ───────────────────────────────────────
function DepenseForm({ projectId, onClose }: { projectId: number; onClose: () => void }) {
  const [form, setForm] = useState({ designation: '', note: '', montant: '', date: '', beneficiaire: '' });
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('project_id',   String(projectId));
      fd.append('designation',  form.designation);
      fd.append('note',         form.note);
      fd.append('montant',      form.montant);
      fd.append('date',         form.date);
      fd.append('beneficiaire', form.beneficiaire);
      await depenseApi.create(fd);
      toast.success('Dépense enregistrée ✓');
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erreur lors de la sauvegarde'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-6 pb-6 pt-5 space-y-4">
      <div>
        <label className="form-label">Désignation *</label>
        <input type="text" className="form-input" required
          value={form.designation} onChange={e => set('designation', e.target.value)}
          placeholder="Ex : Achat de matériel, Transport équipe..." />
      </div>
      <div>
        <label className="form-label">Note *</label>
        <textarea className="form-input" rows={3} required
          value={form.note} onChange={e => set('note', e.target.value)}
          placeholder="Description de la dépense..." />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Montant *</label>
          <input type="number" className="form-input" required min={0} step="any"
            value={form.montant} onChange={e => set('montant', e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="form-label">Date *</label>
          <input type="date" className="form-input" required
            value={form.date} onChange={e => set('date', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="form-label">Bénéficiaire *</label>
        <input type="text" className="form-input" required
          value={form.beneficiaire} onChange={e => set('beneficiaire', e.target.value)}
          placeholder="Nom du bénéficiaire..." />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>Annuler</button>
        <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}

// ─── MODAL TRANSACTION ────────────────────────────────────────
function TransactionModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const [step, setStep] = useState<'choose' | 'depense'>('choose');

  if (step === 'depense') {
    return (
      <Modal open onClose={onClose} title="Nouvelle dépense" size="md">
        <DepenseForm projectId={project.id} onClose={onClose} />
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} size="sm">
      <div className="px-6 pt-5 pb-2 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Nouvelle transaction</h3>
          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">{project.titre}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>
      <div className="px-6 pb-6 pt-3 grid grid-cols-2 gap-3">
        <Link
          to={`/admin/financements?project_id=${project.id}`}
          onClick={onClose}
          className="group flex flex-col items-center gap-3 p-5 border-2 border-gray-100 rounded-2xl hover:border-emerald-300 hover:bg-emerald-50 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition-colors">
            <DollarSign className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-800">Financement</p>
            <p className="text-xs text-gray-400 mt-0.5">Entrée de fonds</p>
          </div>
        </Link>
        <button
          onClick={() => setStep('depense')}
          className="group flex flex-col items-center gap-3 p-5 border-2 border-gray-100 rounded-2xl hover:border-red-300 hover:bg-red-50 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-red-100 group-hover:bg-red-200 flex items-center justify-center transition-colors">
            <TrendingDown className="w-6 h-6 text-red-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-800">Dépense</p>
            <p className="text-xs text-gray-400 mt-0.5">Sortie de fonds</p>
          </div>
        </button>
      </div>
    </Modal>
  );
}

// ─── CARTE PROJET (GRID) ──────────────────────────────────────
function ProjectCard({ project, onDelete, onTransaction, canWrite }: {
  project: Project;
  onDelete?: (id: number) => void;
  onTransaction: (p: Project) => void;
  canWrite: boolean;
}) {
  const accentColor = blendSectorColors(project.domaines_intervention?.map(d => d.designation)).fillColor;
  const statut = STATUT_STYLES[project.statut?.designation ?? ''];
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/admin/projects/${project.id}/details`)}
      className="group relative bg-white rounded-2xl border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
      style={{ borderColor: `${accentColor}40` }}
    >
      {/* Colored top bar */}
      <div className="h-1.5 w-full" style={{ background: accentColor }} />

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Icon + Title */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: `${accentColor}18` }}>
            <FolderKanban className="w-5 h-5" style={{ color: accentColor }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2">{project.titre}</h3>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              {project.id_projet && (
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
                  {project.id_projet}
                </span>
              )}
              {project.region?.designation && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {project.region.designation}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Status + Publication */}
        <div className="flex items-center gap-2 flex-wrap">
          {statut ? (
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${statut.pill}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statut.dot}`} />
              {project.statut?.designation}
            </span>
          ) : null}
          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium
            ${project.is_published ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
            <Globe className="w-3 h-3" />
            {project.is_published ? 'Publié' : 'Non Publié'}
          </span>
        </div>

        {/* Meta info */}
        <div className="space-y-1.5 text-xs text-gray-500">
          {!!project.domaines_intervention?.length && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-3 h-3 flex-shrink-0" />
              {project.domaines_intervention.map(d => (
                <span key={d.id_domaine_intervention} className="px-2 py-0.5 rounded-full text-white text-[11px] font-medium"
                  style={{ background: sectorMapColor(d.designation) }}>
                  {d.designation}
                </span>
              ))}
            </div>
          )}
          {!!project.classifications?.length && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Layers className="w-3 h-3 flex-shrink-0 text-gray-400" />
              {project.classifications.map(c => (
                <span key={c.id_classification}>{CLASSIFICATION_ICON[c.designation] ?? ''} {c.designation}</span>
              ))}
            </div>
          )}
          {!!project.entites_accreditees?.length && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Building2 className="w-3 h-3 flex-shrink-0 text-gray-400" />
              <span className="truncate">{project.entites_accreditees.map(e => e.designation).join(', ')}</span>
            </div>
          )}
          {(project.region?.designation || project.geo_address) && (
            <div className="flex items-start gap-1.5">
              <MapPin className="w-3 h-3 flex-shrink-0 text-gray-400 mt-0.5" />
              <div className="min-w-0">
                {project.region?.designation && (
                  <span className="font-medium text-gray-600">{project.region.designation}</span>
                )}
                {project.region?.designation && project.geo_address && (
                  <span className="text-gray-300 mx-1">·</span>
                )}
                {project.geo_address && (
                  <span className="text-gray-400 truncate block">{project.geo_address}</span>
                )}
              </div>
            </div>
          )}
          {project.date_debut && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 flex-shrink-0 text-gray-400" />
              <span>
                {format(new Date(project.date_debut), 'dd/MM/yyyy')}
                {project.date_fin && <> → {format(new Date(project.date_fin), 'dd/MM/yyyy')}</>}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions footer */}
      <div
        onClick={e => e.stopPropagation()}
        className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between gap-1 bg-gray-50/60"
      >
        <div className="flex gap-1">
          <Link to={`/admin/projects/${project.id}/details`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
            <Info className="w-3.5 h-3.5" /> Détails
          </Link>
          {canWrite && (
            <button onClick={() => onTransaction(project)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
              <ArrowUpRight className="w-3.5 h-3.5" /> Transaction
            </button>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {onDelete && (
            <button onClick={() => onDelete(project.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Supprimer">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ROW PROJET (LIST VIEW) ───────────────────────────────────
function ProjectRow({ project, onDelete, onTransaction, canWrite }: {
  project: Project;
  onDelete?: (id: number) => void;
  onTransaction: (p: Project) => void;
  canWrite: boolean;
}) {
  const accentColor = blendSectorColors(project.domaines_intervention?.map(d => d.designation)).fillColor;
  const statut = STATUT_STYLES[project.statut?.designation ?? ''];
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/admin/projects/${project.id}/details`)}
      className="group bg-white border rounded-xl px-4 py-3 flex items-center gap-4 hover:shadow-md transition-all duration-150 cursor-pointer"
      style={{ borderColor: `${accentColor}40` }}
    >
      {/* Accent dot */}
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: accentColor }} />

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-gray-800 text-sm truncate">{project.titre}</h3>
          {project.id_projet && (
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200 flex-shrink-0">
              {project.id_projet}
            </span>
          )}
          {statut && (
            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${statut.pill}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statut.dot}`} />
              {project.statut?.designation}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
          {project.region?.designation && (
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{project.region.designation}</span>
          )}
          {!!project.domaines_intervention?.length && project.domaines_intervention.map(d => (
            <span key={d.id_domaine_intervention} className="px-1.5 py-0.5 rounded text-white text-[10px] font-medium" style={{ background: sectorMapColor(d.designation) }}>
              {d.designation}
            </span>
          ))}
          {!!project.entites_accreditees?.length && (
            <span className="flex items-center gap-1 truncate max-w-[160px]">
              <Building2 className="w-3 h-3" />{project.entites_accreditees.map(e => e.designation).join(', ')}
            </span>
          )}
          {project.date_debut && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(project.date_debut), 'dd/MM/yyyy')}
            </span>
          )}
        </div>
      </div>

      {/* Published badge */}
      <span className={`hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0
        ${project.is_published ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
        <Globe className="w-3 h-3" />
        {project.is_published ? 'Publié' : 'Non Publié'}
      </span>

      {/* Actions */}
      <div onClick={e => e.stopPropagation()} className="flex items-center gap-1 flex-shrink-0">
        <Link to={`/admin/projects/${project.id}/details`}
          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors" title="Détails">
          <Info className="w-4 h-4" />
        </Link>
        {canWrite && (
          <button onClick={() => onTransaction(project)}
            className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors" title="Transaction">
            <ArrowUpRight className="w-4 h-4" />
          </button>
        )}
        {canWrite && (
          <Link to={`/admin/projects/${project.id}/edit`}
            className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors" title="Modifier">
            <Edit className="w-4 h-4" />
          </Link>
        )}
        {onDelete && (
          <button onClick={() => onDelete(project.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Supprimer">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────
export default function ProjectsPage() {
  const { user } = useAuthStore();
  const role = user?.role;
  const canWrite  = role === 'super_admin' || role === 'admin' || role === 'gestionnaire';
  const canDelete = role === 'super_admin' || role === 'admin';

  const qc = useQueryClient();
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [statusId, setStatusId] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [transactionProject, setTransactionProject] = useState<Project | null>(null);

  // Charger les statuts depuis l'API
  const { data: STATUTS = [] } = useQuery({
    queryKey: ['statuts'],
    queryFn: () => statusApi.list().then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-projects', page, search, statusId],
    queryFn: async () => {
      const r = await projectApi.list({ page, search, status_id: statusId || undefined, per_page: 15 });
      return normalizePagination(r.data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectApi.delete(id),
    onSuccess: () => {
      toast.success('Projet supprimé');
      qc.invalidateQueries({ queryKey: ['admin-projects'] });
      setDeleteId(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const hasFilters = !!(search || statusId);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projets</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isLoading ? '…' : `${data?.total ?? 0} projet${(data?.total ?? 0) !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canWrite && (
          <Link to="/admin/projects/new" className="btn btn-primary">
            <Plus className="w-4 h-4" /> Nouveau projet
          </Link>
        )}
      </div>

      {/* ── Filtres + vue toggle ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            className="form-input w-full pl-9 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 transition"
            placeholder="Rechercher un projet…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          className="form-input w-auto bg-gray-50 border-gray-200"
          value={statusId}
          onChange={e => { setStatusId(e.target.value); setPage(1); }}
        >
          <option value="">Tous les statuts</option>
          {STATUTS.map((s) => (
            <option key={s.id_status} value={s.id_status}>{s.designation}</option>
          ))}
        </select>

        {/* Reset */}
        {hasFilters && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { setSearch(''); setStatusId(''); setPage(1); }}
          >
            <Filter className="w-3.5 h-3.5" /> Réinitialiser
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1 hidden sm:block" />

        {/* View toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
            title="Vue grille"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
            title="Vue liste"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-sm">Chargement des projets…</p>
        </div>
      ) : data?.data?.length ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.data.map((p: Project) => (
              <ProjectCard
                key={p.id} project={p}
                onDelete={canDelete ? setDeleteId : undefined}
                onTransaction={setTransactionProject}
                canWrite={canWrite}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {data.data.map((p: Project) => (
              <ProjectRow
                key={p.id} project={p}
                onDelete={canDelete ? setDeleteId : undefined}
                onTransaction={setTransactionProject}
                canWrite={canWrite}
              />
            ))}
          </div>
        )
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-24 text-gray-400">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <FolderKanban className="w-8 h-8 opacity-30" />
          </div>
          <p className="font-semibold text-gray-500 mb-1">Aucun projet trouvé</p>
          <p className="text-sm text-gray-400 mb-5">
            {hasFilters ? 'Essayez de modifier vos filtres.' : 'Commencez par créer votre premier projet.'}
          </p>
          {!hasFilters && canWrite && (
            <Link to="/admin/projects/new" className="btn btn-primary btn-sm">
              <Plus className="w-3.5 h-3.5" /> Créer un projet
            </Link>
          )}
          {hasFilters && (
            <button className="btn btn-secondary btn-sm"
              onClick={() => { setSearch(''); setStatusId(''); setPage(1); }}>
              <Filter className="w-3.5 h-3.5" /> Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* ── Pagination ── */}
      {data && data.last_page > 1 && (
        <div className="flex items-center justify-between px-1 py-2">
          <span className="text-sm text-gray-400">
            Affichage <span className="font-medium text-gray-700">{data.from}–{data.to}</span> sur{' '}
            <span className="font-medium text-gray-700">{data.total}</span>
          </span>
          <div className="flex gap-1 items-center">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="btn btn-secondary btn-sm disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg">
              {page} / {data.last_page}
            </span>
            <button
              disabled={page === data.last_page}
              onClick={() => setPage(p => p + 1)}
              className="btn btn-secondary btn-sm disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Modal suppression ── */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 text-center mb-1">Supprimer ce projet ?</h3>
            <p className="text-sm text-gray-400 text-center mb-6">
              Cette action est irréversible. Toutes les données associées seront perdues.
            </p>
            <div className="flex gap-3">
              <button className="btn btn-secondary flex-1" onClick={() => setDeleteId(null)}>
                Annuler
              </button>
              <button
                className="btn btn-danger flex-1"
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Suppression…</>
                  : <><Trash2 className="w-4 h-4" /> Supprimer</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {transactionProject && (
        <TransactionModal project={transactionProject} onClose={() => setTransactionProject(null)} />
      )}
    </div>
  );
}