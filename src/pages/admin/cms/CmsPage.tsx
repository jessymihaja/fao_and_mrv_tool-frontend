// src/pages/admin/cms/CmsPage.tsx
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cmsApi } from '@/api/services';
import {
  Plus, Edit, Trash2, X, Save, Mail, Image as ImageIcon,
  ToggleLeft, ToggleRight, Upload, Eye, GripVertical
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import type { Slider, Faq, Contact, Partner } from '@/types';
import { getErrorMessage } from '@/utils/apiError';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';

type Tab = 'slider' | 'faq' | 'partners' | 'contacts';

// ─── SLIDER TAB ───────────────────────────────────────────────
function SliderManager() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Slider | null>(null);
  const [preview, setPreview] = useState<Slider | null>(null);  // slide en preview
  const [form, setForm] = useState({
    titre: '', sous_titre: '', cta_text: '', cta_url: '', ordre: 0, is_active: true,
  });
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const { data: slides = [], isLoading } = useQuery({
    queryKey: ['admin-sliders'],
    queryFn: () => cmsApi.adminSlider().then(r => Array.isArray(r.data) ? r.data : []),
  });

  const saveMutation = useMutation({
    mutationFn: (fd: FormData) =>
      editing ? cmsApi.updateSlider(editing.id, fd) : cmsApi.createSlider(fd),
    onSuccess: () => {
      toast.success(editing ? 'Slide mis à jour ✓' : 'Slide créé ✓');
      qc.invalidateQueries({ queryKey: ['admin-sliders'] });
      qc.invalidateQueries({ queryKey: ['public-slider'] });
      closeModal();
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de la sauvegarde')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => cmsApi.deleteSlider(id),
    onSuccess: () => {
      toast.success('Slide supprimé');
      qc.invalidateQueries({ queryKey: ['admin-sliders'] });
      qc.invalidateQueries({ queryKey: ['public-slider'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => {
      const fd = new FormData();
      fd.append('is_active', is_active ? '0' : '1');
      fd.append('_method', 'PUT');
      return cmsApi.updateSlider(id, fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-sliders'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ titre: '', sous_titre: '', cta_text: '', cta_url: '', ordre: slides.length, is_active: true });
    setFile(null);
    setFilePreview(null);
    setModal(true);
  };

  const openEdit = (s: Slider) => {
    setEditing(s);
    setForm({ titre: s.titre, sous_titre: s.sous_titre || '', cta_text: s.cta_text || '', cta_url: s.cta_url || '', ordre: s.ordre, is_active: s.is_active });
    setFile(null);
    setFilePreview(null);
    setModal(true);
  };

  const closeModal = () => {
    setModal(false); setEditing(null); setFile(null); setFilePreview(null);
    setForm({ titre: '', sous_titre: '', cta_text: '', cta_url: '', ordre: 0, is_active: true });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setFilePreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleSubmit = () => {
    if (!form.titre.trim()) return toast.error('Le titre est requis');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
    if (file) fd.append('image', file);
    if (editing) fd.append('_method', 'PUT');
    saveMutation.mutate(fd);
  };

  const getImgUrl = (img?: string | null): string | null => {
    if (!img) return null;
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    if (img.startsWith('/')) return img; // chemin public local
    return `${API_BASE}/storage/${img}`;
  };

  const sorted = [...slides].sort((a, b) => a.ordre - b.ordre);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{slides.length} slide(s) — Le slider est affiché sur la page d'accueil</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Nouveau slide
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-1">Aucun slide</p>
          <p className="text-sm mb-4">Créez votre premier slide pour le hero slider de la page d'accueil</p>
          <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus className="w-4 h-4" />Créer un slide</button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((s) => {
            const imgUrl = getImgUrl(s.image);
            return (
              <div
                key={s.id}
                className={`card overflow-hidden transition-all ${!s.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-stretch">
                  {/* Drag handle + order */}
                  <div className="flex flex-col items-center justify-center px-3 bg-gray-50 border-r border-gray-100 gap-1">
                    <GripVertical className="w-4 h-4 text-gray-300" />
                    <span className="text-xs font-mono text-gray-400">{s.ordre + 1}</span>
                  </div>

                  {/* Thumbnail */}
                  <div className="relative w-40 h-24 flex-shrink-0 overflow-hidden bg-gray-100">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={s.titre}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                          (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="w-full h-full items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #1a6b45, #0f4027)', display: imgUrl ? 'none' : 'flex' }}
                    >
                      <Leaf className="w-6 h-6 text-white/40" />
                    </div>
                    {/* Active badge */}
                    <div className={`absolute top-2 left-2 text-xs px-1.5 py-0.5 rounded-full font-bold ${s.is_active ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                      {s.is_active ? '● Actif' : '○ Inactif'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-800 line-clamp-1">{s.titre}</h4>
                        {s.sous_titre && (
                          <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{s.sous_titre}</p>
                        )}
                        <div className="flex gap-3 mt-2 text-xs text-gray-400">
                          {s.cta_text && <span className="flex items-center gap-1">🔗 {s.cta_text}</span>}
                          {s.image && <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Image uploadée</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setPreview(s)}
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-500" title="Prévisualiser"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleMutation.mutate({ id: s.id, is_active: s.is_active })}
                          className="p-1.5 rounded hover:bg-gray-50 text-gray-500" title={s.is_active ? 'Désactiver' : 'Activer'}
                        >
                          {s.is_active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Supprimer le slide "${s.titre}" ?`)) deleteMutation.mutate(s.id); }}
                          className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl" style={{ maxHeight: '80vh' }}>
            {/* Preview header */}
            <div className="relative h-64 md:h-80 overflow-hidden flex items-end"
              style={{ background: 'linear-gradient(135deg, #0f4027, #1a6b45)' }}>
              {getImgUrl(preview.image) && (
                <img
                  src={getImgUrl(preview.image)!}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-50"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="relative p-8 text-white">
                <h2 className="text-2xl font-extrabold mb-2">{preview.titre}</h2>
                {preview.sous_titre && <p className="text-white/80 text-sm">{preview.sous_titre}</p>}
                {preview.cta_text && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
                    style={{ background: 'var(--gcf-gold)', color: '#1a1a1a' }}>
                    {preview.cta_text}
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white p-4 flex justify-end">
              <button className="btn btn-secondary btn-sm" onClick={() => setPreview(null)}>
                <X className="w-4 h-4" /> Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-gray-800">
                {editing ? 'Modifier le slide' : 'Nouveau slide'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Image upload */}
              <div>
                <label className="form-label flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5 text-green-600" />
                  Image de fond
                </label>

                {/* Current image preview */}
                {(filePreview || (editing && getImgUrl(editing.image))) && (
                  <div className="relative rounded-xl overflow-hidden mb-3" style={{ height: 160 }}>
                    <img
                      src={filePreview || getImgUrl(editing?.image)!}
                      alt="Aperçu"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-3">
                      <span className="text-white text-xs font-medium">
                        {filePreview ? '🆕 Nouvelle image sélectionnée' : '📷 Image actuelle'}
                      </span>
                    </div>
                    {filePreview && (
                      <button
                        onClick={() => { setFile(null); setFilePreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
                >
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                  />
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500 font-medium">
                    {editing ? 'Remplacer l\'image' : 'Sélectionner une image'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — max 5 MB</p>
                  <p className="text-xs text-gray-400">Taille recommandée : 1600 × 900 px</p>
                </div>
              </div>

              {/* Fields */}
              <div>
                <label className="form-label">Titre *</label>
                <input
                  className="form-input"
                  value={form.titre}
                  onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                  placeholder="Ex : Financer la résilience climatique"
                  required
                />
              </div>

              <div>
                <label className="form-label">Sous-titre</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={form.sous_titre}
                  onChange={e => setForm(f => ({ ...f, sous_titre: e.target.value }))}
                  placeholder="Description courte affichée sous le titre..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Texte du bouton</label>
                  <input
                    className="form-input"
                    value={form.cta_text}
                    onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))}
                    placeholder="Ex : Découvrir"
                  />
                </div>
                <div>
                  <label className="form-label">Lien du bouton</label>
                  <input
                    className="form-input"
                    value={form.cta_url}
                    onChange={e => setForm(f => ({ ...f, cta_url: e.target.value }))}
                    placeholder="/projets"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Ordre d'affichage</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.ordre}
                    onChange={e => setForm(f => ({ ...f, ordre: parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 w-full">
                    <input
                      type="checkbox"
                      id="slide_active"
                      checked={form.is_active}
                      onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                      className="w-4 h-4 accent-green-600"
                    />
                    <label htmlFor="slide_active" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Actif
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
              <button className="btn btn-secondary flex-1" onClick={closeModal}>Annuler</button>
              <button
                className="btn btn-primary flex-1"
                onClick={handleSubmit}
                disabled={saveMutation.isPending}
              >
                <Save className="w-4 h-4" />
                {saveMutation.isPending ? 'Sauvegarde...' : editing ? 'Mettre à jour' : 'Créer le slide'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Petit import inline pour l'icon Leaf dans SliderManager
function Leaf({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3s14-1 16 16c-5-4-11-4-16-1V3z" />
    </svg>
  );
}

// ─── FAQ TAB ──────────────────────────────────────────────────
function FaqManager() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [form, setForm] = useState({ question: '', reponse: '', categorie: '', ordre: 0, is_active: true });

  const { data: faqs = [] } = useQuery({
    queryKey: ['admin-faq'],
    queryFn: () => cmsApi.adminFaq().then(r => Array.isArray(r.data) ? r.data : []),
  });

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) => editing ? cmsApi.updateFaq(editing.id, data) : cmsApi.createFaq(data),
    onSuccess: () => {
      toast.success('FAQ sauvegardée ✓');
      qc.invalidateQueries({ queryKey: ['admin-faq'] });
      setModal(false); setEditing(null);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Erreur lors de la sauvegarde')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => cmsApi.deleteFaq(id),
    onSuccess: () => { toast.success('FAQ supprimée'); qc.invalidateQueries({ queryKey: ['admin-faq'] }); },
  });

  const open = (f?: Faq) => {
    setEditing(f || null);
    setForm(f
      ? { question: f.question, reponse: f.reponse, categorie: f.categorie || '', ordre: f.ordre, is_active: f.is_active }
      : { question: '', reponse: '', categorie: '', ordre: faqs.length, is_active: true });
    setModal(true);
  };

  const sorted = [...faqs].sort((a, b) => a.ordre - b.ordre);
  const categories = [...new Set(sorted.map((f) => f.categorie).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{sorted.length} question{sorted.length !== 1 ? 's' : ''}</span>
          {categories.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {categories.map((cat) => (
                <span key={cat} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{cat}</span>
              ))}
            </div>
          )}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => open()}>
          <Plus className="w-4 h-4" /> Ajouter FAQ
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-3">❓</div>
          <p className="font-medium text-gray-500">Aucune FAQ</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Ajoutez des questions fréquentes pour informer vos visiteurs</p>
          <button className="btn btn-primary btn-sm" onClick={() => open()}><Plus className="w-4 h-4" /> Créer la première FAQ</button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((f) => (
            <div key={f.id} className={`card overflow-hidden transition-all ${!f.is_active ? 'opacity-60' : ''}`}>
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(expanded === f.id ? null : f.id)}
              >
                {/* Numéro */}
                <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-green-700">{f.ordre + 1}</span>
                </div>

                {/* Question */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">{f.question}</span>
                    {f.categorie && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{f.categorie}</span>
                    )}
                    {!f.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Inactif</span>
                    )}
                  </div>
                  {expanded !== f.id && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{f.reponse}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => open(f)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(f.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-gray-300 ml-1">
                    {expanded === f.id
                      ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    }
                  </span>
                </div>
              </div>

              {/* Expanded answer */}
              {expanded === f.id && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                  <div className="ml-10 text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4 whitespace-pre-wrap">
                    {f.reponse}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">{editing ? 'Modifier FAQ' : 'Nouvelle FAQ'}</h3>
              <button onClick={() => setModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="form-label">Question *</label>
                <input className="form-input" value={form.question}
                  onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                  placeholder="Ex : Comment déposer une demande de financement ?" />
              </div>
              <div>
                <label className="form-label">Réponse *</label>
                <textarea className="form-input" rows={5} value={form.reponse}
                  onChange={e => setForm(f => ({ ...f, reponse: e.target.value }))}
                  placeholder="Rédigez la réponse complète ici..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Catégorie</label>
                  <input className="form-input" value={form.categorie}
                    onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
                    placeholder="Ex : Financement" list="faq-cats" />
                  <datalist id="faq-cats">
                    {categories.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="form-label">Ordre</label>
                  <input type="number" className="form-input" value={form.ordre}
                    onChange={e => setForm(f => ({ ...f, ordre: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <input type="checkbox" id="faq_active" checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 accent-green-600" />
                <label htmlFor="faq_active" className="text-sm text-gray-700 cursor-pointer">
                  Actif — visible sur le site public
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button className="btn btn-secondary flex-1" onClick={() => setModal(false)}>Annuler</button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={() => {
                    if (!form.question.trim()) return toast.error('La question est requise');
                    if (!form.reponse.trim()) return toast.error('La réponse est requise');
                    saveMutation.mutate(form);
                  }}
                  disabled={saveMutation.isPending}
                >
                  <Save className="w-4 h-4" />{saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CONTACTS TAB ─────────────────────────────────────────────
function ContactsManager() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Contact | null>(null);

  const { data: contacts } = useQuery({
    queryKey: ['admin-contacts'],
    queryFn: () => cmsApi.contacts().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => cmsApi.deleteContact(id),
    onSuccess: () => {
      toast.success('Message supprimé');
      qc.invalidateQueries({ queryKey: ['admin-contacts'] });
      setSelected(null);
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => cmsApi.markAsRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-contacts'] }),
  });

  const openMessage = (c: Contact) => {
    setSelected(c);
    if (!c.is_read) markAsReadMutation.mutate(c.id);
  };

  const list: Contact[] = contacts?.data ?? [];
  const unread = list.filter((c) => !c.is_read).length;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm">
          <Mail className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-gray-700">{list.length} message{list.length !== 1 ? 's' : ''}</span>
        </div>
        {unread > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />
            <span className="text-sm font-semibold text-blue-700">{unread} non lu{unread !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <div className="card p-16 text-center">
          <Mail className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">Aucun message reçu</p>
          <p className="text-sm text-gray-400 mt-1">Les messages du formulaire de contact apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((c) => (
            <div
              key={c.id}
              onClick={() => openMessage(c)}
              className={`card p-4 cursor-pointer hover:shadow-md transition-all border-l-4 ${
                !c.is_read ? 'border-l-blue-500' : 'border-l-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                    style={{ background: `hsl(${(c.nom?.charCodeAt(0) ?? 0) * 37 % 360}, 55%, 50%)` }}>
                    {(c.nom || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800 text-sm">{c.nom}</span>
                      {!c.is_read && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">Nouveau</span>
                      )}
                      <span className="text-xs text-gray-400">{c.email}</span>
                    </div>
                    <div className="text-sm font-medium text-gray-700 mt-0.5 truncate">{c.sujet}</div>
                    <div className="text-xs text-gray-400 truncate">{c.message}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {format(new Date(c.created_at), 'dd/MM/yy')}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm('Supprimer ?')) deleteMutation.mutate(c.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Message detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                  style={{ background: `hsl(${(selected.nom?.charCodeAt(0) ?? 0) * 37 % 360}, 55%, 50%)` }}>
                  {(selected.nom || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-gray-800">{selected.nom}</div>
                  <a href={`mailto:${selected.email}`} className="text-sm text-blue-500 hover:underline">{selected.email}</a>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Sujet</div>
                <div className="font-semibold text-gray-800">{selected.sujet}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Message</div>
                <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4 whitespace-pre-wrap">
                  {selected.message}
                </div>
              </div>
              <div className="text-xs text-gray-400">
                Reçu le {format(new Date(selected.created_at), "dd/MM/yyyy 'à' HH:mm")}
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <a href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.sujet)}`}
                className="btn btn-primary flex-1">
                <Mail className="w-4 h-4" /> Répondre
              </a>
              <button
                onClick={() => { if (confirm('Supprimer ce message ?')) deleteMutation.mutate(selected.id); }}
                className="btn btn-secondary text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PARTNERS TAB ────────────────────────────────────────────
function PartnersManager() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [logoMode, setLogoMode] = useState<'upload' | 'path'>('upload');
  const [logoPath, setLogoPath] = useState('');
  const [form, setForm] = useState({
    nom: '', description: '', url: '', abbr: '', color: '#1a6b45', ordre: 0, is_active: true,
  });

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['admin-partners'],
    queryFn: () => cmsApi.adminPartners().then(r => Array.isArray(r.data) ? r.data : []),
  });

  const saveMutation = useMutation({
    mutationFn: (fd: FormData) =>
      editing ? cmsApi.updatePartner(editing.id, fd) : cmsApi.createPartner(fd),
    onSuccess: () => {
      toast.success(editing ? 'Partenaire mis à jour ✓' : 'Partenaire ajouté ✓');
      qc.invalidateQueries({ queryKey: ['admin-partners'] });
      qc.invalidateQueries({ queryKey: ['public-partners'] });
      closeModal();
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => cmsApi.deletePartner(id),
    onSuccess: () => {
      toast.success('Partenaire supprimé');
      qc.invalidateQueries({ queryKey: ['admin-partners'] });
      qc.invalidateQueries({ queryKey: ['public-partners'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => {
      const fd = new FormData();
      fd.append('is_active', is_active ? '0' : '1');
      fd.append('_method', 'PUT');
      return cmsApi.updatePartner(id, fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-partners'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setFile(null);
    setFilePreview(null);
    setLogoMode('upload');
    setLogoPath('');
    setForm({ nom: '', description: '', url: '', abbr: '', color: '#1a6b45', ordre: partners.length, is_active: true });
    setModal(true);
  };

  const openEdit = (p: Partner) => {
    setEditing(p);
    setFile(null);
    setFilePreview(null);
    // Détecter le mode selon le logo existant
    const existingLogo = p.logo || '';
    if (existingLogo.startsWith('/') || existingLogo.startsWith('http')) {
      setLogoMode('path');
      setLogoPath(existingLogo);
    } else {
      setLogoMode('upload');
      setLogoPath('');
    }
    setForm({
      nom: p.nom || '', description: p.description || '', url: p.url || '',
      abbr: p.abbr || '', color: p.color || '#1a6b45', ordre: p.ordre || 0, is_active: p.is_active !== false,
    });
    setModal(true);
  };

  const closeModal = () => {
    setModal(false); setEditing(null); setFile(null); setFilePreview(null);
    setLogoMode('upload'); setLogoPath('');
    setForm({ nom: '', description: '', url: '', abbr: '', color: '#1a6b45', ordre: 0, is_active: true });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setFilePreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleSubmit = () => {
    if (!form.nom.trim()) return toast.error('Le nom est requis');
    const fd = new FormData();
    fd.append('nom', form.nom);
    fd.append('description', form.description);
    fd.append('url', form.url);
    fd.append('ordre', String(form.ordre));
    fd.append('is_active', form.is_active ? '1' : '0');
    if (file) fd.append('logo', file);
    if (editing) fd.append('_method', 'PUT');
    saveMutation.mutate(fd);
  };

  const getLogoUrl = (logo?: string | null): string | null => {
    if (!logo) return null;
    if (logo.startsWith('http://') || logo.startsWith('https://')) return logo;
    if (logo.startsWith('/')) return logo; // chemin public local ex: /partenair/Saina.png
    return `${API_BASE}/storage/${logo}`;
  };

  const sorted = [...partners].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{partners.length} partenaire(s) — Affichés sur la page d'accueil</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Ajouter partenaire
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-5xl mb-3">🤝</div>
          <p className="font-medium mb-1">Aucun partenaire</p>
          <p className="text-sm mb-4">Ajoutez vos partenaires stratégiques — ils s'afficheront sur la page d'accueil.</p>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Ajouter un partenaire
          </button>
        </div>
      ) : (
        <>
          {/* Preview grid */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-gray-700">Aperçu — tel qu'affiché sur le site</span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {sorted.filter((p) => p.is_active !== false).map((p) => {
                const logoUrl = getLogoUrl(p.logo);
                const color = p.color || '#1a6b45';
                return (
                  <div key={p.id} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center"
                      style={{ background: `${color}15`, border: `2px solid ${color}25` }}>
                      {logoUrl ? (
                        <img src={logoUrl} alt={p.nom} className="w-full h-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <span className="text-xs font-extrabold" style={{ color }}>
                          {(p.abbr || p.nom || '').slice(0, 3).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-gray-600 text-center line-clamp-1">{p.nom}</div>
                  </div>
                );
              })}
            </div>
            {sorted.filter((p) => p.is_active === false).length > 0 && (
              <p className="text-xs text-gray-400 mt-3">
                + {sorted.filter((p) => p.is_active === false).length} partenaire(s) désactivé(s) — non affiché(s)
              </p>
            )}
          </div>

          {/* List */}
          <div className="space-y-2">
            {sorted.map((p) => {
              const logoUrl = getLogoUrl(p.logo);
              const color = p.color || '#1a6b45';
              return (
                <div key={p.id} className={`card overflow-hidden transition-all ${!p.is_active ? 'opacity-55' : ''}`}>
                  <div className="flex items-center gap-4 p-4">
                    {/* Order */}
                    <div className="flex flex-col items-center w-8 flex-shrink-0">
                      <GripVertical className="w-4 h-4 text-gray-300" />
                      <span className="text-xs font-mono text-gray-400">{p.ordre + 1}</span>
                    </div>

                    {/* Logo */}
                    <div
                      className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}15`, border: `2px solid ${color}30` }}
                    >
                      {logoUrl ? (
                        <img src={logoUrl} alt={p.nom} className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                            (e.currentTarget.nextSibling as HTMLElement)!.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <span
                        className="text-sm font-extrabold"
                        style={{ color, display: logoUrl ? 'none' : 'block' }}
                      >
                        {(p.abbr || p.nom || '').slice(0, 3).toUpperCase()}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800">{p.nom}</span>
                        {!p.is_active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactif</span>
                        )}
                        {p.url && p.url !== '#' && (
                          <a href={p.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline flex items-center gap-0.5">
                            <Eye className="w-3 h-3" /> site
                          </a>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{p.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        {p.logo && <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Logo uploadé</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleMutation.mutate({ id: p.id, is_active: p.is_active !== false })}
                        className="p-1.5 rounded hover:bg-gray-50 text-gray-500"
                        title={p.is_active !== false ? 'Désactiver' : 'Activer'}
                      >
                        {p.is_active !== false
                          ? <ToggleRight className="w-4 h-4 text-green-600" />
                          : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-green-50 text-green-600">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Supprimer "${p.nom}" ?`)) deleteMutation.mutate(p.id); }}
                        className="p-1.5 rounded hover:bg-red-50 text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-gray-800">
                {editing ? 'Modifier le partenaire' : 'Nouveau partenaire'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Logo upload */}
              <div>
                <label className="form-label flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5 text-green-600" />
                  Logo du partenaire
                </label>

                {/* Mode selector */}
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-3">
                  <button
                    type="button"
                    onClick={() => { setLogoMode('upload'); setLogoPath(''); }}
                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${logoMode === 'upload' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
                  >
                    📤 Uploader un fichier
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLogoMode('path'); setFile(null); setFilePreview(null); }}
                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${logoMode === 'path' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
                  >
                    📁 Chemin local / URL
                  </button>
                </div>

                {/* Current image preview */}
                {(filePreview || logoPath || (editing && getLogoUrl(editing.logo))) && (
                  <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200 mb-3">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-200 flex-shrink-0 bg-white flex items-center justify-center">
                      {(filePreview || logoPath || getLogoUrl(editing?.logo)) ? (
                        <img
                          src={filePreview || (logoPath ? logoPath : getLogoUrl(editing?.logo)!) || ''}
                          alt="Logo"
                          className="w-full h-full object-contain p-1"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3'; }}
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">
                        {filePreview ? '🆕 Nouveau fichier' : logoPath ? '🔗 Chemin saisi' : '📷 Logo actuel'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {file ? `${file.name} (${(file.size / 1024).toFixed(0)} KB)`
                          : logoPath || editing?.logo || ''}
                      </p>
                      {(filePreview || logoPath) && (
                        <button
                          type="button"
                          onClick={() => { setFile(null); setFilePreview(null); setLogoPath(''); if (fileRef.current) fileRef.current.value = ''; }}
                          className="text-xs text-red-500 hover:underline mt-1"
                        >
                          Annuler
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Upload mode */}
                {logoMode === 'upload' && (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      onChange={handleFileChange}
                    />
                    <Upload className="w-7 h-7 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500 font-medium">
                      Cliquez pour sélectionner un fichier
                    </p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, SVG — max 2 MB</p>
                    <p className="text-xs text-gray-400">Carré recommandé : 200 × 200 px</p>
                  </div>
                )}

                {/* Path / URL mode */}
                {logoMode === 'path' && (
                  <div className="space-y-2">
                    <input
                      className="form-input font-mono text-sm"
                      value={logoPath}
                      onChange={e => setLogoPath(e.target.value)}
                      placeholder="/partenair/Saina.png"
                    />
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700 space-y-1">
                      <p className="font-semibold">💡 Formats acceptés :</p>
                      <p><code className="bg-blue-100 px-1 rounded">/partenair/Saina.png</code> → fichier dans <code>frontend/public/partenair/</code></p>
                      <p><code className="bg-blue-100 px-1 rounded">https://example.com/logo.png</code> → URL externe</p>
                      <p className="text-blue-500 mt-1">Placez vos logos dans <strong>frontend/public/partenair/</strong> et référencez-les ici.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Nom + Abbr */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="form-label">Nom du partenaire *</label>
                  <input
                    className="form-input"
                    value={form.nom}
                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                    placeholder="Ex : Green Climate Fund"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Sigle</label>
                  <input
                    className="form-input"
                    value={form.abbr}
                    onChange={e => setForm(f => ({ ...f, abbr: e.target.value }))}
                    placeholder="GCF"
                    maxLength={5}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="form-label">Description courte</label>
                <input
                  className="form-input"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ex : Fonds principal de financement climatique international"
                />
              </div>

              {/* URL + Couleur */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="form-label">Site web</label>
                  <input
                    type="url"
                    className="form-input"
                    value={form.url}
                    onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                    placeholder="https://www.partenaire.org"
                  />
                </div>
                <div>
                  <label className="form-label">Couleur accent</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      className="h-10 w-12 rounded-lg border border-gray-200 cursor-pointer p-1"
                      value={form.color}
                      onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    />
                    <input
                      className="form-input flex-1 font-mono text-sm"
                      value={form.color}
                      onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      placeholder="#1a6b45"
                    />
                  </div>
                </div>
              </div>

              {/* Preview mini */}
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Aperçu du badge</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center"
                    style={{ background: `${form.color}15`, border: `2px solid ${form.color}40` }}
                  >
                    {(filePreview || logoPath || (editing && getLogoUrl(editing.logo))) ? (
                      <img
                        src={filePreview || (logoPath ? logoPath : getLogoUrl(editing?.logo)) || ''}
                        alt=""
                        className="w-full h-full object-contain p-1"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2'; }}
                      />
                    ) : (
                      <span className="text-sm font-extrabold" style={{ color: form.color }}>
                        {(form.abbr || form.nom || '?').slice(0, 3).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 text-sm">{form.nom || 'Nom du partenaire'}</div>
                    {form.description && <div className="text-xs text-gray-500 mt-0.5">{form.description}</div>}
                  </div>
                </div>
              </div>

              {/* Ordre + Actif */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Ordre d'affichage</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.ordre}
                    onChange={e => setForm(f => ({ ...f, ordre: parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 w-full">
                    <input
                      type="checkbox"
                      id="partner_active"
                      checked={form.is_active}
                      onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                      className="w-4 h-4 accent-green-600"
                    />
                    <label htmlFor="partner_active" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Visible sur le site
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
              <button className="btn btn-secondary flex-1" onClick={closeModal}>Annuler</button>
              <button
                className="btn btn-primary flex-1"
                onClick={handleSubmit}
                disabled={saveMutation.isPending}
              >
                <Save className="w-4 h-4" />
                {saveMutation.isPending ? 'Sauvegarde...' : editing ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── MAIN CMS PAGE ────────────────────────────────────────────
export default function CmsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('slider');

  const tabs: { key: Tab; label: string; emoji: string; desc: string }[] = [
    { key: 'slider',   label: 'Slider Hero',  emoji: '🖼️', desc: 'Bannières page d\'accueil' },
    { key: 'partners', label: 'Partenaires',   emoji: '🤝', desc: 'Logos & liens partenaires' },
    { key: 'faq',      label: 'FAQ',           emoji: '❓', desc: 'Questions fréquentes' },
    { key: 'contacts', label: 'Messages',      emoji: '✉️', desc: 'Formulaire de contact' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Site Vitrine — CMS</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérez le contenu affiché sur le site public</p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
        >
          <Eye className="w-4 h-4" /> Voir le site
        </a>
      </div>

      {/* ── Tab cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`rounded-xl p-4 text-left transition-all border-2 ${
              activeTab === t.key
                ? 'bg-white border-green-500 shadow-md shadow-green-100'
                : 'bg-white border-transparent hover:border-gray-200 shadow-sm'
            }`}
          >
            <div className="text-2xl mb-2">{t.emoji}</div>
            <div className={`font-semibold text-sm ${activeTab === t.key ? 'text-green-700' : 'text-gray-700'}`}>
              {t.label}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{t.desc}</div>
            {activeTab === t.key && (
              <div className="mt-2 w-6 h-0.5 rounded-full bg-green-500" />
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div>
        {activeTab === 'slider'   && <SliderManager />}
        {activeTab === 'faq'      && <FaqManager />}
        {activeTab === 'contacts' && <ContactsManager />}
        {activeTab === 'partners' && <PartnersManager />}
      </div>
    </div>
  );
}