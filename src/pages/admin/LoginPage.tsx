// src/pages/admin/LoginPage.tsx
import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/services';
import toast from 'react-hot-toast';
import { getFieldErrors, getErrorMessage } from '@/utils/apiError';

export default function LoginPage() {
  const { isAuthenticated, setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', two_factor_code: '' });
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (isAuthenticated) return <Navigate to="/admin/dashboard" replace />;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const res = await authApi.login(form.email, form.password);
      if (res.data.requires_2fa) {
        setRequires2FA(true);
        setLoading(false);
        return;
      }
      setAuth(res.data.user, res.data.token);
      toast.success(`Bonjour, ${res.data.user.name} !`);
      navigate('/admin/dashboard');
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v[0] ?? ''])));
      toast.error(getErrorMessage(err, 'Erreur de connexion'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f9f4] flex items-center justify-center p-4 font-sans">
      <div
        className="w-full flex overflow-hidden rounded-2xl shadow-sm"
        style={{ maxWidth: 1100, height: 680, border: '0.5px solid #dde5d8' }}
      >

        {/* ── LEFT PANEL ── */}
        <div
          className="flex flex-col bg-white"
          style={{ flex: '0 0 46%', padding: '36px 44px 32px' }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between mb-0">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo/logoMEDD.png"
                alt="AND FVC Madagascar"
                className="h-20 w-auto object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
                }}
              />
              <div className="hidden items-center gap-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: '#0f3520' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-bold text-[#1a2e14]">AND FVC Madagascar</div>
                  <div className="text-xs text-[#8a9984]">BNCC-REDD+ / MEDD</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="flex items-center gap-1.5 text-[13px] text-[#6b7c65] rounded-full px-3 py-1 cursor-pointer hover:text-[#4a7c3f] transition-colors"
                style={{ background: '#f0f5ec', border: '0.5px solid #d4e2cc' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                Retour au site
              </Link>
            </div>
          </div>

          {/* Form area */}
          <div className="flex-1 flex flex-col justify-center">
            {!requires2FA ? (
              <>
                <h1
                  className="text-[40px] leading-tight text-[#1a2e14] mb-2 tracking-tight"
                  style={{ fontFamily: 'Georgia, serif', fontWeight: 400 }}
                >
                  Bonjour !
                </h1>
                <p className="text-[15px] text-[#8a9984] leading-relaxed mb-7 max-w-[420px]">
                  Pour vous connecter à votre compte, renseignez votre adresse email ainsi que votre mot de passe.
                </p>

                <form onSubmit={handleSubmit} className="space-y-2.5">
                  <input
                    type="email"
                    placeholder="Votre adresse email"
                    value={form.email}
                    onChange={set('email')}
                    required
                    className="w-full px-4 py-3.5 text-[15px] text-[#1a2e14] rounded-xl outline-none transition-all"
                    style={{
                      background: '#f9fbf7',
                      border: errors.email ? '0.5px solid #e24b4a' : '0.5px solid #d8e4d0',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#4a7c3f'; e.currentTarget.style.background = '#fff'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors.email ? '#e24b4a' : '#d8e4d0'; e.currentTarget.style.background = '#f9fbf7'; }}
                  />
                  <input
                    type="password"
                    placeholder="Votre mot de passe"
                    value={form.password}
                    onChange={set('password')}
                    required
                    className="w-full px-4 py-3.5 text-[15px] text-[#1a2e14] rounded-xl outline-none transition-all"
                    style={{
                      background: '#f9fbf7',
                      border: errors.password ? '0.5px solid #e24b4a' : '0.5px solid #d8e4d0',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#4a7c3f'; e.currentTarget.style.background = '#fff'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors.password ? '#e24b4a' : '#d8e4d0'; e.currentTarget.style.background = '#f9fbf7'; }}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 mt-1 text-[15px] font-medium text-[#e8f0e5] rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      background: loading ? '#3d5c34' : '#1a2e14',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {loading ? 'Connexion…' : 'Étape suivante'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h1
                  className="text-[36px] leading-tight text-[#1a2e14] mb-2 tracking-tight"
                  style={{ fontFamily: 'Georgia, serif', fontWeight: 400 }}
                >
                  Vérification
                </h1>
                <p className="text-[15px] text-[#8a9984] leading-relaxed mb-7">
                  Entrez le code à 6 chiffres de votre application d'authentification.
                </p>

                <form onSubmit={handleSubmit} className="space-y-2.5">
                  <div>
                    <input
                      type="text"
                      placeholder="000 000"
                      maxLength={6}
                      value={form.two_factor_code}
                      onChange={set('two_factor_code')}
                      required
                      className="w-full px-4 py-3.5 text-center text-[22px] tracking-[0.2em] text-[#1a2e14] rounded-xl outline-none"
                      style={{ background: '#f9fbf7', border: '0.5px solid #d8e4d0' }}
                    />
                    <p className="text-[13px] text-[#8a9984] mt-1">
                      Code valable 30 secondes depuis votre application.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 text-[15px] font-medium text-[#e8f0e5] rounded-xl disabled:opacity-60"
                    style={{ background: '#1a2e14' }}
                  >
                    {loading ? 'Vérification…' : 'Vérifier'}
                  </button>
                </form>

                <button
                  onClick={() => setRequires2FA(false)}
                  className="text-[13px] text-[#8a9984] mt-3 hover:text-[#4a7c3f] transition-colors text-left"
                >
                  ← Retour à la connexion
                </button>
              </>
            )}
          </div>

          {/* Footer */}
          <div
            className="mt-6 pt-5 text-center"
            style={{ borderTop: '0.5px solid #e8f0e4' }}
          >
            <p className="text-[13px] text-[#b0bfaa] leading-relaxed">
              N'hésitez pas à nous contacter
              <br />
              <a href="mailto:info@gcf-madagascar.org" className="text-[#6b9e63] hover:underline">
                l'administration AND FVC Madagascar
              </a>
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className="w-[5px] h-[5px] rounded-full bg-[#6b9e63]" />
              <span className="text-[12px] text-[#c4d4be]">Plateforme sécurisée — AND FVC Madagascar</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="relative flex-1 hidden md:block bg-[#c8d9bc] overflow-hidden">
          {/* Background image */}
          <img
            src="/images/slpix-madagascar.jpg"
            alt="Bureaux AND FVC"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'brightness(0.9) saturate(0.85)' }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />

          {/* Glassmorphism card */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
            <div
              className="text-center px-10 py-9 rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '0.5px solid rgba(255,255,255,0.30)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                maxWidth: 480,
              }}
            >
              <p className="text-[13px] uppercase tracking-widest text-white/70 mb-3">
                Autorité Nationale Désignée
              </p>
              <p
                className="text-[28px] text-white leading-snug mb-3"
                style={{ fontFamily: 'Georgia, serif', fontWeight: 400 }}
              >
                Accès sécurisé à la<br />plateforme GCF Madagascar
              </p>
              <div
                className="w-8 mx-auto mb-3"
                style={{ height: '0.5px', background: 'rgba(255,255,255,0.35)' }}
              />
              <p className="text-[14px] text-white/65 leading-relaxed">
                Espace réservé aux agents accrédités et partenaires institutionnels.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}