import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  doc, updateDoc, addDoc, deleteDoc, getDoc, setDoc,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useFirebase } from './FirebaseProvider';
import { Bet, Goal, ALL_BADGES, getLevelMeta, getDailyQuote } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingDown, Flame, Target, Sparkles,
  Plus, Trash2, X, Trophy, Star, Zap, Lock, SmilePlus,
  AlertTriangle, AlertOctagon, Quote, Crown, ChevronRight,
} from 'lucide-react';
import { getMotivationalMessage, analyzeRelapsePattern, getMoodAnalysis } from '../services/aiCoach';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

function getLocalMessage(jours: number): string {
  if (jours === 0) return "Aujourd'hui est un nouveau départ. Chaque grand voyage commence par un premier pas. 💪";
  if (jours < 7)  return `${jours} jour${jours > 1 ? 's' : ''} sans pari déjà ! Tu bâtis quelque chose de solide. Continue !`;
  if (jours < 30) return `${jours} jours sans pari — tu montres chaque jour que tu es plus fort. 🔥`;
  return `${jours} jours sans pari — tu es une légende vivante. Rien ne peut t'arrêter. 👑`;
}

const MOODS = [
  { value: 'stressed', emoji: '😤', label: 'Stressé' },
  { value: 'sad',      emoji: '😔', label: 'Déprimé' },
  { value: 'neutral',  emoji: '😐', label: 'Neutre'  },
  { value: 'good',     emoji: '😊', label: 'Bien'    },
  { value: 'strong',   emoji: '💪', label: 'Fort'    },
];

const MOOD_RISK: Record<string, boolean> = { stressed: true, sad: true };

const BUDGET_ALERTS = [
  { pct: 30, level: 'critical', color: 'bg-red-50 border-red-200',      icon: 'text-red-500',    text: 'text-red-700',    label: 'Situation critique', msg: (p: number) => `Tu as dépensé ${p.toFixed(0)}% de ton salaire en paris ce mois. C'est une situation sérieuse — pense à activer le mode SOS.` },
  { pct: 20, level: 'danger',   color: 'bg-orange-50 border-orange-200', icon: 'text-orange-500', text: 'text-orange-700', label: 'Dépenses élevées',   msg: (p: number) => `${p.toFixed(0)}% de ton salaire dépensé en paris ce mois. Tu approches d'un niveau préoccupant.` },
  { pct: 10, level: 'warning',  color: 'bg-amber-50 border-amber-200',   icon: 'text-amber-500',  text: 'text-amber-700',  label: 'Attention',          msg: (p: number) => `${p.toFixed(0)}% de ton salaire est parti en paris ce mois. Reste vigilant.` },
];

function getBudgetAlert(pct: number) {
  return BUDGET_ALERTS.find(a => pct >= a.pct) ?? null;
}

