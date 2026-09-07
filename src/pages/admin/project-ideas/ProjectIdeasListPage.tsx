// src/pages/admin/project-ideas/ProjectIdeasListPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Eye, Pencil, Trash2, ArrowRightCircle, Filter, ChevronLeft, ChevronRight,
  Loader2, FileDown, FileSpreadsheet, Lightbulb, X, LayoutDashboard, Link as LinkIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import ExcelJS from 'exceljs';
import { projectIdeaApi, secteurApi, geoApi } from '@/api/services';
import { useAuthStore } from '@/store/authStore';
import { STATUT_IDEE_LABELS, type ProjectIdea, type StatutIdee } from '@/types';
import { getErrorMessage } from '@/utils/apiError';

const STATUT_STYLES: Record<StatutIdee, string> = {
  brouillon: 'bg-gray-100 text-gray-600 border-gray-200',
  soumis: 'bg-blue-50 text-blue-700 border-blue-200',
  en_etude: 'bg-amber-50 text-amber-700 border-amber-200',
  approuve: 'bg-green-50 text-green-700 border-green-200',
  converti: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : Math.round(n).toLocaleString('fr-MG'));
const fmtDate = (d?: string | null) => (d ? format(new Date(d), 'dd/MM/yyyy') : '—');

function ConfirmDeleteModal({ open, onClose, onConfirm, isPending, titre }: {
  open: boolean; onClose: () => void; onConfirm: () => void; isPending: boolean; titre: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-5">
        <h3 className="font-bold text-gray-800 mb-2">Supprimer cette idée de projet ?</h3>
        <p className="text-sm text-gray-500 mb-4">
          « <strong>{titre}</strong> » sera définitivement supprimée. Cette action est irréversible.
        </p>
        <div className="flex justify-end gap-2">
          <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={isPending}>Annuler</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm} disabled={isPending}>
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Export Excel (100% client-side avec exceljs) ────
async function exportToExcel(ideas: ProjectIdea[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Idées de projet');

  // 1. Définition des colonnes avec les largeurs exactes que tu avais
  worksheet.columns = [
    { header: 'Titre', key: 'titre', width: 35 },
    { header: 'Secteurs', key: 'secteurs', width: 25 },
    { header: 'Porteur du projet', key: 'porteur', width: 25 },
    { header: 'Bailleur ciblé', key: 'bailleur', width: 20 },
    { header: 'Budget estimé', key: 'budget', width: 15 },
    { header: 'Devise', key: 'devise', width: 8 },
    { header: 'Statut', key: 'statut', width: 18 },
    { header: 'Date de création', key: 'date', width: 14 },
  ];

  // 2. Stylisation de l'en-tête (Fond vert foncé, texte blanc, gras)
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF166534' } // Vert GCF
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;

  // 3. Ajout des données
  ideas.forEach(idea => {
    worksheet.addRow({
      titre: idea.titre,
      secteurs: (idea.secteurs ?? []).map(s => s.designation).join(', '),
      porteur: idea.porteur_projet ?? '',
      bailleur: idea.bailleur_cible ?? '',
      budget: idea.budget_total_estime ?? '',
      devise: idea.devise,
      statut: STATUT_IDEE_LABELS[idea.statut],
      date: fmtDate(idea.created_at),
    });
  });

  // 4. Génération du fichier et téléchargement direct
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `idees-de-projet-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  document.body.appendChild(link);
  link.click();
  
  // Nettoyage
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function exportToPdf(ideas: ProjectIdea[]) {
  Promise.all([import('jspdf'), import('jspdf-autotable')]).then(([{ default: jsPDF }, { autoTable }]) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Idées de projet — GCF Madagascar', 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Exporté le ${format(new Date(), 'dd/MM/yyyy à HH:mm')} — ${ideas.length} idée(s)`, 14, 21);

    autoTable(doc, {
      startY: 26,
      head: [['Titre', 'Secteurs', 'Porteur', 'Bailleur ciblé', 'Budget estimé', 'Statut', 'Créée le']],
      body: ideas.map(idea => [
        idea.titre,
        (idea.secteurs ?? []).map(s => s.designation).join(', '),
        idea.porteur_projet ?? '—',
        idea.bailleur_cible ?? '—',
        `${fmt(idea.budget_total_estime)} ${idea.devise}`,
        STATUT_IDEE_LABELS[idea.statut],
        fmtDate(idea.created_at),
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [22, 101, 52] },
      alternateRowStyles: { fillColor: [247, 250, 247] },
    });

    doc.save(`idees-de-projet-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  });
}

// ── Page principale ────────────────────────────────────────────────────
export default function ProjectIdeasListPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canWrite = ['admin', 'super_admin', 'gestionnaire'].includes(user?.role ?? '');

  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('');
  const [secteurFilter, setSecteurFilter] = useState<string>('');
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectIdea | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const params = {
    search: search || undefined,
    statut: statutFilter || undefined,
    secteur_id: secteurFilter ? Number(secteurFilter) : undefined,
    region_id: regionFilter ? Number(regionFilter) : undefined,
    page,
    per_page: 15,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['project-ideas', params],
    queryFn: () => projectIdeaApi.list(params).then(r => r.data),
  });

  const { data: secteurs = [] } = useQuery({
    queryKey: ['secteurs'],
    queryFn: () => secteurApi.list().then(r => r.data),
  });
  const { data: regions = [] } = useQuery({
    queryKey: ['regions-all'],
    queryFn: () => geoApi.regions().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectIdeaApi.delete(id),
    onSuccess: () => {
      toast.success('Idée de projet supprimée');
      qc.invalidateQueries({ queryKey: ['project-ideas'] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de la suppression')),
  });

  const runExport = async (kind: 'pdf' | 'excel') => {
    setExporting(kind);
    try {
      const res = await projectIdeaApi.exportData(params);
      const rows = res.data.data;
      if (kind === 'excel') exportToExcel(rows); else exportToPdf(rows);
    } catch {
      toast.error("Erreur lors de la génération de l'export");
    } finally {
      setExporting(null);
    }
  };

  const ideas: ProjectIdea[] = data?.data ?? [];
  const meta = data;
  const hasActiveFilters = !!(statutFilter || secteurFilter || regionFilter);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Idées de projet</h1>
            <p className="text-sm text-gray-400">Préparation et maturation des projets avant approbation officielle</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://docs.google.com/spreadsheets/d/1fqh2JjELm9fe3stUkgQjSqpOQQSC7MNd/edit?gid=542354715#gid=542354715"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            <LinkIcon className="w-3.5 h-3.5" />  Idées de projet
          </a>
          <Link to="/admin/project-ideas/dashboard" className="btn btn-secondary btn-sm">
            <LayoutDashboard className="w-3.5 h-3.5" /> Tableau de bord
          </Link>
          {canWrite && (
            <Link to="/admin/project-ideas/new" className="btn btn-primary btn-sm">
              <Plus className="w-3.5 h-3.5" /> Nouvelle idée
            </Link>
          )}
        </div>
      </div>

      {/* Barre de recherche + filtres + export */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="form-input pl-9"
              placeholder="Rechercher par titre, acronyme, porteur…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button
            className={`btn btn-sm ${hasActiveFilters ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFilters(f => !f)}
          >
            <Filter className="w-3.5 h-3.5" /> Filtres {hasActiveFilters && '•'}
          </button>
          <button className="btn btn-secondary btn-sm" disabled={exporting !== null} onClick={() => runExport('excel')}>
            {exporting === 'excel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />} Excel
          </button>
          <button className="btn btn-secondary btn-sm" disabled={exporting !== null} onClick={() => runExport('pdf')}>
            {exporting === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
            <select className="form-input" value={statutFilter} onChange={e => { setStatutFilter(e.target.value); setPage(1); }}>
              <option value="">Tous les statuts</option>
              {Object.entries(STATUT_IDEE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="form-input" value={secteurFilter} onChange={e => { setSecteurFilter(e.target.value); setPage(1); }}>
              <option value="">Tous les secteurs</option>
              {secteurs.map(s => <option key={s.id} value={s.id}>{s.designation}</option>)}
            </select>
            <select className="form-input" value={regionFilter} onChange={e => { setRegionFilter(e.target.value); setPage(1); }}>
              <option value="">Toutes les régions</option>
              {regions.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
            </select>
            {hasActiveFilters && (
              <button
                className="btn btn-secondary btn-sm justify-self-start"
                onClick={() => { setStatutFilter(''); setSecteurFilter(''); setRegionFilter(''); setPage(1); }}
              >
                <X className="w-3.5 h-3.5" /> Réinitialiser
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tableau */}
      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
          </div>
        ) : ideas.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Lightbulb className="w-10 h-10 opacity-20 mb-2" />
            <p className="font-semibold text-gray-500">Aucune idée de projet trouvée</p>
            <p className="text-xs text-gray-400">Essayez d'autres filtres, ou créez-en une nouvelle.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3">Titre</th>
                <th className="px-4 py-3">Lien</th>
                <th className="px-4 py-3">Secteur</th>
                <th className="px-4 py-3">Porteur du projet</th>
                <th className="px-4 py-3">Bailleur ciblé</th>
                <th className="px-4 py-3">Budget estimé</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Créée le</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ideas.map(idea => (
                <tr key={idea.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <Link to={`/admin/project-ideas/${idea.id}`} className="font-semibold text-gray-700 hover:text-green-700">
                      {idea.titre}
                    </Link>
                    {idea.acronyme && <span className="text-gray-400 ml-1.5 text-xs">({idea.acronyme})</span>}
                  </td>
                  <td className="px-4 py-3">
                    {idea.lien ? (
                      <a
                        href={idea.lien}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={idea.lien}
                        className="inline-flex items-center gap-1 text-green-700 hover:underline text-xs"
                        onClick={e => e.stopPropagation()}
                      >
                        <LinkIcon className="w-3.5 h-3.5" /> Ouvrir
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {(idea.secteurs ?? []).slice(0, 2).map(s => s.designation).join(', ')}
                    {(idea.secteurs?.length ?? 0) > 2 && ` +${(idea.secteurs!.length - 2)}`}
                    {(idea.secteurs?.length ?? 0) === 0 && '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{idea.porteur_projet || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{idea.bailleur_cible || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{fmt(idea.budget_total_estime)} {idea.devise}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${STATUT_STYLES[idea.statut]}`}>
                      {STATUT_IDEE_LABELS[idea.statut]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{fmtDate(idea.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button title="Voir" onClick={() => navigate(`/admin/project-ideas/${idea.id}`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {canWrite && idea.statut !== 'converti' && (
                        <button title="Modifier" onClick={() => navigate(`/admin/project-ideas/${idea.id}/edit`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canWrite && idea.statut === 'approuve' && (
                        <button title="Convertir en projet" onClick={() => navigate(`/admin/project-ideas/${idea.id}`)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500">
                          <ArrowRightCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canWrite && idea.statut !== 'converti' && (
                        <button title="Supprimer" onClick={() => setDeleteTarget(idea)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <p>{meta.from}–{meta.to} sur {meta.total} idées</p>
          <div className="flex items-center gap-1">
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2">{page} / {meta.last_page}</span>
            <button className="btn btn-secondary btn-sm" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isPending={deleteMutation.isPending}
        titre={deleteTarget?.titre ?? ''}
      />
    </div>
  );
}
