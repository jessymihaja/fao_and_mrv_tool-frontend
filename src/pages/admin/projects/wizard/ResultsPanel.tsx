// src/pages/admin/projects/wizard/ResultsPanel.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resultApi, composanteApi, activiteApi, indicateurApi, resultTypeApi } from '@/api/services';
import {
  Plus, Trash2, Edit, X, Save, Loader2, Flag, Eye,
  TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Paperclip, MinusCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Result, StatutResultat } from '@/types';
import { getErrorMessage } from '@/utils/apiError';
import SelectAvecAjout from '@/components/admin/SelectAvecAjout';

const STATUT_META: Record<StatutResultat, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  prevu:                  { label: 'Prévu',                  color: 'text-gray-600',   bg: 'bg-gray-50',   icon: <MinusCircle className="w-3.5 h-3.5" /> },
  en_cours:               { label: 'En cours',                color: 'text-blue-700',   bg: 'bg-blue-50',   icon: <TrendingUp className="w-3.5 h-3.5" /> },
  atteint:                { label: 'Atteint',                 color: 'text-green-700',  bg: 'bg-green-50',  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  partiellement_atteint:  { label: 'Partiellement atteint',   color: 'text-orange-700', bg: 'bg-orange-50', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  non_atteint:            { label: 'Non atteint',             color: 'text-red-700',    bg: 'bg-red-50',    icon: <TrendingDown className="w-3.5 h-3.5" /> },
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 16 }, (_, i) => CURRENT_YEAR + 5 - i);

const emptyForm = {
  result_type_id: '' as number | '',
  titre: '',
  description: '',
  composante_id: '' as number | '',
  activite_id: '' as number | '',
  indicateur_id: '' as number | '',
  reference_year: CURRENT_YEAR,
  target_year: CURRENT_YEAR,
  statut: 'prevu' as StatutResultat,
  valeur_reference: '' as number | '',
  source_verification: '',
  methode_collecte: '',
  observations: '',
};
type FormState = typeof emptyForm;

interface Props {
  projectId: number;
  canWrite?: boolean;
}

