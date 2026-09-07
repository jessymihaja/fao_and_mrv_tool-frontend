// src/pages/admin/projects/wizard/ComposanteInfoForm.tsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { composanteApi } from '@/api/services';
import { Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Composante, StatutComposante, Devise } from '@/types';
import { getErrorMessage } from '@/utils/apiError';

const STATUTS: StatutComposante[] = ['Planifiee', 'En cours', 'Terminee', 'Suspendue'];
// Devise du budget (§9-10). Même liste que le reste de l'application.
const DEVISES: Devise[] = ['AR', 'USD', 'EUR'];

interface Props {
  composante: Composante;
  onSaved: (c: Composante) => void;
  canWrite?: boolean;
}

export default function ComposanteInfoForm({ composante, onSaved, canWrite = true }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    code: composante.code || '',
    nom: composante.nom,
    objectif_specifique: composante.objectif_specifique || '',
    description: composante.description || '',
    responsable: composante.responsable || '',
    budget: composante.budget ?? ('' as number | ''),
    devise: composante.devise ?? ('AR' as Devise),
    date_debut: composante.date_debut?.slice(0, 10) || '',
    date_fin: composante.date_fin?.slice(0, 10) || '',
    statut: composante.statut,
  });

  const set = (field: keyof typeof form, value: (typeof form)[keyof typeof form]) => setForm(f => ({ ...f, [field]: value }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, budget: form.budget === '' ? undefined : form.budget };
      return composanteApi.update(composante.id, payload as Partial<Composante>);
    },
    onSuccess: (res) => {
      toast.success('Composante mise à jour ✓');
      qc.invalidateQueries({ queryKey: ['composantes', composante.project_id] });
      onSaved(res.data);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de la sauvegarde')),
  });

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="card p-5 space-y-4 max-w-3xl">
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <label className="form-label">ID de la composante</label>
          <input className="form-input" disabled={!canWrite} value={form.code} onChange={e => set('code', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="form-label">Nom de la composante</label>
          <input className="form-input" disabled={!canWrite} required value={form.nom} onChange={e => set('nom', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="form-label">Objectif spécifique</label>
        <input className="form-input" disabled={!canWrite} value={form.objectif_specifique} onChange={e => set('objectif_specifique', e.target.value)} />
      </div>

      <div>
        <label className="form-label">Description</label>
        <textarea className="form-input" disabled={!canWrite} rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="form-label">Responsable</label>
          <input className="form-input" disabled={!canWrite} value={form.responsable} onChange={e => set('responsable', e.target.value)} />
        </div>
        <div>
          <label className="form-label">Budget</label>
          <input type="number" step="any" className="form-input" disabled={!canWrite} value={form.budget}
            onChange={e => set('budget', e.target.value === '' ? '' : Number(e.target.value))} />
        </div>
        <div>
          <label className="form-label">Devise</label>
          <select className="form-input" disabled={!canWrite} value={form.devise} onChange={e => set('devise', e.target.value as Devise)}>
            {DEVISES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="form-label">Date début</label>
          <input type="date" className="form-input" disabled={!canWrite} value={form.date_debut} onChange={e => set('date_debut', e.target.value)} />
        </div>
        <div>
          <label className="form-label">Date fin</label>
          <input type="date" className="form-input" disabled={!canWrite} value={form.date_fin} onChange={e => set('date_fin', e.target.value)} />
        </div>
        <div>
          <label className="form-label">Statut</label>
          <select className="form-input" disabled={!canWrite} value={form.statut} onChange={e => set('statut', e.target.value as StatutComposante)}>
            {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {canWrite && (
        <div className="flex justify-end pt-2">
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      )}
    </form>
  );
}