// ── Modal didacticiel Premium ──
function PremiumTutorialModal({ onClose, onUpgrade }: { onClose: () => void; onUpgrade: () => void }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      emoji: '🧠',
      title: 'Coach IA personnalisé',
      desc: 'Chaque matin, ton coach analyse ton historique et te envoie un message adapté à ta situation. Il connaît tes rechutes, tes progrès, tes déclencheurs.',
      preview: '"Tu as résisté 3 fois cette semaine à des envies de parier après des matchs. C\'est exactement ce type de progression qui change une vie. Continue à identifier ces moments et à les noter."',
      color: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      emoji: '📊',
      title: 'Analyse de tes rechutes',
      desc: 'Le coach IA analyse tes patterns de rechutes et identifie tes déclencheurs — heure, humeur, événements sportifs — pour t\'aider à les anticiper.',
      preview: '"Tes rechutes surviennent principalement le dimanche soir après 20h, souvent après un match de Ligue 1. On va travailler sur ces moments."',
      color: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
    {
      emoji: '💰',
      title: 'Argent économisé calculé',
      desc: 'Visualise en temps réel combien tu aurais perdu sans StopBet. Chaque jour de streak = de l\'argent dans ta poche.',
      preview: 'À ton rythme actuel : +847€ économisés ce mois 💚',
      color: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
  ];

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
        className="bg-white w-full max-w-md rounded-t-[32px] p-8 shadow-2xl">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-8 bg-indigo-600' : 'w-3 bg-slate-200'}`} />
            ))}
          </div>
          <button onClick={onClose} className="p-1 text-slate-400"><X size={20} /></button>
        </div>

        {/* Contenu */}
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className={`w-14 h-14 ${current.color} rounded-2xl flex items-center justify-center text-3xl mb-4`}>
              {current.emoji}
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">{current.title}</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-4">{current.desc}</p>

            {/* Preview du coach IA */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className={current.iconColor} />
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Exemple coach IA</p>
              </div>
              <p className="text-sm text-slate-700 font-medium italic leading-relaxed">{current.preview}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Boutons */}
        <div className="flex gap-3">
          {step < steps.length - 1 ? (
            <>
              <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold text-sm">
                Pas maintenant
              </button>
              <button onClick={() => setStep(s => s + 1)}
                className="flex-[2] py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2">
                Suivant <ChevronRight size={16} />
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold text-sm">
                Plus tard
              </button>
              <button onClick={onUpgrade}
                className="flex-[2] py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2">
                <Crown size={16} /> Essayer 7j gratuits
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function Dashboard({ onGoToPremium }: { onGoToPremium?: () => void }) {
  const { profile, user } = useFirebase();
  const [recentBets,        setRecentBets]        = useState<Bet[]>([]);
  const [goals,             setGoals]             = useState<Goal[]>([]);
  const [coachMsg,          setCoachMsg]          = useState('Chargement de votre message du jour…');
  const [analysis,          setAnalysis]          = useState<string | null>(null);
  const [showAnalysis,      setShowAnalysis]      = useState(false);
  const [showAddGoal,       setShowAddGoal]       = useState(false);
  const [newGoal,           setNewGoal]           = useState({ title: '', cost: '' });
  const [loading,           setLoading]           = useState(false);
  const [dismissedAlert,    setDismissedAlert]    = useState<string | null>(null);
  const [newBadge,          setNewBadge]          = useState<{ emoji: string; name: string } | null>(null);
  const [showBanner,        setShowBanner]        = useState(false);
  const [showTutorial,      setShowTutorial]      = useState(false);

  const [showMoodModal, setShowMoodModal] = useState(false);
  const [todayMood,     setTodayMood]     = useState<string | null>(null);
  const [selectedMood,  setSelectedMood]  = useState<string | null>(null);
  const [moodNote,      setMoodNote]      = useState('');
  const [moodLoading,   setMoodLoading]   = useState(false);
  const [moodAnalysis,  setMoodAnalysis]  = useState<string | null>(null);
  const [recentMoods,   setRecentMoods]   = useState<{ value: string; date: string }[]>([]);
  const [moodStreak,    setMoodStreak]    = useState(0);

  const coachMsgLoadedRef = useRef<string | null>(null);

  const now          = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const todayStr     = now.toISOString().slice(0, 10);
  const dailyQuote   = getDailyQuote();

  useEffect(() => {
    if (!user) return;
    const unsubBets = onSnapshot(
      query(collection(db, 'users', user.uid, 'bets'), orderBy('date', 'desc')),
      snap => setRecentBets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Bet)))
    );
    const unsubGoals = onSnapshot(
      query(collection(db, 'users', user.uid, 'goals')),
      snap => setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Goal)))
    );
    return () => { unsubBets(); unsubGoals(); };
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    const loadMoods = async () => {
      try {
        const todayDoc = await getDoc(doc(db, 'users', user.uid, 'moods', todayStr));
        if (todayDoc.exists()) setTodayMood(todayDoc.data().value);
        const { getDocs } = await import('firebase/firestore');
        const moodsSnap = await getDocs(query(collection(db, 'users', user.uid, 'moods'), orderBy('date', 'desc')));
        const moods = moodsSnap.docs.slice(0, 30).map(d => ({ value: d.data().value, date: d.data().date }));
        setRecentMoods(moods);
        let streak = 0;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        for (let i = 0; i < moods.length; i++) {
          const expected = new Date(today);
          expected.setDate(today.getDate() - i);
          const expectedStr = expected.toISOString().slice(0, 10);
          if (moods[i]?.date === expectedStr) { streak++; } else { break; }
        }
        setMoodStreak(streak);
      } catch {}
    };
    loadMoods();
  }, [user?.uid, todayStr]);

  // ── Bannière + modal Premium pour users free ──
  useEffect(() => {
    if (!profile || profile.subscriptionType === 'premium') return;

    // Bannière toujours visible pour les free
    setShowBanner(true);

    // Modal après 3 jours d'utilisation
    const createdAt = profile.createdAt ? new Date(profile.createdAt) : null;
    if (createdAt) {
      const daysSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / 86400000);
      const tutorialShown = localStorage.getItem(`tutorial_shown_${user?.uid}`);
      if (daysSinceCreation >= 3 && !tutorialShown) {
        setTimeout(() => setShowTutorial(true), 2000);
        localStorage.setItem(`tutorial_shown_${user?.uid}`, 'true');
      }
    }
  }, [profile?.subscriptionType, user?.uid]);

  useEffect(() => {
    if (!profile || !user) return;
    const isPremium = profile.subscriptionType === 'premium';
    const cacheKey  = `${user.uid}_${todayStr}_${isPremium ? 'premium' : 'free'}`;
    if (coachMsgLoadedRef.current === cacheKey) return;
    if (!isPremium) {
      coachMsgLoadedRef.current = cacheKey;
      setCoachMsg(getLocalMessage(profile.streakCount));
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (cancelled) return;
        const data = userDoc.data();
        if (data?.coachMessageDate === todayStr && data?.coachMessage) {
          coachMsgLoadedRef.current = cacheKey;
          setCoachMsg(data.coachMessage);
          return;
        }
        const betsSnap = await import('firebase/firestore').then(({ getDocs }) =>
          getDocs(query(collection(db, 'users', user.uid, 'bets'), orderBy('date', 'desc')))
        );
        if (cancelled) return;
        const bets = betsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Bet));
        const msg  = await getMotivationalMessage(profile, bets);
        if (cancelled) return;
        coachMsgLoadedRef.current = cacheKey;
        setCoachMsg(msg);
        await updateDoc(doc(db, 'users', user.uid), { coachMessage: msg, coachMessageDate: todayStr });
      } catch {
        if (!cancelled) setCoachMsg(getLocalMessage(profile.streakCount));
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user?.uid, profile?.subscriptionType, todayStr]);

  const handleSaveMood = async (moodValue: string) => {
    if (!user || !profile) return;
    setMoodLoading(true);
    try {
      const note = moodNote.trim();
      await setDoc(doc(db, 'users', user.uid, 'moods', todayStr), {
        value: moodValue, note, date: todayStr, savedAt: new Date().toISOString(),
      });
      setTodayMood(moodValue);
      const newStreak = moodStreak + 1;
      const updates: Record<string, any> = {
        xp: (profile.xp ?? 0) + 5,
        moodStreakCount: newStreak,
        lastMoodDate: todayStr,
      };
      const isPremiumUser = profile.subscriptionType === 'premium';
      if (isPremiumUser) {
        const earned = [...(profile.badges ?? [])];
        let badgeEarned = null;
        if (newStreak >= 7 && !earned.includes('mood_week')) {
          earned.push('mood_week');
          updates.badges = earned;
          badgeEarned = { emoji: '🧘', name: 'Semaine consciente' };
        } else if (newStreak >= 30 && !earned.includes('mood_month')) {
          earned.push('mood_month');
          updates.badges = earned;
          badgeEarned = { emoji: '🌟', name: 'Mois conscient' };
        }
        if (badgeEarned) {
          setNewBadge(badgeEarned);
          setTimeout(() => setNewBadge(null), 3000);
        }
      }
      await updateDoc(doc(db, 'users', user.uid), updates);
      if (isPremiumUser && MOOD_RISK[moodValue]) {
        const a = await getMoodAnalysis(moodValue, note, profile, recentBets);
        setMoodAnalysis(a);
      } else {
        setShowMoodModal(false);
      }
    } catch (e) { console.error(e); }
    finally { setMoodLoading(false); }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGoal.title || !newGoal.cost) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'goals'), { title: newGoal.title, cost: parseFloat(newGoal.cost), progress: 0 });
      setNewGoal({ title: '', cost: '' });
      setShowAddGoal(false);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'goals', id));
  };

  const loadAnalysis = useCallback(async () => {
    if (!profile || recentBets.length < 2) return;
    setShowAnalysis(true);
    if (!analysis) {
      const msg = await analyzeRelapsePattern(profile, recentBets);
      setAnalysis(msg);
    }
  }, [profile, recentBets, analysis]);

  if (!profile) return null;

  const monthBets    = recentBets.filter(b => b.date >= startOfMonth);
  const totalSpent   = monthBets.reduce((s, b) => s + b.amount, 0);
  const spendPct     = profile.monthlyIncome > 0 ? (totalSpent / profile.monthlyIncome) * 100 : 0;
  const isPremium    = profile.subscriptionType === 'premium';
  const levelMeta    = getLevelMeta(profile.xp ?? 0);
  const earnedBadges = ALL_BADGES.filter(b => (profile.badges ?? []).includes(b.id));
  const todayMoodDef = MOODS.find(m => m.value === todayMood);
  const budgetAlert  = getBudgetAlert(spendPct);

  const pieData = [
    { name: 'Dépensé', value: totalSpent },
    { name: 'Restant', value: Math.max(0, profile.monthlyIncome - totalSpent) },
  ];
  const COLORS     = ['#4f46e5', '#f1f5f9'];
  const spendColor = spendPct < 5 ? 'text-emerald-500' : spendPct < 15 ? 'text-orange-500' : 'text-red-500';

  return (
    <div className="p-6 space-y-6 pb-24">

      {/* ── Bannière Premium pour users free ── */}
      <AnimatePresence>
        {!isPremium && showBanner && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-4 text-white relative overflow-hidden">
            <button onClick={() => setShowBanner(false)} className="absolute top-3 right-3 text-white/60"><X size={16} /></button>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-xl"><Sparkles size={18} /></div>
              <div>
                <p className="font-black text-sm">Découvrez le Coach IA Premium</p>
                <p className="text-xs text-white/70">Un message personnalisé chaque matin basé sur votre historique</p>
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 mb-3">
              <p className="text-xs italic text-white/90 leading-relaxed">
                "Tu as résisté 3 fois cette semaine après des matchs. C'est exactement ce type de progression qui change une vie..."
              </p>
            </div>
            <button
              onClick={() => { setShowBanner(false); onGoToPremium?.(); }}
              className="w-full py-2.5 bg-white text-indigo-600 rounded-xl font-black text-sm flex items-center justify-center gap-2">
              <Crown size={14} /> Voir le Premium — 7j gratuits
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Popup badge gagné ── */}
      <AnimatePresence>
        {newBadge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -50 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3"
          >
            <span className="text-3xl">{newBadge.emoji}</span>
            <div>
              <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Badge débloqué !</p>
              <p className="font-black">{newBadge.name}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Alerte budget ── */}
      <AnimatePresence>
        {isPremium && budgetAlert && dismissedAlert !== budgetAlert.level && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`border-2 rounded-3xl p-5 ${budgetAlert.color}`}>
            <div className="flex items-start gap-3">
              <div className={`shrink-0 mt-0.5 ${budgetAlert.icon}`}>
                {budgetAlert.level === 'critical' ? <AlertOctagon size={22} /> : <AlertTriangle size={22} />}
              </div>
              <div className="flex-1">
                <p className={`font-black text-sm mb-1 ${budgetAlert.text}`}>{budgetAlert.label}</p>
                <p className={`text-xs font-medium leading-relaxed ${budgetAlert.text} opacity-80`}>{budgetAlert.msg(spendPct)}</p>
                {budgetAlert.level === 'critical' && (
                  <p className={`text-xs font-black mt-2 ${budgetAlert.text}`}>
                    💡 Pense à utiliser le mode SOS ou à contacter le 09 74 75 13 13
                  </p>
                )}
              </div>
              <button onClick={() => setDismissedAlert(budgetAlert.level)} className="text-slate-400 shrink-0"><X size={16} /></button>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className={budgetAlert.text}>{totalSpent.toFixed(0)}€ dépensé</span>
                <span className={budgetAlert.text}>{profile.monthlyIncome}€ salaire</span>
              </div>
              <div className="h-3 bg-white/50 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, spendPct)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full rounded-full ${budgetAlert.level === 'critical' ? 'bg-red-500' : budgetAlert.level === 'danger' ? 'bg-orange-500' : 'bg-amber-400'}`} />
              </div>
              <p className={`text-xs font-black mt-1 text-right ${budgetAlert.text}`}>{spendPct.toFixed(1)}%</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Jours sans pari ── */}
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={24} className="text-orange-400 fill-orange-400" />
            <span className="text-sm font-bold uppercase tracking-widest opacity-80">Jours sans pari</span>
          </div>
          <h3 className="text-5xl font-black tracking-tighter mb-1">{profile.streakCount} Jours</h3>
          <p className="text-sm font-medium opacity-90">
            Meilleur record : <span className="font-black">{profile.bestStreak ?? 0} jours sans pari</span>
          </p>
        </div>
        <div className="absolute -right-8 -bottom-8 opacity-10 rotate-12"><Flame size={160} /></div>
      </motion.div>

      {/* ── Citation du jour ── */}
      {isPremium ? (
        <div className="bg-slate-900 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex gap-3 items-start relative z-10">
            <Quote size={18} className="text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-white font-medium leading-relaxed text-sm italic">{dailyQuote}</p>
          </div>
          <p className="text-slate-500 text-xs font-bold mt-2 ml-7 relative z-10">Citation du jour</p>
          <div className="absolute -right-4 -bottom-4 opacity-5 text-[80px]">💬</div>
        </div>
      ) : (
        <div className="bg-slate-100 p-5 rounded-2xl flex items-center gap-3">
          <Lock size={16} className="text-slate-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-slate-500">Citation motivante quotidienne</p>
            <p className="text-xs text-indigo-500 font-bold">Premium uniquement</p>
          </div>
        </div>
      )}

      {/* ── Journal d'humeur ── */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SmilePlus size={18} className="text-violet-500" />
            <p className="text-sm font-bold text-slate-900 uppercase tracking-wider">Journal d'humeur</p>
          </div>
          <div className="flex items-center gap-2">
            {isPremium && moodStreak > 0 && (
              <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                🔥 {moodStreak} jour{moodStreak > 1 ? 's' : ''} d'affilée
              </span>
            )}
            {todayMood && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+5 XP ✓</span>}
          </div>
        </div>
        {todayMood ? (
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{todayMoodDef?.emoji}</span>
            <div>
              <p className="font-black text-slate-900">{todayMoodDef?.label}</p>
              <p className="text-xs text-slate-400 font-medium">Humeur d'aujourd'hui</p>
            </div>
            <button onClick={() => { setMoodNote(''); setMoodAnalysis(null); setSelectedMood(todayMood); setShowMoodModal(true); }}
              className="ml-auto text-xs font-bold text-indigo-600 hover:underline">Modifier</button>
          </div>
        ) : (
          <button onClick={() => { setSelectedMood(null); setShowMoodModal(true); }}
            className="w-full py-3 bg-violet-50 border border-violet-100 rounded-2xl text-sm font-bold text-violet-600 mb-4 hover:bg-violet-100 transition-colors">
            + Ajouter mon humeur du jour (+5 XP)
          </button>
        )}
        {recentMoods.length > 0 && (
          <div className="flex gap-2 justify-between">
            {recentMoods.slice(0, 7).map((m, i) => {
              const def = MOODS.find(md => md.value === m.value);
              const dayLabel = new Date(m.date).toLocaleDateString('fr', { weekday: 'short' }).slice(0, 3);
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-lg">{def?.emoji ?? '❓'}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{dayLabel}</span>
                </div>
              );
            })}
          </div>
        )}
        {isPremium && moodStreak > 0 && moodStreak < 30 && (
          <div className="mt-3 pt-3 border-t border-slate-50">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-slate-400">{moodStreak < 7 ? 'Badge Semaine consciente 🧘' : 'Badge Mois conscient 🌟'}</span>
              <span className="text-violet-600">{moodStreak}/{moodStreak < 7 ? 7 : 30}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(moodStreak / (moodStreak < 7 ? 7 : 30)) * 100}%` }}
                className="h-full bg-violet-500 rounded-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── XP / Level ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-xl text-amber-500"><Star size={20} /></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Niveau {levelMeta.level}</p>
              <p className="font-black text-slate-900">{levelMeta.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-full">
            <Zap size={14} className="fill-amber-500" />
            <span className="text-sm font-black">{profile.xp ?? 0} XP</span>
          </div>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${levelMeta.progressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" />
        </div>
        {levelMeta.nextLevel && (
          <p className="text-xs text-slate-400 font-medium mt-2">
            {levelMeta.xpToNext} XP pour atteindre <strong>{levelMeta.nextLevel.name}</strong>
          </p>
        )}
      </motion.div>

      {/* ── Coach message ── */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex gap-4 items-start">
        <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 shrink-0"><Sparkles size={24} /></div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Message du coach</p>
            {isPremium && <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">IA Claude</span>}
          </div>
          <p className="text-slate-700 font-medium leading-relaxed italic">"{coachMsg}"</p>
          {isPremium && recentBets.length >= 2 && (
            <button onClick={loadAnalysis} className="mt-3 text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
              <Sparkles size={12} /> Analyser mes rechutes
            </button>
          )}
          {!isPremium && (
            <button onClick={() => onGoToPremium?.()}
              className="mt-3 flex items-center gap-2 text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl hover:bg-indigo-100 transition-colors">
              <Crown size={12} /> Débloquer le Coach IA — 7j gratuits
            </button>
          )}
        </div>
      </div>

      {/* ── Analyse rechutes ── */}
      <AnimatePresence>
        {showAnalysis && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-violet-50 border border-violet-100 p-5 rounded-2xl relative">
            <button onClick={() => setShowAnalysis(false)} className="absolute top-4 right-4 text-slate-400"><X size={18} /></button>
            <p className="text-xs font-bold text-violet-500 uppercase tracking-wider mb-2">Analyse IA</p>
            <p className="text-slate-700 font-medium leading-relaxed">{analysis ?? 'Analyse en cours…'}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Finances ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total dépensé</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{totalSpent.toFixed(0)}€</span>
            <span className={`text-xs font-bold ${spendColor}`}>{spendPct.toFixed(1)}%</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Revenu mensuel</p>
          <span className="text-2xl font-black text-slate-900">{profile.monthlyIncome}€</span>
        </div>
      </div>

      {/* ── Pie chart ── */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingDown size={18} className="text-indigo-600" /> Répartition du budget
        </h4>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => `${v.toFixed(0)}€`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex justify-center gap-6">
          {[{ color: 'bg-indigo-600', label: 'Paris' }, { color: 'bg-slate-100', label: 'Restant' }].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${color}`} />
              <span className="text-xs font-bold text-slate-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Badges ── */}
      {earnedBadges.length > 0 && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={18} className="text-amber-500" />
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Mes badges</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {earnedBadges.map(b => (
              <div key={b.id} title={b.description}
                className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                <span className="text-xl">{b.emoji}</span>
                <span className="text-xs font-bold text-slate-700">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Projets d'épargne ── */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Projets d'épargne</h4>
          <button onClick={() => setShowAddGoal(true)}
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors">
            <Plus size={14} /> Ajouter
          </button>
        </div>
        <div className="space-y-3">
          {goals.length === 0
            ? <div className="text-center p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-sm text-slate-400 font-medium">Aucun projet pour le moment.</p>
              </div>
            : goals.map(g => <GoalCard key={g.id} goal={g} saved={totalSpent} onDelete={() => handleDeleteGoal(g.id)} />)
          }
        </div>
      </div>

      {/* ── Modal ajout objectif ── */}
      <AnimatePresence>
        {showAddGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900">Nouveau projet</h3>
                <button onClick={() => setShowAddGoal(false)} className="text-slate-400"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddGoal} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Titre du projet</label>
                  <input type="text" placeholder="Ex: Voyage au Japon" value={newGoal.title}
                    onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600" required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Coût estimé (€)</label>
                  <input type="number" placeholder="Ex: 3000" value={newGoal.cost}
                    onChange={e => setNewGoal({ ...newGoal, cost: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600" required />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50">
                  {loading ? 'Création…' : 'Créer le projet'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal humeur ── */}
      <AnimatePresence>
        {showMoodModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full max-w-md rounded-t-[32px] p-8 shadow-2xl">
              {moodAnalysis ? (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-xs font-black text-violet-500 uppercase tracking-wider">Analyse du coach IA</p>
                    <button onClick={() => { setShowMoodModal(false); setMoodAnalysis(null); }} className="text-slate-400"><X size={20} /></button>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-4">
                    <p className="text-slate-700 font-medium leading-relaxed text-sm">{moodAnalysis}</p>
                  </div>
                  <button onClick={() => { setShowMoodModal(false); setMoodAnalysis(null); }}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold">Compris, merci 💪</button>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Comment tu te sens ?</h3>
                      <p className="text-xs text-slate-400 font-medium mt-1">Journal du {new Date().toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    </div>
                    <button onClick={() => setShowMoodModal(false)} className="text-slate-400"><X size={22} /></button>
                  </div>
                  <div className="flex justify-between mb-6">
                    {MOODS.map(mood => (
                      <button key={mood.value} onClick={() => setSelectedMood(mood.value)} disabled={moodLoading}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-95 ${
                          selectedMood === mood.value ? 'bg-violet-100 ring-2 ring-violet-400' : 'hover:bg-slate-50'
                        }`}>
                        <span className="text-3xl">{mood.emoji}</span>
                        <span className="text-[10px] font-bold text-slate-500">{mood.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mb-4">
                    <textarea value={moodNote} onChange={e => setMoodNote(e.target.value)}
                      placeholder="Une note ? (optionnel)" rows={2}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
                  </div>
                  <button onClick={() => selectedMood && handleSaveMood(selectedMood)}
                    disabled={!selectedMood || moodLoading}
                    className="w-full py-4 bg-violet-600 text-white rounded-2xl font-black hover:bg-violet-700 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                    {moodLoading
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enregistrement…</>
                      : '✓ Enregistrer mon humeur'
                    }
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Bouton flottant humeur ── */}
      {!todayMood && (
        <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.9 }}
          onClick={() => { setSelectedMood(null); setShowMoodModal(true); }}
          className="fixed bottom-24 right-4 w-14 h-14 bg-violet-600 text-white rounded-full shadow-xl flex items-center justify-center z-30">
          <SmilePlus size={24} />
        </motion.button>
      )}

      {/* ── Modal didacticiel Premium ── */}
      <AnimatePresence>
        {showTutorial && (
          <PremiumTutorialModal
            onClose={() => setShowTutorial(false)}
            onUpgrade={() => { setShowTutorial(false); onGoToPremium?.(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function GoalCard({ goal, saved, onDelete }: { goal: Goal; saved: number; onDelete: () => void }) {
  const progress = Math.min(100, (saved / goal.cost) * 100);
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-xl text-white bg-indigo-500"><Target size={20} /></div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <p className="font-bold text-slate-900">{goal.title}</p>
            <button onClick={onDelete} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
          </div>
          <p className="text-xs text-slate-500 font-medium">Potentiel perdu : {saved.toFixed(0)}€ / {goal.cost}€</p>
        </div>
        <span className="text-sm font-black text-slate-900">{progress.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-indigo-500" />
      </div>
    </div>
  );
}