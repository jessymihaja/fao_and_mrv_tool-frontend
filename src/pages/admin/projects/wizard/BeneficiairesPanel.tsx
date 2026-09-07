// src/pages/admin/projects/wizard/BeneficiairesPanel.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { beneficiaryApi, geoApi, beneficiaryTypeApi, beneficiaryCategoryApi } from '@/api/services';
import {
  Plus, Trash2, Edit, X, Save, Loader2, Users, MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Beneficiary, Project } from '@/types';
import { getErrorMessage } from '@/utils/apiError';
import SelectAvecAjout from '@/components/admin/SelectAvecAjout';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 16 }, (_, i) => CURRENT_YEAR + 5 - i);

const emptyForm = {
  beneficiary_type_id: '' as number | '',
  beneficiary_category_id: '' as number | '',
  description: '',
  useProjectZone: true,
  region_id: '' as number | '',
  district_id: '' as number | '',
  commune_id: '' as number | '',
  fokontany_id: '' as number | '',
  planned_count: 0,
  achieved_count: 0,
  women_count: '' as number | '',
  men_count: '' as number | '',
  youth_count: '' as number | '',
  vulnerable_count: '' as number | '',
  reference_year: CURRENT_YEAR,
  monitoring_year: '' as number | '',
  source: '',
  observations: '',
};
type FormState = typeof emptyForm;

interface Props {
  projectId: number;
  project?: Project;
  canWrite?: boolean;
}

const fmtN = (n: number | string | null | undefined) => Number(n ?? 0).toLocaleString('fr-MG');

