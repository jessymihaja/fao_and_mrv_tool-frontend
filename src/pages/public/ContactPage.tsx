// src/pages/public/ContactPage.tsx
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { cmsApi, settingsApi } from '@/api/services';
import { Send, CheckCircle, MapPin, Mail, Phone, Clock, ArrowRight, Leaf } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const [form, setForm] = useState({ nom: '', email: '', sujet: '', message: '' });
  const [sent, setSent] = useState(false);

  // ── Settings dynamiques ──────────────────────────────────────
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => settingsApi.public().then(r =>
      Object.fromEntries(r.data.map(s => [s.key, s.value])) as Record<string, string>
    ),
    staleTime: 5 * 60_000,
  });
  const get = (key: string, fallback = '') => settings?.[key] || fallback;

  const address = get('contact_address', 'Antananarivo, Madagascar');
  const email   = get('contact_email',   'info@gcf-madagascar.org');
  const phone   = get('contact_phone',   '+261 20 22 XXX XX');

  // ── Envoi formulaire ─────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (data: typeof form) => cmsApi.sendContact(data),
    onSuccess: () => { setSent(true); setForm({ nom: '', email: '', sujet: '', message: '' }); },
    onError: () => toast.error("Erreur lors de l'envoi. Veuillez réessayer."),
  });

  if (sent) return (
    <div className="flex items-center justify-center min-h-[70vh] px-6" style={{ background: 'var(--gcf-bg)' }}>
      <div className="text-center max-w-md">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, #1a6b45, #10b981)' }}>
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-800 mb-3">Message envoyé !</h2>
        <p className="text-gray-500 mb-8 leading-relaxed text-lg">
          Merci pour votre message. Notre équipe vous répondra dans les <strong>48 heures ouvrables</strong>.
        </p>
        <button onClick={() => setSent(false)} className="btn btn-primary inline-flex items-center gap-2">
          <ArrowRight className="w-4 h-4" /> Envoyer un autre message
        </button>
      </div>
    </div>
  );

  return (
    <div>
      {/* HERO */}
      <div className="relative overflow-hidden" style={{ minHeight: 280 }}>
        <img
          src="/images/madagascar-vie.jpg"
          alt="Madagascar"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'brightness(0.38)' }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            (e.currentTarget.parentElement as HTMLElement).style.background = 'var(--gcf-green-dark)';
          }}
        />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(15,64,39,0.85) 0%, rgba(16,185,129,0.35) 100%)' }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.07) 1px, transparent 0)', backgroundSize: '36px 36px' }} />
        <div className="relative z-10 py-20 text-white text-center px-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-5"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
            <Leaf className="w-3.5 h-3.5 text-green-300" /> GCF Madagascar
          </div>
          <h1 className="text-5xl font-extrabold mb-4 drop-shadow-lg leading-tight">Contactez-nous</h1>
          <p className="text-green-100 max-w-lg mx-auto text-lg leading-relaxed">
            Notre équipe est à votre disposition pour toute question sur nos projets ou nos activités climatiques.
          </p>
        </div>
      </div>

      {/* CARTES INFO — données dynamiques */}
      <div style={{ background: 'var(--gcf-bg)' }} className="pt-0 pb-0">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 -translate-y-8">
            {[
              { icon: MapPin, label: 'Adresse',   value: address, sub: 'BNCC-REDD+ / MEDD',  color: '#10b981' },
              { icon: Mail,   label: 'Email',     value: email,   sub: 'Réponse sous 48h',    color: '#3b82f6' },
              { icon: Phone,  label: 'Téléphone', value: phone,   sub: 'Lun–Ven, 8h–17h',     color: '#f59e0b' },
            ].map(({ icon: Icon, label, value, sub, color }) => (
              <div key={label} className="bg-white rounded-2xl p-5 flex items-start gap-4 shadow-lg border border-gray-100">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}18` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-0.5">{label}</div>
                  <div className="text-sm font-bold text-gray-800 leading-snug">{value}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CORPS */}
      <div style={{ background: 'var(--gcf-bg)' }} className="pb-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

            {/* Colonne gauche */}
            <div className="lg:col-span-2 space-y-5">

              {/* Horaires */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#dcfce7' }}>
                    <Clock className="w-4 h-4 text-green-600" />
                  </div>
                  <h4 className="font-bold text-gray-800">Horaires d'ouverture</h4>
                </div>
                <div className="space-y-0">
                  {[
                    { jour: 'Lundi – Vendredi', heure: '08h00 – 17h00', actif: true },
                    { jour: 'Samedi',           heure: 'Fermé',          actif: false },
                    { jour: 'Dimanche',         heure: 'Fermé',          actif: false },
                  ].map(({ jour, heure, actif }) => (
                    <div key={jour} className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0">
                      <span className="text-gray-600">{jour}</span>
                      <span className={`font-semibold ${actif ? 'text-green-600' : 'text-gray-400'}`}>{heure}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">(GMT+3, heure de Madagascar)</p>
              </div>

              {/* Image localisation */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <div className="relative h-44">
                  <img
                    src="https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&q=70&fit=crop"
                    alt="Madagascar"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%)' }} />
                  <div className="absolute bottom-3 left-4 text-white">
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      <MapPin className="w-4 h-4 text-green-400" /> {address}
                    </div>
                    <div className="text-xs text-white/70 mt-0.5">Ministère de l'Environnement</div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Bureau National des Changements Climatiques et de la REDD+ (BNCC-REDD+), rattaché au MEDD.
                  </p>
                </div>
              </div>

              {/* Note partenariat */}
              <div className="rounded-2xl p-5"
                style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #bbf7d0' }}>
                <div className="flex items-start gap-3">
                  <Leaf className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-green-800 mb-1">Devenir partenaire</div>
                    <p className="text-xs text-green-700 leading-relaxed">
                      Vous représentez une organisation et souhaitez collaborer sur des projets climatiques à Madagascar ? Mentionnez-le dans votre message.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulaire */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-8 py-6"
                  style={{ background: 'linear-gradient(135deg, var(--gcf-green-dark), #1a6b45)' }}>
                  <h3 className="text-white font-extrabold text-xl">Envoyer un message</h3>
                  <p className="text-green-200 text-sm mt-1">Tous les champs marqués * sont obligatoires</p>
                </div>

                <div className="p-8 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="form-label">Nom complet *</label>
                      <input className="form-input" value={form.nom}
                        onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                        placeholder="Votre nom" required />
                    </div>
                    <div>
                      <label className="form-label">Adresse email *</label>
                      <input type="email" className="form-input" value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="votre@email.com" required />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Sujet *</label>
                    <input className="form-input" value={form.sujet}
                      onChange={e => setForm(f => ({ ...f, sujet: e.target.value }))}
                      placeholder="Objet de votre message" required />
                  </div>

                  <div>
                    <label className="form-label">Message *</label>
                    <textarea className="form-input" rows={6} value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Décrivez votre demande en détail..."
                      required style={{ resize: 'vertical' }} />
                  </div>

                  <button
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, var(--gcf-green-dark), #1a6b45)', color: 'white' }}
                    onClick={() => mutation.mutate(form)}
                    disabled={mutation.isPending || !form.nom || !form.email || !form.sujet || !form.message}
                  >
                    {mutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Envoyer le message
                      </>
                    )}
                  </button>

                  <p className="text-xs text-gray-400 text-center">
                    En envoyant ce formulaire, vous acceptez que vos données soient utilisées pour vous répondre.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}