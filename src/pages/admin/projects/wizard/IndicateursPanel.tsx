// src/pages/admin/projects/wizard/IndicateursPanel.tsx
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { indicateurApi, indicateurReferentielApi } from '@/api/services';
import {
  Plus, Trash2, Edit, X, Save, Loader2, Target,
  TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Paperclip,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Indicateur, CategorieIndicateur, NiveauPerformance, indicateur_referentiel } from '@/types';
import { getErrorMessage } from '@/utils/apiError';

const DIM_META: Record<CategorieIndicateur, { label: string; icon: string; badge: string }> = {
  financier:   { label: 'Financier',   icon: '💰', badge: 'bg-blue-50 text-blue-700 border-blue-200'     },
  physique:    { label: 'Physique',    icon: '🏗️', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  adaptation:  { label: 'Adaptation',  icon: '🌿', badge: 'bg-green-50 text-green-700 border-green-200'   },
  attenuation: { label: 'Atténuation', icon: '🌡️', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
};

const NIVEAUX: Record<NiveauPerformance, { color: string; bg: string; icon: React.ReactNode }> = {
  Faible:    { color: 'text-red-700',    bg: 'bg-red-50',    icon: <TrendingDown className="w-3.5 h-3.5" /> },
  Moyen:     { color: 'text-orange-700', bg: 'bg-orange-50', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  Bon:       { color: 'text-blue-700',   bg: 'bg-blue-50',   icon: <TrendingUp className="w-3.5 h-3.5" /> },
  Excellent: { color: 'text-green-700',  bg: 'bg-green-50',  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 16 }, (_, i) => CURRENT_YEAR + 3 - i); // de (année+3) à (année-12)

const emptyForm = {
  categorie:       'physique' as CategorieIndicateur,
  referentiel_id:  '' as number | '',
  nom:             '',
  unite:           '',
  valeur_cible:    '' as number | '',
  valeur_realisee: '' as number | '',
  annee_reference: CURRENT_YEAR,
  commentaire:     '',
};
type FormState = typeof emptyForm;

const emptyRefForm = { dimension: 'physique' as CategorieIndicateur, nom: '', unite: '', frequence: '' };

interface Props {
  projectId?: number;
  composanteId?: number;
  activiteId?: number;
  canWrite?: boolean;
}

export default function IndicateursPanel({ projectId, composanteId, activiteId, canWrite = true }: Props) {
  const qc = useQueryClient();
  const queryKey = activiteId
    ? ['activite-indicateurs', activiteId]
    : composanteId
      ? ['composante-indicateurs', composanteId]
      : ['project-indicateurs', projectId];

  const { data: indicateurs, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      activiteId
        ? indicateurApi.listByActivite(activiteId).then(r => r.data)
        : composanteId
          ? indicateurApi.listByComposante(composanteId).then(r => r.data)
          : indicateurApi.listByProject(projectId!).then(r => r.data),
    enabled: !!(activiteId || composanteId || projectId),
  });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Indicateur | null>(null);
  const [form, setForm]         = useState<FormState>(emptyForm);
  const [files, setFiles]       = useState<File[]>([]);

  // ── Référentiel des indicateurs (partagé entre tous les modules) ──
  // Plus de filtre par catégorie ici : la catégorie de l'indicateur est
  // désormais déduite automatiquement de l'entrée du référentiel choisie.
  const { data: referentiels } = useQuery({
    queryKey: ['indicateur-referentiels-all'],
    queryFn:  () => indicateurReferentielApi.list().then(r => r.data),
    enabled:  showForm,
  });

  const referentielsParDimension = useMemo(() => {
    const groups: Partial<Record<CategorieIndicateur, indicateur_referentiel[]>> = {};
    (referentiels ?? []).forEach(r => {
      (groups[r.dimension] ??= []).push(r);
    });
    return groups;
  }, [referentiels]);

  // Si l'indicateur en cours d'édition ne correspond à aucune entrée du
  // référentiel (ancienne donnée saisie librement), on l'affiche quand même
  // comme option "hors référentiel" pour ne pas perdre l'information.
  const matchedReferentiel = useMemo(
    () => referentiels?.find(r => r.nom === form.nom && r.unite === form.unite),
    [referentiels, form.nom, form.unite]
  );
  const isCustomLegacy = !!form.nom && !matchedReferentiel && form.referentiel_id === '';
  const selectedValue = form.referentiel_id !== ''
    ? String(form.referentiel_id)
    : matchedReferentiel
      ? String(matchedReferentiel.id)
      : (isCustomLegacy ? '__custom__' : '');

  const set = (field: keyof FormState, value: FormState[keyof FormState]) => setForm(f => ({ ...f, [field]: value }));

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFiles([]); setShowForm(true); };
  const openEdit = (ind: Indicateur) => {
    setEditing(ind);
    setForm({
      categorie: ind.categorie, referentiel_id: '', nom: ind.nom, unite: ind.unite,
      valeur_cible: Number(ind.valeur_cible), valeur_realisee: Number(ind.valeur_realisee),
      annee_reference: ind.date_reference ? Number(ind.date_reference.slice(0, 4)) : CURRENT_YEAR,
      commentaire: ind.commentaire || '',
    });
    setFiles([]);
    setShowForm(true);
  };

  const selectReferentiel = (value: string) => {
    if (value === '' || value === '__custom__') {
      set('referentiel_id', '');
      return;
    }
    const r = referentiels?.find(x => x.id === Number(value));
    if (r) {
      setForm(f => ({ ...f, referentiel_id: r.id, nom: r.nom, unite: r.unite, categorie: r.dimension }));
    }
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('categorie', form.categorie);
    fd.append('nom', form.nom);
    fd.append('unite', form.unite);
    fd.append('valeur_cible', String(form.valeur_cible ?? ''));
    fd.append('valeur_realisee', String(form.valeur_realisee ?? ''));
    fd.append('date_reference', `${form.annee_reference}-01-01`);
    fd.append('commentaire', form.commentaire ?? '');
    if (projectId)    fd.append('project_id', String(projectId));
    if (composanteId) fd.append('composante_id', String(composanteId));
    if (activiteId)   fd.append('activite_id', String(activiteId));
    files.forEach(f => fd.append('justificatifs[]', f));
    return fd;
  };

  const mutation = useMutation({
    mutationFn: () =>
      editing ? indicateurApi.update(editing.id, buildFormData()) : indicateurApi.create(buildFormData()),
    onSuccess: () => {
      toast.success(editing ? 'Indicateur mis à jour ✓' : 'Indicateur ajouté ✓');
      qc.invalidateQueries({ queryKey });
      setShowForm(false);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de la sauvegarde')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => indicateurApi.delete(id),
    onSuccess: () => { toast.success('Indicateur supprimé'); qc.invalidateQueries({ queryKey }); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom) { toast.error("Sélectionnez un indicateur dans la liste."); return; }
    mutation.mutate();
  };

  // ── Modale : ajout d'un nouvel indicateur au référentiel ──────────
  const [showRefModal, setShowRefModal] = useState(false);
  const [refForm, setRefForm] = useState(emptyRefForm);

  const createRefMutation = useMutation({
    mutationFn: () => indicateurReferentielApi.create({
      dimension: refForm.dimension, nom: refForm.nom, unite: refForm.unite, frequence: refForm.frequence || undefined,
    }),
    onSuccess: async (res) => {
      const created = res.data as indicateur_referentiel;
      await qc.invalidateQueries({ queryKey: ['indicateur-referentiels-all'] });
      toast.success('Indicateur ajouté au référentiel ✓');
      setForm(f => ({ ...f, referentiel_id: created.id, nom: created.nom, unite: created.unite, categorie: created.dimension }));
      setRefForm(emptyRefForm);
      setShowRefModal(false);
    },
    onError: (err) => toast.error(getErrorMessage(err, "Erreur lors de l'ajout au référentiel")),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Target className="w-4 h-4 text-green-600" /> Indicateurs
        </h3>
        {canWrite && (
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Ajouter un indicateur
          </button>
        )}
      </div>

      {isLoading && <p className="text-sm text-gray-400">Chargement...</p>}

      {!isLoading && (indicateurs?.length ?? 0) === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm border border-dashed rounded-xl">
          Aucun indicateur pour le moment.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {indicateurs?.map(ind => {
          const dim = DIM_META[ind.categorie];
          const niv = NIVEAUX[ind.niveau_performance];
          return (
            <div key={ind.id} className="card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${dim.badge}`}>
                    {dim.icon} {dim.label}
                  </span>
                  <p className="font-semibold text-gray-800 mt-1.5">{ind.nom}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {canWrite && (
                    <>
                      <button onClick={() => openEdit(ind)} className="p-1.5 rounded-lg hover:bg-gray-100">
                        <Edit className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(ind.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Cible: <b>{Number(ind.valeur_cible)}</b> {ind.unite}</span>
                <span>Réalisé: <b>{Number(ind.valeur_realisee)}</b> {ind.unite}</span>
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg w-fit ${niv.bg} ${niv.color}`}>
                {niv.icon} {ind.niveau_performance} ({Number(ind.taux_atteinte ?? 0).toFixed(1)}%)
              </div>
              {(ind.justificatifs?.length ?? 0) > 0 && (
                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Paperclip className="w-3 h-3" /> {ind.justificatifs!.length} justificatif(s)
                </p>
              )}
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-800">{editing ? 'Modifier' : 'Nouvel'} indicateur</h4>
              <button type="button" onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div>
              <label className="form-label">Indicateur</label>
              <div className="flex gap-2">
                <select
                  className="form-input flex-1"
                  required
                  value={selectedValue}
                  onChange={e => selectReferentiel(e.target.value)}
                >
                  <option value="" disabled>— Sélectionner un indicateur —</option>
                  {isCustomLegacy && (
                    <option value="__custom__">{form.nom} (existant, hors référentiel)</option>
                  )}
                  {(Object.keys(DIM_META) as CategorieIndicateur[]).map(dim => (
                    referentielsParDimension[dim]?.length ? (
                      <optgroup key={dim} label={`${DIM_META[dim].icon} ${DIM_META[dim].label}`}>
                        {referentielsParDimension[dim]!.map(r => (
                          <option key={r.id} value={r.id}>{r.nom}{r.unite ? ` (${r.unite})` : ''}</option>
                        ))}
                      </optgroup>
                    ) : null
                  ))}
                </select>
                <button
                  type="button"
                  title="Ajouter un nouvel indicateur au référentiel"
                  onClick={() => { setRefForm({ ...emptyRefForm, dimension: form.categorie || 'physique' }); setShowRefModal(true); }}
                  className="btn btn-secondary px-3 flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {(!referentiels || referentiels.length === 0) && (
                <p className="text-xs text-gray-400 mt-1">
                  Aucun indicateur dans le référentiel — utilisez le bouton ➕ pour en créer un.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Unité</label>
                <input className="form-input" required value={form.unite} onChange={e => set('unite', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Année de référence</label>
                <select className="form-input" required value={form.annee_reference}
                  onChange={e => set('annee_reference', Number(e.target.value))}>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Valeur cible</label>
                <input type="number" step="any" className="form-input" required
                  value={form.valeur_cible} onChange={e => set('valeur_cible', e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div>
                <label className="form-label">Valeur réalisée</label>
                <input type="number" step="any" className="form-input" required
                  value={form.valeur_realisee} onChange={e => set('valeur_realisee', e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
            </div>
            <div>
              <label className="form-label">Commentaire</label>
              <textarea className="form-input" rows={2} value={form.commentaire} onChange={e => set('commentaire', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Justificatifs (PDF, image, Excel, Word)</label>
              <input type="file" multiple className="form-input"
                onChange={e => setFiles(Array.from(e.target.files || []))} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Modale : ajouter un nouvel indicateur au référentiel ── */}
      {showRefModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={() => setShowRefModal(false)}>
          <form
            onClick={e => e.stopPropagation()}
            onSubmit={e => { e.preventDefault(); createRefMutation.mutate(); }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-800">➕ Ajouter un nouvel indicateur au référentiel</h4>
              <button type="button" onClick={() => setShowRefModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div>
              <label className="form-label">Catégorie</label>
              <select className="form-input" required value={refForm.dimension}
                onChange={e => setRefForm(f => ({ ...f, dimension: e.target.value as CategorieIndicateur }))}>
                {Object.entries(DIM_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Nom de l'indicateur</label>
              <input className="form-input" required value={refForm.nom}
                onChange={e => setRefForm(f => ({ ...f, nom: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Unité</label>
              <input className="form-input" required value={refForm.unite}
                onChange={e => setRefForm(f => ({ ...f, unite: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Fréquence</label>
              <input className="form-input" value={refForm.frequence}
                placeholder="Ex : Mensuelle, Trimestrielle, Annuelle..."
                onChange={e => setRefForm(f => ({ ...f, frequence: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowRefModal(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={createRefMutation.isPending}>
                {createRefMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Ajouter et sélectionner
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
