import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useFirebase } from './FirebaseProvider';
import { handleRelapse } from '../services/streak';
import { getInterventionMessage } from '../services/aiCoach';
import { Goal } from '../types';
import { motion } from 'framer-motion';
import {
  Euro, MessageSquare, Clock, CheckCircle2, ShieldAlert, X, Lock,
} from 'lucide-react';

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const h = new Date().getHours();
  if (h >= 6  && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18 && h < 22) return 'evening';
  return 'night';
}

// Messages locaux pour les utilisateurs FREE — courts et directs
function getFreeIntervention(amount: number, streak: number): string {
  const messages = [
    `Es-tu sûr de vouloir parier ${amount}€ ?`,
    `Ce pari va remettre ton streak à zéro.`,
    `${amount}€ perdus = argent qui ne reviendra pas.`,
    `Prends 30 secondes. Tu veux vraiment faire ça ?`,
    `Rappel : chaque pari recommence la série à zéro.`,
  ];
  if (streak > 0) {
    return `Tu vas perdre ton streak de ${streak} jour${streak > 1 ? 's' : ''}. Es-tu sûr ?`;
  }
  return messages[Math.floor(Math.random() * messages.length)];
}

export default function BetLogger({ onComplete }: { onComplete: () => void }) {
  const { user, profile } = useFirebase();
  const [amount,           setAmount]           = useState('');
  const [reason,           setReason]           = useState('');
  const [isPlanned,        setIsPlanned]        = useState(false);
  const [loading,          setLoading]          = useState(false);
  const [intervention,     setIntervention]     = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [cooldown,         setCooldown]         = useState(0);
  const [isPremiumMsg,     setIsPremiumMsg]     = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;
    setLoading(true);

    const isPremium = profile.subscriptionType === 'premium';

    try {
      if (isPremium) {
        // Premium — Claude génère un message psychologique profond
        const goalsSnap = await getDocs(collection(db, 'users', user.uid, 'goals'));
        const goals = goalsSnap.docs.map(d => d.data() as Goal);
        const msg = await getInterventionMessage(num, profile, goals);
        setIntervention(msg);
        setIsPremiumMsg(true);
        setCooldown(15); // 15 secondes pour premium — plus de temps pour réfléchir
      } else {
        // Free — message local court
        const msg = getFreeIntervention(num, profile.streakCount);
        setIntervention(msg);
        setIsPremiumMsg(false);
        setCooldown(5); // 5 secondes seulement pour free
      }
      setShowConfirmation(true);
    } catch {
      confirmBet();
    } finally {
      setLoading(false);
    }
  };

  const confirmBet = async () => {
    if (!user || !profile) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'bets'), {
        amount:    parseFloat(amount),
        date:      new Date().toISOString(),
        reason,
        isPlanned,
        timeOfDay: getTimeOfDay(),
      });
      await handleRelapse(user.uid, profile);
      onComplete();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Enregistrer un pari</h2>
        <button onClick={onComplete} className="p-2 text-slate-400 hover:text-slate-600"><X size={24} /></button>
      </div>

      {!showConfirmation ? (
        <form onSubmit={handleInitialSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Montant du pari</label>
            <div className="relative">
              <Euro className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
              <input type="number" placeholder="0.00" value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full pl-12 pr-4 py-6 bg-white border border-slate-100 rounded-3xl shadow-sm text-3xl font-black focus:outline-none focus:ring-2 focus:ring-indigo-600"
                required />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pourquoi pariez-vous ? (Optionnel)</label>
            <div className="relative">
              <MessageSquare className="absolute left-4 top-6 text-slate-400" size={20} />
              <textarea placeholder="Ennui, stress, envie de gagner…" value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-3xl shadow-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-indigo-600" />
            </div>
          </div>

          <div className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-xl text-slate-600"><Clock size={20} /></div>
              <div>
                <p className="font-bold text-slate-900">Pari planifié ?</p>
                <p className="text-xs text-slate-500 font-medium">Était-ce une impulsion ?</p>
              </div>
            </div>
            <button type="button" onClick={() => setIsPlanned(p => !p)}
              className={`w-14 h-8 rounded-full transition-colors relative ${isPlanned ? 'bg-indigo-600' : 'bg-slate-200'}`}>
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${isPlanned ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          {/* Badge premium/free */}
          {profile?.subscriptionType !== 'premium' && (
            <div className="flex items-center gap-2 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <Lock size={16} className="text-indigo-400 shrink-0" />
              <p className="text-xs text-indigo-600 font-medium">
                Passe en <span className="font-black">Premium</span> pour un coach IA qui analyse vraiment ta psychologie et te retient de parier.
              </p>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-5 bg-slate-900 text-white rounded-3xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50">
            {loading ? 'Analyse en cours…' : 'Continuer'}
          </button>
        </form>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">

          {/* Card d'intervention — différente selon premium ou free */}
          <div className={`p-8 rounded-[40px] border text-center ${
            isPremiumMsg
              ? 'bg-red-50 border-red-100'
              : 'bg-orange-50 border-orange-100'
          }`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              isPremiumMsg ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
            }`}>
              <ShieldAlert size={40} />
            </div>

            {isPremiumMsg ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-xs font-black text-red-500 uppercase tracking-widest">Coach IA — Analyse psychologique</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Stop. Lis ceci attentivement.</h3>
                <p className="text-slate-700 font-medium leading-relaxed text-left mb-8">{intervention}</p>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Pause. Réfléchis un instant.</h3>
                <p className="text-slate-700 font-medium leading-relaxed italic mb-4">"{intervention}"</p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Lock size={14} className="text-indigo-400" />
                  <p className="text-xs text-indigo-600 font-bold">
                    Premium — analyse psychologique approfondie
                  </p>
                </div>
              </>
            )}

            <div className="space-y-3">
              <button onClick={onComplete}
                className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2">
                <CheckCircle2 size={24} /> Je ne parie pas finalement
              </button>
              <button onClick={confirmBet} disabled={loading || cooldown > 0}
                className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition-all disabled:opacity-50 text-sm">
                {loading ? 'Enregistrement…' : cooldown > 0 ? `Attendez encore ${cooldown}s…` : 'Enregistrer quand même'}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 font-medium px-8">
            Chaque pari enregistré réinitialise votre série de jours sans pari à zéro.
          </p>
        </motion.div>
      )}
    </div>
  );
}
