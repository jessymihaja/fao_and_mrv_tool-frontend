// src/pages/admin/project-ideas/ProjectIdeaWizardPage.tsx
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  FileText, MapPin, Layers, Users, Wallet, Landmark, Paperclip,
  ArrowLeft, Save, Loader2, ChevronRight, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectIdeaApi, secteurApi, organismeContributeurApi } from '@/api/services';
import GeoZoneSelector, { type GeoZoneFormFields } from '@/components/admin/GeoZoneSelector';
import MultiSelectAvecAjout from '@/components/admin/MultiSelectAvecAjout';
import SelectAvecAjout from '@/components/admin/SelectAvecAjout';
import type { Devise, ProjectIdea, ProjectIdeaFormData } from '@/types';
import { getErrorMessage } from '@/utils/apiError';

type TabKey = 'infos' | 'localisation' | 'secteurs' | 'beneficiaires' | 'budget' | 'financement' | 'documents';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'infos',         label: 'Informations générales', icon: FileText },
  { key: 'localisation',  label: 'Localisation',            icon: MapPin },
  { key: 'secteurs',      label: 'Secteurs',                icon: Layers },
  { key: 'beneficiaires', label: 'Bénéficiaires',           icon: Users },
  { key: 'budget',        label: 'Budget prévisionnel',     icon: Wallet },
  { key: 'financement',   label: 'Financement envisagé',    icon: Landmark },
  { key: 'documents',     label: 'Documents',                icon: Paperclip },
];

const DEVISES: Devise[] = ['AR', 'USD', 'EUR'];

const emptyForm: ProjectIdeaFormData = {
  titre: '', lien: '', acronyme: '', description: '', contexte: '', justification: '',
  objectif_general: '', objectifs_specifiques: '', resultats_attendus: '',
  duree_prevue_mois: '', date_debut_estimee: '', date_fin_estimee: '', porteur_projet: '',
  latitude: null, longitude: null, province_id: null, region_id: null, district_id: null,
  commune_id: null, fokontany_id: null, zone_description: '', geo_address: '', zone: '',
  secteur_ids: [],
  nombre_beneficiaires: '', beneficiaires_hommes: '', beneficiaires_femmes: '',
  beneficiaires_jeunes: '', beneficiaires_vulnerables: '',
  budget_total_estime: '', devise: 'AR', contribution_nationale: '',
  contribution_partenaires: '', cofinancement_prive: '', autres_financements: '',
};

function ideaToFormData(idea: ProjectIdea): ProjectIdeaFormData {
  return {
    titre: idea.titre, lien: idea.lien ?? '', acronyme: idea.acronyme ?? '', description: idea.description ?? '',
    contexte: idea.contexte ?? '', justification: idea.justification ?? '',
    objectif_general: idea.objectif_general ?? '', objectifs_specifiques: idea.objectifs_specifiques ?? '',
    resultats_attendus: idea.resultats_attendus ?? '', duree_prevue_mois: idea.duree_prevue_mois ?? '',
    date_debut_estimee: idea.date_debut_estimee ?? '', date_fin_estimee: idea.date_fin_estimee ?? '',
    porteur_projet: idea.porteur_projet ?? '',
    latitude: idea.latitude, longitude: idea.longitude, province_id: idea.province_id,
    region_id: idea.region_id, district_id: idea.district_id, commune_id: idea.commune_id,
    fokontany_id: idea.fokontany_id, zone_description: idea.zone_description ?? '', geo_address: idea.geo_address ?? '',
    zone: idea.zone ?? '',
    secteur_ids: idea.secteur_ids ?? (idea.secteurs ?? []).map(s => s.id),
    nombre_beneficiaires: idea.nombre_beneficiaires ?? '', beneficiaires_hommes: idea.beneficiaires_hommes ?? '',
    beneficiaires_femmes: idea.beneficiaires_femmes ?? '', beneficiaires_jeunes: idea.beneficiaires_jeunes ?? '',
    beneficiaires_vulnerables: idea.beneficiaires_vulnerables ?? '',
    budget_total_estime: idea.budget_total_estime ?? '', devise: idea.devise,
    contribution_nationale: idea.contribution_nationale ?? '', contribution_partenaires: idea.contribution_partenaires ?? '',
    cofinancement_prive: idea.cofinancement_prive ?? '', autres_financements: idea.autres_financements ?? '',
  };
}

