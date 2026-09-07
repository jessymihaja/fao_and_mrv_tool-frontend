// src/pages/admin/stakeholders/StakeholderFormPage.tsx
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Save, Loader2, User, Phone, Wallet, CalendarClock, Paperclip, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  stakeholderApi, stakeholderCategoryApi, stakeholderRoleApi, stakeholderContributionTypeApi,
} from '@/api/services';
import SelectAvecAjout from '@/components/admin/SelectAvecAjout';
import type { Devise, Stakeholder, StakeholderFormData, StatutStakeholder } from '@/types';
import { getErrorMessage } from '@/utils/apiError';

const DEVISES: Devise[] = ['AR', 'USD', 'EUR'];
const STATUTS: { value: StatutStakeholder; label: string }[] = [
  { value: 'actif', label: 'Actif' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'suspendu', label: 'Suspendu' },
  { value: 'termine', label: 'Terminé' },
];

const emptyForm: StakeholderFormData = {
  nom: '', organisation: '', acronyme: '',
  categorie_id: '', role_id: '',
  nom_representant: '', fonction: '', email: '', telephone: '', adresse: '',
  type_contribution_id: '', description_contribution: '', montant_estimatif: '', devise: 'AR',
  date_debut: '', date_fin: '', statut: 'actif',
};

