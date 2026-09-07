// src/pages/admin/financements/FinancementsPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financementApi, projectApi, contributionCategorieApi, organismeContributeurApi, documentApi } from '@/api/services';
import {
  Plus, Trash2, Edit, DollarSign, X, Save,
  TrendingUp, Banknote, Calendar, Hash, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, FolderKanban, Upload, FileText, Paperclip, Info,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import type { Financement, Devise, TypeFinancement, ModeContribution, FinancementContributionLine } from '@/types';
import { getErrorMessage } from '@/utils/apiError';
import { useAuthStore } from '@/store/authStore';
import SelectAvecAjout from '@/components/admin/SelectAvecAjout';

const DEVISES: Devise[] = ['USD', 'EUR', 'AR'];

const DEVISE_SYMBOL: Record<Devise, string> = {
  USD: '$',
  EUR: '€',
  AR:  'Ar',
};

const TYPE_FINANCEMENT_OPTIONS: { value: TypeFinancement; label: string }[] = [
  { value: 'gcf',                   label: 'Financement' },
  { value: 'cofinancement_public',  label: 'Co-financement public' },
  { value: 'cofinancement_prive',   label: 'Co-financement privé' },
];

const emptyContribution = (): FinancementContributionLine => ({
  organisme_contributeur_id: '',
  mode_contribution: 'numeraire',
  montant: '',
  devise: 'USD',
  date_contribution: '',
  categorie_contribution_id: '',
  description: '',
});

const emptyForm = {
  project_id:              '' as number | '',
  type_financement:        '' as TypeFinancement | '',
  mode_contribution:       'numeraire' as ModeContribution,
  source_financement:      '',
  budget_approuve:         '' as number | '',
  devise:                  'USD' as Devise,
  date_approbation:        '',
  description:             '',
  categorie_contribution_id: '' as number | '',
  contributions:           [] as FinancementContributionLine[],
};

type FormState = typeof emptyForm;

/* ── Composants formulaire ───────────────────────────────────────── */
function Label({ children, required, hint }: {
  children: React.ReactNode; required?: boolean; hint?: string;
}) {
  return (
    <div className="mb-1.5">
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col">{children}</div>;
}

/* ── Badge devise ────────────────────────────────────────────────── */
function DeviseBadge({ devise }: { devise: Devise }) {
  const colors: Record<Devise, string> = {
    USD: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    EUR: 'bg-blue-50   text-blue-700   border-blue-200',
    AR:  'bg-amber-50  text-amber-700  border-amber-200',
  };
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${colors[devise]}`}>
      {devise}
    </span>
  );
}

/* ── KPI Card ────────────────────────────────────────────────────── */
function KpiCard({
  label, value, sub, icon: Icon, color, bg, loading,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; bg: string; loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: bg }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        {loading
          ? <div className="h-7 w-28 bg-gray-100 rounded-lg animate-pulse mt-1" />
          : <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
        }
        {sub && !loading && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Page principale ─────────────────────────────────────────────── */
export default function FinancementsPage() {
  const { user } = useAuthStore();
  const canWrite  = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'gestionnaire';
  const canDelete = user?.role === 'super_admin' || user?.role === 'admin';
  const qc = useQueryClient();
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<Financement | null>(null);
  const [form, setForm]       = useState<FormState>(emptyForm);
  const [page, setPage]       = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  /* ────────────────────────────────────────────────────────────────
     1. Liste paginée (affichage tableau)
     La Resource Collection Laravel renvoie :
       { data: [...], links: {...}, meta: { current_page, total, ... } }
     donc on accède à r.data.meta.total (pas r.data.total).
  ──────────────────────────────────────────────────────────────── */
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['financements', page],
    queryFn:  () => financementApi.list({ page, per_page: 15 }).then(r => r.data),
    placeholderData: (prev) => prev,
  });

  // La liste paginée est dans pageData.data
  // Le total de pages / enregistrements est dans pageData.meta
  const financements: Financement[] = pageData?.data ?? [];
  const meta = pageData?.meta ?? { last_page: 1, current_page: 1, total: 0, from: 0, to: 0, per_page: 15 };

  /* ────────────────────────────────────────────────────────────────
     2. Totaux KPI via endpoint dédié GET /financements/totaux
     Cet endpoint fait des SUM SQL côté serveur — pas de pagination,
     pas de chargement de milliers de lignes en mémoire.
     Réponse : { total_count: N, totaux: { USD, EUR, AR } }
  ──────────────────────────────────────────────────────────────── */
  const { data: totauxData, isLoading: totauxLoading } = useQuery({
    queryKey: ['financements-totaux'],
    queryFn:  () => financementApi.totaux().then(r => r.data),
    staleTime: 30_000,
  });

  const totalCount = totauxData?.total_count ?? 0;
  const totalUSD   = totauxData?.totaux?.USD ?? 0;
  const totalEUR   = totauxData?.totaux?.EUR ?? 0;
  const totalMGA   = totauxData?.totaux?.AR?? 0;

  /* ── Projets (select du formulaire) ─────────────────────────────── */
  const { data: projects } = useQuery({
    queryKey: ['projects-select'],
    queryFn:  () => projectApi.list({ per_page: 100 }).then(r => r.data),
  });

  /* ── Catégories de contribution en nature (référentiel extensible) ── */
  const { data: contributionCategories } = useQuery({
    queryKey: ['contribution-categories'],
    queryFn:  () => contributionCategorieApi.list().then(r => r.data),
    enabled:  modal,
  });

  /* ── Organismes contributeurs (référentiel extensible, comme Classification) ── */
  const { data: organismesContributeurs } = useQuery({
    queryKey: ['organismes-contributeurs'],
    queryFn:  () => organismeContributeurApi.list().then(r => r.data),
    enabled:  modal,
  });

  /* ── Documents (pièces justificatives) du financement en édition ──── */
  const { data: financementDetail } = useQuery({
    queryKey: ['financement-detail', editing?.id],
    queryFn:  () => financementApi.show(editing!.id).then(r => r.data),
    enabled:  modal && !!editing,
  });

  /* ── Payload ────────────────────────────────────────────────────── */
  const buildContributionPayload = (c: FinancementContributionLine): ContributionPayload => {
    const isNature = c.mode_contribution === 'nature';
    return {
      id:                         c.id,
      organisme_contributeur_id:  c.organisme_contributeur_id === '' ? undefined : Number(c.organisme_contributeur_id),
      mode_contribution:          c.mode_contribution,
      montant:                    c.montant === '' ? 0 : Number(c.montant),
      devise:                     isNature ? 'AR' : c.devise,
      date_contribution:          c.date_contribution || undefined,
      categorie_contribution_id:  isNature && c.categorie_contribution_id !== '' ? Number(c.categorie_contribution_id) : undefined,
      description:                isNature ? (c.description?.trim() || undefined) : undefined,
    };
  };

  interface ContributionPayload {
    id?: number; organisme_contributeur_id?: number; mode_contribution: ModeContribution;
    montant: number; devise: Devise; date_contribution?: string;
    categorie_contribution_id?: number; description?: string;
  }
  interface FinancementPayload {
    project_id?: number;
    type_financement?: TypeFinancement;
    mode_contribution: ModeContribution;
    source_financement: string;
    budget_approuve?: number;
    devise: Devise;
    date_approbation?: string;
    description?: string;
    categorie_contribution_id?: number;
    contributions: ContributionPayload[];
  }

  const buildPayload = (f: FormState): FinancementPayload => {
    // Règle métier : un financement GCF est toujours en numéraire (pour la
    // Source du financement principale — chaque organisme contributeur
    // additionnel garde son propre mode, indépendamment de cette règle).
    const modeContribution: ModeContribution = f.type_financement === 'gcf' ? 'numeraire' : f.mode_contribution;
    const isNature = modeContribution === 'nature';
    // Règle métier : une contribution en nature est toujours valorisée en
    // Ariary (AR) — pas de transfert de devise étrangère pour du non-cash.
    const devise: Devise = isNature ? 'AR' : f.devise;

    return {
      project_id:              f.project_id === '' ? undefined : Number(f.project_id),
      type_financement:        f.type_financement || undefined,
      mode_contribution:       modeContribution,
      source_financement:      String(f.source_financement).trim(),
      budget_approuve:         f.budget_approuve === '' ? 0 : Number(f.budget_approuve),
      devise,
      date_approbation:        f.date_approbation || undefined,
      description:             f.description.trim() || undefined,
      // Champ spécifique à la contribution en nature : jamais envoyé en
      // mode numéraire (le backend le refuse explicitement — "prohibited").
      categorie_contribution_id: isNature && f.categorie_contribution_id !== ''
        ? Number(f.categorie_contribution_id) : undefined,
      contributions:           f.contributions.map(buildContributionPayload),
    };
  };

  /* ── Gestion des lignes "Organismes contributeurs" ─────────────────── */
  const addContribution = () => setForm(f => ({ ...f, contributions: [...f.contributions, emptyContribution()] }));
  const removeContribution = (idx: number) =>
    setForm(f => ({ ...f, contributions: f.contributions.filter((_, i) => i !== idx) }));
  const updateContribution = <K extends keyof FinancementContributionLine>(idx: number, key: K, value: FinancementContributionLine[K]) =>
    setForm(f => ({
      ...f,
      contributions: f.contributions.map((c, i) => i === idx ? { ...c, [key]: value } : c),
    }));

  /* ── Mutations ──────────────────────────────────────────────────── */
  const invalidateAll = async () => {
    await qc.refetchQueries({ queryKey: ['financements'] });
    await qc.refetchQueries({ queryKey: ['financements-totaux'] });
  };

  const saveMutation = useMutation({
    mutationFn: (f: FormState) => {
      const p = buildPayload(f);
      const isNature = p.mode_contribution === 'nature';
      if (!p.project_id)          throw new Error('Sélectionnez un projet');
      if (!p.type_financement)    throw new Error('Le type de financement est requis');
      if (!p.source_financement) throw new Error('La source de financement est requise');
      if (!p.date_approbation)   throw new Error(isNature ? 'La date de mise à disposition est requise' : "La date d'approbation est requise");
      if (!p.budget_approuve)    throw new Error(isNature ? 'La valeur estimée est requise' : 'Le budget approuvé est requis');
      if (isNature && !p.categorie_contribution_id) throw new Error('La catégorie de la contribution est requise');
      if (isNature && !p.description)                throw new Error('La description de la contribution est requise');

      p.contributions.forEach((c, i) => {
        const n = i + 1;
        if (!c.organisme_contributeur_id) throw new Error(`Organisme contributeur #${n} : sélectionnez un organisme`);
        if (!c.montant)      throw new Error(`Organisme contributeur #${n} : le montant est requis`);
        if (!c.date_contribution) throw new Error(`Organisme contributeur #${n} : la date est requise`);
        if (c.mode_contribution === 'nature') {
          if (!c.categorie_contribution_id) throw new Error(`Organisme contributeur #${n} : la catégorie de la contribution est requise`);
          if (!c.description)                throw new Error(`Organisme contributeur #${n} : la description de la contribution est requise`);
        }
      });

      return editing
        ? financementApi.update(editing.id, p as unknown as Partial<Financement>)
        : financementApi.create(p as unknown as Partial<Financement>);
    },
    onSuccess: async (res) => {
      toast.success(editing ? 'Financement mis à jour ✓' : 'Financement ajouté ✓');
      await invalidateAll();
      // On garde la modale ouverte en mode édition après une création, pour
      // permettre d'ajouter immédiatement des pièces justificatives sans
      // avoir à rouvrir le financement depuis la liste.
      if (!editing) {
        setEditing(res.data);
        qc.invalidateQueries({ queryKey: ['financement-detail', res.data.id] });
      }
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Erreur lors de la sauvegarde'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => financementApi.delete(id),
    onSuccess: async () => {
      toast.success('Financement supprimé');
      setDeleteConfirm(null);
      await invalidateAll();
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const uploadDocMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('fichier', file);
      fd.append('type', 'autre');
      fd.append('project_id', String(editing!.project_id));
      fd.append('financement_id', String(editing!.id));
      return documentApi.upload(fd);
    },
    onSuccess: () => {
      toast.success('Pièce justificative ajoutée ✓');
      qc.invalidateQueries({ queryKey: ['financement-detail', editing?.id] });
    },
    onError: () => toast.error('Erreur lors du téléversement'),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id: number) => documentApi.delete(id),
    onSuccess: () => {
      toast.success('Pièce justificative supprimée');
      qc.invalidateQueries({ queryKey: ['financement-detail', editing?.id] });
    },
  });

  /* ── Modal helpers ──────────────────────────────────────────────── */
  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit   = (f: Financement) => {
    setEditing(f);
    setForm({
      project_id:              f.project_id,
      type_financement:        f.type_financement,
      mode_contribution:       f.mode_contribution,
      source_financement:      f.source_financement,
      budget_approuve:         f.budget_approuve,
      devise:                  f.devise,
      date_approbation:        f.date_approbation?.slice(0, 10) || '',
      description:             f.description || '',
      categorie_contribution_id: f.categorie_contribution_id ?? '',
      contributions: (f.contributions ?? []).map(c => ({
        id:                         c.id,
        organisme_contributeur_id:  c.organisme_contributeur_id,
        organisme_contributeur:     c.organisme_contributeur,
        mode_contribution:          c.mode_contribution,
        montant:                    c.montant,
        devise:                     c.devise,
        date_contribution:          c.date_contribution?.slice(0, 10) || '',
        categorie_contribution_id:  c.categorie_contribution_id ?? '',
        description:                c.description || '',
      })),
    });
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditing(null); setForm(emptyForm); };
  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  // Règle métier : un financement GCF est toujours en numéraire — dès que
  // l'utilisateur choisit "Financement GCF", on verrouille automatiquement
  // le mode de contribution, sans rechargement de page.
  const handleTypeFinancementChange = (value: TypeFinancement) => {
    setForm(prev => ({
      ...prev,
      type_financement: value,
      mode_contribution: value === 'gcf' ? 'numeraire' : prev.mode_contribution,
    }));
  };

  // Règle métier : une contribution en nature est toujours valorisée en
  // Ariary — dès que l'utilisateur passe en "En nature", la devise se
  // verrouille automatiquement sur AR, sans rechargement de page.
  const handleModeContributionChange = (value: ModeContribution) => {
    setForm(prev => ({
      ...prev,
      mode_contribution: value,
      devise: value === 'nature' ? 'AR' : prev.devise,
    }));
  };
  const handleContributionModeChange = (idx: number, value: ModeContribution) =>
    setForm(f => ({
      ...f,
      contributions: f.contributions.map((c, i) => i === idx
        ? { ...c, mode_contribution: value, devise: value === 'nature' ? 'AR' : c.devise }
        : c),
    }));

  const isGcf    = form.type_financement === 'gcf';
  const isNature = !isGcf && form.mode_contribution === 'nature';

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <>
      <div className="space-y-5 animate-fade-in">

        {/* ── En-tête ── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financements</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {totauxLoading
                ? '…'
                : `${totalCount} financement${totalCount !== 1 ? 's' : ''} enregistré${totalCount !== 1 ? 's' : ''}`
              }
            </p>
          </div>
          {canWrite && (
            <button className="btn btn-primary gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          )}
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total financements"
            value={totalCount}
            sub="tous projets confondus"
            icon={Hash}
            color="#6366f1" bg="#eef2ff"
            loading={totauxLoading}
          />
          <KpiCard
            label="Budget total USD"
            value={`$${totalUSD.toLocaleString('fr-FR')}`}
            icon={TrendingUp}
            color="#16a34a" bg="#dcfce7"
            loading={totauxLoading}
          />
          <KpiCard
            label="Budget total EUR"
            value={`€${totalEUR.toLocaleString('fr-FR')}`}
            icon={DollarSign}
            color="#2563eb" bg="#dbeafe"
            loading={totauxLoading}
          />
          <KpiCard
            label="Total en MGA"
            value={`${totalMGA.toLocaleString('fr-FR')} Ar`}
            sub="équivalent Ariary cumulé"
            icon={Banknote}
            color="#0891b2" bg="#e0f2fe"
            loading={totauxLoading}
          />
        </div>

        {/* ── Tableau ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
              <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-sm">Chargement…</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      {['Projet', 'Financeur', 'Budget approuvé', 'Approbation', ''].map(h => (
                        <th key={h} className={`px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider ${h === '' ? 'text-right' : 'text-left'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {financements.map((f) => (
                      <tr key={f.id} className="hover:bg-gray-50/60 transition-colors group">

                        {/* Projet */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                              <FolderKanban className="w-3.5 h-3.5 text-indigo-500" />
                            </div>
                            <span className="font-medium text-gray-700 truncate max-w-[150px]">
                              {f.project?.titre || `Projet #${f.project_id}`}
                            </span>
                          </div>
                        </td>

                        {/* Financeur */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                            </div>
                            <span className="text-gray-700 truncate max-w-[140px]">{f.source_financement}</span>
                          </div>
                        </td>

                        {/* Budget */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800">
                              {DEVISE_SYMBOL[f.devise]}{Number(f.budget_approuve).toLocaleString('fr-FR')}
                            </span>
                            <DeviseBadge devise={f.devise} />
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-5 py-3.5">
                          {f.date_approbation ? (
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                              {format(new Date(f.date_approbation), 'dd/MM/yyyy')}
                            </div>
                          ) : <span className="text-gray-300">—</span>}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5">
                          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEdit(f)}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(f.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                              title="Supprimer"
                              style={{ display: canDelete ? undefined : 'none' }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {financements.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
                              <DollarSign className="w-7 h-7 opacity-30" />
                            </div>
                            <p className="font-medium text-gray-500">Aucun financement enregistré</p>
                            <button className="btn btn-primary btn-sm" onClick={openCreate}>
                              <Plus className="w-3.5 h-3.5" /> Ajouter le premier
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {meta.last_page > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/40">
                  <span className="text-sm text-gray-400">
                    Affichage{' '}
                    <span className="font-medium text-gray-700">{meta.from}–{meta.to}</span>
                    {' '}sur{' '}
                    <span className="font-medium text-gray-700">{meta.total}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-secondary btn-sm disabled:opacity-40"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Précédent
                    </button>
                    <span className="text-sm font-medium text-gray-700 px-3 py-1 bg-white border border-gray-200 rounded-lg">
                      {meta.current_page} / {meta.last_page}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm disabled:opacity-40"
                      disabled={page >= meta.last_page}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Suivant <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Modal suppression ───────────────────────────────────────── */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 text-center mb-1">Supprimer ce financement ?</h3>
            <p className="text-sm text-gray-400 text-center mb-6">
              Cette action est irréversible et affectera les totaux.
            </p>
            <div className="flex gap-3">
              <button className="btn btn-secondary flex-1" onClick={() => setDeleteConfirm(null)}>Annuler</button>
              <button
                className="btn btn-danger flex-1"
                onClick={() => deleteMutation.mutate(deleteConfirm)}
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

      {/* ── Modal formulaire ────────────────────────────────────────── */}
      {modal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[calc(100dvh-32px)] overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                  <DollarSign className="w-[18px] h-[18px] text-emerald-700" />
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900 leading-tight">
                    {editing ? 'Modifier le financement' : 'Nouveau financement'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {editing ? `Financement #${editing.id}` : 'Tous les champs * sont requis'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              <Field>
                <Label>Projet</Label>
                <select
                  className="form-input bg-gray-50 border-gray-200 focus:bg-white focus:border-emerald-400"
                  value={form.project_id}
                  onChange={e => setField('project_id', e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <option value="">— Sélectionner un projet —</option>
                  {projects?.data?.map((p) => (
                    <option key={p.id} value={p.id}>{p.titre}</option>
                  ))}
                </select>
              </Field>

              <Field>
                <Label>Type de financement</Label>
                <select
                  className="form-input bg-gray-50 border-gray-200 focus:bg-white focus:border-emerald-400"
                  value={form.type_financement}
                  onChange={e => handleTypeFinancementChange(e.target.value as TypeFinancement)}
                >
                  <option value="">— Sélectionner un type —</option>
                  {TYPE_FINANCEMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>

              {/* ── Mode de contribution : dynamique selon le type ── */}
              {isGcf ? (
                <Field>
                  <Label>Mode de contribution</Label>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gray-100 border border-gray-200 text-sm text-gray-500">
                    <Info className="w-3.5 h-3.5 flex-shrink-0" />
                    Cash — automatique pour un financement
                  </div>
                </Field>
              ) : form.type_financement && (
                <Field>
                  <Label>Mode de financement</Label>
                  <select
                    className="form-input bg-gray-50 border-gray-200 focus:bg-white focus:border-emerald-400"
                    value={form.mode_contribution}
                    onChange={e => handleModeContributionChange(e.target.value as ModeContribution)}
                  >
                    <option value="numeraire">Cash</option>
                    <option value="nature">En nature</option>
                  </select>
                </Field>
              )}

              <div className="pt-2 pb-1 flex items-center gap-2 border-t border-gray-100">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Source du financement (principale)</p>
              </div>

              <Field>
                <Label>bailleur</Label>
                <input
                  className="form-input bg-gray-50 border-gray-200 focus:bg-white focus:border-emerald-400"
                  value={form.source_financement}
                  onChange={e => setField('source_financement', e.target.value)}
                  placeholder="Ex : Green Climate Fund (GCF)"
                />
              </Field>

              <div className="grid grid-cols-[1fr_140px] gap-3">
                <Field>
                  <Label>{isNature ? 'Valeur estimée' : 'Budget approuvé'}</Label>
                  <input
                    type="number" min="0" step="any"
                    className="form-input bg-gray-50 border-gray-200 focus:bg-white focus:border-emerald-400"
                    value={form.budget_approuve}
                    onChange={e => setField('budget_approuve', e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0"
                  />
                </Field>
                <Field>
                  <Label>Devise</Label>
                  <select
                    className="form-input bg-gray-50 border-gray-200 focus:bg-white focus:border-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
                    value={form.devise}
                    disabled={isNature}
                    onChange={e => setField('devise', e.target.value as Devise)}
                  >
                    {DEVISES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {isNature && <p className="text-[11px] text-amber-600 mt-1">Fixée en Ariary pour une financement en nature</p>}
                </Field>
              </div>

              <Field>
                <Label>{isNature ? 'Date de mise à disposition' : "Date d'approbation"}</Label>
                <input
                  type="date"
                  className="form-input bg-gray-50 border-gray-200 focus:bg-white focus:border-emerald-400"
                  value={form.date_approbation}
                  onChange={e => setField('date_approbation', e.target.value)}
                />
              </Field>

              {/* ── Bloc spécifique "En nature" ── */}
              {isNature && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-4">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" /> Contribution en nature
                  </p>

                  <SelectAvecAjout
                    label="Catégorie du financement"
                    value={form.categorie_contribution_id === '' ? undefined : form.categorie_contribution_id}
                    onChange={v => setField('categorie_contribution_id', v === undefined ? '' : Number(v))}
                    options={(contributionCategories ?? []).map(c => ({ id: c.id, label: c.designation }))}
                    queryKey="contribution-categories"
                    createEndpoint="/contribution-categories"
                    idField="id"
                  />
                </div>
              )}

              <Field>
                <Label required={isNature}>{isNature ? 'Description de la contribution' : 'Description'}</Label>
                <textarea
                  rows={3}
                  className="form-input bg-gray-50 border-gray-200 focus:bg-white focus:border-emerald-400"
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  placeholder={isNature ? 'Ex : Terrain de 2 hectares mis à disposition du projet à Toamasina' : ''}
                />
              </Field>

              {/* ══ Organismes contributeurs additionnels (co-financement) ══ */}
              <div className="pt-2 pb-1 flex items-center justify-between border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Organismes contributeurs</p>
                    <p className="text-[11px] text-gray-400">Un ou plusieurs co-financeurs, chacun avec son propre montant et mode de contribution</p>
                  </div>
                </div>
              </div>

              {form.contributions.length === 0 && (
                <p className="text-xs text-gray-400 italic px-1">
                  Aucun organisme contributeur additionnel. Ajoutez-en un si ce financement implique un ou plusieurs co-financeurs.
                </p>
              )}

              <div className="space-y-3">
                {form.contributions.map((c, idx) => {
                  const rowIsNature = c.mode_contribution === 'nature';
                  return (
                    <div key={idx} className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">
                          Co-financeur {idx + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeContribution(idx)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                          title="Retirer cet organisme"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <SelectAvecAjout
                        label="bailleur"
                        value={c.organisme_contributeur_id === '' ? undefined : c.organisme_contributeur_id}
                        onChange={v => updateContribution(idx, 'organisme_contributeur_id', v === undefined ? '' : Number(v))}
                        options={(organismesContributeurs ?? []).map(o => ({ id: o.id, label: o.designation }))}
                        queryKey="organismes-contributeurs"
                        createEndpoint="/organismes-contributeurs"
                        idField="id"
                      />

                      <Field>
                        <Label>Mode de financement</Label>
                        <select
                          className="form-input bg-white border-gray-200 focus:border-emerald-400"
                          value={c.mode_contribution}
                          onChange={e => handleContributionModeChange(idx, e.target.value as ModeContribution)}
                        >
                          <option value="numeraire">Cash</option>
                          <option value="nature">En nature</option>
                        </select>
                      </Field>

                      <div className="grid grid-cols-[1fr_120px] gap-3">
                        <Field>
                          <Label>{rowIsNature ? 'Valeur estimée' : 'Budget approuvé'}</Label>
                          <input
                            type="number" min="0" step="any"
                            className="form-input bg-white border-gray-200 focus:border-emerald-400"
                            value={c.montant}
                            onChange={e => updateContribution(idx, 'montant', e.target.value === '' ? '' : parseFloat(e.target.value))}
                            placeholder="0"
                          />
                        </Field>
                        <Field>
                          <Label>Devise</Label>
                          <select
                            className="form-input bg-white border-gray-200 focus:border-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
                            value={c.devise}
                            disabled={rowIsNature}
                            onChange={e => updateContribution(idx, 'devise', e.target.value as Devise)}
                          >
                            {DEVISES.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </Field>
                      </div>
                      {rowIsNature && <p className="text-[11px] text-amber-600 -mt-2">Devise fixée en Ariary pour une financement en nature</p>}

                      <Field>
                        <Label>{rowIsNature ? 'Date de mise à disposition' : "Date d'approbation"}</Label>
                        <input
                          type="date"
                          className="form-input bg-white border-gray-200 focus:border-emerald-400"
                          value={c.date_contribution}
                          onChange={e => updateContribution(idx, 'date_contribution', e.target.value)}
                        />
                      </Field>

                      {rowIsNature && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-3">
                          <SelectAvecAjout
                            label="Catégorie du financement"
                            value={c.categorie_contribution_id === '' ? undefined : c.categorie_contribution_id}
                            onChange={v => updateContribution(idx, 'categorie_contribution_id', v === undefined ? '' : Number(v))}
                            options={(contributionCategories ?? []).map(cc => ({ id: cc.id, label: cc.designation }))}
                            queryKey="contribution-categories"
                            createEndpoint="/contribution-categories"
                            idField="id"
                          />
                          <Field>
                            <Label>Description du financement</Label>
                            <textarea
                              rows={2}
                              className="form-input bg-white border-gray-200 focus:border-emerald-400"
                              value={c.description}
                              onChange={e => updateContribution(idx, 'description', e.target.value)}
                            />
                          </Field>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={addContribution}
                className="btn btn-secondary w-full justify-center border-dashed"
              >
                <Plus className="w-4 h-4" /> Ajouter un co-financement
              </button>

              {/* ── Pièces justificatives : disponible une fois le financement créé ── */}
              <Field>
                <Label>Pièces justificatives</Label>
                {!editing ? (
                  <p className="text-xs text-gray-400 italic">
                    Enregistrez d'abord le financement pour pouvoir y joindre des pièces justificatives.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(financementDetail?.documents ?? []).map(doc => (
                      <div key={doc.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                        <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-700 truncate flex-1">{doc.titre}</span>
                        <button
                          type="button"
                          onClick={() => deleteDocMutation.mutate(doc.id)}
                          className="p-1 rounded hover:bg-red-50 flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    ))}
                    <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors">
                      {uploadDocMutation.isPending
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Upload className="w-3.5 h-3.5" />}
                      Téléverser un fichier
                      <input
                        type="file"
                        className="hidden"
                        disabled={uploadDocMutation.isPending}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) uploadDocMutation.mutate(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                )}
              </Field>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50/50">
              <button onClick={closeModal} className="btn btn-secondary flex-1">
                {editing ? 'Fermer' : 'Annuler'}
              </button>
              <button
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending}
                className="btn btn-primary flex-1"
              >
                {saveMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</>
                  : <><Save className="w-4 h-4" /> Enregistrer</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}