export default function BeneficiairesPanel({ projectId, project, canWrite = true }: Props) {
  const qc = useQueryClient();
  const queryKey = ['project-beneficiaries', projectId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => beneficiaryApi.listByProject(projectId).then(r => r.data),
  });
  const items = data?.data ?? [];
  const stats = data?.stats;

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Beneficiary | null>(null);
  const [form, setForm]         = useState<FormState>(emptyForm);

  const set = (field: keyof FormState, value: FormState[keyof FormState]) => setForm(f => ({ ...f, [field]: value }));

  // Référentiels "Type de bénéficiaire" / "Catégorie de bénéficiaire" —
  // extensibles via le bouton "+" (comme Classification, Secteur...)
  // plutôt que des listes figées.
  const { data: benTypes = [] } = useQuery({
    queryKey: ['beneficiary-types'],
    queryFn: () => beneficiaryTypeApi.list().then(r => r.data),
  });
  const { data: benCategories = [] } = useQuery({
    queryKey: ['beneficiary-categories'],
    queryFn: () => beneficiaryCategoryApi.list().then(r => r.data),
  });

  // ── Cascade géographique manuelle — utilisée uniquement quand
  // l'utilisateur choisit de préciser une zone différente de celle du
  // projet. Réutilise le même système géographique (Region/District/
  // Commune/Fokontany) que le reste de l'application.
  const { data: districts } = useQuery({
    queryKey: ['ben-districts', form.region_id],
    queryFn: () => geoApi.districts(Number(form.region_id)).then(r => r.data),
    enabled: !form.useProjectZone && form.region_id !== '',
  });
  const { data: communes } = useQuery({
    queryKey: ['ben-communes', form.district_id],
    queryFn: () => geoApi.communes(Number(form.district_id)).then(r => r.data),
    enabled: !form.useProjectZone && form.district_id !== '',
  });
  const { data: fokontanyList } = useQuery({
    queryKey: ['ben-fokontany', form.commune_id],
    queryFn: () => geoApi.fokontany(Number(form.commune_id)).then(r => r.data),
    enabled: !form.useProjectZone && form.commune_id !== '',
  });
  const { data: regions } = useQuery({
    queryKey: ['ben-regions'],
    queryFn: () => geoApi.regions().then(r => r.data),
    enabled: showForm && !form.useProjectZone,
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (b: Beneficiary) => {
    const matchesProjectZone =
      (b.region_id ?? null) === (project?.region_id ?? null) &&
      (b.district_id ?? null) === (project?.district_id ?? null) &&
      (b.commune_id ?? null) === (project?.commune_id ?? null) &&
      (b.fokontany_id ?? null) === (project?.fokontany_id ?? null);

    setEditing(b);
    setForm({
      beneficiary_type_id: b.beneficiary_type_id,
      beneficiary_category_id: b.beneficiary_category_id,
      description: b.description || '',
      useProjectZone: matchesProjectZone,
      region_id: b.region_id ?? '',
      district_id: b.district_id ?? '',
      commune_id: b.commune_id ?? '',
      fokontany_id: b.fokontany_id ?? '',
      planned_count: b.planned_count,
      achieved_count: b.achieved_count,
      women_count: b.women_count ?? '',
      men_count: b.men_count ?? '',
      youth_count: b.youth_count ?? '',
      vulnerable_count: b.vulnerable_count ?? '',
      reference_year: b.reference_year,
      monitoring_year: b.monitoring_year ?? '',
      source: b.source || '',
      observations: b.observations || '',
    });
    setShowForm(true);
  };

  const buildPayload = (): Partial<Beneficiary> => {
    const useProject = form.useProjectZone;
    return {
      beneficiary_type_id: form.beneficiary_type_id === '' ? undefined : Number(form.beneficiary_type_id),
      beneficiary_category_id: form.beneficiary_category_id === '' ? undefined : Number(form.beneficiary_category_id),
      description: form.description || undefined,
      region_id:    useProject ? (project?.region_id ?? null)    : (form.region_id === '' ? null : Number(form.region_id)),
      district_id:  useProject ? (project?.district_id ?? null)  : (form.district_id === '' ? null : Number(form.district_id)),
      commune_id:   useProject ? (project?.commune_id ?? null)   : (form.commune_id === '' ? null : Number(form.commune_id)),
      fokontany_id: useProject ? (project?.fokontany_id ?? null) : (form.fokontany_id === '' ? null : Number(form.fokontany_id)),
      planned_count: Number(form.planned_count) || 0,
      achieved_count: Number(form.achieved_count) || 0,
      women_count: form.women_count === '' ? null : Number(form.women_count),
      men_count: form.men_count === '' ? null : Number(form.men_count),
      youth_count: form.youth_count === '' ? null : Number(form.youth_count),
      vulnerable_count: form.vulnerable_count === '' ? null : Number(form.vulnerable_count),
      reference_year: Number(form.reference_year),
      monitoring_year: form.monitoring_year === '' ? null : Number(form.monitoring_year),
      source: form.source || undefined,
      observations: form.observations || undefined,
    };
  };

  const mutation = useMutation({
    mutationFn: () =>
      editing ? beneficiaryApi.update(editing.id, buildPayload()) : beneficiaryApi.create(projectId, buildPayload()),
    onSuccess: () => {
      toast.success(editing ? 'Bénéficiaire mis à jour ✓' : 'Bénéficiaire ajouté ✓');
      qc.invalidateQueries({ queryKey });
      setShowForm(false);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de la sauvegarde')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => beneficiaryApi.delete(id),
    onSuccess: () => { toast.success('Bénéficiaire supprimé'); qc.invalidateQueries({ queryKey }); },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de la suppression')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.beneficiary_type_id === '') { toast.error('Le type de bénéficiaire est obligatoire.'); return; }
    if (form.beneficiary_category_id === '') { toast.error('La catégorie de bénéficiaire est obligatoire.'); return; }
    const women = form.women_count === '' ? null : Number(form.women_count);
    const men   = form.men_count === '' ? null : Number(form.men_count);
    if (women !== null && men !== null && (women + men) > Number(form.achieved_count)) {
      toast.error("La somme femmes + hommes ne peut pas dépasser le nombre atteint.");
      return;
    }
    mutation.mutate();
  };

  // Bug corrigé : ProjectResource sérialise la région du projet en
  // `{ id, nom }` (comme district/commune/fokontany) — le champ est bien
  // `nom`, pas `designation` (qui n'existe que sur le type `Region` générique
  // utilisé ailleurs dans l'app, pas sur cet objet imbriqué).
  const projectZoneLabel = [project?.commune?.nom, project?.district?.nom, project?.region?.nom]
    .filter(Boolean).join(', ') || 'Zone du projet non renseignée';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-green-600" /> Bénéficiaires du projet
        </h3>
        {canWrite && (
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Ajouter un bénéficiaire
          </button>
        )}
      </div>

      {/* ── Statistiques synthétiques — calculées côté serveur ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { label: 'Prévus',      value: stats.total_prevu },
            { label: 'Atteints',    value: stats.total_atteint },
            { label: 'Femmes',      value: stats.femmes },
            { label: 'Hommes',      value: stats.hommes },
            { label: 'Jeunes',      value: stats.jeunes },
            { label: 'Vulnérables', value: stats.vulnerables },
            { label: 'Taux global', value: `${stats.taux_atteinte}%` },
          ].map(s => (
            <div key={s.label} className="card p-3 text-center">
              <p className="text-lg font-bold text-gray-800">{typeof s.value === 'number' ? fmtN(s.value) : s.value}</p>
              <p className="text-[11px] text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading && <p className="text-sm text-gray-400">Chargement...</p>}

      {!isLoading && items.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm border border-dashed rounded-xl">
          Aucun bénéficiaire pour le moment.
        </div>
      )}

      {items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Catégorie</th>
                <th className="text-right px-3 py-2">Prévu</th>
                <th className="text-right px-3 py-2">Atteint</th>
                <th className="text-right px-3 py-2">Femmes</th>
                <th className="text-right px-3 py-2">Hommes</th>
                <th className="text-right px-3 py-2">Jeunes</th>
                <th className="text-left px-3 py-2">Progression</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(b => {
                const pct = Number(b.taux_atteinte);
                return (
                  <tr key={b.id} className="hover:bg-gray-50/60">
                    <td className="px-3 py-2">{b.beneficiary_type?.designation ?? '—'}</td>
                    <td className="px-3 py-2">{b.beneficiary_category?.designation ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{fmtN(b.planned_count)}</td>
                    <td className="px-3 py-2 text-right">{fmtN(b.achieved_count)}</td>
                    <td className="px-3 py-2 text-right">{b.women_count != null ? fmtN(b.women_count) : '—'}</td>
                    <td className="px-3 py-2 text-right">{b.men_count != null ? fmtN(b.men_count) : '—'}</td>
                    <td className="px-3 py-2 text-right">{b.youth_count != null ? fmtN(b.youth_count) : '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 w-28">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-600">{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        {canWrite && (
                          <>
                            <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-gray-100" title="Modifier">
                              <Edit className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                            <button onClick={() => deleteMutation.mutate(b.id)} className="p-1.5 rounded-lg hover:bg-red-50" title="Supprimer">
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

      {/* ── Formulaire d'ajout / modification ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-800">{editing ? 'Modifier' : 'Nouveau'} bénéficiaire</h4>
              <button type="button" onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {/* Le projet est déjà connu (route /projects/{id}/beneficiaries) —
                aucun champ de sélection de projet n'est affiché ici. */}

            <div className="grid grid-cols-2 gap-3">
              <SelectAvecAjout
                label="Type de bénéficiaire"
                required
                value={form.beneficiary_type_id}
                onChange={v => set('beneficiary_type_id', v as number)}
                options={benTypes.map(t => ({ id: t.id, label: t.designation }))}
                queryKey="beneficiary-types"
                createEndpoint="/beneficiary-types"
                idField="id"
              />
              <SelectAvecAjout
                label="Catégorie"
                required
                value={form.beneficiary_category_id}
                onChange={v => set('beneficiary_category_id', v as number)}
                options={benCategories.map(c => ({ id: c.id, label: c.designation }))}
                queryKey="beneficiary-categories"
                createEndpoint="/beneficiary-categories"
                idField="id"
              />
            </div>

            <div>
              <label className="form-label">Description du groupe</label>
              <textarea className="form-input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
            </div>

            {/* ── Localisation : réutilisation de la zone du projet par défaut ── */}
            <div className="rounded-xl border border-gray-200 p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input type="checkbox" checked={form.useProjectZone}
                  onChange={e => set('useProjectZone', e.target.checked as unknown as FormState['useProjectZone'])} />
                Utiliser la zone géographique du projet
              </label>
              {form.useProjectZone ? (
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-green-500" /> {projectZoneLabel}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <select className="form-input text-sm" value={form.region_id}
                    onChange={e => { set('region_id', e.target.value === '' ? '' : Number(e.target.value)); set('district_id', ''); set('commune_id', ''); set('fokontany_id', ''); }}>
                    <option value="">— Région —</option>
                    {regions?.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                  </select>
                  <select className="form-input text-sm" value={form.district_id} disabled={form.region_id === ''}
                    onChange={e => { set('district_id', e.target.value === '' ? '' : Number(e.target.value)); set('commune_id', ''); set('fokontany_id', ''); }}>
                    <option value="">— District —</option>
                    {districts?.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                  </select>
                  <select className="form-input text-sm" value={form.commune_id} disabled={form.district_id === ''}
                    onChange={e => { set('commune_id', e.target.value === '' ? '' : Number(e.target.value)); set('fokontany_id', ''); }}>
                    <option value="">— Commune —</option>
                    {communes?.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                  <select className="form-input text-sm" value={form.fokontany_id} disabled={form.commune_id === ''}
                    onChange={e => set('fokontany_id', e.target.value === '' ? '' : Number(e.target.value))}>
                    <option value="">— Fokontany —</option>
                    {fokontanyList?.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Nombre prévu *</label>
                <input type="number" min={0} className="form-input" required
                  value={form.planned_count} onChange={e => set('planned_count', Number(e.target.value))} />
              </div>
              <div>
                <label className="form-label">Nombre atteint *</label>
                <input type="number" min={0} className="form-input" required
                  value={form.achieved_count} onChange={e => set('achieved_count', Number(e.target.value))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Nombre de femmes</label>
                <input type="number" min={0} className="form-input"
                  value={form.women_count} onChange={e => set('women_count', e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div>
                <label className="form-label">Nombre d'hommes</label>
                <input type="number" min={0} className="form-input"
                  value={form.men_count} onChange={e => set('men_count', e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div>
                <label className="form-label">Nombre de jeunes</label>
                <input type="number" min={0} className="form-input"
                  value={form.youth_count} onChange={e => set('youth_count', e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div>
                <label className="form-label">Personnes vulnérables</label>
                <input type="number" min={0} className="form-input"
                  value={form.vulnerable_count} onChange={e => set('vulnerable_count', e.target.value === '' ? '' : Number(e.target.value))} />
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
                <label className="form-label">Année de suivi</label>
                <select className="form-input" value={form.monitoring_year} onChange={e => set('monitoring_year', e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">—</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Source</label>
              <input className="form-input" value={form.source} onChange={e => set('source', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Observations</label>
              <textarea className="form-input" rows={2} value={form.observations} onChange={e => set('observations', e.target.value)} />
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