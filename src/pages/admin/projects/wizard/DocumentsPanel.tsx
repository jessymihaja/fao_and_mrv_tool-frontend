// src/pages/admin/projects/wizard/DocumentsPanel.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi } from '@/api/services';
import { Upload, Trash2, Download, Eye, FileText, X, Loader2, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Document, DocumentType } from '@/types';
import { DOCUMENT_UPLOAD_RULE, formatBytes, validateFile } from '@/utils/fileValidation';
import { getErrorMessage } from '@/utils/apiError';

const TYPE_LABELS: Record<DocumentType, string> = {
  rapport: 'Rapport', contrat: 'Contrat', accord: 'Accord',
  plan: 'Plan', etude: 'Étude', photo: 'Photo', autre: 'Autre',
};

const fmtSize = (n?: number) => {
  if (!n) return '—';
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
};

interface Props {
  projectId?: number;
  composanteId?: number;
  canWrite?: boolean;
}

export default function DocumentsPanel({ projectId, composanteId, canWrite = true }: Props) {
  const qc = useQueryClient();
  const queryKey = composanteId ? ['composante-documents', composanteId] : ['project-documents', projectId];

  const { data: documents, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      composanteId
        ? documentApi.listByComposante(composanteId).then(r => r.data)
        : documentApi.listByProject(projectId!).then(r => r.data),
    enabled: !!(composanteId || projectId),
  });

  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile]   = useState<File | null>(null);
  const [titre, setTitre] = useState('');
  const [type, setType]   = useState<DocumentType>('autre');
  const [description, setDescription] = useState('');

  const uploadMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('fichier', file as File);
      fd.append('type', type);
      if (titre) fd.append('titre', titre);
      if (description) fd.append('description', description);
      if (projectId)    fd.append('project_id', String(projectId));
      if (composanteId) fd.append('composante_id', String(composanteId));
      return documentApi.upload(fd);
    },
    onSuccess: () => {
      toast.success('Document téléversé ✓');
      qc.invalidateQueries({ queryKey });
      setShowUpload(false); setFile(null); setTitre(''); setDescription(''); setType('autre');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors du téléversement')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => documentApi.delete(id),
    onSuccess: () => { toast.success('Document supprimé'); qc.invalidateQueries({ queryKey }); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error('Sélectionnez un fichier'); return; }
    const validationError = validateFile(file, DOCUMENT_UPLOAD_RULE);
    if (validationError) { toast.error(validationError); return; }
    uploadMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-green-600" /> Documents et Ressource du projet
        </h3>
        {canWrite && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}>
            <Upload className="w-4 h-4" /> Téléverser
          </button>
        )}
      </div>

      {isLoading && <p className="text-sm text-gray-400">Chargement...</p>}

      {!isLoading && (documents?.length ?? 0) === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm border border-dashed rounded-xl">
          Aucun document pour le moment.
        </div>
      )}

      <div className="space-y-2">
        {documents?.map((doc: Document) => (
          <div key={doc.id} className="card p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-800 text-sm truncate">{doc.titre}</p>
              <p className="text-[11px] text-gray-400">
                {TYPE_LABELS[doc.type]} · {fmtSize(doc.taille)}
              </p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => documentApi.download(doc.id)}
                title="Aperçu / Télécharger"
                className="p-1.5 rounded-lg hover:bg-gray-100"
              >
                <Eye className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <button onClick={() => documentApi.download(doc.id)} title="Télécharger" className="p-1.5 rounded-lg hover:bg-gray-100">
                <Download className="w-3.5 h-3.5 text-gray-500" />
              </button>
              {canWrite && (
                <button onClick={() => deleteMutation.mutate(doc.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showUpload && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowUpload(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-800">Téléverser un document</h4>
              <button type="button" onClick={() => setShowUpload(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div>
              <label className="form-label">Fichier</label>
              <input
                type="file"
                required
                accept={DOCUMENT_UPLOAD_RULE.allowedExtensions.map(e => `.${e}`).join(',')}
                className="form-input"
                onChange={e => {
                  const selected = e.target.files?.[0] ?? null;
                  if (selected) {
                    const err = validateFile(selected, DOCUMENT_UPLOAD_RULE);
                    if (err) {
                      toast.error(err);
                      e.target.value = '';
                      setFile(null);
                      return;
                    }
                  }
                  setFile(selected);
                }}
              />
              {file && (
                <p className="text-xs text-gray-400 mt-1">{file.name} · {formatBytes(file.size)}</p>
              )}
              <p className="text-[11px] text-gray-400 mt-1">
                Formats acceptés : {DOCUMENT_UPLOAD_RULE.allowedExtensions.join(', ')} · Max {formatBytes(DOCUMENT_UPLOAD_RULE.maxSizeBytes)}
              </p>
            </div>
            <div>
              <label className="form-label">Type</label>
              <select className="form-input" value={type} onChange={e => setType(e.target.value as DocumentType)}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Titre du document</label>
              <input className="form-input" value={titre} onChange={e => setTitre(e.target.value)} placeholder="Nom du document original si vide" />
            </div>
            <div>
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowUpload(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Téléverser
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
