// src/pages/admin/stakeholders/StakeholderDetailPage.tsx
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Pencil, User, Phone, Wallet, CalendarClock, Paperclip, HeartHandshake,
} from 'lucide-react';
import { format } from 'date-fns';
import { stakeholderApi } from '@/api/services';
import { useAuthStore } from '@/store/authStore';
import { STATUT_STAKEHOLDER_LABELS, type StatutStakeholder } from '@/types';

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : Math.round(n).toLocaleString('fr-MG'));
const fmtDate = (d?: string | null) => (d ? format(new Date(d), 'dd/MM/yyyy') : '—');

const STATUT_STYLES: Record<StatutStakeholder, string> = {
  actif: 'bg-green-50 text-green-700 border-green-200',
  en_attente: 'bg-amber-50 text-amber-700 border-amber-200',
  suspendu: 'bg-red-50 text-red-700 border-red-200',
  termine: 'bg-gray-100 text-gray-600 border-gray-200',
};

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

export default function StakeholderDetailPage() {
  const { id } = useParams();
  const stakeholderId = Number(id);
  const { user } = useAuthStore();
  const canWrite = ['admin', 'super_admin', 'gestionnaire'].includes(user?.role ?? '');

  const { data: s, isLoading } = useQuery({
    queryKey: ['stakeholder', stakeholderId],
    queryFn: () => stakeholderApi.show(stakeholderId).then(r => r.data),
  });

  if (isLoading || !s) {
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
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
            <HeartHandshake className="w-4.5 h-4.5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{s.nom}</h1>
            <p className="text-sm text-gray-400">{s.acronyme && `${s.acronyme} · `}{s.organisation || 'Organisation non précisée'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-3 py-1.5 rounded-full border font-medium ${STATUT_STYLES[s.statut]}`}>
            {STATUT_STAKEHOLDER_LABELS[s.statut]}
          </span>
          {canWrite && (
            <Link to={`/admin/stakeholders/${s.id}/edit`} className="btn btn-secondary btn-sm">
              <Pencil className="w-3.5 h-3.5" /> Modifier
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard icon={User} title="Informations générales">
          <InfoRow label="Catégorie" value={s.categorie?.designation} />
          <InfoRow label="Rôle" value={s.role?.designation} />
        </SectionCard>

        <SectionCard icon={Phone} title="Coordonnées">
          <InfoRow label="Représentant" value={s.nom_representant} />
          <InfoRow label="Fonction" value={s.fonction} />
          <InfoRow label="Email" value={s.email} />
          <InfoRow label="Téléphone" value={s.telephone} />
          <InfoRow label="Adresse" value={s.adresse} />
        </SectionCard>

        <SectionCard icon={Wallet} title="Contribution">
          <InfoRow label="Type de contribution" value={s.type_contribution?.designation} />
          <InfoRow label="Description" value={s.description_contribution} />
          <InfoRow label="Montant estimatif" value={s.montant_estimatif !== null ? `${fmt(s.montant_estimatif)} ${s.devise}` : null} />
        </SectionCard>

        <SectionCard icon={CalendarClock} title="Participation">
          <InfoRow label="Date de début" value={fmtDate(s.date_debut)} />
          <InfoRow label="Date de fin" value={fmtDate(s.date_fin)} />
          <InfoRow label="Statut" value={STATUT_STAKEHOLDER_LABELS[s.statut]} />
        </SectionCard>

        <div className="lg:col-span-2">
          <SectionCard icon={Paperclip} title="Documents">
            {(s.documents ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">Aucun document.</p>
            ) : (
              <div className="space-y-2">
                {s.documents!.map(d => (
                  <button key={d.id} onClick={() => stakeholderApi.documents.download(d.id, d.file_name)}
                    className="w-full flex justify-between items-center text-sm border-b border-gray-50 last:border-0 py-1.5 hover:text-green-700">
                    <span className="font-medium text-gray-700">{d.libelle || d.file_name}</span>
                    <span className="text-gray-400 text-xs">{d.file_name}</span>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