export default function ResultsPanel({ projectId, canWrite = true }: Props) {
  const qc = useQueryClient();
  const queryKey = ['project-results', projectId];

  const { data: results, isLoading } = useQuery({
    queryKey,
    queryFn: () => resultApi.listByProject(projectId).then(r => r.data),
  });

  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing]   = useState<Result | null>(null);
  const [editing, setEditing]   = useState<Result | null>(null);
  const [form, setForm]         = useState<FormState>(emptyForm);
  const [files, setFiles]       = useState<File[]>([]);

  // Référentiel "Type de résultat" — extensible via le bouton "+" (comme
  // Classification, Secteur...) plutôt qu'une liste figée.
  const { data: resultTypes = [] } = useQuery({
    queryKey: ['result-types'],
    queryFn: () => resultTypeApi.list().then(r => r.data),
  });

  // Composantes / activités du projet — pour le rattachement optionnel
  const { data: composantes } = useQuery({
    queryKey: ['project-composantes-lite', projectId],
    queryFn: () => composanteApi.listByProject(projectId).then(r => r.data),
    enabled: showForm,
  });
  const { data: activites } = useQuery({
    queryKey: ['project-activites-lite', projectId],
    // listAllForProject : inclut aussi les activités rattachées à une
    // composante, sinon un résultat déjà lié à ce type d'activité ne peut
    // plus l'afficher/la sélectionner à l'édition.
    queryFn: () => activiteApi.listAllForProject(projectId).then(r => r.data),
    enabled: showForm,
  });
  // Indicateurs déjà existants du projet — réutilisés, jamais dupliqués
  // (voir Result::getValeurCibleAttribute() côté backend).
  const { data: indicateurs } = useQuery({
    queryKey: ['project-indicateurs-lite', projectId],
    // listAllForProject : inclut aussi les indicateurs rattachés à une
    // composante ou une activité, sinon un résultat lié à ce type
    // d'indicateur ne peut plus le retrouver/le sélectionner à l'édition.
    queryFn: () => indicateurApi.listAllForProject(projectId).then(r => r.data),
    enabled: showForm,
  });

  const set = (field: keyof FormState, value: FormState[keyof FormState]) => setForm(f => ({ ...f, [field]: value }));

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFiles([]); setShowForm(true); };
  const openEdit = (r: Result) => {
    setEditing(r);
    setForm({
      result_type_id: r.result_type_id,
      titre: r.titre,
      description: r.description || '',
      composante_id: r.composante_id ?? '',
      activite_id: r.activite_id ?? '',
      indicateur_id: r.indicateur_id ?? '',
      reference_year: r.reference_year,
      target_year: r.target_year,
      statut: r.statut,
      valeur_reference: r.valeur_reference != null ? Number(r.valeur_reference) : '',
      source_verification: r.source_verification || '',
      methode_collecte: r.methode_collecte || '',
      observations: r.observations || '',
    });
    setFiles([]);
    setShowForm(true);
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('result_type_id', String(form.result_type_id));
    fd.append('titre', form.titre);
    fd.append('description', form.description ?? '');
    if (form.composante_id !== '') fd.append('composante_id', String(form.composante_id));
    if (form.activite_id   !== '') fd.append('activite_id', String(form.activite_id));
    if (form.indicateur_id !== '') fd.append('indicateur_id', String(form.indicateur_id));
    fd.append('reference_year', String(form.reference_year));
    fd.append('target_year', String(form.target_year));
    fd.append('statut', form.statut);
    if (form.valeur_reference !== '') fd.append('valeur_reference', String(form.valeur_reference));
    fd.append('source_verification', form.source_verification ?? '');
    fd.append('methode_collecte', form.methode_collecte ?? '');
    fd.append('observations', form.observations ?? '');
    files.forEach(f => fd.append('pieces_jointes[]', f));
    return fd;
  };

  const mutation = useMutation({
    mutationFn: () =>
      editing ? resultApi.update(editing.id, buildFormData()) : resultApi.create(projectId, buildFormData()),
    onSuccess: () => {
      toast.success(editing ? 'Résultat mis à jour ✓' : 'Résultat ajouté ✓');
      qc.invalidateQueries({ queryKey });
      setShowForm(false);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de la sauvegarde')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => resultApi.delete(id),
    onSuccess: () => { toast.success('Résultat supprimé'); qc.invalidateQueries({ queryKey }); },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de la suppression')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre.trim()) { toast.error('Le titre est obligatoire.'); return; }
    if (form.result_type_id === '') { toast.error('Le type de résultat est obligatoire.'); return; }
    if (Number(form.target_year) < Number(form.reference_year)) {
      toast.error("L'année cible doit être supérieure ou égale à l'année de référence.");
      return;
    }
    mutation.mutate();
  };

  const typeLabel = (r: Result) => r.result_type?.designation ?? '—';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Flag className="w-4 h-4 text-green-600" /> Résultats du projet
        </h3>
        {canWrite && (
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Ajouter un résultat
          </button>
        )}
      </div>

      {isLoading && <p className="text-sm text-gray-400">Chargement...</p>}

      {!isLoading && (results?.length ?? 0) === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm border border-dashed rounded-xl">
          Aucun résultat pour le moment.
        </div>
      )}

      {(results?.length ?? 0) > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Résultat</th>
                <th className="text-left px-3 py-2">Indicateur</th>
                <th className="text-right px-3 py-2">Cible</th>
                <th className="text-right px-3 py-2">Réalisé</th>
                <th className="text-left px-3 py-2">Progression</th>
                <th className="text-left px-3 py-2">Statut</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results?.map(r => {
                const statut = STATUT_META[r.statut];
                const pct = r.pourcentage_atteinte;
                return (
                  <tr key={r.id} className="hover:bg-gray-50/60">
                    <td className="px-3 py-2">
                      <span className="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200">
                        {typeLabel(r)}
                      </span>
                    </td>
                    <td className="px-3 py-2 max-w-[220px]">
                      <p className="font-semibold text-gray-800 truncate">{r.titre}</p>
                      {(r.pieces_jointes?.length ?? 0) > 0 && (
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Paperclip className="w-3 h-3" /> {r.pieces_jointes!.length} pièce(s)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{r.indicateur?.nom || <span className="text-gray-300 italic">—</span>}</td>
                    <td className="px-3 py-2 text-right">
                      {r.valeur_cible != null ? `${Number(r.valeur_cible)} ${r.unite ?? ''}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.valeur_realisee != null ? `${Number(r.valeur_realisee)} ${r.unite ?? ''}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {pct != null ? (
                        <div className="flex items-center gap-2 w-28">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-600">{pct.toFixed(0)}%</span>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg ${statut.bg} ${statut.color}`}>
                        {statut.icon} {statut.label}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setViewing(r)} className="p-1.5 rounded-lg hover:bg-gray-100" title="Voir">
                          <Eye className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        {canWrite && (
                          <>
                            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-gray-100" title="Modifier">
                              <Edit className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                            <button onClick={() => deleteMutation.mutate(r.id)} className="p-1.5 rounded-lg hover:bg-red-50" title="Supprimer">
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modale : voir le détail ── */}
      {viewing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setViewing(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-800">{viewing.titre}</h4>
              <button onClick={() => setViewing(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-500">{viewing.description || 'Aucune description.'}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-400">Type :</span> {typeLabel(viewing)}</div>
              <div><span className="text-gray-400">Statut :</span> {STATUT_META[viewing.statut].label}</div>
              <div><span className="text-gray-400">Année de référence :</span> {viewing.reference_year}</div>
              <div><span className="text-gray-400">Année cible :</span> {viewing.target_year}</div>
              {viewing.indicateur && (
                <>
                  <div><span className="text-gray-400">Indicateur :</span> {viewing.indicateur.nom}</div>
                  <div><span className="text-gray-400">Année de réalisation :</span> {viewing.annee_realisation?.slice(0, 4) ?? '—'}</div>
                  <div><span className="text-gray-400">Cible :</span> {Number(viewing.valeur_cible)} {viewing.unite}</div>
                  <div><span className="text-gray-400">Réalisé :</span> {Number(viewing.valeur_realisee)} {viewing.unite}</div>
                </>
              )}
              {viewing.valeur_reference != null && (
                <div><span className="text-gray-400">Valeur de référence :</span> {Number(viewing.valeur_reference)}</div>
              )}
              {viewing.source_verification && (
                <div className="col-span-2"><span className="text-gray-400">Source de vérification :</span> {viewing.source_verification}</div>
              )}
              {viewing.methode_collecte && (
                <div className="col-span-2"><span className="text-gray-400">Méthode de collecte :</span> {viewing.methode_collecte}</div>
              )}
              {viewing.observations && (
                <div className="col-span-2"><span className="text-gray-400">Observations :</span> {viewing.observations}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Formulaire d'ajout / modification ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-800">{editing ? 'Modifier' : 'Nouveau'} résultat</h4>
              <button type="button" onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {/* Le projet est déjà connu (route /projects/{id}/results) — aucun
                champ de sélection de projet n'est affiché ici. */}

            <div className="grid grid-cols-2 gap-3">
              <SelectAvecAjout
                label="Type de résultat"
                required
                value={form.result_type_id}
                onChange={v => set('result_type_id', v as number)}
                options={resultTypes.map(t => ({ id: t.id, label: t.designation }))}
                queryKey="result-types"
                createEndpoint="/result-types"
                idField="id"
              />
              <div>
                <label className="form-label">Statut</label>
                <select className="form-input" value={form.statut} onChange={e => set('statut', e.target.value as StatutResultat)}>
                  {(Object.keys(STATUT_META) as StatutResultat[]).map(s => <option key={s} value={s}>{STATUT_META[s].label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Titre du résultat *</label>
              <input className="form-input" required value={form.titre} onChange={e => set('titre', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Composante</label>
                <select className="form-input" value={form.composante_id} onChange={e => set('composante_id', e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">— Aucune —</option>
                  {composantes?.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Activité liée</label>
                <select className="form-input" value={form.activite_id} onChange={e => set('activite_id', e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">— Aucune —</option>
                  {activites?.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Année de référence *</label>
                <select className="form-input" required value={form.reference_year} onChange={e => set('reference_year', Number(e.target.value))}>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Année cible *</label>
                <select className="form-input" required value={form.target_year} onChange={e => set('target_year', Number(e.target.value))}>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Indicateur associé — réutilise un indicateur existant du projet
                plutôt que de resaisir cible/réalisé/unité (audit §4). */}
            <div>
              <label className="form-label">Indicateur associé</label>
              <select className="form-input" value={form.indicateur_id} onChange={e => set('indicateur_id', e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">— Aucun indicateur associé —</option>
                {indicateurs?.map(ind => (
                  <option key={ind.id} value={ind.id}>
                    {ind.nom} ({ind.unite}){ind.activite_id ? ' — activité' : ind.composante_id ? ' — composante' : ' — projet'}
                  </option>
                ))}
              </select>
              {(!indicateurs || indicateurs.length === 0) && (
                <p className="text-xs text-gray-400 mt-1">
                  Aucun indicateur disponible — créez-en un dans l'onglet « Indicateurs ».
                </p>
              )}
              {form.indicateur_id !== '' && (
                <p className="text-xs text-green-600 mt-1">
                  Cible, valeur réalisée et unité seront affichées automatiquement depuis cet indicateur.
                </p>
              )}
            </div>

            <div>
              <label className="form-label">Valeur de référence (baseline)</label>
              <input type="number" step="any" min={0} className="form-input"
                value={form.valeur_reference} onChange={e => set('valeur_reference', e.target.value === '' ? '' : Number(e.target.value))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Source de vérification</label>
                <input className="form-input" value={form.source_verification} onChange={e => set('source_verification', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Méthode de collecte</label>
                <input className="form-input" value={form.methode_collecte} onChange={e => set('methode_collecte', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="form-label">Observations</label>
              <textarea className="form-input" rows={2} value={form.observations} onChange={e => set('observations', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Pièce justificative (PDF, image, Excel, Word)</label>
              <input type="file" multiple className="form-input" onChange={e => setFiles(Array.from(e.target.files || []))} />
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
    </div>
  );
}