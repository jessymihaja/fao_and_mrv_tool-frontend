// src/pages/admin/project-ideas/ProjectIdeaDetailPage.tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Pencil, CheckCircle2, Circle, ArrowRightCircle, Loader2, MapPin,
  Users, Wallet, Landmark, Paperclip, Clock, ExternalLink, FolderKanban,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { projectIdeaApi } from '@/api/services';
import { useAuthStore } from '@/store/authStore';
import { STATUT_IDEE_LABELS, WORKFLOW_IDEE, type StatutIdee } from '@/types';
import { getErrorMessage } from '@/utils/apiError';

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : Math.round(n).toLocaleString('fr-MG'));
const fmtDate = (d?: string | null) => (d ? format(new Date(d), 'dd/MM/yyyy') : '—');
const fmtDateTime = (d?: string | null) => (d ? format(new Date(d), 'dd/MM/yyyy HH:mm') : '—');

// ── Chronologie du workflow ────────────────────────────────────────────
function WorkflowStepper({ statut }: { statut: StatutIdee }) {
  const currentIndex = WORKFLOW_IDEE.indexOf(statut);

  return (
    <div className="flex items-center">
      {WORKFLOW_IDEE.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                done ? 'bg-green-600 text-white' : active ? 'bg-green-100 text-green-700 ring-2 ring-green-500' : 'bg-gray-100 text-gray-400'
              }`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-3 h-3 fill-current" />}
              </div>
              <span className={`text-[11px] font-medium text-center whitespace-nowrap ${active ? 'text-green-700' : 'text-gray-400'}`}>
                {STATUT_IDEE_LABELS[step]}
              </span>
            </div>
            {i < WORKFLOW_IDEE.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 mb-4 ${i < currentIndex ? 'bg-green-600' : 'bg-gray-100'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5 text-sm border-b border-gray-50 last:border-0">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-700 font-medium text-right">{value ?? '—'}</span>
    </div>
  );
}

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-400" /> {title}
      </p>
      {children}
    </div>
  );
}

function ConvertModal({ open, onClose, onConfirm, isPending }: {
  open: boolean; onClose: () => void; onConfirm: () => void; isPending: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-5">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center mb-3">
          <ArrowRightCircle className="w-5 h-5 text-indigo-600" />
        </div>
        <h3 className="font-bold text-gray-800 mb-2">Convertir en projet ?</h3>
        <p className="text-sm text-gray-500 mb-4">
          Un nouveau projet sera créé automatiquement, reprenant les informations générales, la localisation,
          les secteurs, les objectifs et les documents de cette idée. L'idée passera au statut « Converti en Projet »
          et restera consultable, liée au nouveau projet.
        </p>
        <div className="flex justify-end gap-2">
          <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={isPending}>Annuler</button>
          <button className="btn btn-primary btn-sm" onClick={onConfirm} disabled={isPending}>
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightCircle className="w-3.5 h-3.5" />} Convertir en projet
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusChangeModal({ open, onClose, onConfirm, isPending, nextLabel }: {
  open: boolean; onClose: () => void; onConfirm: (commentaire: string) => void; isPending: boolean; nextLabel: string;
}) {
  const [commentaire, setCommentaire] = useState('');
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-5">
        <h3 className="font-bold text-gray-800 mb-3">Passer au statut « {nextLabel} »</h3>
        <label className="form-label">Commentaire (optionnel)</label>
        <textarea className="form-input" rows={3} value={commentaire} onChange={e => setCommentaire(e.target.value)} />
        <div className="flex justify-end gap-2 mt-4">
          <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={isPending}>Annuler</button>
          <button className="btn btn-primary btn-sm" onClick={() => onConfirm(commentaire)} disabled={isPending}>
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────
export default function ProjectIdeaDetailPage() {
  const { id } = useParams();
  const ideaId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canWrite = ['admin', 'super_admin', 'gestionnaire'].includes(user?.role ?? '');

  const [showConvert, setShowConvert] = useState(false);
  const [statusModal, setStatusModal] = useState<StatutIdee | null>(null);

  const { data: idea, isLoading } = useQuery({
    queryKey: ['project-idea', ideaId],
    queryFn: () => projectIdeaApi.show(ideaId).then(r => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ statut, commentaire }: { statut: string; commentaire: string }) =>
      projectIdeaApi.changeStatus(ideaId, statut, commentaire || undefined),
    onSuccess: () => {
      toast.success('Statut mis à jour');
      qc.invalidateQueries({ queryKey: ['project-idea', ideaId] });
      setStatusModal(null);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors du changement de statut')),
  });

  const convertMutation = useMutation({
    mutationFn: () => projectIdeaApi.convert(ideaId),
    onSuccess: (res) => {
      toast.success('Idée convertie en projet avec succès');
      setShowConvert(false);
      navigate(`/admin/projects/${res.data.project.id}/details`);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de la conversion')),
  });

  if (isLoading || !idea) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  const nextStatutIndex = WORKFLOW_IDEE.indexOf(idea.statut) + 1;
  const nextStatut = nextStatutIndex < WORKFLOW_IDEE.length - 1 ? WORKFLOW_IDEE[nextStatutIndex] : null; // jamais 'converti' ici

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/admin/project-ideas" className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{idea.titre}</h1>
            <p className="text-sm text-gray-400">{idea.acronyme && `${idea.acronyme} · `}Créée le {fmtDate(idea.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canWrite && idea.statut !== 'converti' && (
            <Link to={`/admin/project-ideas/${idea.id}/edit`} className="btn btn-secondary btn-sm">
              <Pencil className="w-3.5 h-3.5" /> Modifier
            </Link>
          )}
          {canWrite && nextStatut && (
            <button className="btn btn-secondary btn-sm" onClick={() => setStatusModal(nextStatut)}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Passer à « {STATUT_IDEE_LABELS[nextStatut]} »
            </button>
          )}
          {canWrite && idea.statut === 'approuve' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowConvert(true)}>
              <ArrowRightCircle className="w-3.5 h-3.5" /> Convertir en projet
            </button>
          )}
          {idea.statut === 'converti' && idea.converted_project_id && (
            <Link to={`/admin/projects/${idea.converted_project_id}/details`} className="btn btn-primary btn-sm">
              <FolderKanban className="w-3.5 h-3.5" /> Voir le projet <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {/* Chronologie du workflow */}
      <div className="card p-5">
        <WorkflowStepper statut={idea.statut} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <SectionCard icon={Users} title="Informations générales">
            <p className="text-sm text-gray-600 whitespace-pre-line mb-3">{idea.description || 'Aucune description.'}</p>
            <InfoRow label="Lien" value={idea.lien ? (
              <a href={idea.lien} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline inline-flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Ouvrir
              </a>
            ) : null} />
            <InfoRow label="Porteur du projet" value={idea.porteur_projet} />
            <InfoRow label="Objectif général" value={idea.objectif_general} />
            <InfoRow label="Durée prévue" value={idea.duree_prevue_mois ? `${idea.duree_prevue_mois} mois` : null} />
            <InfoRow label="Période estimée" value={idea.date_debut_estimee ? `${fmtDate(idea.date_debut_estimee)} → ${fmtDate(idea.date_fin_estimee)}` : null} />
            <InfoRow label="Secteurs" value={(idea.secteurs ?? []).map(s => s.designation).join(', ') || null} />
          </SectionCard>

          <SectionCard icon={MapPin} title="Localisation">
            <InfoRow label="Zone" value={idea.zone} />
            <InfoRow label="Région" value={idea.region?.nom} />
            <InfoRow label="District" value={idea.district?.nom} />
            <InfoRow label="Commune" value={idea.commune?.nom} />
            <InfoRow label="Fokontany" value={idea.fokontany?.nom} />
            <InfoRow label="Description de la zone" value={idea.zone_description} />
          </SectionCard>

          <SectionCard icon={Users} title="Bénéficiaires">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div><p className="text-lg font-bold text-gray-800">{fmt(idea.nombre_beneficiaires)}</p><p className="text-[11px] text-gray-400">Total</p></div>
              <div><p className="text-lg font-bold text-gray-800">{fmt(idea.beneficiaires_hommes)}</p><p className="text-[11px] text-gray-400">Hommes</p></div>
              <div><p className="text-lg font-bold text-gray-800">{fmt(idea.beneficiaires_femmes)}</p><p className="text-[11px] text-gray-400">Femmes</p></div>
              <div><p className="text-lg font-bold text-gray-800">{fmt(idea.beneficiaires_jeunes)}</p><p className="text-[11px] text-gray-400">Jeunes</p></div>
            </div>
          </SectionCard>

          <SectionCard icon={Landmark} title="Financement envisagé">
            {(idea.financements ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">Aucun bailleur envisagé.</p>
            ) : (
              <div className="space-y-2">
                {idea.financements!.map(f => (
                  <div key={f.id} className="flex justify-between items-center text-sm border-b border-gray-50 last:border-0 py-1.5">
                    <span className="font-medium text-gray-700">{f.bailleur}</span>
                    <span className="text-gray-500">{f.montant_demande ? `${fmt(f.montant_demande)} ${f.devise}` : '—'} · {f.type_financement}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard icon={Paperclip} title="Documents">
            {(idea.documents ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">Aucun document.</p>
            ) : (
              <div className="space-y-2">
                {idea.documents!.map(d => (
                  <button key={d.id} onClick={() => projectIdeaApi.documents.download(d.id, d.file_name)}
                    className="w-full flex justify-between items-center text-sm border-b border-gray-50 last:border-0 py-1.5 hover:text-green-700">
                    <span className="font-medium text-gray-700">{d.file_name}</span>
                    <span className="text-gray-400 text-xs">{d.type}</span>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard icon={Wallet} title="Budget prévisionnel">
            <InfoRow label="Budget total estimé" value={`${fmt(idea.budget_total_estime)} ${idea.devise}`} />
            <InfoRow label="Contribution nationale" value={fmt(idea.contribution_nationale)} />
            <InfoRow label="Contribution partenaires" value={fmt(idea.contribution_partenaires)} />
            <InfoRow label="Cofinancement privé" value={fmt(idea.cofinancement_prive)} />
            <InfoRow label="Autres financements" value={fmt(idea.autres_financements)} />
            <InfoRow label="Total des contributions" value={`${fmt(idea.total_contributions)} ${idea.devise}`} />
            <InfoRow label="% de cofinancement" value={idea.pourcentage_cofinancement !== null && idea.pourcentage_cofinancement !== undefined ? `${idea.pourcentage_cofinancement}%` : null} />
          </SectionCard>

          <SectionCard icon={Clock} title="Historique du statut">
            <div className="space-y-3">
              {(idea.status_history ?? []).map(h => (
                <div key={h.id} className="text-xs border-l-2 border-green-200 pl-3">
                  <p className="font-semibold text-gray-700">
                    {h.ancien_statut ? `${STATUT_IDEE_LABELS[h.ancien_statut]} → ` : ''}{STATUT_IDEE_LABELS[h.nouveau_statut]}
                  </p>
                  <p className="text-gray-400">{fmtDateTime(h.created_at)}{h.auteur && ` · ${h.auteur}`}</p>
                  {h.commentaire && <p className="text-gray-500 mt-0.5">{h.commentaire}</p>}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      <ConvertModal open={showConvert} onClose={() => setShowConvert(false)} onConfirm={() => convertMutation.mutate()} isPending={convertMutation.isPending} />
      {statusModal && (
        <StatusChangeModal
          open
          onClose={() => setStatusModal(null)}
          onConfirm={commentaire => statusMutation.mutate({ statut: statusModal, commentaire })}
          isPending={statusMutation.isPending}
          nextLabel={STATUT_IDEE_LABELS[statusModal]}
        />
      )}
    </div>
  );
}
