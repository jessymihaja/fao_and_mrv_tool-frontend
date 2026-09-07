// src/pages/admin/projects/wizard/ProjectWizardPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  projectApi, statusApi, classificationApi, domaine_interventionApi, entite_accrediteeApi,
} from '@/api/services';
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Project } from '@/types';
import { getErrorMessage } from '@/utils/apiError';
import GeoZoneSelector from '@/components/admin/GeoZoneSelector';
import SelectAvecAjout from '@/components/admin/SelectAvecAjout';
import MultiSelectAvecAjout from '@/components/admin/MultiSelectAvecAjout';
import StepperHeader, { type WizardStepDef } from './StepperHeader';

// La création d'un projet ne comporte plus que 2 étapes : Informations
// générales et Zone géographique. Les Activités / Composantes /
// Indicateurs / Documents se gèrent désormais depuis les onglets de la
// fiche projet une fois celui-ci créé (voir ProjectAdminDetailPage.tsx).
const STEPS: WizardStepDef[] = [
  { key: 1, label: 'Informations générales' },
  { key: 2, label: 'Zone géographique' },
];

const emptyForm: Partial<Project> = {
  id_projet: '', titre: '', status_id: undefined,
  classification_ids: [], entite_accreditee_ids: [], description: '',
  domaine_intervention_ids: [], date_debut: '', date_fin: '',
  latitude: undefined, longitude: undefined, zone_description: '', is_published: false,
  region_id: undefined, district_id: undefined, commune_id: undefined, fokontany_id: undefined,
  zone: '',
};

