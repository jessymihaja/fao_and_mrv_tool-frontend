// src/pages/admin/projects/tabs/BudgetsCycleTab.tsx
//
// Onglet "Budgets" — suivi du cycle de vie des budgets climatiques :
//   Annoncé → Mobilisé → Engagé → Approuvé → Programmé → Décaissé → Audité/Dépensé
//
// Vue consolidée (tableau de bord, chronologie, tableau récapitulatif,
// graphique en cascade) alimentée par /projects/{id}/budget-cycle, avec
// CRUD dédié pour chacune des 7 étapes.

import { useState, Fragment } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Megaphone, Handshake, FileSignature, CheckCircle2, CalendarClock, Banknote,
  ClipboardCheck, Plus, Pencil, Trash2, Download, X, Loader2, Filter,
  ChevronDown, ChevronUp, FileCheck2, TrendingUp,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  budgetCycleApi, budgetPledgeApi, budgetMobilisationApi, budgetApprobationApi,
  suiviApi, depenseApi, composanteApi, activiteApi, organismeContributeurApi, contributionCategorieApi,
  projectApi,
} from '@/api/services';
import type {
  Project, Financement, Composante, Activite, Devise, ModeContribution, TypeMobilisation,
  BudgetStageKey, BudgetStageItem, BudgetCycleSummary, MontantsParDevise,
} from '@/types';
import { getErrorMessage } from '@/utils/apiError';

// ── Helpers ──────────────────────────────────────────────────────────────
const fmt = (n: number) => Math.round(Number(n) || 0).toLocaleString('fr-MG');
const fmtDate = (d?: string | null) => (d ? format(new Date(d), 'dd/MM/yyyy') : '—');

// Correction multidevises (§7-8-11) : un montant agrégé (total d'étape,
// budget, dépense...) peut regrouper plusieurs devises (AR, USD, EUR) — on
// ne les additionne jamais entre elles. Affiche chaque devise séparément,
// ex. "700 000 USD · 100 000 AR" ; "—" si aucun montant.
const fmtDevises = (totaux?: MontantsParDevise): string => {
  const entries = Object.entries(totaux ?? {}).filter(([, v]) => (v ?? 0) !== 0);
  if (entries.length === 0) return '—';
  return entries.map(([devise, montant]) => `${fmt(montant ?? 0)} ${devise}`).join(' · ');
};

// Idem pour un taux (mobilisation, engagement...) : un taux n'a de sens que
// dans une seule devise à la fois (§10).
const fmtTauxDevises = (taux?: Partial<Record<string, number | null>>): string => {
  const entries = Object.entries(taux ?? {}).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) return '—';
  return entries.map(([devise, v]) => `${v}% ${devise}`).join(' · ');
};

const STAGE_ORDER: BudgetStageKey[] = ['pledge', 'mobilise', 'engage', 'approuve', 'programme', 'decaisse', 'audite'];

