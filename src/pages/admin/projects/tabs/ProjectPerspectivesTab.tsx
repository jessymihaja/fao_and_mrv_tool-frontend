// src/pages/admin/projects/tabs/ProjectPerspectivesTab.tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, X, Compass } from 'lucide-react';
import toast from 'react-hot-toast';
import { projectPerspectiveApi, perspectiveTypeApi } from '@/api/services';
import SelectAvecAjout from '@/components/admin/SelectAvecAjout';
import {
  STATUT_PERSPECTIVE_LABELS,
  type Project, type ProjectPerspective, type ProjectPerspectiveFormData, type StatutPerspective,
} from '@/types';
import { getErrorMessage } from '@/utils/apiError';

const emptyForm: ProjectPerspectiveFormData = {
  type_id: '', titre: '', description: '', zone_extension_envisagee: '',
  objectif_moyen_terme: '', objectif_long_terme: '', impact_futur_attendu: '', statut: 'a_l_etude',
};

function perspectiveToForm(p: ProjectPerspective): ProjectPerspectiveFormData {
  return {
    type_id: p.type_id, titre: p.titre, description: p.description ?? '',
    zone_extension_envisagee: p.zone_extension_envisagee ?? '',
    objectif_moyen_terme: p.objectif_moyen_terme ?? '', objectif_long_terme: p.objectif_long_terme ?? '',
    impact_futur_attendu: p.impact_futur_attendu ?? '', statut: p.statut,
  };
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function PerspectiveFormModal({ open, onClose, projectId, editing, onSaved }: {
  open: boolean; onClose: () => void; projectId: number; editing: ProjectPerspective | null; onSaved: () => void;
}) {
  const isEdit = !!editing;
  const [form, setForm] = useState<ProjectPerspectiveFormData>(editing ? perspectiveToForm(editing) : emptyForm);
  const set = (k: keyof ProjectPerspectiveFormData, v: ProjectPerspectiveFormData[keyof ProjectPerspectiveFormData]) => setForm(f => ({ ...f, [k]: v }));

  const { data: types = [] } = useQuery({
    queryKey: ['perspective-types'],
    queryFn: () => perspectiveTypeApi.list().then(r => r.data),
  });

  const mutation = useMutation({
    mutationFn: () => (isEdit ? projectPerspectiveApi.update(editing!.id, form) : projectPerspectiveApi.create(projectId, form)),
    onSuccess: () => { toast.success(isEdit ? 'Perspective mise à jour' : 'Perspective ajoutée'); onSaved(); onClose(); },
    onError: (err) => toast.error(getErrorMessage(err, "Erreur lors de l'enregistrement")),
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier la perspective' : 'Ajouter une perspective'}>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); mutation.mutate(); }}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <SelectAvecAjout
              label="Type"
              value={form.type_id}
              onChange={v => set('type_id', v)}
              options={types.map(t => ({ id: t.id, label: t.designation }))}
              queryKey="perspective-types"
              createEndpoint="/perspective-types"
              idField="designation"
            />
          </div>
          <div>
            <label className="form-label">Statut</label>
            <select className="form-input" value={form.statut} onChange={e => set('statut', e.target.value)}>
              {(Object.entries(STATUT_PERSPECTIVE_LABELS) as [StatutPerspective, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="form-label">Titre *</label>
          <input className="form-input" value={form.titre} onChange={e => set('titre', e.target.value)} required />
        </div>
        <div>
          <label className="form-label">Description</label>
          <textarea className="form-input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div>
          <label className="form-label">Zone d'extension envisagée</label>
          <input className="form-input" value={form.zone_extension_envisagee} onChange={e => set('zone_extension_envisagee', e.target.value)} placeholder="Ex : Région Anosy" />
        </div>
        <div>
          <label className="form-label">Objectif à moyen terme</label>
          <textarea className="form-input" rows={2} value={form.objectif_moyen_terme} onChange={e => set('objectif_moyen_terme', e.target.value)} />
        </div>
        <div>
          <label className="form-label">Objectif à long terme</label>
          <textarea className="form-input" rows={2} value={form.objectif_long_terme} onChange={e => set('objectif_long_terme', e.target.value)} />
        </div>
        <div>
          <label className="form-label">Résumé des impacts futurs attendus</label>
          <textarea className="form-input" rows={2} value={form.impact_futur_attendu} onChange={e => set('impact_futur_attendu', e.target.value)} />
        </div>
        <p className="text-[11px] text-gray-400">
          Ce contenu alimente la section « Perspectives des projets » de la page d'accueil publique (uniquement si ce projet est publié).
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProjectPerspectivesTab({ project, canWrite, canDelete }: {
  project: Project; canWrite: boolean; canDelete: boolean;
}) {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectPerspective | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectPerspective | null>(null);

  const { data: perspectives = [], isLoading } = useQuery({
    queryKey: ['project-perspectives', project.id],
    queryFn: () => projectPerspectiveApi.list(project.id).then(r => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['project-perspectives', project.id] });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectPerspectiveApi.delete(id),
    onSuccess: () => { toast.success('Perspective supprimée'); invalidate(); setDeleteTarget(null); },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de la suppression')),
  });

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (p: ProjectPerspective) => { setEditing(p); setModalOpen(true); };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-gray-700">Perspectives de ce projet</p>
          <p className="text-xs text-gray-400">Vision future : extensions, pérennisation, nouveaux financements. Alimente la Homepage publique.</p>
        </div>
        {canWrite && (
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5" /> Ajouter une perspective
          </button>
        )}
      </div>

      {perspectives.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-12 text-center text-gray-400">
          <Compass className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Aucune perspective enregistrée pour ce projet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {perspectives.map(p => {
            return (
              <div key={p.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                      <Compass className="w-4.5 h-4.5 text-green-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-700 truncate">{p.titre}</p>
                      <p className="text-[11px] text-gray-400">{p.type?.designation ?? '—'} · {STATUT_PERSPECTIVE_LABELS[p.statut]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {canWrite && (
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => setDeleteTarget(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {p.description && <p className="text-sm text-gray-600 mt-3">{p.description}</p>}
                {p.impact_futur_attendu && (
                  <p className="text-xs text-gray-500 mt-2"><strong>Impact attendu :</strong> {p.impact_futur_attendu}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <PerspectiveFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        projectId={project.id}
        editing={editing}
        onSaved={invalidate}
      />

      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} title="Confirmer la suppression">
          <p className="text-sm text-gray-600 mb-4">Supprimer « <strong>{deleteTarget.titre}</strong> » ?</p>
          <div className="flex justify-end gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => setDeleteTarget(null)}>Annuler</button>
            <button className="btn btn-danger btn-sm" onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Supprimer
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