export default function ProjectWizardPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Indique qu'on est dans le parcours de CRÉATION (par opposition à une
  // simple modification d'un projet déjà existant) : détecté à l'arrivée
  // sur /new (pas d'id), puis conservé via ?new=1 après la redirection
  // interne vers /admin/projects/:id/wizard qui suit la création réelle.
  const [isCreationFlow] = useState<boolean>(!isEdit || searchParams.get('new') === '1');

  const [currentStep, setCurrentStep] = useState<number>(() => {
    const s = Number(searchParams.get('step'));
    return s >= 1 && s <= 2 ? s : 1;
  });
  const [form, setForm] = useState<Partial<Project>>(emptyForm);

  const { data: existing } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectApi.show(Number(id)).then(r => r.data),
    enabled: isEdit,
  });

  useEffect(() => { if (existing) setForm(existing); }, [existing]);

  useEffect(() => {
    setSearchParams(prev => { prev.set('step', String(currentStep)); return prev; }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const set = (field: keyof Project, value: Project[keyof Project]) => setForm(f => ({ ...f, [field]: value }));

  // Sur un nouveau projet non encore créé, seule l'étape 1 est accessible.
  // Un projet déjà existant (édition) donne accès libre aux 2 étapes.
  const maxUnlockedStep = isEdit ? 2 : 1;

  const { data: STATUTS } = useQuery({ queryKey: ['statuts'], queryFn: () => statusApi.list().then(r => r.data) });
  const { data: CLASSIFICATIONS } = useQuery({ queryKey: ['classifications'], queryFn: () => classificationApi.list().then(r => r.data) });
  const { data: SECTEURS } = useQuery({ queryKey: ['domaine-interventions'], queryFn: () => domaine_interventionApi.list().then(r => r.data) });
  const { data: ENTITE_ACCREDITEE } = useQuery({ queryKey: ['entite-accreditees'], queryFn: () => entite_accrediteeApi.list().then(r => r.data) });

  // ── Sauvegarde étape 1 (création ou modif des infos générales) ──
  const saveInfoMutation = useMutation({
    mutationFn: (payload: Partial<Project>) =>
      isEdit ? projectApi.update(Number(id), payload) : projectApi.create(payload),
    onSuccess: async (res) => {
      const project = res.data;
      qc.invalidateQueries({ queryKey: ['admin-projects'] });
      if (!isEdit) {
        // Nouveau projet : on passe en mode édition sur son id réel, en
        // conservant le contexte "création" (?new=1) pour la redirection finale.
        await projectApi.advanceStep(project.id, 1);
        navigate(`/admin/projects/${project.id}/wizard?step=2&new=1`, { replace: true });
      } else {
        toast.success('Informations enregistrées ✓');
        qc.invalidateQueries({ queryKey: ['project', id] });
        goToStep(2);
      }
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Erreur lors de la sauvegarde'));
    },
  });

  // ── Sauvegarde étape 2 (zone géographique) ───────────────────────
  const saveGeoMutation = useMutation({
    mutationFn: (payload: Partial<Project>) => projectApi.update(Number(id), payload),
    onSuccess: async () => {
      await projectApi.advanceStep(Number(id), 2);
      qc.invalidateQueries({ queryKey: ['project', id] });
      qc.invalidateQueries({ queryKey: ['admin-projects'] });
      if (isCreationFlow) {
        // Fin de la création : retour automatique à la liste des projets.
        toast.success('Projet créé avec succès.');
        navigate('/admin/projects', { replace: true });
      } else {
        toast.success('Zone géographique mise à jour ✓');
        navigate(`/admin/projects/${id}/details`, { replace: true });
      }
    },
    onError: () => toast.error('Erreur lors de la sauvegarde de la zone géographique'),
  });

  const goToStep = (step: number) => {
    if (step > maxUnlockedStep) return;
    setCurrentStep(step);
  };

  const handleSubmitInfo = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === undefined ? null : v])
    ) as Partial<Project>;
    saveInfoMutation.mutate(payload);
  };

  const handleSubmitGeo = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === undefined ? null : v])
    ) as Partial<Project>;
    saveGeoMutation.mutate(payload);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-fade-in">
      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          to={isEdit && !isCreationFlow ? `/admin/projects/${id}/details` : '/admin/projects'}
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">
            {isCreationFlow ? 'Nouveau projet' : 'Modifier le projet'}
          </h1>
          {isEdit && !isCreationFlow && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{existing?.titre}</p>}
        </div>
      </div>

      {/* ── Stepper ───────────────────────────────────── */}
      <StepperHeader
        steps={STEPS}
        currentStep={currentStep}
        maxUnlockedStep={maxUnlockedStep}
        onStepClick={goToStep}
      />

      {/* ── ÉTAPE 1 : Informations générales ─────────────── */}
      {currentStep === 1 && (
        <form onSubmit={handleSubmitInfo} className="space-y-5">
          <div className="card p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="form-label">ID Projet</label>
                <input className="form-input font-mono" value={form.id_projet || ''}
                  onChange={e => set('id_projet', e.target.value.toUpperCase())}
                  placeholder="Si Applicable" maxLength={50} />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Titre du projet</label>
                <input className="form-input" required value={form.titre || ''}
                  onChange={e => set('titre', e.target.value)}
                  placeholder="Ex : Adaptation Climatique Zones Côtières Nord" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MultiSelectAvecAjout
                label="Classification"
                values={form.classification_ids ?? []}
                onChange={v => set('classification_ids', v as number[])}
                options={(CLASSIFICATIONS ?? []).map(c => ({ id: c.id_classification, label: c.designation }))}
                queryKey="classifications" createEndpoint="/classifications" idField="id_classification"
              />
              <SelectAvecAjout
                label="Statut"
                value={form.status_id}
                onChange={v => set('status_id', v)}
                options={(STATUTS ?? []).map(s => ({ id: s.id_status, label: s.designation }))}
                queryKey="statuts" createEndpoint="/statuses" idField="id_status"
              />
            </div>

            <MultiSelectAvecAjout
              label="Entité accréditée"
              values={form.entite_accreditee_ids ?? []}
              onChange={v => set('entite_accreditee_ids', v as number[])}
              options={(ENTITE_ACCREDITEE ?? []).map(e => ({
                id: e.id_entite_accreditee,
                label: e.sigle ? `${e.sigle} — ${e.designation}` : e.designation,
              }))}
              queryKey="entite-accreditees" createEndpoint="/entite-accreditees" idField="id_entite_accreditee"
              extraField={{ name: 'sigle', placeholder: 'Sigle', label: 'Sigle' }}
            />

            <MultiSelectAvecAjout
              label="Domaines du changement climatiques"
              values={form.domaine_intervention_ids ?? []}
              onChange={v => set('domaine_intervention_ids', v as number[])}
              options={(SECTEURS ?? []).map(s => ({ id: s.id_domaine_intervention, label: s.designation }))}
              queryKey="domaine-interventions" createEndpoint="/domaine-interventions" idField="id_domaine_intervention"
            />

            <div>
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={4} value={form.description || ''}
                onChange={e => set('description', e.target.value)}
                placeholder="Description générale du projet..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Date mise en service</label>
                <input type="date" className="form-input" value={form.date_debut?.toString().slice(0, 10) || ''}
                  onChange={e => set('date_debut', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Date fin</label>
                <input type="date" className="form-input" value={form.date_fin?.toString().slice(0, 10) || ''}
                  onChange={e => set('date_fin', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="form-label">Nombre de bénéficiaires</label>
              <input type="number" min={0} className="form-input max-w-xs" value={form.nombre_beneficiaires ?? ''}
                onChange={e => set('nombre_beneficiaires', e.target.value === '' ? null : Number(e.target.value))}
                placeholder="Ex : 15000" />
              <p className="text-[11px] text-gray-400 mt-1">Affiché dans « Impact en chiffres » sur la page d'accueil publique.</p>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <input type="checkbox" id="is_published" checked={form.is_published || false}
                onChange={e => set('is_published', e.target.checked)} className="w-4 h-4 accent-green-600" />
              <label htmlFor="is_published" className="text-sm font-medium text-gray-700 cursor-pointer">
                Publier sur le site vitrine public
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={saveInfoMutation.isPending}>
              {saveInfoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Enregistrer et continuer
            </button>
          </div>
        </form>
      )}

      {/* ── ÉTAPE 2 : Zone géographique ───────────────────── */}
      {currentStep === 2 && isEdit && (
        <form onSubmit={handleSubmitGeo} className="space-y-5">
          <GeoZoneSelector form={form} onChange={set} />
          <div className="flex justify-between">
            <button type="button" className="btn btn-secondary" onClick={() => goToStep(1)}>
              <ArrowLeft className="w-4 h-4" /> Précédent
            </button>
            <button type="submit" className="btn btn-primary" disabled={saveGeoMutation.isPending}>
              {saveGeoMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : isCreationFlow ? <CheckCircle2 className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              {isCreationFlow ? 'Créer le projet' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