function stakeholderToFormData(s: Stakeholder): StakeholderFormData {
  return {
    nom: s.nom, organisation: s.organisation ?? '', acronyme: s.acronyme ?? '',
    categorie_id: s.categorie_id, role_id: s.role_id ?? '',
    nom_representant: s.nom_representant ?? '', fonction: s.fonction ?? '',
    email: s.email ?? '', telephone: s.telephone ?? '', adresse: s.adresse ?? '',
    type_contribution_id: s.type_contribution_id ?? '', description_contribution: s.description_contribution ?? '',
    montant_estimatif: s.montant_estimatif ?? '', devise: s.devise ?? 'AR',
    date_debut: s.date_debut ?? '', date_fin: s.date_fin ?? '', statut: s.statut,
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

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <p className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-400" /> {title}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

// ── Documents (nécessite que la partie prenante existe déjà) ─────────────
function DocumentsSection({ stakeholderId }: { stakeholderId: number | null }) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [libelle, setLibelle] = useState('');

  const { data: documents = [] } = useQuery({
    queryKey: ['stakeholder-documents', stakeholderId],
    queryFn: () => stakeholderApi.documents.list(stakeholderId!).then(r => r.data),
    enabled: !!stakeholderId,
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      if (libelle) fd.append('libelle', libelle);
      fd.append('file', file!);
      return stakeholderApi.documents.create(stakeholderId!, fd);
    },
    onSuccess: () => {
      toast.success('Document ajouté');
      qc.invalidateQueries({ queryKey: ['stakeholder-documents', stakeholderId] });
      setFile(null); setLibelle('');
    },
    onError: (err) => toast.error(getErrorMessage(err, "Erreur lors de l'envoi")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => stakeholderApi.documents.delete(id),
    onSuccess: () => { toast.success('Document supprimé'); qc.invalidateQueries({ queryKey: ['stakeholder-documents', stakeholderId] }); },
  });

  return (
    <div className="card p-5">
      <p className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
        <Paperclip className="w-4 h-4 text-gray-400" /> Documents
      </p>

      {!stakeholderId ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
          <Info className="w-5 h-5 mx-auto mb-2 opacity-50" />
          Enregistrez d'abord les informations générales pour pouvoir téléverser des documents.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-1">
              <label className="form-label">Libellé (optionnel)</label>
              <input className="form-input" value={libelle} onChange={e => setLibelle(e.target.value)} placeholder="Convention, rapport..." />
            </div>
            <div className="md:col-span-1">
              <label className="form-label">Fichier (PDF, Word, Excel, Image)</label>
              <input type="file" className="form-input" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <button
              className="btn btn-primary btn-sm"
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
                  <button onClick={() => stakeholderApi.documents.download(d.id, d.file_name)} className="font-semibold text-gray-700 hover:text-green-700 truncate text-left">
                    {d.libelle || d.file_name}
                  </button>
                  <p className="text-xs text-gray-400">{d.file_name}</p>
                </div>
                <button onClick={() => deleteMutation.mutate(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 shrink-0">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────
export default function StakeholderFormPage() {
  const { id } = useParams();
  const stakeholderId = id ? Number(id) : null;
  const isEdit = stakeholderId !== null;
  const navigate = useNavigate();

  const [form, setForm] = useState<StakeholderFormData>(emptyForm);
  const [savedId, setSavedId] = useState<number | null>(stakeholderId);

  const { data: stakeholder, isLoading } = useQuery({
    queryKey: ['stakeholder', stakeholderId],
    queryFn: () => stakeholderApi.show(stakeholderId!).then(r => r.data),
    enabled: isEdit,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['stakeholder-categories'],
    queryFn: () => stakeholderCategoryApi.list().then(r => r.data),
  });
  const { data: roles = [] } = useQuery({
    queryKey: ['stakeholder-roles'],
    queryFn: () => stakeholderRoleApi.list().then(r => r.data),
  });
  const { data: contributionTypes = [] } = useQuery({
    queryKey: ['stakeholder-contribution-types'],
    queryFn: () => stakeholderContributionTypeApi.list().then(r => r.data),
  });

  useEffect(() => {
    if (stakeholder) {
      setForm(stakeholderToFormData(stakeholder));
      setSavedId(stakeholder.id);
    }
  }, [stakeholder]);

  const set = (key: keyof StakeholderFormData, value: StakeholderFormData[keyof StakeholderFormData]) => setForm(f => ({ ...f, [key]: value }));

  const saveMutation = useMutation({
    mutationFn: () => (savedId ? stakeholderApi.update(savedId, form) : stakeholderApi.create(form)),
    onSuccess: (res) => {
      toast.success(savedId ? 'Partie prenante mise à jour' : 'Partie prenante ajoutée');
      const newId = (res.data as Stakeholder).id;
      if (!savedId) {
        setSavedId(newId);
        navigate(`/admin/stakeholders/${newId}/edit`, { replace: true });
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
          <Link to="/admin/stakeholders" className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{savedId ? 'Modifier la partie prenante' : 'Ajouter une partie prenante'}</h1>
            <p className="text-sm text-gray-400">Renseignez les informations ci-dessous, puis enregistrez.</p>
          </div>
        </div>
        <button className="btn btn-primary" disabled={saveMutation.isPending || !form.nom || !form.categorie_id} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
        </button>
      </div>

      <SectionCard icon={User} title="Informations générales">
        <Field label="Nom de la partie prenante" required>
          <input className="form-input" value={form.nom} onChange={e => set('nom', e.target.value)} />
        </Field>
        <Field label="Organisation">
          <input className="form-input" value={form.organisation} onChange={e => set('organisation', e.target.value)} />
        </Field>
        <Field label="Acronyme">
          <input className="form-input" value={form.acronyme} onChange={e => set('acronyme', e.target.value)} />
        </Field>
        <Field label="Catégorie" required>
          <SelectAvecAjout
            label=""
            value={form.categorie_id}
            onChange={v => set('categorie_id', v)}
            options={categories.map(c => ({ id: c.id, label: c.designation }))}
            queryKey="stakeholder-categories"
            createEndpoint="/stakeholder-categories"
            idField="designation"
          />
        </Field>
        <Field label="Rôle">
          <SelectAvecAjout
            label=""
            value={form.role_id}
            onChange={v => set('role_id', v)}
            options={roles.map(r => ({ id: r.id, label: r.designation }))}
            queryKey="stakeholder-roles"
            createEndpoint="/stakeholder-roles"
            idField="designation"
          />
        </Field>
      </SectionCard>

      <SectionCard icon={Phone} title="Coordonnées">
        <Field label="Nom du représentant">
          <input className="form-input" value={form.nom_representant} onChange={e => set('nom_representant', e.target.value)} />
        </Field>
        <Field label="Fonction">
          <input className="form-input" value={form.fonction} onChange={e => set('fonction', e.target.value)} />
        </Field>
        <Field label="Email">
          <input type="email" className="form-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="nom@exemple.mg" />
        </Field>
        <Field label="Téléphone">
          <input type="tel" className="form-input" value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="+261 34 12 345 67" />
        </Field>
        <Field label="Adresse" full>
          <textarea className="form-input" rows={2} value={form.adresse} onChange={e => set('adresse', e.target.value)} />
        </Field>
      </SectionCard>

      <SectionCard icon={Wallet} title="Contribution">
        <Field label="Type de contribution">
          <SelectAvecAjout
            label=""
            value={form.type_contribution_id}
            onChange={v => set('type_contribution_id', v)}
            options={contributionTypes.map(t => ({ id: t.id, label: t.designation }))}
            queryKey="stakeholder-contribution-types"
            createEndpoint="/stakeholder-contribution-types"
            idField="designation"
          />
        </Field>
        <div />
        <Field label="Description de la contribution" full>
          <textarea className="form-input" rows={2} value={form.description_contribution} onChange={e => set('description_contribution', e.target.value)} />
        </Field>
        <Field label="Montant estimatif (si contribution financière)">
          <input type="number" min={0} step="0.01" className="form-input" value={form.montant_estimatif}
            onChange={e => set('montant_estimatif', e.target.value === '' ? '' : Number(e.target.value))} />
        </Field>
        <Field label="Devise">
          <select className="form-input" value={form.devise} onChange={e => set('devise', e.target.value)}>
            {DEVISES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
      </SectionCard>

      <SectionCard icon={CalendarClock} title="Participation">
        <Field label="Date de début">
          <input type="date" className="form-input" value={form.date_debut} onChange={e => set('date_debut', e.target.value)} />
        </Field>
        <Field label="Date de fin">
          <input type="date" className="form-input" value={form.date_fin} onChange={e => set('date_fin', e.target.value)} />
        </Field>
        <Field label="Statut" full>
          <div className="flex flex-wrap gap-2">
            {STATUTS.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => set('statut', s.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.statut === s.value ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Field>
      </SectionCard>

      <DocumentsSection stakeholderId={savedId} />
    </div>
  );
}