function Field({ label, children, required = false, full = false }: {
  label: string; children: React.ReactNode; required?: boolean; full?: boolean;
}) {
  return (
    <div className={full ? 'col-span-full' : ''}>
      <label className="form-label">{label} {required && <span className="text-red-500">*</span>}</label>
      {children}
    </div>
  );
}

// ── Onglet 1 : Informations générales ─────────────────────────────────────
function TabInfosGenerales({ form, set }: { form: ProjectIdeaFormData; set: (k: keyof ProjectIdeaFormData, v: ProjectIdeaFormData[keyof ProjectIdeaFormData]) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Titre" required full>
        <input className="form-input" value={form.titre} onChange={e => set('titre', e.target.value)} />
      </Field>
      <Field label="Lien" full>
        <input
          type="url"
          className="form-input"
          placeholder="https://…"
          value={form.lien}
          onChange={e => set('lien', e.target.value)}
        />
      </Field>
      <Field label="Acronyme">
        <input className="form-input" value={form.acronyme} onChange={e => set('acronyme', e.target.value)} />
      </Field>
      <Field label="Porteur du projet">
        <input className="form-input" value={form.porteur_projet} onChange={e => set('porteur_projet', e.target.value)} />
      </Field>
      <Field label="Description" full>
        <textarea className="form-input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
      </Field>
      <Field label="Contexte" full>
        <textarea className="form-input" rows={3} value={form.contexte} onChange={e => set('contexte', e.target.value)} />
      </Field>
      <Field label="Justification" full>
        <textarea className="form-input" rows={3} value={form.justification} onChange={e => set('justification', e.target.value)} />
      </Field>
      <Field label="Objectif général" full>
        <textarea className="form-input" rows={2} value={form.objectif_general} onChange={e => set('objectif_general', e.target.value)} />
      </Field>
      <Field label="Objectifs spécifiques" full>
        <textarea className="form-input" rows={3} value={form.objectifs_specifiques} onChange={e => set('objectifs_specifiques', e.target.value)} />
      </Field>
      <Field label="Résultats attendus" full>
        <textarea className="form-input" rows={3} value={form.resultats_attendus} onChange={e => set('resultats_attendus', e.target.value)} />
      </Field>
      <Field label="Durée prévue (mois)">
        <input type="number" min={0} className="form-input" value={form.duree_prevue_mois}
          onChange={e => set('duree_prevue_mois', e.target.value === '' ? '' : Number(e.target.value))} />
      </Field>
      <Field label="Date estimée de début">
        <input type="date" className="form-input" value={form.date_debut_estimee ?? ''} onChange={e => set('date_debut_estimee', e.target.value)} />
      </Field>
      <Field label="Date estimée de fin">
        <input type="date" className="form-input" value={form.date_fin_estimee ?? ''} onChange={e => set('date_fin_estimee', e.target.value)} />
      </Field>
    </div>
  );
}

// ── Onglet 3 : Secteurs (sélection multiple) ──────────────────────────────
function TabSecteurs({ form, set }: { form: ProjectIdeaFormData; set: (k: keyof ProjectIdeaFormData, v: ProjectIdeaFormData[keyof ProjectIdeaFormData]) => void }) {
  const { data: secteurs = [] } = useQuery({
    queryKey: ['secteurs'],
    queryFn: () => secteurApi.list().then(r => r.data),
  });

  return (
    <div className="max-w-xl">
      <MultiSelectAvecAjout
        label="Secteurs concernés"
        values={form.secteur_ids}
        onChange={vals => set('secteur_ids', vals.map(Number))}
        options={secteurs.map(s => ({ id: s.id, label: s.designation }))}
        queryKey="secteurs"
        createEndpoint="/secteurs"
        idField="designation"
      />
      <p className="text-xs text-gray-400 mt-2">
        Agriculture, Forêt, Eau, Énergie, Transport, Déchets, Santé, Biodiversité, Adaptation, Atténuation, Autre…
      </p>
    </div>
  );
}

