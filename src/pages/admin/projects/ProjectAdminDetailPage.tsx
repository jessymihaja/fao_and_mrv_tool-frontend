// src/pages/admin/projects/ProjectAdminDetailPage.tsx
import { useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi, suiviApi } from '@/api/services';
import {
  ArrowLeft, Edit, MapPin, Calendar, Globe,
  Layers, ChevronDown, ChevronUp, Plus, Trash2,
  X, Save, Loader2, TrendingUp,
  TrendingDown, CheckCircle2, Filter, DollarSign,
  AlertTriangle, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import type { Project, Financement } from '@/types';
import { useAuthStore } from '@/store/authStore';
import ActivitesPanel from './wizard/ActivitesPanel';
import StepComposantes from './wizard/StepComposantes';
import IndicateursPanel from './wizard/IndicateursPanel';
import ResultsPanel from './wizard/ResultsPanel';
import BeneficiairesPanel from './wizard/BeneficiairesPanel';
import DocumentsPanel from './wizard/DocumentsPanel';
import BudgetsCycleTab from './tabs/BudgetsCycleTab';
import ProjectPerspectivesTab from './tabs/ProjectPerspectivesTab';
import { getErrorMessage } from '@/utils/apiError';
import { blendSectorColors, sectorMapColor } from '@/utils/sectorColors';

// ── Types locaux ───────────────────────────────────────────────────────────────
interface Engagement       { id: number; financement_id: number; date: string; montant: number; description?: string }
interface Decaissement     { id: number; financement_id: number; date: string; montant: number; reference?: string }
interface Depense {
  id: number; project_id: number; financement_id?: number;
  designation: string; note: string; montant: number; date: string;
  beneficiaire: string; categorie?: string; reference?: string;
  financement?: Financement;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt     = (n: number) => Number(n).toLocaleString('fr-MG');
const fmtDate = (d: string) => format(new Date(d), 'dd/MM/yyyy');

/*const STATUT_STYLE: Record<string, string> = {
  'Concept Note':     'bg-blue-100 text-blue-700 border-blue-200',
  'Funding Proposal': 'bg-purple-100 text-purple-700 border-purple-200',
  'En cours':         'bg-green-100 text-green-700 border-green-200',
  'Clôturé':          'bg-gray-100 text-gray-500 border-gray-200',
};*/

// ── Seuils d'alerte ────────────────────────────────────────────────────────────
const WARN_THRESHOLD  = 0.9;  // 90% → avertissement orange
const LIMIT_THRESHOLD = 1.0;  // 100% → dépassement rouge

function getOverrunStatus(total: number, budget: number): 'ok' | 'warn' | 'over' {
  if (budget <= 0) return 'ok';
  const ratio = total / budget;
  if (ratio >= LIMIT_THRESHOLD) return 'over';
  if (ratio >= WARN_THRESHOLD)  return 'warn';
  return 'ok';
}

// ── Bannière d'alerte dépassement ──────────────────────────────────────────────
function OverrunAlert({ label, total, budget, devise = 'Ar' }: {
  label: string; total: number; budget: number; devise?: string;
}) {
  const status = getOverrunStatus(total, budget);
  if (status === 'ok') return null;

  const isOver  = status === 'over';
  const exces   = total - budget;
  const pct     = budget > 0 ? ((total / budget) * 100).toFixed(1) : '0';

  return (
    <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${
      isOver
        ? 'bg-red-50 border-red-200 text-red-800'
        : 'bg-orange-50 border-orange-200 text-orange-800'
    }`}>
      <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isOver ? 'text-red-500' : 'text-orange-500'}`} />
      <div className="text-xs leading-relaxed">
        <p className="font-bold">
          {isOver
            ? `⚠️ Dépassement — ${label} dépasse le budget approuvé (${pct}%)`
            : `⚠️ Attention — ${label} atteint ${pct}% du budget approuvé`}
        </p>
        {isOver && (
          <p className="mt-0.5 text-red-600">
            Excédent : <strong>{fmt(exces)} {devise}</strong> au-delà du budget de <strong>{fmt(budget)} {devise}</strong>
          </p>
        )}
      </div>
    </div>
  );
}

// ── Mini modal inline ──────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Section accordéon (Accords / Déblocages) ───────────────────────────────────
function CollapsibleSection({
  title, icon, iconBg, badgeBg, badgeText,
  count, total, budget, budgetDevise,
  overrunLabel, onAdd, addBtnColor, children, defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  iconBg: string; iconColor: string;
  badgeBg: string; badgeText: string;
  count: number; total: number;
  budget: number; budgetDevise?: string;
  overrunLabel: string;
  onAdd?: () => void;
  addBtnColor: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const status = getOverrunStatus(total, budget);

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      status === 'over' ? 'border-red-300 shadow-red-100 shadow-sm' :
      status === 'warn' ? 'border-orange-300 shadow-orange-50 shadow-sm' :
      'border-gray-200'
    }`}>
      {/* En-tête cliquable */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
          status === 'over' ? 'bg-red-50 hover:bg-red-100/70' :
          status === 'warn' ? 'bg-orange-50 hover:bg-orange-100/70' :
          'bg-gray-50 hover:bg-gray-100/70'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
            {icon}
          </div>
          <span className="text-sm font-bold text-gray-700">{title}</span>
          <span className={`text-xs ${badgeBg} ${badgeText} font-semibold px-2 py-0.5 rounded-full`}>
            {count}
          </span>
          {status !== 'ok' && (
            <AlertCircle className={`w-4 h-4 flex-shrink-0 ${status === 'over' ? 'text-red-500' : 'text-orange-500'}`} />
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`hidden sm:inline text-xs font-bold ${
            status === 'over' ? 'text-red-600' :
            status === 'warn' ? 'text-orange-600' :
            'text-gray-500'
          }`}>
            {fmt(total)} Ar
          </span>
          {open
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />
          }
        </div>
      </button>

      {/* Alerte dépassement (toujours visible si problème) */}
      {status !== 'ok' && (
        <div className="px-4 pt-3 pb-0">
          <OverrunAlert label={overrunLabel} total={total} budget={budget} devise={budgetDevise ?? 'Ar'} />
        </div>
      )}

      {/* Corps déplié */}
      {open && (
        <div className="p-4 space-y-3 bg-white">
          {/* Bouton ajouter — visible seulement si onAdd fourni */}
          {onAdd && (
            <div className="flex justify-end">
              <button
                onClick={onAdd}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-colors shadow-sm ${addBtnColor}`}
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

// ── Carte d'une entrée (engagement ou décaissement) ────────────────────────────
function EntryCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
      {children}
    </div>
  );
}

