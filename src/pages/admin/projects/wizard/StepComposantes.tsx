// src/pages/admin/projects/wizard/StepComposantes.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { composanteApi } from '@/api/services';
import { Plus, Trash2, Edit, ChevronRight, X, Save, Loader2, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Composante, StatutComposante, Devise } from '@/types';
import ComposanteDetailPanel from './ComposanteDetailPanel';
import { getErrorMessage } from '@/utils/apiError';

const STATUTS: StatutComposante[] = ['Planifiee', 'En cours', 'Terminee', 'Suspendue'];
const STATUT_STYLE: Record<StatutComposante, string> = {
  'Planifiee': 'bg-gray-100 text-gray-600',
  'En cours':  'bg-blue-50 text-blue-700',
  'Terminee':  'bg-green-50 text-green-700',
  'Suspendue': 'bg-orange-50 text-orange-700',
};
// Devise du budget (§9-10 : nécessaire pour comparer les dépenses au budget
// dans la même devise). Même liste que le reste de l'application.
const DEVISES: Devise[] = ['AR', 'USD', 'EUR'];

const emptyForm = {
  code: '', nom: '', objectif_specifique: '', description: '',
  responsable: '', budget: '' as number | '', devise: 'AR' as Devise, date_debut: '', date_fin: '',
  statut: 'Planifiee' as StatutComposante,
};
type FormState = typeof emptyForm;

interface Props {
  projectId: number;
  canWrite?: boolean;
}

export default function StepComposantes({ projectId, canWrite = true }: Props) {
  const qc = useQueryClient();
  const queryKey = ['composantes', projectId];

  const { data: composantes, isLoading } = useQuery({
    queryKey,
    queryFn: () => composanteApi.listByProject(projectId).then(r => r.data),
  });

  const [selected, setSelected] = useState<Composante | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Composante | null>(null);
  const [form, setForm]         = useState<FormState>(emptyForm);

  const set = (field: keyof FormState, value: FormState[keyof FormState]) => setForm(f => ({ ...f, [field]: value }));

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (c: Composante) => {
    setEditing(c);
    setForm({
      code: c.code || '', nom: c.nom, objectif_specifique: c.objectif_specifique || '',
      description: c.description || '', responsable: c.responsable || '',
      budget: c.budget ?? '', devise: c.devise ?? 'AR', date_debut: c.date_debut?.slice(0, 10) || '',
      date_fin: c.date_fin?.slice(0, 10) || '', statut: c.statut,
    });
    setShowForm(true);
  };

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, budget: form.budget === '' ? undefined : form.budget };
      return editing ? composanteApi.update(editing.id, payload) : composanteApi.create(projectId, payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Composante mise à jour ✓' : 'Composante créée ✓');
      qc.invalidateQueries({ queryKey });
      setShowForm(false);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de la sauvegarde')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => composanteApi.delete(id),
    onSuccess: () => { toast.success('Composante supprimée'); qc.invalidateQueries({ queryKey }); },
  });

  // ── Vue détail d'une composante (sous-onglets) ──────────────────
  if (selected) {
    return (
      <ComposanteDetailPanel
        composante={selected}
        onBack={() => setSelected(null)}
        onUpdated={(c) => setSelected(c)}
        canWrite={canWrite}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800">Composantes du projet</h3>
          <p className="text-sm text-gray-500">
            Un projet peut contenir une ou plusieurs composantes, chacune avec ses activités, indicateurs et documents.
          </p>
        </div>
        {canWrite && (
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Nouvelle composante
          </button>
        )}
      </div>

      {isLoading && <p className="text-sm text-gray-400">Chargement...</p>}

      {!isLoading && (composantes?.length ?? 0) === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm border border-dashed rounded-xl">
          <Layers className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          Aucune composante. Ajoutez-en au moins une pour continuer.
        </div>
      )}

      <div className="space-y-2">
        {composantes?.map(c => (
          <div key={c.id} className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelected(c)}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {c.code && <span className="text-[11px] font-mono text-gray-400">{c.code}</span>}
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUT_STYLE[c.statut]}`}>{c.statut}</span>
              </div>
              <p className="font-semibold text-gray-800 mt-1 truncate">{c.nom}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {c.activites_count ?? 0} activité(s) · {c.indicateurs_count ?? 0} indicateur(s) · {c.documents_count ?? 0} document(s)
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
              {canWrite && (
                <>
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100">
                    <Edit className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(c.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </>
              )}
              <ChevronRight className="w-4 h-4 text-gray-300 ml-1" />
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); mutation.mutate(); }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-800">{editing ? 'Modifier' : 'Nouvelle'} composante</h4>
              <button type="button" onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="form-label">ID de la composante</label>
                <input className="form-input" value={form.code} onChange={e => set('code', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="form-label">Nom de la composante</label>
                <input className="form-input" required value={form.nom} onChange={e => set('nom', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="form-label">Objectif spécifique</label>
              <input className="form-input" value={form.objectif_specifique} onChange={e => set('objectif_specifique', e.target.value)} />
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
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="form-label">Date début</label>
                <input type="date" className="form-input" value={form.date_debut} onChange={e => set('date_debut', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Date fin</label>
                <input type="date" className="form-input" value={form.date_fin} onChange={e => set('date_fin', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Statut</label>
                <select className="form-input" value={form.statut} onChange={e => set('statut', e.target.value as StatutComposante)}>
                  {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
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
