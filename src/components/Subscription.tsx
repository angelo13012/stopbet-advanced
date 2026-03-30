import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useFirebase } from './FirebaseProvider';
import { app } from '../services/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Star, X, Sparkles, Trophy, TrendingUp, Lock, Gift, Copy, Users, ShieldOff, SmilePlus, Quote, AlertTriangle } from 'lucide-react';

type View = 'main' | 'referral';

const PREMIUM_FEATURES = [
  { icon: <Sparkles size={15} />,     text: 'Coach IA Claude — analyse personnalisée chaque jour' },
  { icon: <TrendingUp size={15} />,   text: 'Graphique 12 mois + heatmap 30 jours' },
  { icon: <Trophy size={15} />,       text: 'Argent perdu vs économisé grâce à ton streak' },
  { icon: <Check size={15} />,        text: 'Historique complet des rechutes' },
  { icon: <AlertTriangle size={15} />,text: 'Alertes budget 10% / 20% / 30% de ton salaire' },
  { icon: <ShieldOff size={15} />,    text: 'Plateformes de paris + liens d\'auto-exclusion' },
  { icon: <SmilePlus size={15} />,    text: 'Badges journal d\'humeur — streak 7 et 30 jours' },
  { icon: <Quote size={15} />,        text: 'Citation motivante quotidienne personnalisée' },
];