// ── Liste scrollable si beaucoup d'entrées ─────────────────────────────────────
function EntryList({ children, count }: { children: React.ReactNode; count: number }) {
  const [showAll, setShowAll] = useState(false);
  const MAX_VISIBLE = 4;

  if (count === 0) return <>{children}</>;

  const childArray = Array.isArray(children) ? children : [children];
  const visible    = showAll ? childArray : childArray.slice(0, MAX_VISIBLE);
  const hidden     = count - MAX_VISIBLE;

  return (
    <div className="space-y-2">
      {visible}
      {count > MAX_VISIBLE && (
        <button
          onClick={() => setShowAll(s => !s)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-dashed border-gray-200 transition-colors"
        >
          {showAll ? (
            <><ChevronUp className="w-3.5 h-3.5" /> Réduire</>
          ) : (
            <><ChevronDown className="w-3.5 h-3.5" /> Voir {hidden} de plus</>
          )}
        </button>
      )}
    </div>
  );
}

// ── Composant principal : un financement avec son suivi ────────────────────────
function FinancementSuivi({ financement, canWrite, canDelete }: { financement: Financement; canWrite: boolean; canDelete: boolean }) {
  const [open, setOpen]   = useState(false);
  const [modal, setModal] = useState<null | 'engagement' | 'decaissement' | 'edit-engagement' | 'edit-decaissement'>(null);
  const [editItem, setEditItem] = useState<Engagement | Decaissement | null>(null);
  const qc = useQueryClient();

  const { data: engagements   = [] } = useQuery({
    queryKey: ['engagements',   financement.id],
    queryFn:  () => suiviApi.engagements(financement.id).then(r => r.data),
    enabled:  open,
  });
  const { data: decaissements = [] } = useQuery({
    queryKey: ['decaissements', financement.id],
    queryFn:  () => suiviApi.decaissements(financement.id).then(r => r.data),
    enabled:  open,
  });

  const totalEngage   = (engagements   as Engagement[]).reduce((s, e) => s + Number(e.montant), 0);
  const totalDecaisse = (decaissements as Decaissement[]).reduce((s, d) => s + Number(d.montant), 0);

  const budgetRef = Number(financement.budget_approuve) || 0;
  const budgetApprouve = Number(financement.budget_approuve) || 0;
  const devise        = financement.devise || 'Ar';

  const pctDecaisse   = budgetRef > 0 ? Math.min(100, (totalDecaisse / budgetRef) * 100) : 0;
  const pctEngage     = budgetRef > 0 ? Math.min(100, (totalEngage   / budgetRef) * 100) : 0;

  const engStatus = getOverrunStatus(totalEngage,   budgetRef);
  const decStatus = getOverrunStatus(totalDecaisse, budgetRef);
  const hasAlert  = engStatus !== 'ok' || decStatus !== 'ok';

  const mutEngagement   = useMutation({
    mutationFn: (d: object) => suiviApi.createEngagement(financement.id, d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['engagements',   financement.id] }); setModal(null); toast.success('Accord ajouté'); },
    onError:    () => toast.error('Erreur lors de l\'ajout'),
  });
  const mutDecaissement = useMutation({
    mutationFn: (d: object) => suiviApi.createDecaissement(financement.id, d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['decaissements', financement.id] }); setModal(null); toast.success('Déblocage ajouté'); },
    onError:    () => toast.error('Erreur lors de l\'ajout'),
  });
  const delEngagement   = useMutation({
    mutationFn: (id: number) => suiviApi.deleteEngagement(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['engagements',   financement.id] }); toast.success('Supprimé'); },
  });
  const delDecaissement = useMutation({
    mutationFn: (id: number) => suiviApi.deleteDecaissement(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['decaissements', financement.id] }); toast.success('Supprimé'); },
  });
  const updEngagement = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => suiviApi.updateEngagement(id, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['engagements', financement.id] }); setModal(null); setEditItem(null); toast.success('Accord mis à jour'); },
    onError:    () => toast.error('Erreur lors de la mise à jour'),
  });
  const updDecaissement = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => suiviApi.updateDecaissement(id, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['decaissements', financement.id] }); setModal(null); setEditItem(null); toast.success('Déblocage mis à jour'); },
    onError:    () => toast.error('Erreur lors de la mise à jour'),
  });

  return (
    <div className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-all ${
      hasAlert ? 'border-red-200' : 'border-gray-200'
    }`}>
      {/* Barre colorée top — rouge si alerte */}
      <div className={`h-1 w-full ${hasAlert ? 'bg-gradient-to-r from-red-400 to-red-500' : 'bg-gradient-to-r from-green-400 to-emerald-500'}`} />

      {/* ── Header cliquable ── */}
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full text-left">
        <div className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/70 transition-colors">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
              hasAlert ? 'bg-red-100' : 'bg-gradient-to-br from-green-100 to-emerald-100'
            }`}>
              {hasAlert
                ? <AlertTriangle className="w-5 h-5 text-red-500" />
                : <DollarSign className="w-5 h-5 text-green-600" />
              }
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-800 truncate">
                  {financement.source_financement}
                </p>
                {hasAlert && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200 flex-shrink-0">
                    Dépassement
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Budget approuvé :&nbsp;
                <span className="font-semibold text-gray-600">
                  {fmt(budgetApprouve)} {devise}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0 ml-3">
            <div className="hidden sm:flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                engStatus === 'over' ? 'bg-red-50 text-red-700 border-red-200' :
                engStatus === 'warn' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                'bg-blue-50 text-blue-700 border-blue-100'
              }`}>
                <TrendingUp className="w-3 h-3" /> {fmt(totalEngage)} Ar
              </span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                decStatus === 'over' ? 'bg-red-50 text-red-700 border-red-200' :
                decStatus === 'warn' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                'bg-green-50 text-green-700 border-green-100'
              }`}>
                <CheckCircle2 className="w-3 h-3" /> {fmt(totalDecaisse)} Ar
              </span>
            </div>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${open ? 'bg-gray-200' : 'bg-gray-100'}`}>
              {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </div>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1.5">
            <span>Progression financière</span>
            <span className={pctDecaisse > 100 ? 'text-red-500 font-semibold' : ''}>
              {pctDecaisse.toFixed(0)}% débloqué
              {pctDecaisse > 100 && ' ⚠️'}
            </span>
          </div>
          <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
            {/* Accordé */}
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                engStatus !== 'ok' ? 'bg-orange-300' : 'bg-blue-200'
              }`}
              style={{ width: `${Math.min(pctEngage, 100)}%` }}
            />
            {/* Débloqué */}
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                decStatus === 'over' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                decStatus === 'warn' ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                'bg-gradient-to-r from-green-400 to-emerald-500'
              }`}
              style={{ width: `${Math.min(pctDecaisse, 100)}%` }}
            />
            {/* Indicateur dépassement */}
            {(pctDecaisse > 100 || pctEngage > 100) && (
              <div className="absolute right-0 inset-y-0 w-1 bg-red-600 rounded-r-full" />
            )}
          </div>
          <div className="flex items-center gap-4 mt-1.5">
            <span className={`flex items-center gap-1 text-[10px] ${engStatus !== 'ok' ? 'text-orange-500' : 'text-blue-500'}`}>
              <span className={`w-2 h-2 rounded-full inline-block ${engStatus !== 'ok' ? 'bg-orange-300' : 'bg-blue-200'}`} />
              Accordé
            </span>
            <span className={`flex items-center gap-1 text-[10px] ${
              decStatus === 'over' ? 'text-red-500 font-semibold' :
              decStatus === 'warn' ? 'text-orange-500' : 'text-emerald-600'
            }`}>
              <span className={`w-2 h-2 rounded-full inline-block ${
                decStatus === 'over' ? 'bg-red-500' :
                decStatus === 'warn' ? 'bg-orange-400' : 'bg-emerald-400'
              }`} />
              Débloqué
            </span>
          </div>
        </div>
      </button>

      {/* ── Contenu déplié ── */}
      {open && (
        <div className="border-t border-gray-100 bg-gray-50/40 p-5 space-y-4">

          {/* Mini KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl bg-white border p-3.5 shadow-sm ${engStatus !== 'ok' ? 'border-orange-200 bg-orange-50/30' : 'border-blue-100'}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${engStatus !== 'ok' ? 'bg-orange-100' : 'bg-blue-100'}`}>
                  <TrendingUp className={`w-3.5 h-3.5 ${engStatus !== 'ok' ? 'text-orange-600' : 'text-blue-600'}`} />
                </div>
                <span className="text-xs font-semibold text-gray-500">Total accordé</span>
              </div>
              <p className={`text-base font-bold ${engStatus === 'over' ? 'text-red-600' : engStatus === 'warn' ? 'text-orange-600' : 'text-blue-700'}`}>
                {fmt(totalEngage)}<span className="text-xs font-normal text-gray-400 ml-1">Ar</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{engagements.length} accord{engagements.length > 1 ? 's' : ''}</p>
            </div>
            <div className={`rounded-xl bg-white border p-3.5 shadow-sm ${decStatus !== 'ok' ? 'border-red-200 bg-red-50/30' : 'border-green-100'}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${decStatus !== 'ok' ? 'bg-red-100' : 'bg-green-100'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${decStatus !== 'ok' ? 'text-red-500' : 'text-green-600'}`} />
                </div>
                <span className="text-xs font-semibold text-gray-500">Total débloqué</span>
              </div>
              <p className={`text-base font-bold ${decStatus === 'over' ? 'text-red-600' : decStatus === 'warn' ? 'text-orange-600' : 'text-green-700'}`}>
                {fmt(totalDecaisse)}<span className="text-xs font-normal text-gray-400 ml-1">Ar</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{decaissements.length} déblocage{decaissements.length > 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* ─ Section Accords ─ */}
          <CollapsibleSection
            title="Accords"
            icon={<TrendingUp className="w-3.5 h-3.5 text-blue-600" />}
            iconBg="bg-blue-100" iconColor="text-blue-600"
            badgeBg="bg-blue-100" badgeText="text-blue-600"
            count={engagements.length}
            total={totalEngage}
            budget={budgetRef}
            budgetDevise="Ar"
            overrunLabel="Total accordé"
            onAdd={canWrite ? () => setModal('engagement') : undefined}
            addBtnColor="bg-blue-600 hover:bg-blue-700"
            defaultOpen
          >
            {engagements.length === 0 ? (
              <div className="flex flex-col items-center py-6 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                <TrendingUp className="w-6 h-6 mb-1 opacity-30" />
                <p className="text-xs">Aucun accord enregistré</p>
              </div>
            ) : (
              <EntryList count={engagements.length}>
                {(engagements as Engagement[]).map(e => (
                  <EntryCard key={e.id}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-blue-700">{fmt(e.montant)} Ar</p>
                        <p className="text-[10px] text-gray-400">{fmtDate(e.date)}</p>
                      </div>
                    </div>
                    {e.description && (
                      <p className="text-xs text-gray-500 flex-1 truncate mx-2" title={e.description}>
                        {e.description}
                      </p>
                    )}
                    {(canWrite || canDelete) && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {canWrite && (
                          <button
                            onClick={() => { setEditItem(e); setModal('edit-engagement'); }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-300 hover:text-blue-500 transition-all"
                            title="Modifier"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => delEngagement.mutate(e.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-300 hover:text-red-500 transition-all"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </EntryCard>
                ))}
              </EntryList>
            )}
          </CollapsibleSection>

          {/* ─ Section Déblocages ─ */}
          <CollapsibleSection
            title="Déblocages"
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
            iconBg="bg-green-100" iconColor="text-green-600"
            badgeBg="bg-green-100" badgeText="text-green-600"
            count={decaissements.length}
            total={totalDecaisse}
            budget={budgetRef}
            budgetDevise="Ar"
            overrunLabel="Total débloqué"
            onAdd={canWrite ? () => setModal('decaissement') : undefined}
            addBtnColor="bg-green-600 hover:bg-green-700"
            defaultOpen
          >
            {decaissements.length === 0 ? (
              <div className="flex flex-col items-center py-6 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                <CheckCircle2 className="w-6 h-6 mb-1 opacity-30" />
                <p className="text-xs">Aucun déblocage enregistré</p>
              </div>
            ) : (
              <EntryList count={decaissements.length}>
                {(decaissements as Decaissement[]).map(d => (
                  <EntryCard key={d.id}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-green-700">{fmt(d.montant)} Ar</p>
                        <p className="text-[10px] text-gray-400">{fmtDate(d.date)}</p>
                      </div>
                    </div>
                    {d.reference && (
                      <p className="text-xs text-gray-500 flex-1 truncate mx-2 font-mono" title={d.reference}>
                        {d.reference}
                      </p>
                    )}
                    {(canWrite || canDelete) && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {canWrite && (
                          <button
                            onClick={() => { setEditItem(d); setModal('edit-decaissement'); }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-300 hover:text-blue-500 transition-all"
                            title="Modifier"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => delDecaissement.mutate(d.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-300 hover:text-red-500 transition-all"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </EntryCard>
                ))}
              </EntryList>
            )}
          </CollapsibleSection>

        </div>
      )}

      {/* Modals */}
      <Modal open={modal === 'engagement'} onClose={() => setModal(null)} title="Ajouter un accord">
        <SimpleForm
          fields={[
            { key: 'date',        label: 'Date *',      type: 'date' },
            { key: 'montant',     label: 'Montant (Ar) *', type: 'number' },
            { key: 'description', label: 'Description', type: 'textarea' },
          ]}
          onSubmit={d => mutEngagement.mutate(d)}
          loading={mutEngagement.isPending}
        />
      </Modal>

      <Modal open={modal === 'decaissement'} onClose={() => setModal(null)} title="Ajouter un déblocage">
        <SimpleForm
          fields={[
            { key: 'date',      label: 'Date *',          type: 'date' },
            { key: 'montant',   label: 'Montant (Ar) *',  type: 'number' },
            { key: 'reference', label: 'Référence',       type: 'text' },
          ]}
          onSubmit={d => mutDecaissement.mutate(d)}
          loading={mutDecaissement.isPending}
        />
      </Modal>

      <Modal open={modal === 'edit-engagement'} onClose={() => { setModal(null); setEditItem(null); }} title="Modifier l'accord">
        <SimpleForm
          fields={[
            { key: 'date',        label: 'Date *',         type: 'date' },
            { key: 'montant',     label: 'Montant (Ar) *', type: 'number' },
            { key: 'description', label: 'Description',    type: 'textarea' },
          ]}
          initialValues={editItem ? {
            date:        (editItem as Engagement).date?.toString().slice(0, 10) ?? '',
            montant:     String((editItem as Engagement).montant ?? ''),
            description: (editItem as Engagement).description ?? '',
          } : undefined}
          onSubmit={d => editItem && updEngagement.mutate({ id: editItem.id, data: d })}
          loading={updEngagement.isPending}
          submitLabel="Enregistrer"
        />
      </Modal>

      <Modal open={modal === 'edit-decaissement'} onClose={() => { setModal(null); setEditItem(null); }} title="Modifier le déblocage">
        <SimpleForm
          fields={[
            { key: 'date',      label: 'Date *',          type: 'date' },
            { key: 'montant',   label: 'Montant (Ar) *',  type: 'number' },
            { key: 'reference', label: 'Référence',       type: 'text' },
          ]}
          initialValues={editItem ? {
            date:      (editItem as Decaissement).date?.toString().slice(0, 10) ?? '',
            montant:   String((editItem as Decaissement).montant ?? ''),
            reference: (editItem as Decaissement).reference ?? '',
          } : undefined}
          onSubmit={d => editItem && updDecaissement.mutate({ id: editItem.id, data: d })}
          loading={updDecaissement.isPending}
          submitLabel="Enregistrer"
        />
      </Modal>
    </div>
  );
}

// ── Formulaire simple réutilisable ─────────────────────────────────────────────
interface Field {
  key: string; label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
}

function SimpleForm({ fields, onSubmit, loading, initialValues, submitLabel = 'Enregistrer' }: {
  fields: Field[];
  onSubmit: (data: Record<string, string>) => void;
  loading: boolean;
  initialValues?: Record<string, string>;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues
      ? { ...Object.fromEntries(fields.map(f => [f.key, f.type === 'select' ? (f.options?.[0]?.value ?? '') : ''])), ...initialValues }
      : Object.fromEntries(fields.map(f => [f.key, f.type === 'select' ? (f.options?.[0]?.value ?? '') : '']))
  );
  const set = (k: string, v: string) => setValues(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-3">
      {fields.map(f => (
        <div key={f.key}>
          <label className="form-label">{f.label}</label>
          {f.type === 'textarea' ? (
            <textarea className="form-input" rows={2} value={values[f.key] || ''} onChange={e => set(f.key, e.target.value)} />
          ) : f.type === 'select' ? (
            <select className="form-input" value={values[f.key]} onChange={e => set(f.key, e.target.value)}>
              {f.options!.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input type={f.type} className="form-input" value={values[f.key] || ''} onChange={e => set(f.key, e.target.value)} />
          )}
        </div>
      ))}
      <button
        className="btn btn-primary w-full justify-center mt-2"
        disabled={loading}
        onClick={() => onSubmit(values)}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {loading ? 'Enregistrement...' : submitLabel}
      </button>
    </div>
  );
}

// ── ONGLET 1 : DÉTAIL PROJET ───────────────────────────────────────────────────
function ProjectOverviewHeader({ project, canWrite }: { project: Project; canWrite: boolean }) {
  const color = blendSectorColors(project.domaines_intervention?.map(d => d.designation)).fillColor;
  const rows  = [
    { label: 'ID Projet',         value: project.id_projet },
    { label: 'Statut',            value: project.statut?.designation },
    { label: 'Classification',    value: project.classifications?.map(c => c.designation).join(', ') },
    { label: 'Entité accréditée', value: project.entites_accreditees?.map(e => e.designation).join(', ') },
    { label: 'Domaines du changement climatiques',           value: project.domaines_intervention?.map(d => d.designation).join(', ') },
    { label: 'Date mise en service',        value: project.date_debut ? fmtDate(project.date_debut) : null },
    { label: 'Date fin',          value: project.date_fin   ? fmtDate(project.date_fin)   : null },
  ].filter(r => r.value);

  const zoneRows = [
    { label: 'Zone',           value: project.zone },
    { label: 'Province',      value: project.province?.nom },
    { label: 'Région',        value: project.region?.designation },
    { label: 'District',      value: project.district?.nom },
    { label: 'Commune',       value: project.commune?.nom },
    { label: 'Zonr d\'intervention', value: project.geo_address },
  ].filter(r => r.value);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* ── Informations générales ── */}
          <div className="card overflow-hidden" style={{ border: `1.5px solid ${color}40` }}>
            <div className="h-1.5" style={{ background: color }} />
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                    <Layers className="w-6 h-6" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Informations générales</p>
                    <h2 className="text-xl font-bold text-gray-800">{project.titre}</h2>
                  </div>
                </div>
                {canWrite && (
                  <Link to={`/admin/projects/${project.id}/edit`} className="btn btn-secondary btn-sm flex-shrink-0">
                    <Edit className="w-3.5 h-3.5" /> Modifier
                  </Link>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mb-5">
                <span className="text-xs px-3 py-1 rounded-full border font-medium bg-gray-100 text-gray-500">{project.statut?.designation}</span>
                {project.classifications?.map(c => (
                  <span key={c.id_classification} className="text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">{c.designation}</span>
                ))}
                {project.domaines_intervention?.map(d => (
                  <span key={d.id_domaine_intervention} className="text-xs px-3 py-1 rounded-full text-white font-medium" style={{ background: sectorMapColor(d.designation) }}>{d.designation}</span>
                ))}
                <span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium ${project.is_published ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-gray-50 text-gray-400 border border-gray-200'}`}>
                  <Globe className="w-3 h-3" />{project.is_published ? 'Publié' : 'Non publié'}
                </span>
              </div>
              {project.description && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{project.description}</p>
                </div>
              )}
            </div>
          </div>

          {(project.objectifs || project.impact) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.objectifs && <div className="card p-5"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">🎯 Objectifs</p><p className="text-sm text-gray-600 leading-relaxed">{project.objectifs}</p></div>}
              {project.impact    && <div className="card p-5"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">📈 Impact</p><p className="text-sm text-gray-600 leading-relaxed">{project.impact}</p></div>}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Détails</p>
            <div className="space-y-2.5">
              {rows.map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-2">
                  <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
                  <span className="text-xs font-semibold text-gray-700 text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Zone géographique ── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Zone géographique
              </p>
            </div>
            {zoneRows.length > 0 ? (
              <div className="space-y-2.5 mb-3">
                {zoneRows.map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
                    <span className="text-xs font-semibold text-gray-700 text-right">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-300 italic mb-3">Aucune zone renseignée</p>
            )}
            <Link to={`/admin/projects/${project.id}/zone`} className="btn btn-secondary w-full justify-center btn-sm">
              <MapPin className="w-3.5 h-3.5" /> Voir la carte
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ONGLET : APERÇU FINANCIER (KPIs agrégés) ──────────────────────────────────
function TabApercuFinancier({ project }: { project: Project; canWrite: boolean }) {
  const { data: finData } = useQuery({
    queryKey: ['project-financements-detail', project.id],
    queryFn:  () => projectApi.financements(project.id).then(r => r.data),
  });
  const financements: Financement[] = Array.isArray(finData) ? finData : (finData?.data ?? []);
  const totalBudgetApprouve = financements.reduce(
    (s, f) => s + Number(f.budget_approuve ?? 0),
    0
  );
  const budgetParDevise = financements.reduce((acc, f) => {
    const dev = f.devise;
    const amt = Number(f.budget_approuve ?? 0);
    acc[dev] = (acc[dev] ?? 0) + amt;
    return acc;
  }, {} as Record<string, number>);

  const finIds = financements.map(f => f.id).join(',');

  const { data: engagementsAll   = [] } = useQuery({
    queryKey: ['detail-eng', project.id, finIds],
    queryFn:  async () => {
      if (!financements.length) return [];
      const res = await Promise.all(financements.map(f => suiviApi.engagements(f.id).then(r => r.data as Engagement[])));
      return res.flat();
    },
    enabled: financements.length > 0,
  });

  const { data: decaissementsAll = [] } = useQuery({
    queryKey: ['detail-dec', project.id, finIds],
    queryFn:  async () => {
      if (!financements.length) return [];
      const res = await Promise.all(financements.map(f => suiviApi.decaissements(f.id).then(r => r.data as Decaissement[])));
      return res.flat();
    },
    enabled: financements.length > 0,
  });

  const { data: depensesAll = [] } = useQuery({
    queryKey: ['detail-dep', project.id],
    queryFn:  () => projectApi.depenses(project.id).then(r => r.data as Depense[]),
  });

  const totalEngagements   = (engagementsAll   as Engagement[]).reduce((s, e)   => s + Number(e.montant), 0);
  const totalDecaissements = (decaissementsAll as Decaissement[]).reduce((s, d) => s + Number(d.montant), 0);
  const totalDepenses      = (depensesAll      as Depense[]).reduce((s, d)      => s + Number(d.montant), 0);

  const engGlobalStatus = getOverrunStatus(totalEngagements,   totalBudgetApprouve);
  const decGlobalStatus = getOverrunStatus(totalDecaissements, totalBudgetApprouve);

  return (
    <div className="space-y-6">

      {/* ── Alertes globales ── */}
      {engGlobalStatus !== 'ok' && (
        <OverrunAlert label="Total accordé (tous financements)" total={totalEngagements} budget={totalBudgetApprouve} />
      )}
      {decGlobalStatus !== 'ok' && (
        <OverrunAlert label="Total débloqué (tous financements)" total={totalDecaissements} budget={totalBudgetApprouve} />
      )}

      {/* ── KPIs financiers ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4 border border-blue-100 bg-blue-50/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs font-semibold text-gray-500">Budget approuvé</p>
          </div>
          {Object.entries(budgetParDevise).length > 0 ? (
            <div className="space-y-0.5">
              {Object.entries(budgetParDevise).map(([dev, amt]) => (
                <p key={dev} className="text-base font-bold text-blue-700 leading-snug">
                  {fmt(amt)} <span className="text-xs font-semibold text-blue-400">{dev}</span>
                </p>
              ))}
            </div>
          ) : <p className="text-sm text-gray-300 italic">—</p>}
        </div>

        <div className={`card p-4 border ${engGlobalStatus === 'over' ? 'border-red-200 bg-red-50/50' : engGlobalStatus === 'warn' ? 'border-orange-200 bg-orange-50/50' : 'border-indigo-100 bg-indigo-50/50'}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${engGlobalStatus !== 'ok' ? 'bg-red-100' : 'bg-indigo-100'}`}>
              <TrendingUp className={`w-4 h-4 ${engGlobalStatus !== 'ok' ? 'text-red-500' : 'text-indigo-600'}`} />
            </div>
            <p className="text-xs font-semibold text-gray-500">Accordé</p>
            {engGlobalStatus !== 'ok' && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
          </div>
          <p className={`text-lg font-bold leading-none ${engGlobalStatus === 'over' ? 'text-red-600' : engGlobalStatus === 'warn' ? 'text-orange-600' : 'text-indigo-700'}`}>
            {fmt(totalEngagements)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">Ar</p>
        </div>

        <div className={`card p-4 border ${decGlobalStatus === 'over' ? 'border-red-200 bg-red-50/50' : decGlobalStatus === 'warn' ? 'border-orange-200 bg-orange-50/50' : 'border-green-100 bg-green-50/50'}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${decGlobalStatus !== 'ok' ? 'bg-red-100' : 'bg-green-100'}`}>
              <CheckCircle2 className={`w-4 h-4 ${decGlobalStatus !== 'ok' ? 'text-red-500' : 'text-green-600'}`} />
            </div>
            <p className="text-xs font-semibold text-gray-500">Débloqué</p>
            {decGlobalStatus !== 'ok' && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
          </div>
          <p className={`text-lg font-bold leading-none ${decGlobalStatus === 'over' ? 'text-red-600' : decGlobalStatus === 'warn' ? 'text-orange-600' : 'text-green-700'}`}>
            {fmt(totalDecaissements)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">Ar</p>
        </div>

        <div className="card p-4 border border-red-100 bg-red-50/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-xs font-semibold text-gray-500">Dépenses</p>
          </div>
          <p className="text-lg font-bold text-red-600 leading-none">{fmt(totalDepenses)}</p>
          <p className="text-[10px] text-gray-400 mt-1">Ar</p>
        </div>
      </div>
    </div>
  );
}

// ── ONGLET 2 : SUIVI FINANCEMENTS ─────────────────────────────────────────────
function TabSuiviFinancements({ project, canWrite, canDelete }: { project: Project; canWrite: boolean; canDelete: boolean }) {
  const { data: financements = [], isLoading } = useQuery({
    queryKey: ['project-financements', project.id],
    queryFn:  () => projectApi.financements(project.id).then(r => Array.isArray(r.data) ? r.data : r.data.data),
  });

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <div className="w-7 h-7 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
    </div>
  );

  if (!financements.length) return (
    <div className="rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center py-16 text-gray-400 bg-white">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
        <DollarSign className="w-7 h-7 opacity-30" />
      </div>
      <p className="font-semibold text-gray-500 mb-1">Aucun financement lié à ce projet</p>
      <p className="text-xs text-gray-400 mb-4">Ajoutez un financement pour commencer le suivi</p>
      <Link to="/admin/financements" className="btn btn-primary btn-sm"><Plus className="w-3.5 h-3.5" /> Ajouter un financement</Link>
    </div>
  );

  const totalBudgetApprouve = (financements as Financement[]).reduce((s, f) => s + Number(f.budget_approuve ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold text-green-100 uppercase tracking-wide mb-1">Suivi des financements</p>
            <p className="text-2xl font-bold">{fmt(totalBudgetApprouve)}</p>
            <p className="text-xs text-green-100 mt-0.5">Budget total approuvé</p>
          </div>
          <div className="text-center bg-white/10 rounded-xl px-4 py-2">
            <p className="text-xl font-bold">{financements.length}</p>
            <p className="text-[10px] text-green-100">Source{financements.length > 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {(financements as Financement[]).map(f => (
          <FinancementSuivi key={f.id} financement={f} canWrite={canWrite} canDelete={canDelete} />
        ))}
      </div>
    </div>
  );
}

// ── ONGLET 3 : DÉPENSES (lecture seule) ───────────────────────────────────────
function TabDepenses({ project, canDelete, canWrite }: { project: Project; canDelete: boolean; canWrite: boolean }) {
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo,   setFilterTo]   = useState('');
  const [deleteId,   setDeleteId]   = useState<number | null>(null);
  const [editDepense, setEditDepense] = useState<Depense | null>(null);
  const [editForm, setEditForm] = useState({ designation: '', note: '', montant: '', date: '', beneficiaire: '' });
  const qc = useQueryClient();

  const { data: depenses = [], isLoading } = useQuery({
    queryKey: ['project-depenses', project.id, filterFrom, filterTo],
    queryFn:  () => projectApi.depenses(project.id, {
      date_from: filterFrom || undefined,
      date_to:   filterTo   || undefined,
    }).then(r => r.data),
  });

  const mutDelete = useMutation({
    mutationFn: (id: number) => import('@/api/services').then(m => m.depenseApi.delete(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-depenses', project.id] });
      toast.success('Dépense supprimée');
      setDeleteId(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const mutEdit = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) =>
      import('@/api/services').then(m => m.depenseApi.update(id, data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-depenses', project.id] });
      toast.success('Dépense mise à jour');
      setEditDepense(null);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de la mise à jour')),
  });

  const openEdit = (d: Depense) => {
    setEditDepense(d);
    setEditForm({
      designation:  d.designation ?? '',
      note:         d.note        ?? '',
      montant:      String(d.montant ?? ''),
      date:         d.date?.toString().slice(0, 10) ?? '',
      beneficiaire: d.beneficiaire ?? '',
    });
  };

  const total = (depenses as Depense[]).reduce((s, d) => s + Number(d.montant), 0);

  return (
    <div className="space-y-4">
      {/* Filtres : date seulement */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="form-label text-xs">Du</label>
          <input type="date" className="form-input" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
        </div>
        <div>
          <label className="form-label text-xs">Au</label>
          <input type="date" className="form-input" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
        </div>
        {(filterFrom || filterTo) && (
          <button className="btn btn-secondary btn-sm self-end"
            onClick={() => { setFilterFrom(''); setFilterTo(''); }}>
            <Filter className="w-3.5 h-3.5" /> Réinitialiser
          </button>
        )}
      </div>

      {(depenses as Depense[]).length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <TrendingDown className="w-4 h-4 text-red-400" />
          <span className="text-sm text-gray-600">
            Total dépenses : <strong className="text-red-600">{fmt(total)}</strong>
          </span>
          <span className="text-xs text-gray-400">
            ({(depenses as Depense[]).length} entrée{(depenses as Depense[]).length > 1 ? 's' : ''})
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
        </div>
      ) : (depenses as Depense[]).length === 0 ? (
        <div className="card flex flex-col items-center py-14 text-gray-400">
          <TrendingDown className="w-10 h-10 mb-2 opacity-20" />
          <p className="text-sm">Aucune dépense enregistrée</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Date', 'Désignation', 'Montant', 'Bénéficiaire', 'Note', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(depenses as Depense[]).map(d => (
                  <tr key={d.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDate(d.date)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800 max-w-[180px] truncate" title={d.designation}>{d.designation}</td>
                    <td className="px-4 py-3 font-semibold text-red-600 whitespace-nowrap">{fmt(d.montant)}</td>
                    <td className="px-4 py-3 text-gray-600">{d.beneficiaire}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate" title={d.note}>{d.note}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {canWrite && (
                          <button
                            onClick={() => openEdit(d)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteId(d.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Confirmer la suppression">
        <p className="text-sm text-gray-600 mb-5">Êtes-vous sûr de vouloir supprimer cette dépense ? Cette action est irréversible.</p>
        <div className="flex gap-3 justify-end">
          <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Annuler</button>
          <button
            className="btn btn-danger"
            onClick={() => deleteId !== null && mutDelete.mutate(deleteId)}
            disabled={mutDelete.isPending}
          >
            {mutDelete.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Supprimer
          </button>
        </div>
      </Modal>

      {/* Modal édition dépense */}
      <Modal open={editDepense !== null} onClose={() => setEditDepense(null)} title="Modifier la dépense">
        <div className="space-y-4">
          <div>
            <label className="form-label">Désignation *</label>
            <input type="text" className="form-input" required
              value={editForm.designation}
              onChange={e => setEditForm(f => ({ ...f, designation: e.target.value }))}
              placeholder="Ex : Achat de matériel, Transport équipe..." />
          </div>
          <div>
            <label className="form-label">Note *</label>
            <textarea className="form-input" rows={3}
              value={editForm.note}
              onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Description de la dépense..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Montant (Ar) *</label>
              <input type="number" className="form-input" min={0} step="any"
                value={editForm.montant}
                onChange={e => setEditForm(f => ({ ...f, montant: e.target.value }))}
                placeholder="0" />
            </div>
            <div>
              <label className="form-label">Date *</label>
              <input type="date" className="form-input"
                value={editForm.date}
                onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="form-label">Bénéficiaire *</label>
            <input type="text" className="form-input"
              value={editForm.beneficiaire}
              onChange={e => setEditForm(f => ({ ...f, beneficiaire: e.target.value }))}
              placeholder="Nom du bénéficiaire..." />
          </div>
          <div className="flex gap-3 pt-1">
            <button className="btn btn-secondary flex-1" onClick={() => setEditDepense(null)}>
              Annuler
            </button>
            <button
              className="btn btn-primary flex-1"
              disabled={mutEdit.isPending}
              onClick={() => editDepense && mutEdit.mutate({
                id: editDepense.id,
                data: {
                  designation:  editForm.designation,
                  note:         editForm.note,
                  montant:      Number(editForm.montant),
                  date:         editForm.date,
                  beneficiaire: editForm.beneficiaire,
                },
              })}
            >
              {mutEdit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {mutEdit.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── PAGE PRINCIPALE ────────────────────────────────────────────────────────────
export default function ProjectAdminDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  type TabKey = 'activites' | 'composantes' | 'indicateurs' | 'resultats' | 'beneficiaires' | 'documents' | 'financier' | 'suivi' | 'budgets' | 'depenses' | 'perspectives';
  const validTabs: TabKey[] = ['activites', 'composantes', 'indicateurs', 'resultats', 'beneficiaires', 'documents', 'financier', 'suivi', 'budgets', 'depenses', 'perspectives'];
  const tabParam = searchParams.get('tab') as TabKey | null;
  const [tab, setTab] = useState<TabKey>(tabParam && validTabs.includes(tabParam) ? tabParam : 'activites');

  const { user } = useAuthStore();
  const role = user?.role;
  const canWrite  = role === 'super_admin' || role === 'admin' || role === 'gestionnaire';
  const canDelete = role === 'super_admin' || role === 'admin';

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn:  () => projectApi.show(Number(id)).then(r => r.data),
  });

  if (isLoading) return (
    <div className="flex justify-center items-center py-32">
      <div className="w-9 h-9 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
    </div>
  );

  if (!project) return (
    <div className="text-center py-32 text-gray-400">
      <p className="mb-4">Projet introuvable</p>
      <button onClick={() => navigate(-1)} className="btn btn-secondary">← Retour</button>
    </div>
  );

  // Les 3 onglets demandés par le nouveau parcours (Activités / Composantes /
  // Indicateurs), plus "Documents du projet" conservé par précaution (module
  // existant à ne pas perdre), puis les onglets financiers déjà existants
  // (hors périmètre de cette réorganisation, conservés tels quels).
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'activites',   label: '📌 Activités du projet' },
    { key: 'composantes', label: '🧩 Composantes' },
    { key: 'indicateurs', label: '🎯 Indicateurs du projet' },
    { key: 'resultats',    label: '🏁 Résultats' },
    { key: 'beneficiaires', label: '👥 Bénéficiaires' },
    { key: 'documents',   label: '📎 Documents du projet' },
    { key: 'financier',   label: '💰 Aperçu financier' },
    { key: 'suivi',       label: '📊 Suivi des financements' },
    { key: 'budgets',     label: '📈 Budgets' },
    { key: 'depenses',    label: '💸 Dépenses' },
    { key: 'perspectives', label: '🧭 Perspectives' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/projects')} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-800 truncate">{project.titre}</h1>
            {project.id_projet && (
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-green-100 text-green-700 border border-green-200 flex-shrink-0">
                {project.id_projet}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium 'bg-gray-100 text-gray-500'}`}>{project.statut?.designation}</span>
            {project.region?.designation && (
              <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {project.region.designation}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Informations générales + Zone géographique : toujours visibles ── */}
      <ProjectOverviewHeader project={project} canWrite={canWrite} />

      {/* ── Onglets ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'activites'   && <div className="card p-5"><ActivitesPanel projectId={project.id} canWrite={canWrite} /></div>}
      {tab === 'composantes' && <div className="card p-5"><StepComposantes projectId={project.id} canWrite={canWrite} /></div>}
      {tab === 'indicateurs' && <div className="card p-5"><IndicateursPanel projectId={project.id} canWrite={canWrite} /></div>}
      {tab === 'resultats'    && <div className="card p-5"><ResultsPanel projectId={project.id} canWrite={canWrite} /></div>}
      {tab === 'beneficiaires' && <div className="card p-5"><BeneficiairesPanel projectId={project.id} project={project} canWrite={canWrite} /></div>}
      {tab === 'documents'   && <div className="card p-5"><DocumentsPanel projectId={project.id} canWrite={canWrite} /></div>}
      {tab === 'financier'   && <TabApercuFinancier project={project} canWrite={canWrite} />}
      {tab === 'suivi'       && <TabSuiviFinancements project={project} canWrite={canWrite} canDelete={canDelete} />}
      {tab === 'budgets'     && <BudgetsCycleTab project={project} canWrite={canWrite} canDelete={canDelete} />}
      {tab === 'depenses'    && <TabDepenses project={project} canDelete={canDelete} canWrite={canWrite} />}
      {tab === 'perspectives' && <ProjectPerspectivesTab project={project} canWrite={canWrite} canDelete={canDelete} />}
    </div>
  );
}