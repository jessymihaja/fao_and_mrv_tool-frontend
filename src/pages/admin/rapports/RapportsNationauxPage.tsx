// src/pages/admin/rapports/RapportsNationauxPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rapportNationalApi } from '@/api/services';
import { geoApi } from '@/api/services';
import {
  Plus, Trash2, FileText, Download, RefreshCw,
  X, Loader2, Globe, BookOpen, Filter, Zap,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import type { RapportNational } from '@/types';
import { getErrorMessage } from '@/utils/apiError';
import { useAuthStore } from '@/store/authStore';

const SECTEURS = [
  'adaptation', 'attenuation', 'resilience', 'biodiversite',
  'eau', 'foret', 'energie', 'transport', 'agriculture',
];

const STATUTS_PROJET = ['Concept Note', 'Funding Proposal', 'En cours', 'Clôturé'];

// Correction multidevises (§7-11-14) : un rapport national agrège des
// financements potentiellement en AR, USD et EUR — jamais de total unique
// étiqueté "Ar". Chaque devise réellement présente est affichée séparément.
const fmtDevises = (totaux?: Partial<Record<string, number>>): string => {
  const entries = Object.entries(totaux ?? {}).filter(([, v]) => (v ?? 0) !== 0);
  if (entries.length === 0) return '0';
  return entries.map(([devise, montant]) => `${Number(montant).toLocaleString('fr-MG')} ${devise}`).join(' · ');
};

const fmtTauxParDevise = (taux?: Partial<Record<string, number | null>>): string => {
  const entries = Object.entries(taux ?? {}).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) return '—';
  return entries.map(([devise, v]) => `${(v ?? 0).toFixed(1)}% ${devise}`).join(' · ');
};

const STATUT_RAPPORT: Record<string, { bg: string; text: string; label: string }> = {
  brouillon: { bg: 'bg-gray-100', text: 'text-gray-600', label: '⏳ Brouillon' },
  genere:    { bg: 'bg-blue-100', text: 'text-blue-700', label: '📄 Généré'    },
  publie:    { bg: 'bg-green-100', text: 'text-green-700', label: '✅ Publié'   },
};

const emptyForm: Partial<RapportNational> = {
  titre:              '',
  annee:              new Date().getFullYear(),
  region_id:          undefined,
  secteur_climatique: '',
  accredited_entity:  '',
  source_financement: '',
  statut_projet:      '',
};

