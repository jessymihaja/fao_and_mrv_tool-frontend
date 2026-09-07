// src/pages/admin/projects/wizard/ActivitesPanel.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activiteApi } from '@/api/services';
import { Plus, Trash2, Edit, X, Save, Loader2, ListChecks, Paperclip, Target, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Activite, StatutComposante, Devise } from '@/types';
import IndicateursPanel from './IndicateursPanel';
import { getErrorMessage } from '@/utils/apiError';

const STATUTS: StatutComposante[] = ['Planifiee', 'En cours', 'Terminee', 'Suspendue'];
const STATUT_STYLE: Record<StatutComposante, string> = {
  'Planifiee': 'bg-gray-100 text-gray-600',
  'En cours':  'bg-blue-50 text-blue-700',
  'Terminee':  'bg-green-50 text-green-700',
  'Suspendue': 'bg-orange-50 text-orange-700',
};
// Devise du budget (§9-10). Même liste que le reste de l'application.
const DEVISES: Devise[] = ['AR', 'USD', 'EUR'];

const emptyForm = {
  code: '', nom: '', description: '', responsable: '',
  date_debut: '', date_fin: '', budget: '' as number | '', devise: 'AR' as Devise,
  statut: 'Planifiee' as StatutComposante,
  pourcentage_avancement: 0, observations: '',
};
type FormState = typeof emptyForm;

interface Props {
  composanteId?: number;
  projectId?: number;
  canWrite?: boolean;
}

export default function ActivitesPanel({ composanteId, projectId, canWrite = true }: Props) {
  const qc = useQueryClient();
  const queryKey = composanteId ? ['activites-composante', composanteId] : ['activites-projet', projectId];

  const { data: activites, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      composanteId
        ? activiteApi.listByComposante(composanteId).then(r => r.data)
        : activiteApi.listByProject(projectId!).then(r => r.data),
    enabled: !!(composanteId || projectId),
  });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Activite | null>(null);
  const [form, setForm]         = useState<FormState>(emptyForm);
  const [files, setFiles]       = useState<File[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const set = (field: keyof FormState, value: FormState[keyof FormState]) => setForm(f => ({ ...f, [field]: value }));

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFiles([]); setShowForm(true); };
  const openEdit = (a: Activite) => {
    setEditing(a);
    setForm({
      code: a.code || '', nom: a.nom, description: a.description || '', responsable: a.responsable || '',
      date_debut: a.date_debut?.slice(0, 10) || '', date_fin: a.date_fin?.slice(0, 10) || '',
      budget: a.budget ?? '', devise: a.devise ?? 'AR', statut: a.statut, pourcentage_avancement: a.pourcentage_avancement,
      observations: a.observations || '',
    });
    setFiles([]);
    setShowForm(true);
  };

  const buildFormData = () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v === '') return; // champs optionnels vides : on n'envoie rien plutôt qu'une chaîne vide
      fd.append(k, String(v ?? ''));
    });
    files.forEach(f => fd.append('pieces_jointes[]', f));
    return fd;
  };

  const mutation = useMutation({
    mutationFn: () => {
      if (editing) return activiteApi.update(editing.id, buildFormData());
      return composanteId
        ? activiteApi.create(composanteId, buildFormData())
        : activiteApi.createForProject(projectId!, buildFormData());
    },
    onSuccess: () => {
      toast.success(editing ? 'Activité mise à jour ✓' : 'Activité ajoutée ✓');
      qc.invalidateQueries({ queryKey });
      setShowForm(false);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de la sauvegarde')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => activiteApi.delete(id),
    onSuccess: () => { toast.success('Activité supprimée'); qc.invalidateQueries({ queryKey }); },
  });

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); mutation.mutate(); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-green-600" /> Activités
        </h3>
        {canWrite && (
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Ajouter une activité
          </button>
        )}
      </div>

      {isLoading && <p className="text-sm text-gray-400">Chargement...</p>}
      {!isLoading && (activites?.length ?? 0) === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm border border-dashed rounded-xl">
          Aucune activité pour le moment.
        </div>
      )}

      <div className="space-y-2">
        {activites?.map(a => {
          const isExpanded = expandedId === a.id;
          return (
            <div key={a.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.code && <span className="text-[11px] font-mono text-gray-400">{a.code}</span>}
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUT_STYLE[a.statut]}`}>{a.statut}</span>
                  </div>
                  <p className="font-semibold text-gray-800 mt-1">{a.nom}</p>
                  {a.responsable && <p className="text-xs text-gray-500 mt-0.5">Responsable : {a.responsable}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {canWrite && (
                    <>
                      <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-gray-100">
                        <Edit className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(a.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Avancement</span><span>{a.pourcentage_avancement}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${a.pourcentage_avancement}%` }} />
                </div>
              </div>

              {(a.pieces_jointes?.length ?? 0) > 0 && (
                <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                  <Paperclip className="w-3 h-3" /> {a.pieces_jointes!.length} pièce(s) jointe(s)
                </p>
              )}

              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : a.id)}
                className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-800"
              >
                <Target className="w-3.5 h-3.5" />
                Indicateurs {(a.indicateurs_count ?? a.indicateurs?.length) ? `(${a.indicateurs_count ?? a.indicateurs?.length})` : ''}
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <IndicateursPanel activiteId={a.id} canWrite={canWrite} />
                </div>
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
              <h4 className="font-bold text-gray-800">{editing ? 'Modifier' : 'Nouvelle'} activité</h4>
              <button type="button" onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="form-label">ID d'activité</label>
                <input className="form-input" value={form.code} onChange={e => set('code', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="form-label">Nom de l'activité</label>
                <input className="form-input" required value={form.nom} onChange={e => set('nom', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="form-label">Responsable</label>
                <input className="form-input" value={form.responsable} onChange={e => set('responsable', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Budget</label>
                <input type="number" step="any" className="form-input" value={form.budget}
                  onChange={e => set('budget', e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div>
                <label className="form-label">Devise</label>
                <select className="form-input" value={form.devise} onChange={e => set('devise', e.target.value as Devise)}>
                  {DEVISES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Date début</label>
                <input type="date" className="form-input" value={form.date_debut} onChange={e => set('date_debut', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Date fin</label>
                <input type="date" className="form-input" value={form.date_fin} onChange={e => set('date_fin', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Statut</label>
                <select className="form-input" value={form.statut} onChange={e => set('statut', e.target.value)}>
                  {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Avancement (%)</label>
                <input type="number" min={0} max={100} className="form-input" value={form.pourcentage_avancement}
                  onChange={e => set('pourcentage_avancement', Number(e.target.value))} />
              </div>
            </div>
            <div>
              <label className="form-label">Observations</label>
              <textarea className="form-input" rows={2} value={form.observations} onChange={e => set('observations', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Pièces jointes</label>
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
