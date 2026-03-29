import React, { useState, useEffect, useCallback } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useFirebase } from './FirebaseProvider';
import { getSOSMessage } from '../services/aiCoach';
import { haptic } from '../services/haptic';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Sparkles, Wind, Phone, Lock } from 'lucide-react';

const TIPS = [
  "🚶 Lève-toi et marche 2 minutes dans la pièce",
  "💧 Bois un grand verre d'eau froide maintenant",
  "📞 Appelle quelqu'un que tu aimes, n'importe qui",
  "🎵 Mets ta musique préférée à fond",
  "🌬️ Souffle fort 3 fois — vide tes poumons complètement",
  "✋ Serre fort ton poing pendant 10 secondes, puis relâche",
  "🪟 Ouvre une fenêtre et respire l'air frais",
  "⏱️ Dis-toi : je tiens encore 5 minutes. Juste 5.",
];

const CYCLES_REQUIRED = 2; // Nombre de cycles 4-4-4 avant de pouvoir valider

type BreathPhase = 'inspire' | 'retiens' | 'expire' | 'pause';

export default function SOSMode({ onClose }: { onClose: () => void }) {
  const { profile, user } = useFirebase();
  const [sosMsg,        setSosMsg]        = useState('');
  const [loadingMsg,    setLoadingMsg]    = useState(true);
  const [seconds,       setSeconds]       = useState(0);
  const [breathPhase,   setBreathPhase]   = useState<BreathPhase>('inspire');
  const [breathCount,   setBreathCount]   = useState(4);
  const [showSuccess,   setShowSuccess]   = useState(false);
  const [tipIndex,      setTipIndex]      = useState(0);
  const [breathCycles,  setBreathCycles]  = useState(0);
  const [canResist,     setCanResist]     = useState(false);
  const [showXPAnim,    setShowXPAnim]    = useState(false);

  // Compteur
  useEffect(() => {
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Tips rotatifs
  useEffect(() => {
    const t = setInterval(() => setTipIndex(i => (i + 1) % TIPS.length), 8000);
    return () => clearInterval(t);
  }, []);

  // Respiration 4-4-4
  useEffect(() => {
    const phases: { phase: BreathPhase; duration: number }[] = [
      { phase: 'inspire', duration: 4000 },
      { phase: 'retiens', duration: 4000 },
      { phase: 'expire',  duration: 4000 },
      { phase: 'pause',   duration: 1000 },
    ];
    let idx = 0;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      const current = phases[idx];
      setBreathPhase(current.phase);
      let remaining = current.duration / 1000;
      setBreathCount(remaining);
      const countdown = setInterval(() => { remaining -= 1; setBreathCount(remaining); }, 1000);
      timer = setTimeout(() => {
        clearInterval(countdown);
        idx = (idx + 1) % phases.length;
        if (idx === 0) {
          setBreathCycles(c => {
            const newCount = c + 1;
            // Vibration à chaque cycle complété
            haptic('light');
            // Débloquer le bouton après CYCLES_REQUIRED cycles
            if (newCount >= CYCLES_REQUIRED) setCanResist(true);
            return newCount;
          });
        }
        next();
      }, current.duration);
    };
    next();
    return () => clearTimeout(timer);
  }, []);

  // Message SOS
  useEffect(() => {
    if (!profile) return;
    const isPremium = profile.subscriptionType === 'premium';
    if (isPremium) {
      getSOSMessage(profile).then(msg => { setSosMsg(msg); setLoadingMsg(false); });
    } else {
      setSosMsg(`Cette envie va passer — elle dure toujours moins de 20 minutes. ${profile.streakCount > 0 ? `Tu as tenu ${profile.streakCount} jour${profile.streakCount > 1 ? 's' : ''}, ne lâche pas maintenant.` : 'Chaque seconde de résistance compte.'} Respire, lève-toi, et bois un verre d'eau.`);
      setLoadingMsg(false);
    }
  }, [profile?.uid]);

  const handleResisted = useCallback(async () => {
    if (!user || !profile || !canResist) return;
    haptic('resist');
    setShowXPAnim(true);
    await updateDoc(doc(db, 'users', user.uid), { xp: (profile.xp ?? 0) + 25 });
    setTimeout(() => {
      setShowXPAnim(false);
      setShowSuccess(true);
    }, 1000);
    setTimeout(onClose, 4000);
  }, [user, profile, onClose, canResist]);

  const breathLabel = { inspire: 'Inspire…', retiens: 'Retiens…', expire: 'Expire…', pause: 'Pause…' }[breathPhase];
  const breathScale = breathPhase === 'inspire' ? 1.4 : breathPhase === 'retiens' ? 1.4 : 1;
  const formatTime  = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const contacts    = profile?.emergencyContacts ?? [];

  // Écran succès
  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 bg-emerald-600 flex flex-col items-center justify-center p-8 text-white">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="text-center">
          <motion.div
            initial={{ scale: 1 }} animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: 2 }}
            className="text-8xl mb-6">🦅</motion.div>
          <h2 className="text-4xl font-black mb-3">Tu as résisté !</h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-black text-emerald-200 mb-2">+25 XP</motion.p>
          <p className="text-sm opacity-75">Tu viens de prouver que tu es plus fort.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col overflow-y-auto">

      {/* Animation XP flottant */}
      <AnimatePresence>
        {showXPAnim && (
          <motion.div
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -80, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-60 text-emerald-400 font-black text-4xl pointer-events-none"
          >
            +25 XP 🎉
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex justify-between items-center p-6 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-xs font-black uppercase tracking-widest">Mode urgence</span>
          </div>
          <p className="text-white text-2xl font-black">Tu tiens depuis</p>
          <p className="text-4xl font-black text-emerald-400">{formatTime(seconds)}</p>
        </div>
        <button onClick={onClose} className="p-3 bg-white/10 rounded-2xl text-white"><X size={22} /></button>
      </div>

      {/* Respiration */}
      <div className="flex flex-col items-center py-8 shrink-0">
        <div className="relative flex items-center justify-center mb-6">
          <motion.div animate={{ scale: breathPhase === 'inspire' ? 1.6 : breathPhase === 'retiens' ? 1.6 : 1 }}
            transition={{ duration: 4, ease: 'easeInOut' }} className="absolute w-36 h-36 rounded-full bg-indigo-600/20" />
          <motion.div animate={{ scale: breathPhase === 'inspire' ? 1.3 : breathPhase === 'retiens' ? 1.3 : 1 }}
            transition={{ duration: 4, ease: 'easeInOut' }} className="absolute w-28 h-28 rounded-full bg-indigo-600/30" />
          <motion.div animate={{ scale: breathScale }} transition={{ duration: 4, ease: 'easeInOut' }}
            className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center">
            <Wind size={28} className="text-white" />
          </motion.div>
        </div>
        <p className="text-white text-xl font-black mb-1">{breathLabel}</p>
        <p className="text-slate-400 text-3xl font-black">{breathCount}</p>

        {/* Indicateur de cycles */}
        <div className="flex items-center gap-2 mt-3">
          {Array.from({ length: CYCLES_REQUIRED }).map((_, i) => (
            <motion.div key={i}
              initial={{ scale: 0.8 }}
              animate={{ scale: breathCycles > i ? 1 : 0.8 }}
              className={`w-3 h-3 rounded-full transition-colors ${breathCycles > i ? 'bg-emerald-400' : 'bg-slate-700'}`}
            />
          ))}
          <p className="text-slate-500 text-xs font-medium ml-1">
            {breathCycles >= CYCLES_REQUIRED
              ? '✅ Cycles complétés !'
              : `${breathCycles}/${CYCLES_REQUIRED} cycles`}
          </p>
        </div>
      </div>

      {/* Message coach */}
      <div className="mx-6 mb-6 bg-white/5 border border-white/10 rounded-3xl p-5 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-indigo-400" />
          <span className="text-xs font-black text-indigo-400 uppercase tracking-wider">
            {profile?.subscriptionType === 'premium' ? 'Coach IA Claude' : 'Ton coach'}
          </span>
        </div>
        {loadingMsg ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Analyse en cours…</p>
          </div>
        ) : (
          <p className="text-white font-medium leading-relaxed text-sm">{sosMsg}</p>
        )}
      </div>

      {/* Contacts d'urgence */}
      {contacts.length > 0 && (
        <div className="mx-6 mb-6 shrink-0">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Appeler un proche</p>
          <div className="space-y-2">
            {contacts.map((contact, i) => (
              <a key={i} href={`tel:${contact.phone}`}
                className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 active:scale-95 transition-transform">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                  <Phone size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-black text-sm">{contact.name}</p>
                  <p className="text-slate-400 text-xs font-medium">{contact.phone}</p>
                </div>
                <span className="text-emerald-400 text-xs font-black uppercase tracking-wider">Appeler</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mx-6 mb-6 shrink-0">
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Action immédiate</p>
        <AnimatePresence mode="wait">
          <motion.div key={tipIndex}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
            <p className="text-amber-300 font-bold text-sm">{TIPS[tipIndex]}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Boutons */}
      <div className="px-6 pb-8 space-y-3 shrink-0 mt-auto">
        {canResist ? (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            onClick={handleResisted}
            className="w-full py-5 bg-emerald-500 text-white rounded-3xl font-black text-lg flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-lg shadow-emerald-500/30"
          >
            <CheckCircle2 size={24} /> J'ai résisté ! +25 XP
          </motion.button>
        ) : (
          <div className="w-full py-5 bg-slate-800 text-slate-500 rounded-3xl font-black text-sm flex items-center justify-center gap-3 border border-slate-700">
            <Lock size={18} />
            Complète {CYCLES_REQUIRED - breathCycles} cycle{CYCLES_REQUIRED - breathCycles > 1 ? 's' : ''} pour débloquer
          </div>
        )}
        <button onClick={onClose} className="w-full py-4 text-slate-500 font-bold text-sm">
          Fermer sans enregistrer
        </button>
      </div>
    </div>
  );
}