// ── Onglet 4 : Bénéficiaires ───────────────────────────────────────────────
function TabBeneficiaires({ form, set }: { form: ProjectIdeaFormData; set: (k: keyof ProjectIdeaFormData, v: ProjectIdeaFormData[keyof ProjectIdeaFormData]) => void }) {
  const num = (k: keyof ProjectIdeaFormData) => (
    <input type="number" min={0} className="form-input" value={form[k] as number | ''}
      onChange={e => set(k, e.target.value === '' ? '' : Number(e.target.value))} />
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
      <Field label="Nombre total de bénéficiaires">{num('nombre_beneficiaires')}</Field>
      <div />
      <Field label="Hommes">{num('beneficiaires_hommes')}</Field>
      <Field label="Femmes">{num('beneficiaires_femmes')}</Field>
      <Field label="Jeunes">{num('beneficiaires_jeunes')}</Field>
      <Field label="Communautés vulnérables">{num('beneficiaires_vulnerables')}</Field>
    </div>
  );
}

// ── Onglet 5 : Budget prévisionnel ────────────────────────────────────────
function TabBudget({ form, set }: { form: ProjectIdeaFormData; set: (k: keyof ProjectIdeaFormData, v: ProjectIdeaFormData[keyof ProjectIdeaFormData]) => void }) {
  const n = (v: number | '') => (v === '' ? 0 : v);
  const totalContrib = n(form.contribution_nationale) + n(form.contribution_partenaires) + n(form.cofinancement_prive) + n(form.autres_financements);
  const pct = n(form.budget_total_estime) > 0 ? Math.round((totalContrib / n(form.budget_total_estime)) * 1000) / 10 : null;

  const num = (k: keyof ProjectIdeaFormData) => (
    <input type="number" min={0} className="form-input" value={form[k] as number | ''}
      onChange={e => set(k, e.target.value === '' ? '' : Number(e.target.value))} />
  );

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Budget total estimé" required>{num('budget_total_estime')}</Field>
        <Field label="Devise" required>
          <select className="form-input" value={form.devise} onChange={e => set('devise', e.target.value)}>
            {DEVISES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Contribution nationale">{num('contribution_nationale')}</Field>
        <Field label="Contribution des partenaires">{num('contribution_partenaires')}</Field>
        <Field label="Cofinancement privé">{num('cofinancement_prive')}</Field>
        <Field label="Autres financements">{num('autres_financements')}</Field>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="card p-4 bg-gray-50">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Total des contributions</p>
          <p className="text-xl font-bold text-gray-800">{totalContrib.toLocaleString('fr-MG')} {form.devise}</p>
        </div>
        <div className="card p-4 bg-gray-50">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Pourcentage de cofinancement</p>
          <p className="text-xl font-bold text-gray-800">{pct === null ? '—' : `${pct}%`}</p>
        </div>
      </div>
    </div>
  );
}