const STAGE_META: Record<BudgetStageKey, { label: string; short: string; icon: React.ElementType; color: string; bg: string; text: string; border: string }> = {
  pledge:    { label: 'Annoncé (Pledge)',   short: 'Annoncé',   icon: Megaphone,       color: '#0284c7', bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200' },
  mobilise:  { label: 'Mobilisé',           short: 'Mobilisé',  icon: Handshake,       color: '#7c3aed', bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200' },
  engage:    { label: 'Engagé',             short: 'Engagé',    icon: FileSignature,  color: '#d97706', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  approuve:  { label: 'Approuvé',           short: 'Approuvé',  icon: CheckCircle2,   color: '#16a34a', bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200' },
  programme: { label: 'Programmé',          short: 'Programmé', icon: CalendarClock,  color: '#0891b2', bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200' },
  decaisse:  { label: 'Décaissé',           short: 'Décaissé',  icon: Banknote,       color: '#dc2626', bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
  audite:    { label: 'Dépensé / Audité',   short: 'Dépensé',   icon: ClipboardCheck, color: '#4338ca', bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200' },
};

const DEVISES: Devise[] = ['AR', 'USD', 'EUR'];

// ── Modal générique ──────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, wide = false }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl w-full ${wide ? 'max-w-xl' : 'max-w-md'} shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
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

function ConfirmDeleteModal({ open, onClose, onConfirm, isPending, label }: {
  open: boolean; onClose: () => void; onConfirm: () => void; isPending: boolean; label: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Confirmer la suppression">
      <p className="text-sm text-gray-600 mb-4">
        Voulez-vous vraiment supprimer <strong>{label}</strong> ? Cette action est irréversible.
      </p>
      <div className="flex gap-2 justify-end">
        <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={isPending}>Annuler</button>
        <button className="btn btn-danger btn-sm" onClick={onConfirm} disabled={isPending}>
          {isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Suppression…</> : <><Trash2 className="w-3.5 h-3.5" /> Supprimer</>}
        </button>
      </div>
    </Modal>
  );
}

// ── Champs Montant / Devise ────────────────────────────────────────────
function MoneyFields({ montant, setMontant, devise, setDevise, montantLabel = 'Montant' }: {
  montant: number | ''; setMontant: (v: number | '') => void;
  devise: Devise; setDevise: (v: Devise) => void;
  montantLabel?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-1">
        <label className="form-label">{montantLabel} *</label>
        <input type="number" min={0} step="0.01" className="form-input" value={montant}
          onChange={e => setMontant(e.target.value === '' ? '' : Number(e.target.value))} required />
      </div>
      <div className="col-span-1">
        <label className="form-label">Devise *</label>
        <select className="form-input" value={devise} onChange={e => setDevise(e.target.value as Devise)}>
          {DEVISES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
    </div>
  );
}

function FileField({ label, onChange, currentName }: {
  label: string; onChange: (f: File | null) => void; currentName?: string | null;
}) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <input type="file" className="form-input" onChange={e => onChange(e.target.files?.[0] ?? null)} />
      {currentName && <p className="text-[11px] text-gray-400 mt-1">Fichier actuel : {currentName} (laisser vide pour conserver)</p>}
    </div>
  );
}

function ScopeFields({ composanteId, setComposanteId, activiteId, setActiviteId, composantes, activites, required = false }: {
  composanteId: number | ''; setComposanteId: (v: number | '') => void;
  activiteId: number | ''; setActiviteId: (v: number | '') => void;
  composantes: Composante[]; activites: Activite[]; required?: boolean;
}) {
  const filteredActivites = composanteId
    ? activites.filter(a => a.composante_id === composanteId)
    : activites;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="form-label">Composante{required ? ' *' : ' (optionnel)'}</label>
        <select className="form-input" required={required} value={composanteId}
          onChange={e => { setComposanteId(e.target.value === '' ? '' : Number(e.target.value)); setActiviteId(''); }}>
          <option value="">{required ? '— Sélectionner une composante —' : '— Tout le projet —'}</option>
          {composantes.map(c => <option key={c.id} value={c.id}>{c.code ? `${c.code} — ` : ''}{c.nom}</option>)}
        </select>
      </div>
      <div>
        <label className="form-label">Activité{required ? ' *' : ' (optionnel)'}</label>
        <select className="form-input" required={required} disabled={required && composanteId === ''} value={activiteId}
          onChange={e => setActiviteId(e.target.value === '' ? '' : Number(e.target.value))}>
          <option value="">{required ? (composanteId === '' ? '— Choisir une composante d\'abord —' : '— Sélectionner une activité —') : '— Toute la composante —'}</option>
          {filteredActivites.map(a => <option key={a.id} value={a.id}>{a.code ? `${a.code} — ` : ''}{a.nom}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Tableau de bord : totaux + taux ───────────────────────────────────────
function CycleDashboard({ summary }: { summary: BudgetCycleSummary }) {
  const rateCards: { key: keyof BudgetCycleSummary['rates']; label: string; hint: string }[] = [
    { key: 'taux_mobilisation', label: 'Taux de mobilisation', hint: 'Mobilisé / Annoncé' },
    { key: 'taux_engagement',   label: "Taux d'engagement",    hint: 'Engagé / Mobilisé' },
    { key: 'taux_decaissement', label: 'Taux de décaissement', hint: 'Décaissé / Engagé' },
    { key: 'taux_execution',    label: "Taux d'exécution",     hint: 'Dépensé / Décaissé' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {STAGE_ORDER.map(key => {
          const meta = STAGE_META[key];
          const stage = summary.stages[key];
          const Icon = meta.icon;
          return (
            <div key={key} className={`rounded-xl border ${meta.border} ${meta.bg} p-3`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                <p className={`text-[10px] font-bold uppercase tracking-wide ${meta.text}`}>{meta.short}</p>
              </div>
              <p className="text-sm font-bold text-gray-800 leading-tight">{fmtDevises(stage?.totaux)}</p>
              <p className="text-[10px] text-gray-400">{stage?.count ?? 0} entrée{(stage?.count ?? 0) > 1 ? 's' : ''}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {rateCards.map(r => {
          const value = summary.rates[r.key];
          return (
            <div key={r.key} className="card p-4">
              <p className="text-[11px] font-semibold text-gray-500 mb-1">{r.label}</p>
              <p className="text-lg font-bold text-gray-800">{fmtTauxDevises(value)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{r.hint}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Graphique en cascade ───────────────────────────────────────────────────
function CycleCascadeChart({ summary }: { summary: BudgetCycleSummary }) {
  // Correction multidevises (§7-8-11) : chaque étape peut mélanger AR, USD,
  // EUR — une seule barre par étape n'a plus de sens. On trace une série
  // par devise réellement présente dans le cycle (summary.devises), jamais
  // un montant unique qui les additionnerait.
  const devises: Devise[] = summary.devises?.length ? summary.devises : ['AR'];
  const data = summary.cascade.map(p => {
    const row: Record<string, string | number> = { stage: p.stage };
    devises.forEach(d => { row[d] = Math.round(p.totaux[d] ?? 0); });
    return row;
  });
  const seriesColors: Record<string, string> = { AR: '#64748b', USD: '#16a34a', EUR: '#2563eb' };

  return (
    <div className="card p-4">
      <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-gray-400" /> Évolution des montants par étape
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmt(v)} width={70} />
          <Tooltip formatter={(v: number | string | readonly (number | string)[] | undefined, name) => [fmt(Number(Array.isArray(v) ? v[0] : v) || 0), name]} />
          {devises.map(d => (
            <Bar key={d} dataKey={d} name={d} radius={[6, 6, 0, 0]} fill={seriesColors[d] ?? '#94a3b8'} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Tableau récapitulatif ───────────────────────────────────────────────
function CycleRecapTable({ summary }: { summary: BudgetCycleSummary }) {
  const rows = STAGE_ORDER.map(key => {
    const stage = summary.stages[key];
    const items = stage?.items ?? [];
    const lastDate = items.reduce<string | null>((latest, it) => {
      if (!it.date) return latest;
      return !latest || it.date > latest ? it.date : latest;
    }, null);
    const withDocs = items.filter(it => it.has_justificatif).length;
    return { key, label: STAGE_META[key].label, totaux: stage?.totaux ?? {}, count: stage?.count ?? 0, lastDate, withDocs };
  });

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wide text-gray-400">
            <th className="px-4 py-3">Étape</th>
            <th className="px-4 py-3">Montant</th>
            <th className="px-4 py-3">Dernière entrée</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3">Pièces jointes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} className="border-b border-gray-50 last:border-0">
              <td className="px-4 py-3 font-semibold text-gray-700 flex items-center gap-2">
                {(() => { const Icon = STAGE_META[r.key].icon; return <Icon className="w-3.5 h-3.5" style={{ color: STAGE_META[r.key].color }} />; })()}
                {r.label}
              </td>
              <td className="px-4 py-3 font-bold text-gray-800">{fmtDevises(r.totaux)}</td>
              <td className="px-4 py-3 text-gray-500">{fmtDate(r.lastDate)}</td>
              <td className="px-4 py-3">
                {r.count === 0 ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Aucune donnée</span>
                ) : (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${STAGE_META[r.key].bg} ${STAGE_META[r.key].text} border ${STAGE_META[r.key].border}`}>
                    {r.count} entrée{r.count > 1 ? 's' : ''}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-500">{r.withDocs > 0 ? `📎 ${r.withDocs}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Section chronologique d'une étape (accordéon avec liste d'entrées) ───
function StageTimelineSection({
  stageKey, items, canWrite, canDelete, onAdd, onEdit, onDelete, onDownload, renderExtraActions, defaultOpen = false,
}: {
  stageKey: BudgetStageKey;
  items: BudgetStageItem[];
  canWrite: boolean;
  canDelete: boolean;
  onAdd: () => void;
  onEdit: (item: BudgetStageItem) => void;
  onDelete: (item: BudgetStageItem) => void;
  onDownload: (item: BudgetStageItem) => void;
  renderExtraActions?: (item: BudgetStageItem) => React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = STAGE_META[stageKey];
  const Icon = meta.icon;
  const total = items.reduce((s, i) => s + Number(i.montant || 0), 0);

  return (
    <div className={`rounded-2xl border ${meta.border} overflow-hidden bg-white`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 ${meta.bg}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
            <Icon className="w-4 h-4" style={{ color: meta.color }} />
          </div>
          <div className="text-left">
            <p className={`text-sm font-bold ${meta.text}`}>{meta.label}</p>
            <p className="text-[11px] text-gray-400">{items.length} entrée{items.length > 1 ? 's' : ''} · {fmt(total)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canWrite && (
            <span
              role="button"
              tabIndex={0}
              onClick={e => { e.stopPropagation(); onAdd(); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onAdd(); } }}
              className="btn btn-primary btn-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="p-3 space-y-2 bg-white">
          {items.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">Aucune entrée pour cette étape.</p>
          )}
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5 hover:bg-gray-50">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-700 truncate flex items-center gap-2">
                  {item.label}
                  {item.statut && item.statut !== 'complete' && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      item.statut === 'audite' || item.statut === 'realise'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {item.statut === 'audite' ? 'Audité' : item.statut === 'depense' ? 'Non audité' : item.statut === 'realise' ? 'Réalisé' : 'Planifié'}
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-gray-400">
                  {fmtDate(item.date)} · {fmt(item.montant)} {item.devise}
                  {(item.composante_id || item.activite_id) && <> · portée partielle</>}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {item.has_justificatif && (
                  <button title="Télécharger le justificatif" onClick={() => onDownload(item)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
                {renderExtraActions?.(item)}
                {canWrite && (
                  <button title="Modifier" onClick={() => onEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {canDelete && (
                  <button title="Supprimer" onClick={() => onDelete(item)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Formulaire : Budget annoncé (Pledge) ──────────────────────────────────
function PledgeFormModal({ open, onClose, financementId, editing, composantes, activites, organismes, onSaved }: {
  open: boolean; onClose: () => void; financementId: number; editing: BudgetStageItem | null;
  composantes: Composante[]; activites: Activite[]; organismes: { id: number; designation: string }[];
  onSaved: () => void;
}) {
  const isEdit = !!editing;
  const [dateAnnonce, setDateAnnonce] = useState(String(editing?.date ?? ''));
  const [bailleurId, setBailleurId] = useState<number | ''>((editing?.bailleur_id as number) ?? '');
  const [montant, setMontant] = useState<number | ''>((editing?.montant as number) ?? '');
  const [devise, setDevise] = useState<Devise>((editing?.devise as Devise) ?? 'AR');
  const [source, setSource] = useState(String(editing?.source ?? ''));
  const [description, setDescription] = useState(String(editing?.description ?? ''));
  const [composanteId, setComposanteId] = useState<number | ''>((editing?.composante_id as number) ?? '');
  const [activiteId, setActiviteId] = useState<number | ''>((editing?.activite_id as number) ?? '');
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('date_annonce', dateAnnonce);
      if (bailleurId !== '') fd.append('bailleur_id', String(bailleurId));
      fd.append('montant', String(montant));
      fd.append('devise', devise);
      if (source) fd.append('source', source);
      if (description) fd.append('description', description);
      if (composanteId !== '') fd.append('composante_id', String(composanteId));
      if (activiteId !== '') fd.append('activite_id', String(activiteId));
      if (file) fd.append('justificatif', file);
      if (isEdit) fd.append('_method', 'PUT');
      return isEdit ? budgetPledgeApi.update(editing!.id, fd) : budgetPledgeApi.create(financementId, fd);
    },
    onSuccess: () => { toast.success(isEdit ? 'Budget annoncé mis à jour' : 'Budget annoncé ajouté'); onSaved(); onClose(); },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de l\u2019enregistrement')),
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier le budget annoncé' : 'Ajouter un budget annoncé (Pledge)'}>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); mutation.mutate(); }}>
        <div>
          <label className="form-label">Date d'annonce *</label>
          <input type="date" className="form-input" value={dateAnnonce} onChange={e => setDateAnnonce(e.target.value)} required />
        </div>
        <div>
          <label className="form-label">Bailleur</label>
          <select className="form-input" value={bailleurId} onChange={e => setBailleurId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">— Non précisé —</option>
            {organismes.map(o => <option key={o.id} value={o.id}>{o.designation}</option>)}
          </select>
        </div>
        <MoneyFields montant={montant} setMontant={setMontant} devise={devise} setDevise={setDevise} />
        <div>
          <label className="form-label">Source</label>
          <input type="text" className="form-input" placeholder="COP30, communiqué officiel..." value={source} onChange={e => setSource(e.target.value)} />
        </div>
        <div>
          <label className="form-label">Description</label>
          <textarea className="form-input" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <ScopeFields composanteId={composanteId} setComposanteId={setComposanteId} activiteId={activiteId} setActiviteId={setActiviteId} composantes={composantes} activites={activites} />
        <FileField label="Pièce justificative" onChange={setFile} currentName={editing?.has_justificatif ? 'déjà attachée' : null} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck2 className="w-3.5 h-3.5" />} Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Formulaire : Budget mobilisé ──────────────────────────────────────────
function MobilisationFormModal({ open, onClose, financementId, editing, composantes, activites, organismes, categories, onSaved }: {
  open: boolean; onClose: () => void; financementId: number; editing: BudgetStageItem | null;
  composantes: Composante[]; activites: Activite[]; organismes: { id: number; designation: string }[];
  categories: { id: number; designation: string }[];
  onSaved: () => void;
}) {
  const isEdit = !!editing;
  const [organismeId, setOrganismeId] = useState<number | ''>((editing?.organisme_contributeur_id as number) ?? '');
  const [modeContribution, setModeContribution] = useState<ModeContribution>((editing?.mode_contribution as ModeContribution) ?? 'numeraire');
  const [typeMobilisation, setTypeMobilisation] = useState<TypeMobilisation | ''>((editing?.type_mobilisation as TypeMobilisation) ?? '');
  const [montant, setMontant] = useState<number | ''>((editing?.montant as number) ?? '');
  const [devise, setDevise] = useState<Devise>((editing?.devise as Devise) ?? 'AR');
  const [dateContribution, setDateContribution] = useState(String(editing?.date ?? ''));
  const [categorieId, setCategorieId] = useState<number | ''>((editing?.categorie_contribution_id as number) ?? '');
  const [description, setDescription] = useState(String(editing?.description ?? ''));
  const [commentaire, setCommentaire] = useState(String(editing?.commentaire ?? ''));
  const [composanteId, setComposanteId] = useState<number | ''>((editing?.composante_id as number) ?? '');
  const [activiteId, setActiviteId] = useState<number | ''>((editing?.activite_id as number) ?? '');
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      if (organismeId !== '') fd.append('organisme_contributeur_id', String(organismeId));
      fd.append('mode_contribution', modeContribution);
      if (typeMobilisation) fd.append('type_mobilisation', typeMobilisation);
      fd.append('montant', String(montant));
      fd.append('devise', devise);
      fd.append('date_contribution', dateContribution);
      if (modeContribution === 'nature') {
        if (categorieId !== '') fd.append('categorie_contribution_id', String(categorieId));
        fd.append('description', description);
      }
      if (commentaire) fd.append('commentaire', commentaire);
      if (composanteId !== '') fd.append('composante_id', String(composanteId));
      if (activiteId !== '') fd.append('activite_id', String(activiteId));
      if (file) fd.append('justificatif', file);
      if (isEdit) fd.append('_method', 'PUT');
      return isEdit ? budgetMobilisationApi.update(editing!.id, fd) : budgetMobilisationApi.create(financementId, fd);
    },
    onSuccess: () => { toast.success(isEdit ? 'Budget mobilisé mis à jour' : 'Budget mobilisé ajouté'); onSaved(); onClose(); },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de l\u2019enregistrement')),
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier le budget mobilisé' : 'Ajouter un budget mobilisé'}>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); mutation.mutate(); }}>
        <div>
          <label className="form-label">Source de financement (organisme) *</label>
          <select className="form-input" value={organismeId} onChange={e => setOrganismeId(e.target.value === '' ? '' : Number(e.target.value))} required>
            <option value="" disabled>Sélectionner…</option>
            {organismes.map(o => <option key={o.id} value={o.id}>{o.designation}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Mode de contribution *</label>
            <select className="form-input" value={modeContribution} onChange={e => setModeContribution(e.target.value as ModeContribution)}>
              <option value="numeraire">Numéraire</option>
              <option value="nature">En nature</option>
            </select>
          </div>
          <div>
            <label className="form-label">Type de mobilisation</label>
            <select className="form-input" value={typeMobilisation} onChange={e => setTypeMobilisation(e.target.value as TypeMobilisation)}>
              <option value="">— Non précisé —</option>
              <option value="public">Financement public</option>
              <option value="prive">Financement privé</option>
              <option value="cofinancement">Cofinancement</option>
              <option value="effet_levier">Effet de levier</option>
            </select>
          </div>
        </div>
        <MoneyFields montant={montant} setMontant={setMontant} devise={devise} setDevise={setDevise} montantLabel="Montant mobilisé" />
        <div>
          <label className="form-label">Date *</label>
          <input type="date" className="form-input" value={dateContribution} onChange={e => setDateContribution(e.target.value)} required />
        </div>
        {modeContribution === 'nature' && (
          <>
            <div>
              <label className="form-label">Catégorie (en nature) *</label>
              <select className="form-input" value={categorieId} onChange={e => setCategorieId(e.target.value === '' ? '' : Number(e.target.value))} required>
                <option value="" disabled>Sélectionner…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.designation}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Description *</label>
              <textarea className="form-input" rows={2} value={description} onChange={e => setDescription(e.target.value)} required />
            </div>
          </>
        )}
        <div>
          <label className="form-label">Commentaire</label>
          <textarea className="form-input" rows={2} value={commentaire} onChange={e => setCommentaire(e.target.value)} />
        </div>
        <ScopeFields composanteId={composanteId} setComposanteId={setComposanteId} activiteId={activiteId} setActiviteId={setActiviteId} composantes={composantes} activites={activites} />
        <FileField label="Pièce justificative" onChange={setFile} currentName={editing?.has_justificatif ? 'déjà attachée' : null} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck2 className="w-3.5 h-3.5" />} Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Formulaire : Budget engagé (Engagement) ───────────────────────────────
function EngagementFormModal({ open, onClose, financementId, editing, composantes, activites, organismes, onSaved }: {
  open: boolean; onClose: () => void; financementId: number; editing: BudgetStageItem | null;
  composantes: Composante[]; activites: Activite[]; organismes: { id: number; designation: string }[];
  onSaved: () => void;
}) {
  const isEdit = !!editing;
  const [date, setDate] = useState(String(editing?.date ?? ''));
  const [referenceAccord, setReferenceAccord] = useState(String(editing?.reference_accord ?? ''));
  const [bailleurId, setBailleurId] = useState<number | ''>((editing?.bailleur_id as number) ?? '');
  const [montant, setMontant] = useState<number | ''>((editing?.montant as number) ?? '');
  const [devise, setDevise] = useState<Devise>((editing?.devise as Devise) ?? 'AR');
  const [description, setDescription] = useState(String(editing?.description ?? ''));
  const [composanteId, setComposanteId] = useState<number | ''>((editing?.composante_id as number) ?? '');
  const [activiteId, setActiviteId] = useState<number | ''>((editing?.activite_id as number) ?? '');
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('date', date);
      if (referenceAccord) fd.append('reference_accord', referenceAccord);
      if (bailleurId !== '') fd.append('bailleur_id', String(bailleurId));
      fd.append('montant', String(montant));
      fd.append('devise', devise);
      if (description) fd.append('description', description);
      if (composanteId !== '') fd.append('composante_id', String(composanteId));
      if (activiteId !== '') fd.append('activite_id', String(activiteId));
      if (file) fd.append('justificatif', file);
      return isEdit ? suiviApi.updateEngagementWithFile(editing!.id, fd) : suiviApi.createEngagementWithFile(financementId, fd);
    },
    onSuccess: () => { toast.success(isEdit ? 'Accord mis à jour' : 'Accord ajouté'); onSaved(); onClose(); },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de l\u2019enregistrement')),
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Modifier le budget engagé" : "Ajouter un budget engagé"}>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); mutation.mutate(); }}>
        <div>
          <label className="form-label">Date de signature *</label>
          <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="form-label">Référence de l'accord</label>
          <input type="text" className="form-input" value={referenceAccord} onChange={e => setReferenceAccord(e.target.value)} />
        </div>
        <div>
          <label className="form-label">Bailleur</label>
          <select className="form-input" value={bailleurId} onChange={e => setBailleurId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">— Non précisé —</option>
            {organismes.map(o => <option key={o.id} value={o.id}>{o.designation}</option>)}
          </select>
        </div>
        <MoneyFields montant={montant} setMontant={setMontant} devise={devise} setDevise={setDevise} montantLabel="Montant engagé" />
        <div>
          <label className="form-label">Description</label>
          <textarea className="form-input" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <ScopeFields composanteId={composanteId} setComposanteId={setComposanteId} activiteId={activiteId} setActiviteId={setActiviteId} composantes={composantes} activites={activites} />
        <FileField label="Document signé" onChange={setFile} currentName={editing?.has_justificatif ? 'déjà attaché' : null} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck2 className="w-3.5 h-3.5" />} Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Formulaire : Budget approuvé ──────────────────────────────────────────
function ApprobationFormModal({ open, onClose, financementId, editing, composantes, activites, organismes, onSaved }: {
  open: boolean; onClose: () => void; financementId: number; editing: BudgetStageItem | null;
  composantes: Composante[]; activites: Activite[]; organismes: { id: number; designation: string }[];
  onSaved: () => void;
}) {
  const isEdit = !!editing;
  const [dateApprobation, setDateApprobation] = useState(String(editing?.date ?? ''));
  const [organismeId, setOrganismeId] = useState<number | ''>((editing?.organisme_id as number) ?? '');
  const [montant, setMontant] = useState<number | ''>((editing?.montant as number) ?? '');
  const [devise, setDevise] = useState<Devise>((editing?.devise as Devise) ?? 'AR');
  const [reference, setReference] = useState(String(editing?.reference ?? ''));
  const [decision, setDecision] = useState(String(editing?.decision ?? ''));
  const [composanteId, setComposanteId] = useState<number | ''>((editing?.composante_id as number) ?? '');
  const [activiteId, setActiviteId] = useState<number | ''>((editing?.activite_id as number) ?? '');
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('date_approbation', dateApprobation);
      if (organismeId !== '') fd.append('organisme_id', String(organismeId));
      fd.append('montant_approuve', String(montant));
      fd.append('devise', devise);
      if (reference) fd.append('reference', reference);
      if (decision) fd.append('decision', decision);
      if (composanteId !== '') fd.append('composante_id', String(composanteId));
      if (activiteId !== '') fd.append('activite_id', String(activiteId));
      if (file) fd.append('justificatif', file);
      if (isEdit) fd.append('_method', 'PUT');
      return isEdit ? budgetApprobationApi.update(editing!.id, fd) : budgetApprobationApi.create(financementId, fd);
    },
    onSuccess: () => { toast.success(isEdit ? 'Budget approuvé mis à jour' : 'Budget approuvé ajouté'); onSaved(); onClose(); },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de l\u2019enregistrement')),
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier le budget approuvé' : 'Ajouter un budget approuvé'}>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); mutation.mutate(); }}>
        <div>
          <label className="form-label">Date d'approbation *</label>
          <input type="date" className="form-input" value={dateApprobation} onChange={e => setDateApprobation(e.target.value)} required />
        </div>
        <div>
          <label className="form-label">Organisme (organe décisionnel)</label>
          <select className="form-input" value={organismeId} onChange={e => setOrganismeId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">— Non précisé —</option>
            {organismes.map(o => <option key={o.id} value={o.id}>{o.designation}</option>)}
          </select>
        </div>
        <MoneyFields montant={montant} setMontant={setMontant} devise={devise} setDevise={setDevise} montantLabel="Montant approuvé" />
        <div>
          <label className="form-label">Référence</label>
          <input type="text" className="form-input" value={reference} onChange={e => setReference(e.target.value)} />
        </div>
        <div>
          <label className="form-label">Décision</label>
          <textarea className="form-input" rows={2} value={decision} onChange={e => setDecision(e.target.value)} />
        </div>
        <ScopeFields composanteId={composanteId} setComposanteId={setComposanteId} activiteId={activiteId} setActiviteId={setActiviteId} composantes={composantes} activites={activites} />
        <FileField label="Document de décision" onChange={setFile} currentName={editing?.has_justificatif ? 'déjà attaché' : null} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck2 className="w-3.5 h-3.5" />} Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Formulaire : Budget programmé / planifié ──────────────────────────────
function ProgrammationFormModal({ open, onClose, financementId, editing, composantes, activites, onSaved }: {
  open: boolean; onClose: () => void; financementId: number; editing: BudgetStageItem | null;
  composantes: Composante[]; activites: Activite[];
  onSaved: () => void;
}) {
  const isEdit = !!editing;
  const [datePrevue, setDatePrevue] = useState(String(editing?.date ?? ''));
  const [exerciceBudgetaire, setExerciceBudgetaire] = useState(String(editing?.exercice_budgetaire ?? ''));
  const [annee, setAnnee] = useState<number | ''>((editing?.annee as number) ?? '');
  const [montant, setMontant] = useState<number | ''>((editing?.montant as number) ?? '');
  const [devise, setDevise] = useState<Devise>((editing?.devise as Devise) ?? 'AR');
  const [description, setDescription] = useState(String(editing?.description ?? ''));
  const [composanteId, setComposanteId] = useState<number | ''>((editing?.composante_id as number) ?? '');
  const [activiteId, setActiviteId] = useState<number | ''>((editing?.activite_id as number) ?? '');
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('date_prevue', datePrevue);
      if (exerciceBudgetaire) fd.append('exercice_budgetaire', exerciceBudgetaire);
      if (annee !== '') fd.append('annee', String(annee));
      fd.append('montant_prevu', String(montant));
      fd.append('devise', devise);
      if (description) fd.append('description', description);
      if (composanteId !== '') fd.append('composante_id', String(composanteId));
      if (activiteId !== '') fd.append('activite_id', String(activiteId));
      if (file) fd.append('justificatif', file);
      return isEdit ? suiviApi.updatePlanWithFile(editing!.id, fd) : suiviApi.createPlanWithFile(financementId, fd);
    },
    onSuccess: () => { toast.success(isEdit ? 'Budget programmé mis à jour' : 'Budget programmé ajouté'); onSaved(); onClose(); },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de l\u2019enregistrement')),
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier le budget programmé' : 'Ajouter un budget programmé'}>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); mutation.mutate(); }}>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="form-label">Date prévue *</label>
            <input type="date" className="form-input" value={datePrevue} onChange={e => setDatePrevue(e.target.value)} required />
          </div>
          <div className="col-span-1">
            <label className="form-label">Exercice budgétaire</label>
            <input type="text" className="form-input" placeholder="2026-2027" value={exerciceBudgetaire} onChange={e => setExerciceBudgetaire(e.target.value)} />
          </div>
          <div className="col-span-1">
            <label className="form-label">Année</label>
            <input type="number" className="form-input" value={annee} onChange={e => setAnnee(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
        </div>
        <MoneyFields montant={montant} setMontant={setMontant} devise={devise} setDevise={setDevise} montantLabel="Montant prévu" />
        <div>
          <label className="form-label">Description</label>
          <textarea className="form-input" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <ScopeFields composanteId={composanteId} setComposanteId={setComposanteId} activiteId={activiteId} setActiviteId={setActiviteId} composantes={composantes} activites={activites} />
        <FileField label="Pièce justificative" onChange={setFile} currentName={editing?.has_justificatif ? 'déjà attachée' : null} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck2 className="w-3.5 h-3.5" />} Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Formulaire : Budget décaissé ──────────────────────────────────────────
function DecaissementFormModal({ open, onClose, financementId, editing, composantes, activites, onSaved }: {
  open: boolean; onClose: () => void; financementId: number; editing: BudgetStageItem | null;
  composantes: Composante[]; activites: Activite[];
  onSaved: () => void;
}) {
  const isEdit = !!editing;
  const [date, setDate] = useState(String(editing?.date ?? ''));
  const [montant, setMontant] = useState<number | ''>((editing?.montant as number) ?? '');
  const [devise, setDevise] = useState<Devise>((editing?.devise as Devise) ?? 'AR');
  const [reference, setReference] = useState(String(editing?.reference ?? ''));
  const [beneficiaire, setBeneficiaire] = useState(String(editing?.beneficiaire ?? ''));
  const [commentaire, setCommentaire] = useState(String(editing?.commentaire ?? ''));
  const [composanteId, setComposanteId] = useState<number | ''>((editing?.composante_id as number) ?? '');
  const [activiteId, setActiviteId] = useState<number | ''>((editing?.activite_id as number) ?? '');
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('date', date);
      fd.append('montant', String(montant));
      fd.append('devise', devise);
      if (reference) fd.append('reference', reference);
      if (beneficiaire) fd.append('beneficiaire', beneficiaire);
      if (commentaire) fd.append('commentaire', commentaire);
      if (composanteId !== '') fd.append('composante_id', String(composanteId));
      if (activiteId !== '') fd.append('activite_id', String(activiteId));
      if (file) fd.append('justificatif', file);
      return isEdit ? suiviApi.updateDecaissementWithFile(editing!.id, fd) : suiviApi.createDecaissementWithFile(financementId, fd);
    },
    onSuccess: () => { toast.success(isEdit ? 'Déblocage mis à jour' : 'Déblocage ajouté'); onSaved(); onClose(); },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de l\u2019enregistrement')),
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier le budget décaissé' : 'Ajouter un budget décaissé'}>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); mutation.mutate(); }}>
        <div>
          <label className="form-label">Date du décaissement *</label>
          <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
        </div>
        <MoneyFields montant={montant} setMontant={setMontant} devise={devise} setDevise={setDevise} montantLabel="Montant décaissé" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Référence bancaire</label>
            <input type="text" className="form-input" value={reference} onChange={e => setReference(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Bénéficiaire</label>
            <input type="text" className="form-input" value={beneficiaire} onChange={e => setBeneficiaire(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="form-label">Commentaire</label>
          <textarea className="form-input" rows={2} value={commentaire} onChange={e => setCommentaire(e.target.value)} />
        </div>
        <ScopeFields composanteId={composanteId} setComposanteId={setComposanteId} activiteId={activiteId} setActiviteId={setActiviteId} composantes={composantes} activites={activites} />
        <FileField label="Pièce justificative" onChange={setFile} currentName={editing?.has_justificatif ? 'déjà attachée' : null} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck2 className="w-3.5 h-3.5" />} Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Formulaire : Dépense (sous-étape "dépensé", avant audit) ─────────────
function DepenseFormModal({ open, onClose, projectId, financements, editing, composantes, activites, defaultFinancementId, onSaved }: {
  open: boolean; onClose: () => void; projectId: number; financements: Financement[]; editing: BudgetStageItem | null;
  composantes: Composante[]; activites: Activite[]; defaultFinancementId: number | '';
  onSaved: () => void;
}) {
  const isEdit = !!editing;
  const [financementId, setFinancementId] = useState<number | ''>(defaultFinancementId);
  const [designation, setDesignation] = useState(String(editing?.label ?? ''));
  const [note, setNote] = useState('');
  const [montant, setMontant] = useState<number | ''>((editing?.montant as number) ?? '');
  const [devise, setDevise] = useState<Devise>((editing?.devise as Devise) ?? 'AR');
  const [date, setDate] = useState(String(editing?.date ?? ''));
  const [beneficiaire, setBeneficiaire] = useState(String(editing?.beneficiaire ?? ''));
  const [categorie, setCategorie] = useState(String(editing?.categorie ?? ''));
  const [reference, setReference] = useState('');
  const [composanteId, setComposanteId] = useState<number | ''>((editing?.composante_id as number) ?? '');
  const [activiteId, setActiviteId] = useState<number | ''>((editing?.activite_id as number) ?? '');
  const [annee, setAnnee] = useState<number | ''>((editing?.annee as number) ?? new Date().getFullYear());
  const [semestre, setSemestre] = useState<'S1' | 'S2' | ''>((editing?.semestre as 'S1' | 'S2') ?? '');
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('project_id', String(projectId));
      if (financementId !== '') fd.append('financement_id', String(financementId));
      fd.append('designation', designation);
      fd.append('note', note);
      fd.append('montant', String(montant));
      fd.append('devise', devise);
      fd.append('date', date);
      fd.append('annee', String(annee));
      fd.append('semestre', String(semestre));
      fd.append('beneficiaire', beneficiaire);
      if (categorie) fd.append('categorie', categorie);
      if (reference) fd.append('reference', reference);
      fd.append('composante_id', String(composanteId));
      fd.append('activite_id', String(activiteId));
      if (file) fd.append('justification', file);
      if (isEdit) fd.append('_method', 'PUT');
      return isEdit
        ? depenseApi.update(editing!.id, Object.fromEntries(fd.entries()))
        : depenseApi.create(fd);
    },
    onSuccess: () => { toast.success(isEdit ? 'Dépense mise à jour' : 'Dépense ajoutée'); onSaved(); onClose(); },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de l\u2019enregistrement')),
  });

  const YEARS_DEPENSE = Array.from({ length: 16 }, (_, i) => new Date().getFullYear() + 5 - i);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Hiérarchie Projet → Composante → Activité → Dépense obligatoire, et
    // période Année + Semestre obligatoire (§4/§5) — revalidé de toute façon
    // côté backend (assertHierarchy), mais on évite ici un aller-retour
    // réseau inutile pour une erreur détectable côté client.
    if (composanteId === '') { toast.error('La composante est obligatoire.'); return; }
    if (activiteId === '') { toast.error("L'activité est obligatoire."); return; }
    if (semestre === '') { toast.error('Le semestre est obligatoire.'); return; }
    if (!montant || Number(montant) <= 0) { toast.error('Le montant doit être strictement supérieur à 0.'); return; }
    mutation.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier la dépense' : 'Ajouter une dépense'} wide>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div>
          <label className="form-label">Financement</label>
          <select className="form-input" value={financementId} onChange={e => setFinancementId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">— Non rattachée —</option>
            {financements.map(f => <option key={f.id} value={f.id}>{f.source_financement} ({f.type_financement})</option>)}
          </select>
        </div>
        {/* Hiérarchie obligatoire Projet (déjà connu) → Composante → Activité */}
        <ScopeFields required composanteId={composanteId} setComposanteId={setComposanteId} activiteId={activiteId} setActiviteId={setActiviteId} composantes={composantes} activites={activites} />
        <div>
          <label className="form-label">Désignation *</label>
          <input type="text" className="form-input" value={designation} onChange={e => setDesignation(e.target.value)} required />
        </div>
        <div>
          <label className="form-label">Note *</label>
          <textarea className="form-input" rows={2} value={note} onChange={e => setNote(e.target.value)} required />
        </div>
        <MoneyFields montant={montant} setMontant={setMontant} devise={devise} setDevise={setDevise} />
        {/* Période de suivi semestriel — indépendante de la date précise ci-dessous */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Année de référence *</label>
            <select className="form-input" required value={annee} onChange={e => setAnnee(Number(e.target.value))}>
              {YEARS_DEPENSE.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Semestre *</label>
            <select className="form-input" required value={semestre} onChange={e => setSemestre(e.target.value as 'S1' | 'S2')}>
              <option value="">— Sélectionner —</option>
              <option value="S1">S1 — Premier semestre</option>
              <option value="S2">S2 — Deuxième semestre</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Date de la dépense *</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="form-label">Bénéficiaire *</label>
            <input type="text" className="form-input" value={beneficiaire} onChange={e => setBeneficiaire(e.target.value)} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Catégorie</label>
            <input type="text" className="form-input" value={categorie} onChange={e => setCategorie(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Référence</label>
            <input type="text" className="form-input" value={reference} onChange={e => setReference(e.target.value)} />
          </div>
        </div>
        <FileField label="Pièce justificative" onChange={setFile} currentName={editing?.has_justificatif ? 'déjà attachée' : null} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck2 className="w-3.5 h-3.5" />} Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Formulaire : Auditer une dépense (étape finale) ───────────────────────
function AuditFormModal({ open, onClose, depense, onSaved }: {
  open: boolean; onClose: () => void; depense: BudgetStageItem | null; onSaved: () => void;
}) {
  const [montantAudite, setMontantAudite] = useState<number | ''>((depense?.montant_audite as number) ?? '');
  const [organismeAudit, setOrganismeAudit] = useState(String(depense?.organisme_audit ?? ''));
  const [dateAudit, setDateAudit] = useState(String(depense?.date_audit ?? ''));
  const [observation, setObservation] = useState(String(depense?.observation_audit ?? ''));
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('montant_audite', String(montantAudite));
      fd.append('organisme_audit', organismeAudit);
      fd.append('date_audit', dateAudit);
      if (observation) fd.append('observation_audit', observation);
      if (file) fd.append('rapport_audit', file);
      return depenseApi.audit(depense!.id, fd);
    },
    onSuccess: () => { toast.success('Dépense auditée'); onSaved(); onClose(); },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de l\u2019audit')),
  });

  if (!depense) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Auditer la dépense — ${depense.label}`}>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); mutation.mutate(); }}>
        <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-500">
          Montant dépensé : <strong>{fmt(depense.montant)} {depense.devise}</strong> le {fmtDate(depense.date)}
        </div>
        <div>
          <label className="form-label">Montant audité *</label>
          <input type="number" min={0} step="0.01" className="form-input" value={montantAudite}
            onChange={e => setMontantAudite(e.target.value === '' ? '' : Number(e.target.value))} required />
        </div>
        <div>
          <label className="form-label">Organisme d'audit *</label>
          <input type="text" className="form-input" value={organismeAudit} onChange={e => setOrganismeAudit(e.target.value)} required />
        </div>
        <div>
          <label className="form-label">Date d'audit *</label>
          <input type="date" className="form-input" value={dateAudit} onChange={e => setDateAudit(e.target.value)} required />
        </div>
        <div>
          <label className="form-label">Observation</label>
          <textarea className="form-input" rows={2} value={observation} onChange={e => setObservation(e.target.value)} />
        </div>
        <FileField label="Rapport d'audit" onChange={setFile} currentName={depense.has_rapport_audit ? 'déjà attaché' : null} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardCheck className="w-3.5 h-3.5" />} Valider l'audit
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Suivi des dépenses : Composante → Activité, budget/dépensé/solde/taux ──
// Alimenté par GET /projects/{id}/depenses-summary (DepenseController::summaryForProject).
// Réutilise Composante::budget / Activite::budget déjà existants — aucun
// nouveau champ budgétaire créé (cahier des charges §10/§13).
function DepenseHierarchySummary({ projectId }: { projectId: number }) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const { data: summary, isLoading } = useQuery({
    queryKey: ['depenses-summary', projectId],
    queryFn: () => depenseApi.summaryByProject(projectId).then(r => r.data),
  });

  if (isLoading || !summary) {
    return (
      <div className="card p-5 flex justify-center">
        <div className="w-5 h-5 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  const toggle = (id: number) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const tauxBadge = (taux: number | null) => {
    if (taux === null) return <span className="text-gray-300">—</span>;
    const color = taux >= 90 ? 'text-red-600 bg-red-50' : taux >= 60 ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50';
    return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${color}`}>{taux}%</span>;
  };

  // Budget/solde restent des montants mono-devise (ceux de la composante ou
  // de l'activité) — on affiche simplement leur devise à côté du montant.
  const fmtAvecDevise = (montant: number | null, devise?: Devise | null) =>
    montant === null ? '—' : `${fmt(montant)}${devise ? ` ${devise}` : ''}`;

  // Taux d'exécution projet : désormais ventilé par devise (§9-10), un
  // badge par devise ayant un taux calculable.
  const tauxBadgeDevises = (taux: Partial<Record<string, number | null>>) => {
    const entries = Object.entries(taux).filter(([, v]) => v !== null && v !== undefined);
    if (entries.length === 0) return <span className="text-gray-300">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {entries.map(([devise, v]) => (
          <span key={devise}>{tauxBadge(v ?? null)} <span className="text-[10px] text-gray-400">{devise}</span></span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Totaux par semestre / année (§9) */}
      {summary.par_periode.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Totaux par période</p>
          <div className="flex flex-wrap gap-2">
            {summary.par_periode.map(p => (
              <span key={`${p.annee}-${p.semestre}`} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                {p.annee} {p.semestre} : {fmtDevises(p.totaux)}
              </span>
            ))}
            <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-800 text-white">
              Total cumulé : {fmtDevises(summary.project.totaux_depense)}
            </span>
          </div>
        </div>
      )}

      {/* Arborescence Composante → Activité (§11/§12) */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wide text-gray-400">
              <th className="px-4 py-3">Composante / Activité</th>
              <th className="px-4 py-3 text-right">Budget prévu</th>
              <th className="px-4 py-3 text-right">Dépensé (par devise)</th>
              <th className="px-4 py-3 text-right">Solde</th>
              <th className="px-4 py-3">Taux d'exécution</th>
            </tr>
          </thead>
          <tbody>
            {summary.composantes.map(c => (
              <Fragment key={c.id}>
                <tr className="border-b border-gray-50 bg-gray-50/60 cursor-pointer" onClick={() => toggle(c.id)}>
                  <td className="px-4 py-2.5 font-bold text-gray-800 flex items-center gap-1.5">
                    {expanded[c.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {c.nom}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{fmtAvecDevise(c.budget, c.devise)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{fmtDevises(c.totaux_depense)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{fmtAvecDevise(c.solde, c.devise)}</td>
                  <td className="px-4 py-2.5">{tauxBadge(c.taux_execution)}</td>
                </tr>
                {expanded[c.id] && c.activites.map(a => (
                  <tr key={`a-${a.id}`} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-2 pl-9 text-gray-600">{a.nom}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{fmtAvecDevise(a.budget, a.devise)}</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-700">{fmtDevises(a.totaux_depense)}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{fmtAvecDevise(a.solde, a.devise)}</td>
                    <td className="px-4 py-2">{tauxBadge(a.taux_execution)}</td>
                  </tr>
                ))}
                {expanded[c.id] && c.activites.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-2 pl-9 text-gray-300 italic text-xs">Aucune activité dans cette composante.</td></tr>
                )}
              </Fragment>
            ))}
            {summary.composantes.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Aucune composante définie pour ce projet.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-100 font-bold text-gray-800">
              <td className="px-4 py-3">Total projet</td>
              <td className="px-4 py-3 text-right">{fmtDevises(summary.project.budget)}</td>
              <td className="px-4 py-3 text-right">{fmtDevises(summary.project.totaux_depense)}</td>
              <td className="px-4 py-3 text-right">{fmtDevises(summary.project.solde)}</td>
              <td className="px-4 py-3">{tauxBadgeDevises(summary.project.taux_execution)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {summary.non_ventilees.count > 0 && (
        <p className="text-xs text-gray-400 px-1">
          {summary.non_ventilees.count} dépense(s) historique(s) non rattachée(s) à une composante/activité
          (total {fmtDevises(summary.non_ventilees.totaux_depense)}) — non incluses dans l'arborescence ci-dessus.
        </p>
      )}
    </div>
  );
}

// ── Composant principal : onglet "Budgets" ────────────────────────────────
export default function BudgetsCycleTab({ project, canWrite, canDelete }: {
  project: Project; canWrite: boolean; canDelete: boolean;
}) {
  const qc = useQueryClient();

  const [financementFilter, setFinancementFilter] = useState<number | ''>('');
  const [composanteFilter, setComposanteFilter]   = useState<number | ''>('');
  const [activiteFilter, setActiviteFilter]       = useState<number | ''>('');

  const [modalStage, setModalStage] = useState<BudgetStageKey | null>(null);
  const [editingItem, setEditingItem] = useState<BudgetStageItem | null>(null);
  const [auditingItem, setAuditingItem] = useState<BudgetStageItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ stage: BudgetStageKey; item: BudgetStageItem } | null>(null);

  const { data: financements = [] } = useQuery({
    queryKey: ['project-financements', project.id],
    queryFn:  () => projectApi.financements(project.id).then(r => (Array.isArray(r.data) ? r.data : r.data.data)),
  });
  const { data: composantes = [] } = useQuery({
    queryKey: ['project-composantes-budgets', project.id],
    queryFn:  () => composanteApi.listByProject(project.id).then(r => r.data),
  });
  const { data: activites = [] } = useQuery({
    queryKey: ['project-activites-budgets', project.id],
    // listAllForProject (et non listByProject) : il faut aussi les activités
    // rattachées à une composante, sinon impossible de sélectionner/afficher
    // l'activité déjà enregistrée sur une dépense/étape du cycle budgétaire.
    queryFn:  () => activiteApi.listAllForProject(project.id).then(r => r.data),
  });
  const { data: organismes = [] } = useQuery({
    queryKey: ['organismes-contributeurs'],
    queryFn:  () => organismeContributeurApi.list().then(r => r.data),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['contribution-categories'],
    queryFn:  () => contributionCategorieApi.list().then(r => r.data),
  });

  const summaryParams = {
    financement_id: financementFilter || undefined,
    composante_id:  composanteFilter || undefined,
    activite_id:    activiteFilter || undefined,
  };

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['budget-cycle-summary', project.id, financementFilter, composanteFilter, activiteFilter],
    queryFn:  () => budgetCycleApi.forProject(project.id, summaryParams).then(r => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['budget-cycle-summary', project.id] });
    qc.invalidateQueries({ queryKey: ['depenses-summary', project.id] });
  };

  const downloadHandlers: Record<BudgetStageKey, (item: BudgetStageItem) => void> = {
    pledge:    item => budgetPledgeApi.download(item.id),
    mobilise:  item => budgetMobilisationApi.download(item.id),
    engage:    item => suiviApi.downloadEngagement(item.id),
    approuve:  item => budgetApprobationApi.download(item.id),
    programme: item => suiviApi.downloadPlan(item.id),
    decaisse:  item => suiviApi.downloadDecaissement(item.id),
    audite:    item => depenseApi.download(item.id),
  };

  const deleteMutation = useMutation({
    mutationFn: async ({ stage, item }: { stage: BudgetStageKey; item: BudgetStageItem }) => {
      switch (stage) {
        case 'pledge':    return budgetPledgeApi.delete(item.id);
        case 'mobilise':  return budgetMobilisationApi.delete(item.id);
        case 'engage':    return suiviApi.deleteEngagement(item.id);
        case 'approuve':  return budgetApprobationApi.delete(item.id);
        case 'programme': return suiviApi.deletePlan(item.id);
        case 'decaisse':  return suiviApi.deleteDecaissement(item.id);
        case 'audite':    return depenseApi.delete(item.id);
      }
    },
    onSuccess: () => { toast.success('Entrée supprimée'); invalidate(); setDeleteTarget(null); },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de la suppression')),
  });

  const openAdd = (stage: BudgetStageKey) => { setEditingItem(null); setModalStage(stage); };
  const openEdit = (stage: BudgetStageKey, item: BudgetStageItem) => { setEditingItem(item); setModalStage(stage); };
  const closeModal = () => { setModalStage(null); setEditingItem(null); };

  const financementIdForForms: number | '' = financementFilter || (financements[0]?.id ?? '');
  const canAdd = canWrite && typeof financementIdForForms === 'number';

  if (summaryLoading || !summary) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* En-tête + filtres */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-500 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold text-indigo-100 uppercase tracking-wide mb-1">Cycle de vie des budgets climatiques</p>
            <p className="text-lg font-bold leading-tight">Annoncé → Mobilisé → Engagé → Approuvé → Programmé → Décaissé → Audité</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white/10 rounded-xl px-3 py-2">
            <label className="text-[10px] font-bold text-indigo-100 uppercase tracking-wide flex items-center gap-1 mb-1">
              <Filter className="w-3 h-3" /> Financement
            </label>
            <select
              className="w-full bg-white/95 text-gray-700 text-sm rounded-lg px-2 py-1.5 outline-none"
              value={financementFilter}
              onChange={e => setFinancementFilter(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Tous les financements</option>
              {(financements as Financement[]).map(f => (
                <option key={f.id} value={f.id}>{f.source_financement} ({f.type_financement})</option>
              ))}
            </select>
          </div>
          <div className="bg-white/10 rounded-xl px-3 py-2">
            <label className="text-[10px] font-bold text-indigo-100 uppercase tracking-wide mb-1 block">Composante</label>
            <select
              className="w-full bg-white/95 text-gray-700 text-sm rounded-lg px-2 py-1.5 outline-none"
              value={composanteFilter}
              onChange={e => { setComposanteFilter(e.target.value === '' ? '' : Number(e.target.value)); setActiviteFilter(''); }}
            >
              <option value="">Toutes les composantes</option>
              {(composantes as Composante[]).map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div className="bg-white/10 rounded-xl px-3 py-2">
            <label className="text-[10px] font-bold text-indigo-100 uppercase tracking-wide mb-1 block">Activité</label>
            <select
              className="w-full bg-white/95 text-gray-700 text-sm rounded-lg px-2 py-1.5 outline-none"
              value={activiteFilter}
              onChange={e => setActiviteFilter(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Toutes les activités</option>
              {(activites as Activite[])
                .filter(a => !composanteFilter || a.composante_id === composanteFilter)
                .map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
            </select>
          </div>
        </div>
        {!canAdd && canWrite && (
          <p className="text-[11px] text-indigo-100 mt-3">
            Sélectionnez un financement précis pour pouvoir ajouter de nouvelles entrées.
          </p>
        )}
      </div>

      {financements.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center py-16 text-gray-400 bg-white">
          <p className="font-semibold text-gray-500 mb-1">Aucun financement lié à ce projet</p>
          <p className="text-xs text-gray-400">Ajoutez un financement avant de suivre son cycle budgétaire.</p>
        </div>
      ) : (
        <>
          <CycleDashboard summary={summary} />
          <CycleCascadeChart summary={summary} />
          <CycleRecapTable summary={summary} />

          {/* Suivi des dépenses Projet → Composante → Activité (§11/§12) */}
          <div>
            <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-500" /> Suivi des dépenses par composante / activité
            </p>
            <DepenseHierarchySummary projectId={project.id} />
          </div>

          <div className="space-y-3">
            {STAGE_ORDER.map(stageKey => (
              <StageTimelineSection
                key={stageKey}
                stageKey={stageKey}
                items={summary.stages[stageKey]?.items ?? []}
                canWrite={canAdd}
                canDelete={canDelete}
                onAdd={() => openAdd(stageKey)}
                onEdit={item => openEdit(stageKey, item)}
                onDelete={item => setDeleteTarget({ stage: stageKey, item })}
                onDownload={item => downloadHandlers[stageKey](item)}
                renderExtraActions={stageKey === 'audite' ? (item => (
                  canWrite && (
                    <button title="Auditer cette dépense" onClick={() => setAuditingItem(item)}
                      className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500">
                      <ClipboardCheck className="w-3.5 h-3.5" />
                    </button>
                  )
                )) : undefined}
              />
            ))}
          </div>
        </>
      )}

      {/* Modales d'ajout / édition */}
      {modalStage === 'pledge' && (
        <PledgeFormModal open onClose={closeModal} financementId={Number(financementIdForForms)} editing={editingItem}
          composantes={composantes} activites={activites} organismes={organismes} onSaved={invalidate} />
      )}
      {modalStage === 'mobilise' && (
        <MobilisationFormModal open onClose={closeModal} financementId={Number(financementIdForForms)} editing={editingItem}
          composantes={composantes} activites={activites} organismes={organismes} categories={categories} onSaved={invalidate} />
      )}
      {modalStage === 'engage' && (
        <EngagementFormModal open onClose={closeModal} financementId={Number(financementIdForForms)} editing={editingItem}
          composantes={composantes} activites={activites} organismes={organismes} onSaved={invalidate} />
      )}
      {modalStage === 'approuve' && (
        <ApprobationFormModal open onClose={closeModal} financementId={Number(financementIdForForms)} editing={editingItem}
          composantes={composantes} activites={activites} organismes={organismes} onSaved={invalidate} />
      )}
      {modalStage === 'programme' && (
        <ProgrammationFormModal open onClose={closeModal} financementId={Number(financementIdForForms)} editing={editingItem}
          composantes={composantes} activites={activites} onSaved={invalidate} />
      )}
      {modalStage === 'decaisse' && (
        <DecaissementFormModal open onClose={closeModal} financementId={Number(financementIdForForms)} editing={editingItem}
          composantes={composantes} activites={activites} onSaved={invalidate} />
      )}
      {modalStage === 'audite' && (
        <DepenseFormModal open onClose={closeModal} projectId={project.id} financements={financements} editing={editingItem}
          composantes={composantes} activites={activites} defaultFinancementId={financementIdForForms} onSaved={invalidate} />
      )}

      {auditingItem && (
        <AuditFormModal open onClose={() => setAuditingItem(null)} depense={auditingItem} onSaved={invalidate} />
      )}

      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        isPending={deleteMutation.isPending}
        label={deleteTarget ? `« ${deleteTarget.item.label} »` : ''}
      />
    </div>
  );
}