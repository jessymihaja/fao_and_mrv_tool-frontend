// src/pages/admin/chatbot/ChatbotAdminPage.tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatbotApi } from '@/api/services';
import { Bot, Plus, Edit, Trash2, X, Save, Power, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/apiError';
import type { ChatbotKnowledgeEntry } from '@/types';

export default function ChatbotAdminPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<ChatbotKnowledgeEntry | null>(null);
  const [form, setForm] = useState({ category: '', keywords: '', response: '', is_active: true });

  // ✅ FIX 1 : welcomeMsg est un état React contrôlé, pas un defaultValue non contrôlé
  const [welcomeMsg, setWelcomeMsg] = useState('');

  const { data: settings, isLoading: settingsLoading, isError: settingsError } = useQuery({
    queryKey: ['chatbot-settings'],
    queryFn: () => chatbotApi.settings().then(r => r.data),
    retry: 1,
  });

  // ✅ FIX 2 : synchroniser welcomeMsg quand les settings arrivent depuis l'API
  useEffect(() => {
    if (settings?.welcome_message !== undefined) {
      setWelcomeMsg(settings.welcome_message ?? '');
    }
  }, [settings?.welcome_message]);

  const { data: knowledge } = useQuery({
    queryKey: ['chatbot-knowledge'],
    queryFn: () => chatbotApi.knowledge().then(r => r.data),
    retry: 1,
  });

  const settingsMutation = useMutation({
    mutationFn: (data: Partial<{ is_active: boolean; welcome_message: string }>) => chatbotApi.updateSettings(data),
    onSuccess: () => {
      toast.success('Paramètres sauvegardés');
      qc.invalidateQueries({ queryKey: ['chatbot-settings'] });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Erreur lors de la sauvegarde'));
    },
  });

  const knowledgeMutation = useMutation({
    mutationFn: (data: typeof form) =>
      editing ? chatbotApi.updateKnowledge(editing.id, data) : chatbotApi.createKnowledge(data),
    onSuccess: () => {
      toast.success('Entrée sauvegardée');
      qc.invalidateQueries({ queryKey: ['chatbot-knowledge'] });
      closeModal();
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Erreur lors de la sauvegarde'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => chatbotApi.deleteKnowledge(id),
    onSuccess: () => {
      toast.success('Entrée supprimée');
      qc.invalidateQueries({ queryKey: ['chatbot-knowledge'] });
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const closeModal = () => {
    setModal(false);
    setEditing(null);
    setForm({ category: '', keywords: '', response: '', is_active: true });
  };

  // ✅ FIX 3 : isActive par défaut false si settings non chargé (évite le bouton bloqué)
  const isActive = settings?.is_active === true || settings?.is_active === 1;

  // ✅ FIX 4 : handleToggle ne bloque plus si settingsError — on permet quand même l'action
  const handleToggle = () => {
    if (settingsMutation.isPending) return;
    settingsMutation.mutate({
      is_active: !isActive,
      welcome_message: welcomeMsg,
    });
  };

  // ✅ FIX 5 : sauvegarder le message d'accueil via l'état React contrôlé
  const handleSaveWelcome = () => {
    if (!welcomeMsg.trim()) {
      toast.error('Le message ne peut pas être vide');
      return;
    }
    settingsMutation.mutate({ is_active: isActive, welcome_message: welcomeMsg });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-800">Chatbot GCF</h1>

      {/* Alerte si le GET /chatbot/settings échoue */}
      {settingsError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          ⚠️ Impossible de charger les paramètres du chatbot. Vérifiez que la migration a été exécutée :{' '}
          <code className="bg-red-100 px-1 rounded">php artisan migrate</code>
        </div>
      )}

      {/* Status card */}
      <div className="card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
            <Bot className={`w-5 h-5 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <div className="font-semibold text-gray-800">Chatbot GCF Madagascar</div>
            <div className={`text-sm ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
              {settingsLoading
                ? 'Chargement...'
                : settingsError
                  ? '⚠️ Erreur de chargement'
                  : isActive
                    ? '● Actif — Répond aux visiteurs'
                    : '○ Désactivé'}
            </div>
          </div>
        </div>
        {/* ✅ FIX 6 : disabled uniquement si mutation en cours, pas si settings absent */}
        <button
          onClick={handleToggle}
          disabled={settingsMutation.isPending}
          className={`btn btn-sm ${isActive ? 'btn-danger' : 'btn-primary'}`}
        >
          {settingsMutation.isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Power className="w-4 h-4" />}
          {isActive ? 'Désactiver' : 'Activer'}
        </button>
      </div>

      {/* Welcome message — ✅ input contrôlé par state React */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Message d'accueil</h3>
        <div className="flex gap-3">
          <input
            className="form-input flex-1"
            value={welcomeMsg}
            onChange={e => setWelcomeMsg(e.target.value)}
            placeholder="Bonjour ! Comment puis-je vous aider ?"
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSaveWelcome}
            disabled={settingsMutation.isPending}
          >
            {settingsMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Save className="w-4 h-4" />}
            Sauvegarder
          </button>
        </div>
      </div>

      {/* Knowledge base */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700">
            Base de connaissances ({knowledge?.length || 0} entrées)
          </h3>
          <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Catégorie</th>
              <th>Mots-clés</th>
              <th>Réponse</th>
              <th>Actif</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {knowledge?.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400 text-sm">
                  Aucune entrée. Cliquez sur "Ajouter" pour commencer.
                </td>
              </tr>
            )}
            {knowledge?.map((k) => (
              <tr key={k.id}>
                <td>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                    {k.category}
                  </span>
                </td>
                <td>
                  <div className="text-xs text-gray-500 max-w-[150px] truncate">{k.keywords}</div>
                </td>
                <td>
                  <div className="text-sm text-gray-700 max-w-[250px] line-clamp-2">{k.response}</div>
                </td>
                <td>
                  <span className={`text-xs px-2 py-1 rounded-full ${k.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {k.is_active ? 'Oui' : 'Non'}
                  </span>
                </td>
                <td>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditing(k);
                        setForm({ category: k.category, keywords: k.keywords, response: k.response, is_active: k.is_active });
                        setModal(true);
                      }}
                      className="p-1.5 rounded hover:bg-green-50 text-green-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { if (confirm('Supprimer cette entrée ?')) deleteMutation.mutate(k.id); }}
                      className="p-1.5 rounded hover:bg-red-50 text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">{editing ? 'Modifier entrée' : 'Nouvelle entrée'}</h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="form-label">Catégorie *</label>
                <input
                  className="form-input"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="Ex: GCF, Projets, Contact"
                />
              </div>
              <div>
                <label className="form-label">Mots-clés (séparés par virgule) *</label>
                <input
                  className="form-input"
                  value={form.keywords}
                  onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
                  placeholder="gcf,green climate fund,fonds"
                />
              </div>
              <div>
                <label className="form-label">Réponse *</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={form.response}
                  onChange={e => setForm(f => ({ ...f, response: e.target.value }))}
                  placeholder="Réponse que le chatbot donnera..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="kb_active"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 accent-green-600"
                />
                <label htmlFor="kb_active" className="text-sm text-gray-700">Actif</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button className="btn btn-secondary flex-1" onClick={closeModal}>Annuler</button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={() => {
                    if (!form.category.trim()) return toast.error('La catégorie est requise');
                    if (!form.keywords.trim()) return toast.error('Les mots-clés sont requis');
                    if (!form.response.trim()) return toast.error('La réponse est requise');
                    knowledgeMutation.mutate(form);
                  }}
                  disabled={knowledgeMutation.isPending}
                >
                  {knowledgeMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Save className="w-4 h-4" />}
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}