export default function Subscription({ onComplete }: { onComplete: () => void }) {
  const { profile, user } = useFirebase();
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState(false);
  const [isTrial,      setIsTrial]      = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | null>(null);
  const [view,         setView]         = useState<View>('main');
  const [referralCode, setReferralCode] = useState('');
  const [inputCode,    setInputCode]    = useState('');
  const [referralMsg,  setReferralMsg]  = useState('');
  const [copied,       setCopied]       = useState(false);

  const isPremium     = profile?.subscriptionType === 'premium';
  const trialUsed     = profile?.trialUsed === true;
  const trialEndsAt   = profile?.trialEndsAt;
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const plan      = params.get('plan') as 'monthly' | 'yearly' | null;
    const trial     = params.get('trial') === 'true';
    if (sessionId && plan && user) {
      const fns = getFunctions(app, 'us-central1');
      httpsCallable(fns, 'confirmCheckout')({ sessionId, plan, trial })
        .then(() => { setSuccess(true); setIsTrial(trial); window.history.replaceState({}, '', window.location.pathname); })
        .catch(e => setError(e.message));
    }
  }, [user]);

  useEffect(() => {
    if (!user || !isPremium) return;
    const fns = getFunctions(app, 'us-central1');
    httpsCallable(fns, 'generateReferralCode')({})
      .then((r: any) => setReferralCode(r.data.code))
      .catch(() => {});
  }, [user, isPremium]);

  const handleSubscribe = async (plan: 'monthly' | 'yearly', withTrial = false) => {
    if (!user) return;
    setLoading(true); setError(''); setSelectedPlan(plan);
    try {
      const fns    = getFunctions(app, 'us-central1');
      const fnName = withTrial ? 'createTrialSession' : 'createCheckoutSession';
      const result = await httpsCallable(fns, fnName)({
        plan,
        successUrl: window.location.origin + window.location.pathname,
        cancelUrl:  window.location.origin + window.location.pathname,
      });
      window.location.href = (result.data as any).url;
    } catch (e: any) {
      setError(e.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  const handleApplyCode = async () => {
    if (!inputCode.trim() || !user) return;
    setLoading(true); setReferralMsg('');
    try {
      const fns = getFunctions(app, 'us-central1');
      await httpsCallable(fns, 'applyReferralCode')({ code: inputCode.trim() });
      setReferralMsg('✅ Code appliqué ! Tu as 15 jours Premium offerts.');
    } catch (e: any) {
      setReferralMsg('❌ ' + (e.message || 'Code invalide'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Rejoins-moi sur StopBet et arrête de parier ! Utilise mon code ${referralCode} pour obtenir 15 jours Premium offerts. stopbet-app-angel.vercel.app`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (success) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="text-center">
          <div className="text-7xl mb-6">{isTrial ? '🎁' : '🎉'}</div>
          <h2 className="text-3xl font-black text-slate-900 mb-3">
            {isTrial ? 'Essai démarré !' : 'Bienvenue Premium !'}
          </h2>
          <p className="text-slate-500 font-medium mb-2">
            {isTrial
              ? "7 jours gratuits commencent maintenant. Tu peux annuler à tout moment avant la fin de l'essai."
              : 'Toutes les fonctionnalités avancées sont débloquées.'}
          </p>
          {isTrial && <p className="text-xs text-slate-400 mb-8">Sans annulation, ton abonnement se renouvelle automatiquement.</p>}
          <button onClick={onComplete} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all">
            Découvrir les nouvelles fonctionnalités
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-slate-50 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">StopBet Premium</h2>
        <button onClick={onComplete} className="p-2 text-slate-400 hover:text-slate-600"><X size={24} /></button>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setView('main')}
          className={`flex-1 py-2.5 rounded-2xl text-sm font-black transition-all ${view === 'main' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>
          Abonnement
        </button>
        <button onClick={() => setView('referral')}
          className={`flex-1 py-2.5 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 ${view === 'referral' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>
          <Gift size={14} /> Parrainage
        </button>
      </div>

      <AnimatePresence mode="wait">
        {view === 'main' && (
          <motion.div key="main" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col flex-1">
            {isPremium ? (
              <div className="space-y-4">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center">
                  <div className="text-5xl mb-4">🎉</div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Vous êtes Premium !</h3>
                  {trialDaysLeft !== null && trialDaysLeft > 0 && (
                    <p className="text-amber-600 font-bold text-sm mt-2">⏳ Essai gratuit — {trialDaysLeft} jour{trialDaysLeft > 1 ? 's' : ''} restant{trialDaysLeft > 1 ? 's' : ''}</p>
                  )}
                  <p className="text-slate-600 font-medium mt-2">Toutes les fonctionnalités avancées sont débloquées.</p>
                </motion.div>
                <button onClick={() => setView('referral')}
                  className="w-full flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                  <div className="p-2 bg-indigo-600 rounded-xl text-white"><Users size={18} /></div>
                  <div className="text-left flex-1">
                    <p className="font-black text-slate-900 text-sm">Parrainez vos amis</p>
                    <p className="text-xs text-slate-500">Gagnez 1 mois offert pour 3 filleuls</p>
                  </div>
                </button>
              </div>
            ) : (
              <>
                {/* Features card — liste complète */}
                <div className="bg-indigo-600 p-7 rounded-[40px] text-white shadow-xl mb-6 relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-4">Pourquoi passer au Premium ?</h3>
                    <ul className="space-y-2.5">
                      {PREMIUM_FEATURES.map(({ icon, text }) => (
                        <li key={text} className="flex items-center gap-3">
                          <div className="bg-white/20 p-1.5 rounded-full shrink-0">{icon}</div>
                          <span className="font-medium text-sm">{text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12"><Star size={180} /></div>
                </div>

                {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium mb-4">{error}</div>}

                {!trialUsed && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Gift size={20} className="text-amber-500" />
                      <p className="font-black text-slate-900">7 jours gratuits</p>
                      <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full">OFFERT</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mb-4">
                      Essaie Premium gratuitement pendant 7 jours. Sans annulation, ton abonnement démarre automatiquement.
                    </p>
                    <div className="space-y-2">
                      <button onClick={() => handleSubscribe('monthly', true)} disabled={loading}
                        className="w-full py-3 bg-amber-500 text-white rounded-2xl font-black text-sm hover:bg-amber-600 transition-all disabled:opacity-50">
                        {loading && selectedPlan === 'monthly' ? 'Redirection…' : "Démarrer l'essai — Mensuel (3,49€/mois ensuite)"}
                      </button>
                      <button onClick={() => handleSubscribe('yearly', true)} disabled={loading}
                        className="w-full py-3 bg-amber-400 text-white rounded-2xl font-black text-sm hover:bg-amber-500 transition-all disabled:opacity-50">
                        {loading && selectedPlan === 'yearly' ? 'Redirection…' : "Démarrer l'essai — Annuel (30€/an ensuite)"}
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                  {trialUsed ? 'Choisir un abonnement' : "Ou s'abonner directement"}
                </p>
                <div className="space-y-3 flex-1">
                  <PlanCard title="Mensuel" price="3,49€" period="/ mois" description="Idéal pour commencer"
                    onClick={() => handleSubscribe('monthly')} loading={loading && selectedPlan === 'monthly'} />
                  <PlanCard title="Annuel" price="30€" period="/ an" description="2 mois offerts 🎁" highlight
                    onClick={() => handleSubscribe('yearly')} loading={loading && selectedPlan === 'yearly'} />
                </div>

                <div className="mt-4 p-4 bg-white border border-slate-100 rounded-2xl">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Tu as un code de parrainage ?</p>
                  <p className="text-xs text-indigo-600 font-bold mb-3">→ Obtiens 15 jours Premium offerts au lieu de 7 !</p>
                  <div className="flex gap-2">
                    <input value={inputCode} onChange={e => setInputCode(e.target.value.toUpperCase())}
                      placeholder="Ex: A1B2C3D4" maxLength={8}
                      className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 uppercase" />
                    <button onClick={handleApplyCode} disabled={loading || !inputCode.trim()}
                      className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">
                      Appliquer
                    </button>
                  </div>
                  {referralMsg && <p className="text-xs font-medium mt-2 text-slate-600">{referralMsg}</p>}
                </div>

                <div className="flex items-center justify-center gap-2 mt-4 text-slate-400">
                  <Lock size={14} />
                  <p className="text-xs font-medium">Paiement sécurisé par Stripe • Apple Pay • Google Pay</p>
                </div>
              </>
            )}
          </motion.div>
        )}

        {view === 'referral' && (
          <motion.div key="referral" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col flex-1">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-7 rounded-3xl text-white mb-6 relative overflow-hidden">
              <div className="relative z-10">
                <div className="text-4xl mb-3">🎁</div>
                <h3 className="text-2xl font-black mb-2">Parrainez vos amis</h3>
                <p className="text-sm font-medium opacity-90 leading-relaxed">
                  Pour chaque ami qui s'inscrit avec ton code, il reçoit <strong>15 jours Premium offerts</strong>.
                  Toi tu gagnes <strong>1 mois offert</strong> tous les 3 filleuls.
                </p>
              </div>
              <div className="absolute -right-8 -bottom-8 opacity-10 text-[120px]">🎁</div>
            </div>

            {isPremium ? (
              <>
                <div className="bg-white border border-slate-100 rounded-2xl p-5 mb-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Ton code unique</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
                      <p className="text-2xl font-black text-indigo-600 tracking-widest">{referralCode || '…'}</p>
                    </div>
                    <button onClick={handleCopy} className="p-4 bg-indigo-600 text-white rounded-xl active:scale-95 transition-transform">
                      {copied ? <Check size={20} /> : <Copy size={20} />}
                    </button>
                  </div>
                  {copied && <p className="text-xs text-emerald-600 font-bold mt-2 text-center">Message copié ! 🎉</p>}
                </div>

                <div className="bg-white border border-slate-100 rounded-2xl p-5 mb-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Tes filleuls</p>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-black text-slate-900">{profile?.referralCount ?? 0}</p>
                      <p className="text-xs text-slate-400 font-medium">filleul{(profile?.referralCount ?? 0) > 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((profile?.referralCount ?? 0) % 3) / 3 * 100)}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 font-bold">
                      {3 - ((profile?.referralCount ?? 0) % 3)} de plus → 1 mois offert
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Comment ça marche</p>
                  {[
                    '1. Partage ton code unique avec tes amis',
                    "2. Ils l'utilisent à l'inscription ou dans Compte",
                    '3. Ils reçoivent 15 jours Premium gratuits',
                    '4. Toi tu gagnes 1 mois offert tous les 3 filleuls',
                  ].map(step => (
                    <p key={step} className="text-xs text-slate-500 font-medium py-1">{step}</p>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center">
                <Lock size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500 mb-1">Fonctionnalité Premium</p>
                <p className="text-xs text-slate-400 mb-4">Abonne-toi pour accéder au parrainage et gagner des mois offerts.</p>
                <button onClick={() => setView('main')} className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm">
                  Voir les offres
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlanCard({ title, price, period, description, highlight, onClick, loading }: {
  title: string; price: string; period: string; description: string;
  highlight?: boolean; onClick: () => void; loading: boolean;
}) {
  return (
    <button onClick={onClick} disabled={loading}
      className={`w-full p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden disabled:opacity-50 ${
        highlight ? 'bg-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white border-slate-100'
      }`}>
      {highlight && (
        <div className="absolute top-0 right-0 bg-indigo-600 text-white px-4 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest">
          Meilleure offre
        </div>
      )}
      <div className="flex justify-between items-center mb-1">
        <h4 className="text-xl font-black text-slate-900">{title}</h4>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-slate-900">{price}</span>
          <span className="text-sm font-bold text-slate-400">{period}</span>
        </div>
      </div>
      <p className="text-sm font-medium text-slate-500">{description}</p>
      {loading && (
        <div className="mt-3 flex items-center gap-2 text-indigo-600">
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold">Redirection vers le paiement...</span>
        </div>
      )}
    </button>
  );
}
