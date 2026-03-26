import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useFirebase } from './FirebaseProvider';
import { motion } from 'framer-motion';
import { Check, Star, X, Sparkles, Trophy, TrendingUp, Lock } from 'lucide-react';

export default function Subscription({ onComplete }: { onComplete: () => void }) {
  const { profile, user } = useFirebase();
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | null>(null);

  const isPremium = profile?.subscriptionType === 'premium';

  // Vérifier si on revient d'un paiement Stripe réussi
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const plan = params.get('plan') as 'monthly' | 'yearly' | null;

    if (sessionId && plan && user) {
      const functions = getFunctions();
      const confirmCheckout = httpsCallable(functions, 'confirmCheckout');
      confirmCheckout({ sessionId, plan })
        .then(() => {
          setSuccess(true);
          window.history.replaceState({}, '', window.location.pathname);
        })
        .catch(e => setError(e.message));
    }
  }, [user]);

  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    if (!user) return;
    setLoading(true);
    setError('');
    setSelectedPlan(plan);

    try {
      const functions = getFunctions();
      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      const result = await createCheckoutSession({
        plan,
        successUrl: window.location.origin + window.location.pathname,
        cancelUrl:  window.location.origin + window.location.pathname,
      });

      const { url } = result.data as { url: string };
      window.location.href = url;
    } catch (e: any) {
      setError(e.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-center"
        >
          <div className="text-7xl mb-6">🎉</div>
          <h2 className="text-3xl font-black text-slate-900 mb-3">Bienvenue Premium !</h2>
          <p className="text-slate-500 font-medium mb-8">Toutes les fonctionnalités avancées sont débloquées.</p>
          <button onClick={onComplete}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all">
            Découvrir les nouvelles fonctionnalités
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-slate-50 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">StopBet Premium</h2>
        <button onClick={onComplete} className="p-2 text-slate-400 hover:text-slate-600"><X size={24} /></button>
      </div>

      {isPremium ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">Vous êtes Premium !</h3>
          <p className="text-slate-600 font-medium">Toutes les fonctionnalités avancées sont débloquées.</p>
        </motion.div>
      ) : (
        <>
          <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-xl mb-8 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-6">Pourquoi passer au Premium ?</h3>
              <ul className="space-y-4">
                {[
                  { icon: <Sparkles size={18} />, text: 'Coach IA Claude — analyse personnalisée' },
                  { icon: <TrendingUp size={18} />, text: 'Historique complet des rechutes' },
                  { icon: <Trophy size={18} />, text: 'Analyse des patterns de rechute' },
                  { icon: <Check size={18} />, text: 'Zéro pub, 100% focus' },
                ].map(({ icon, text }) => (
                  <li key={text} className="flex items-center gap-3">
                    <div className="bg-white/20 p-1.5 rounded-full shrink-0">{icon}</div>
                    <span className="font-medium">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12"><Star size={200} /></div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium mb-4">{error}</div>
          )}

          <div className="space-y-4 flex-1">
            <PlanCard
              title="Mensuel" price="3€" period="/ mois" description="Idéal pour commencer"
              onClick={() => handleSubscribe('monthly')}
              loading={loading && selectedPlan === 'monthly'}
            />
            <PlanCard
              title="Annuel" price="30€" period="/ an" description="2 mois offerts 🎁" highlight
              onClick={() => handleSubscribe('yearly')}
              loading={loading && selectedPlan === 'yearly'}
            />
          </div>

          <div className="flex items-center justify-center gap-2 mt-6 text-slate-400">
            <Lock size={14} />
            <p className="text-xs font-medium">Paiement sécurisé par Stripe • Apple Pay • Google Pay</p>
          </div>
        </>
      )}
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
