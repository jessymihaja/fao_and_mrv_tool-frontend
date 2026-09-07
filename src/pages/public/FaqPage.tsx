// src/pages/public/FaqPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cmsApi } from '@/api/services';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';

// Couleurs par catégorie
const CAT_COLORS: Record<string, { bg: string; text: string; border: string; activeBg: string; activeText: string }> = {
  'GCF Madagascar':        { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0', activeBg: '#16a34a', activeText: '#fff' },
  'AND':                   { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe', activeBg: '#2563eb', activeText: '#fff' },
  'Financement climatique':{ bg: '#fefce8', text: '#854d0e', border: '#fde68a', activeBg: '#d97706', activeText: '#fff' },
};

const DEFAULT_COLOR = { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb', activeBg: '#4b5563', activeText: '#fff' };

function getCat(cat: string) {
  return CAT_COLORS[cat] || DEFAULT_COLOR;
}

export default function FaqPage() {
  const [open, setOpen]         = useState<number | null>(null);
  const [search, setSearch]     = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['public-faq'],
    queryFn: () => cmsApi.faq().then(r => r.data),
  });

  const categories = [...new Set(faqs.map((f) => f.categorie).filter(Boolean))] as string[];

  const filtered = faqs.filter(f => {
    const matchSearch = !search ||
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.reponse.toLowerCase().includes(search.toLowerCase());
    const matchCat = !activeCategory || f.categorie === activeCategory;
    return matchSearch && matchCat;
  });

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(prev => prev === cat ? null : cat);
    setOpen(null); // fermer les accordéons ouverts lors du changement de filtre
  };

  const clearFilters = () => {
    setSearch('');
    setActiveCategory(null);
  };

  const hasActiveFilter = !!search || !!activeCategory;

  return (
    <div>
      {/* HERO */}
      <div className="relative py-20 text-white text-center overflow-hidden">
        <img
          src="/images/madagascar-urbain.jpg"
          alt="Madagascar"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'brightness(0.45)' }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            (e.currentTarget.parentElement as HTMLElement).style.background = 'var(--gcf-green-dark)';
          }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(15,64,39,0.7) 100%)' }} />
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold mb-3 drop-shadow-lg">Foire Aux Questions</h1>
          <p className="text-green-100 max-w-xl mx-auto text-lg drop-shadow">
            Tout ce que vous devez savoir sur GCF Madagascar et nos projets climatiques.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-5">

        {/* SEARCH */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="form-input pl-10 pr-10 py-3 text-base"
            placeholder="Rechercher une question..."
            value={search}
            onChange={e => { setSearch(e.target.value); setOpen(null); }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* FILTRES PAR CATÉGORIE */}
        {categories.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Filtrer par catégorie</p>
            <div className="flex flex-wrap gap-2">
              {/* Bouton Toutes */}
              <button
                onClick={() => setActiveCategory(null)}
                className="px-4 py-1.5 rounded-full text-sm font-semibold border transition-all"
                style={
                  !activeCategory
                    ? { background: 'var(--gcf-green)', color: '#fff', borderColor: 'var(--gcf-green)' }
                    : { background: '#f9fafb', color: '#374151', borderColor: '#e5e7eb' }
                }
              >
                Toutes
                <span
                  className="ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={
                    !activeCategory
                      ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                      : { background: '#e5e7eb', color: '#6b7280' }
                  }
                >
                  {faqs.length}
                </span>
              </button>

              {/* Boutons par catégorie */}
              {categories.map(cat => {
                const c = getCat(cat);
                const count = faqs.filter((f) => f.categorie === cat).length;
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryClick(cat)}
                    className="px-4 py-1.5 rounded-full text-sm font-semibold border transition-all hover:shadow-sm"
                    style={
                      isActive
                        ? { background: c.activeBg, color: c.activeText, borderColor: c.activeBg }
                        : { background: c.bg, color: c.text, borderColor: c.border }
                    }
                  >
                    {cat}
                    <span
                      className="ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full"
                      style={
                        isActive
                          ? { background: 'rgba(255,255,255,0.25)', color: c.activeText }
                          : { background: c.border, color: c.text }
                      }
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* RÉSUMÉ + RESET */}
        {hasActiveFilter && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              <strong className="text-gray-800">{filtered.length}</strong> résultat{filtered.length !== 1 ? 's' : ''}
              {activeCategory && <> dans <strong className="text-gray-800">"{activeCategory}"</strong></>}
              {search && <> pour <strong className="text-gray-800">"{search}"</strong></>}
            </span>
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
            >
              <X className="w-3 h-3" /> Réinitialiser
            </button>
          </div>
        )}

        {/* FAQ ITEMS */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((faq) => {
              const c = getCat(faq.categorie ?? '');
              const isOpen = open === faq.id;
              return (
                <div
                  key={faq.id}
                  className="bg-white rounded-2xl overflow-hidden transition-all"
                  style={{
                    border: isOpen ? `1.5px solid ${c.activeBg}` : '1.5px solid #f0f0f0',
                    boxShadow: isOpen ? `0 4px 16px ${c.activeBg}18` : '0 1px 4px rgba(0,0,0,0.04)',
                  }}
                >
                  <button
                    className="w-full flex items-center justify-between p-5 text-left gap-3"
                    onClick={() => setOpen(isOpen ? null : faq.id)}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {faq.categorie && (
                        <span
                          className="text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 mt-0.5"
                          style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                        >
                          {faq.categorie}
                        </span>
                      )}
                      <span className="font-semibold text-gray-800 leading-snug">{faq.question}</span>
                    </div>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                      style={isOpen
                        ? { background: c.activeBg, color: '#fff' }
                        : { background: '#f3f4f6', color: '#9ca3af' }
                      }
                    >
                      {isOpen
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />
                      }
                    </div>
                  </button>

                  {isOpen && (
                    <div
                      className="px-5 pb-5 border-t"
                      style={{ borderColor: `${c.activeBg}20` }}
                    >
                      <p className="text-gray-600 leading-relaxed pt-4">{faq.reponse}</p>
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">❓</div>
                <p className="font-medium mb-1">Aucune question trouvée</p>
                <p className="text-sm">
                  {search ? `pour "${search}"` : `dans cette catégorie`}
                </p>
                <button onClick={clearFilters} className="mt-4 text-sm text-green-600 hover:underline font-medium">
                  Voir toutes les questions
                </button>
              </div>
            )}
          </div>
        )}

        {/* CONTACT CTA */}
        <div className="card p-6 text-center border-2" style={{ borderColor: 'var(--gcf-border)' }}>
          <p className="text-gray-700 font-medium mb-2">Vous n'avez pas trouvé votre réponse ?</p>
          <p className="text-gray-500 text-sm mb-4">Notre équipe est disponible pour répondre à toutes vos questions.</p>
          <a href="/contact" className="btn btn-primary">Nous contacter</a>
        </div>
      </div>
    </div>
  );
}