// ── Onglet 6 : Financement envisagé (CRUD nécessite une idée déjà créée) ──
function TabFinancement({ ideaId }: { ideaId: number | null }) {
  const qc = useQueryClient();
  const [organismeId, setOrganismeId] = useState<number | string>('');
  const [montant, setMontant] = useState<number | ''>('');
  const [devise, setDevise] = useState<Devise>('AR');
  const [typeFinancement, setTypeFinancement] = useState('don');
  const [statut, setStatut] = useState('en_preparation');

  const { data: organismes = [] } = useQuery({
    queryKey: ['organismes-contributeurs'],
    queryFn: () => organismeContributeurApi.list().then(r => r.data),
    enabled: !!ideaId,
  });
  const { data: financements = [] } = useQuery({
    queryKey: ['project-idea-financements', ideaId],
    queryFn: () => projectIdeaApi.financements.list(ideaId!).then(r => r.data),
    enabled: !!ideaId,
  });

  const createMutation = useMutation({
    mutationFn: () => projectIdeaApi.financements.create(ideaId!, {
      organisme_contributeur_id: organismeId || null,
      montant_demande: montant === '' ? null : montant,
      devise, type_financement: typeFinancement, statut,
    }),
    onSuccess: () => {
      toast.success('Bailleur ajouté');
      qc.invalidateQueries({ queryKey: ['project-idea-financements', ideaId] });
      setOrganismeId(''); setMontant('');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectIdeaApi.financements.delete(id),
    onSuccess: () => { toast.success('Supprimé'); qc.invalidateQueries({ queryKey: ['project-idea-financements', ideaId] }); },
  });

  if (!ideaId) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
        <Info className="w-5 h-5 mx-auto mb-2 opacity-50" />
        Enregistrez d'abord les informations générales pour pouvoir ajouter des bailleurs envisagés.
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="card p-4">
        <p className="text-sm font-bold text-gray-700 mb-3">Ajouter un bailleur envisagé</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div className="col-span-2">
            <SelectAvecAjout
              label="Bailleur (GCF, Banque mondiale, BAD…)"
              value={organismeId}
              onChange={setOrganismeId}
              options={organismes.map((o) => ({ id: o.id, label: o.designation }))}
              queryKey="organismes-contributeurs"
              createEndpoint="/organismes-contributeurs"
              idField="designation"
            />
          </div>
          <div>
            <label className="form-label">Montant demandé</label>
            <input type="number" min={0} className="form-input" value={montant} onChange={e => setMontant(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div>
            <label className="form-label">Devise</label>
            <select className="form-input" value={devise} onChange={e => setDevise(e.target.value as Devise)}>
              {DEVISES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Type</label>
            <select className="form-input" value={typeFinancement} onChange={e => setTypeFinancement(e.target.value)}>
              <option value="don">Don</option>
              <option value="pret">Prêt</option>
              <option value="cofinancement">Cofinancement</option>
              <option value="assistance_technique">Assistance technique</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <select className="form-input max-w-[220px]" value={statut} onChange={e => setStatut(e.target.value)}>
            <option value="en_preparation">En préparation</option>
            <option value="soumis">Soumis</option>
            <option value="en_negociation">En négociation</option>
          </select>
          <button
            className="btn btn-primary btn-sm"
            disabled={createMutation.isPending || !organismeId}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />} Ajouter
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {financements.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Aucun bailleur envisagé pour l'instant.</p>}
        {financements.map(f => (
          <div key={f.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
            <div>
              <p className="font-semibold text-gray-700">{f.bailleur}</p>
              <p className="text-xs text-gray-400">
                {f.montant_demande ? `${f.montant_demande.toLocaleString('fr-MG')} ${f.devise}` : 'Montant non précisé'} · {f.type_financement} · {f.statut}
              </p>
            </div>
            <button onClick={() => deleteMutation.mutate(f.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
              <Loader2 className={`w-3.5 h-3.5 ${deleteMutation.isPending ? 'animate-spin' : 'hidden'}`} />
              {!deleteMutation.isPending && '✕'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Onglet 7 : Documents (nécessite une idée déjà créée) ──────────────────
const DOC_TYPES: { value: string; label: string }[] = [
  { value: 'concept_note', label: 'Concept Note' },
  { value: 'etude_faisabilite', label: 'Étude de faisabilité' },
  { value: 'budget', label: 'Budget' },
  { value: 'carte', label: 'Carte' },
  { value: 'images', label: 'Images' },
  { value: 'autre', label: 'Autre (PDF, Word, Excel…)' },
];

function TabDocuments({ ideaId }: { ideaId: number | null }) {
  const qc = useQueryClient();
  const [type, setType] = useState('concept_note');
  const [file, setFile] = useState<File | null>(null);

  const { data: documents = [] } = useQuery({
    queryKey: ['project-idea-documents', ideaId],
    queryFn: () => projectIdeaApi.documents.list(ideaId!).then(r => r.data),
    enabled: !!ideaId,
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('type', type);
      fd.append('file', file!);
      return projectIdeaApi.documents.create(ideaId!, fd);
    },
    onSuccess: () => {
      toast.success('Document ajouté');
      qc.invalidateQueries({ queryKey: ['project-idea-documents', ideaId] });
      setFile(null);
    },
    onError: (err) => toast.error(getErrorMessage(err, "Erreur lors de l'envoi")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectIdeaApi.documents.delete(id),
    onSuccess: () => { toast.success('Document supprimé'); qc.invalidateQueries({ queryKey: ['project-idea-documents', ideaId] }); },
  });

  if (!ideaId) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
        <Info className="w-5 h-5 mx-auto mb-2 opacity-50" />
        Enregistrez d'abord les informations générales pour pouvoir téléverser des documents.
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="card p-4">
        <p className="text-sm font-bold text-gray-700 mb-3">Téléverser un document</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Type de document</label>
            <select className="form-input" value={type} onChange={e => setType(e.target.value)}>
              {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Fichier</label>
            <input type="file" className="form-input" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <button
          className="btn btn-primary btn-sm mt-3"
          disabled={!file || uploadMutation.isPending}
          onClick={() => uploadMutation.mutate()}
        >
          {uploadMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />} Téléverser
        </button>
      </div>

      <div className="space-y-2">
        {documents.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Aucun document pour l'instant.</p>}
        {documents.map(d => (
          <div key={d.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
            <div className="min-w-0">
              <p className="font-semibold text-gray-700 truncate">{d.file_name}</p>
              <p className="text-xs text-gray-400">{DOC_TYPES.find(t => t.value === d.type)?.label ?? d.type}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => projectIdeaApi.documents.download(d.id, d.file_name)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-xs">
                Télécharger
              </button>
              <button onClick={() => deleteMutation.mutate(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────
export default function ProjectIdeaWizardPage() {
  const { id } = useParams();
  const ideaId = id ? Number(id) : null;
  const isEdit = ideaId !== null;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>('infos');
  const [form, setForm] = useState<ProjectIdeaFormData>(emptyForm);
  const [savedIdeaId, setSavedIdeaId] = useState<number | null>(ideaId);

  const { data: idea, isLoading } = useQuery({
    queryKey: ['project-idea', ideaId],
    queryFn: () => projectIdeaApi.show(ideaId!).then(r => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (idea) {
      setForm(ideaToFormData(idea));
      setSavedIdeaId(idea.id);
    }
  }, [idea]);

  const set = (key: keyof ProjectIdeaFormData, value: ProjectIdeaFormData[keyof ProjectIdeaFormData]) => setForm(f => ({ ...f, [key]: value }));
  const setGeo = (key: keyof GeoZoneFormFields, value: GeoZoneFormFields[keyof GeoZoneFormFields]) => setForm(f => ({ ...f, [key]: value }));

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...form };
      return savedIdeaId ? projectIdeaApi.update(savedIdeaId, payload) : projectIdeaApi.create(payload);
    },
    onSuccess: (res) => {
      toast.success(savedIdeaId ? 'Idée de projet mise à jour' : 'Idée de projet créée');
      const newId = (res.data as ProjectIdea).id;
      if (!savedIdeaId) {
        setSavedIdeaId(newId);
        navigate(`/admin/project-ideas/${newId}/edit`, { replace: true });
      }
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Erreur lors de l'enregistrement"));
    },
  });

  if (isEdit && isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/admin/project-ideas" className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{savedIdeaId ? 'Modifier l\u2019idée de projet' : 'Nouvelle idée de projet'}</h1>
            <p className="text-sm text-gray-400">Remplissez les onglets ci-dessous, puis enregistrez.</p>
          </div>
        </div>
        <button className="btn btn-primary" disabled={saveMutation.isPending || !form.titre} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
        </button>
      </div>

      <div className="flex gap-5">
        {/* Navigation des onglets */}
        <div className="w-56 shrink-0 space-y-1">
          {TABS.map(t => {
            const Icon = t.icon;
            const locked = (t.key === 'financement' || t.key === 'documents') && !savedIdeaId;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors ${
                  activeTab === t.key ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                } ${locked ? 'opacity-50' : ''}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Contenu de l'onglet actif */}
        <div className="flex-1 card p-6">
          {activeTab === 'infos' && <TabInfosGenerales form={form} set={set} />}
          {activeTab === 'localisation' && <GeoZoneSelector form={form} onChange={setGeo} />}
          {activeTab === 'secteurs' && <TabSecteurs form={form} set={set} />}
          {activeTab === 'beneficiaires' && <TabBeneficiaires form={form} set={set} />}
          {activeTab === 'budget' && <TabBudget form={form} set={set} />}
          {activeTab === 'financement' && <TabFinancement ideaId={savedIdeaId} />}
          {activeTab === 'documents' && <TabDocuments ideaId={savedIdeaId} />}
        </div>
      </div>
    </div>
  );
}