// ── Modal ──────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-14 px-4 pb-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-white rounded-2xl w-full shadow-2xl flex flex-col max-h-[calc(100dvh-32px)] overflow-hidden ${wide ? 'max-w-xl' : 'max-w-md'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Résumé contenu rapport ─────────────────────────────────────────────────────
function RapportContenuPreview({ rapport }: { rapport: RapportNational }) {
  const c = rapport.contenu;
  if (!c) return <p className="text-sm text-gray-400 italic">Rapport non encore généré.</p>;
  const r = c.resume;
  const p = c.physique;
  const cl = c.climatique;
  return (
    <div className="space-y-4">
      {/* Résumé exécutif */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <h4 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-gray-400" /> Résumé exécutif
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Projets', value: r.total_projets },
            { label: 'Budget approuvé', value: fmtDevises(r.budget_total_approuve) },
            { label: 'Budget engagé',   value: fmtDevises(r.budget_engage) },
            { label: 'Budget décaissé', value: fmtDevises(r.budget_decaisse) },
            { label: 'Taux exécution',  value: fmtTauxParDevise(r.taux_execution_global) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-lg p-3 border border-gray-100">
              <div className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{label}</div>
              <div className="text-sm font-bold text-gray-800 mt-0.5">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Physique */}
      <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
        <h4 className="font-semibold text-orange-700 text-sm mb-3">🏗️ Résultats Physiques</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-gray-500">Bénéficiaires :</span> <strong>{Number(p.total_beneficiaires).toLocaleString('fr-MG')}</strong></div>
          <div><span className="text-gray-500">Infrastructures :</span> <strong>{p.infrastructures_realisees}</strong></div>
          <div><span className="text-gray-500">Surface restaurée :</span> <strong>{p.surfaces_restaurees} ha</strong></div>
          <div><span className="text-gray-500">Formations :</span> <strong>{p.formations_realisees}</strong></div>
        </div>
      </div>

      {/* Climatique */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <h4 className="font-semibold text-green-700 text-xs mb-2">🌿 Adaptation</h4>
          <div className="space-y-1 text-xs text-gray-600">
            <div>Pop. résiliente : <strong>{Number(cl.adaptation.population_resiliente).toLocaleString('fr-MG')}</strong></div>
            <div>Réd. vulnérabilité : <strong>{cl.adaptation.reduction_vulnerabilite}%</strong></div>
            <div>Systèmes alerte : <strong>{cl.adaptation.systemes_alerte}</strong></div>
          </div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <h4 className="font-semibold text-purple-700 text-xs mb-2">🌡️ Atténuation</h4>
          <div className="space-y-1 text-xs text-gray-600">
            <div>CO₂ évité : <strong>{Number(cl.attenuation.co2_evite).toLocaleString('fr-MG')} t</strong></div>
            <div>Énergie RN : <strong>{cl.attenuation.energie_renouvelable} MWh</strong></div>
            <div>Réd. énergie : <strong>{cl.attenuation.reduction_energetique}%</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────
export default function RapportsNationauxPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canWrite  = ['super_admin', 'admin', 'gestionnaire'].includes(user?.role ?? '');
  const canDelete = ['super_admin', 'admin'].includes(user?.role ?? '');

  const [page, setPage]           = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [viewItem, setViewItem]   = useState<RapportNational | null>(null);
  const [deleteId, setDeleteId]   = useState<number | null>(null);
  const [form, setForm]           = useState<Partial<RapportNational>>(emptyForm);
  const [generating, setGenerating] = useState<number | null>(null);

  const setF = (k: keyof RapportNational, v: RapportNational[keyof RapportNational]) => setForm((f) => ({ ...f, [k]: v }));
  const { data: regionsData } = useQuery({
    queryKey: ['geo-regions'],
    queryFn: () => geoApi.regions().then(r => r.data),
  });
  const regions = regionsData ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['rapports-nationaux', page],
    queryFn:  () => rapportNationalApi.list({ page, per_page: 12 }).then(r => r.data),
  });
  const rapports = data?.data ?? [];
  const lastPage = data?.last_page ?? 1;

  const mutCreate = useMutation({
    mutationFn: (d: Partial<RapportNational>) => rapportNationalApi.create(d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['rapports-nationaux'] });
      toast.success('Rapport créé ✓');
      setShowCreate(false);
      setForm(emptyForm);
      // Générer automatiquement
      setGenerating(res.data.id);
      rapportNationalApi.generate(res.data.id).then(() => {
        qc.invalidateQueries({ queryKey: ['rapports-nationaux'] });
        toast.success('Rapport généré et prêt ✓');
        setGenerating(null);
      }).catch(() => { toast.error('Erreur lors de la génération'); setGenerating(null); });
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Erreur')),
  });

  const mutDelete = useMutation({
    mutationFn: (id: number) => rapportNationalApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rapports-nationaux'] });
      toast.success('Rapport supprimé');
      setDeleteId(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const handleGenerate = async (id: number) => {
    setGenerating(id);
    try {
      await rapportNationalApi.generate(id);
      qc.invalidateQueries({ queryKey: ['rapports-nationaux'] });
      toast.success('Rapport régénéré ✓');
    } catch {
      toast.error('Erreur lors de la génération');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Globe className="w-6 h-6 text-green-600" />
            Rapports Nationaux
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Rapports consolidés par année, région, secteur ou source de financement
          </p>
        </div>
        {canWrite && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Nouveau rapport
          </button>
        )}
      </div>

      {/* Grille rapports */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
        </div>
      ) : rapports.length === 0 ? (
        <div className="card text-center py-20 text-gray-400">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="font-medium">Aucun rapport national</p>
          {canWrite && (
            <button className="mt-3 text-sm text-green-600 hover:underline" onClick={() => setShowCreate(true)}>
              Créer le premier rapport
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rapports.map(r => {
            const st = STATUT_RAPPORT[r.statut] ?? STATUT_RAPPORT.brouillon;
            const isGen = generating === r.id;
            return (
              <div key={r.id} className="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800 truncate" title={r.titre}>{r.titre}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {r.annee && `Année ${r.annee}`}
                      {r.secteur_climatique && ` · ${r.secteur_climatique}`}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${st.bg} ${st.text}`}>
                    {st.label}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {r.region_id && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Filter className="w-2.5 h-2.5" /> Région #{r.region_id}
                    </span>
                  )}
                  {r.statut_projet && (
                    <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">{r.statut_projet}</span>
                  )}
                  {r.accredited_entity && (
                    <span className="text-xs bg-purple-50 text-purple-500 px-2 py-0.5 rounded-full truncate max-w-[120px]">{r.accredited_entity}</span>
                  )}
                </div>

                <div className="text-xs text-gray-400">
                  Créé le {r.created_at ? format(new Date(r.created_at), 'dd/MM/yyyy') : '—'}
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-gray-100 flex-wrap">
                  <button
                    className="btn btn-secondary btn-sm flex-1"
                    onClick={() => setViewItem(r)}
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Consulter
                  </button>
                  {canWrite && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleGenerate(r.id)}
                      disabled={isGen}
                      title="Régénérer"
                    >
                      {isGen ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  {r.statut === 'genere' || r.statut === 'publie' ? (
                    <>
                      <a
                        href={rapportNationalApi.exportPdfUrl(r.id)}
                        target="_blank" rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                        title="Exporter PDF"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </a>
                      <a
                        href={rapportNationalApi.exportExcelUrl(r.id)}
                        target="_blank" rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                        title="Exporter Excel"
                      >
                        <FileText className="w-3.5 h-3.5" /> XLS
                      </a>
                    </>
                  ) : null}
                  {canDelete && (
                    <button
                      className="p-2 rounded-lg hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors"
                      onClick={() => setDeleteId(r.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-500">Page {page} / {lastPage}</span>
          <button className="btn btn-secondary btn-sm" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal création */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau rapport national" wide>
        <div className="space-y-4">
          <div>
            <label className="form-label">Titre du rapport *</label>
            <input className="form-input" required placeholder="Ex : Rapport annuel AND-GCF 2024"
              value={form.titre ?? ''} onChange={e => setF('titre', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Année</label>
              <input type="number" className="form-input" min={2010} max={2100}
                value={form.annee ?? ''} onChange={e => setF('annee', e.target.value ? Number(e.target.value) : undefined)} />
            </div>
            <div>
              <label className="form-label">Région</label>
              <select className="form-input" value={form.region_id ?? ''}
                onChange={e => setF('region_id', e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">Toutes les régions</option>
                {regions.map((reg) => <option key={reg.id} value={reg.id}>{reg.nom}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Secteur climatique</label>
              <select className="form-input" value={form.secteur_climatique ?? ''}
                onChange={e => setF('secteur_climatique', e.target.value)}>
                <option value="">Tous secteurs</option>
                {SECTEURS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Statut projet</label>
              <select className="form-input" value={form.statut_projet ?? ''}
                onChange={e => setF('statut_projet', e.target.value)}>
                <option value="">Tous statuts</option>
                {STATUTS_PROJET.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Entité accréditée</label>
            <input className="form-input" placeholder="Ex : ONE, WWF, UNDP…"
              value={form.accredited_entity ?? ''} onChange={e => setF('accredited_entity', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Source de financement</label>
            <input className="form-input" placeholder="Ex : GCF, GEF…"
              value={form.source_financement ?? ''} onChange={e => setF('source_financement', e.target.value)} />
          </div>

          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700">
            <Zap className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
            Le rapport sera automatiquement généré après création en agrégeant tous les projets, financements et indicateurs correspondant aux filtres.
          </div>

          <div className="flex gap-3 pt-1">
            <button className="btn btn-secondary flex-1" onClick={() => setShowCreate(false)}>Annuler</button>
            <button
              className="btn btn-primary flex-1"
              disabled={mutCreate.isPending || !form.titre}
              onClick={() => mutCreate.mutate(form)}
            >
              {mutCreate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {mutCreate.isPending ? 'Création…' : 'Créer et générer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal consultation */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title={viewItem?.titre ?? ''} wide>
        {viewItem && <RapportContenuPreview rapport={viewItem} />}
      </Modal>

      {/* Modal suppression */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Confirmer la suppression">
        <p className="text-sm text-gray-600 mb-5">Supprimer ce rapport national ? Cette action est irréversible.</p>
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
    </div>
  );
}