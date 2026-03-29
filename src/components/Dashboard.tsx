import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  doc, updateDoc, addDoc, deleteDoc, getDoc, setDoc,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useFirebase } from './FirebaseProvider';
import { Bet, Goal, ALL_BADGES, getLevelMeta } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingDown, Flame, Target, Sparkles,
  Plus, Trash2, X, Trophy, Star, Zap, Lock, SmilePlus,
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
  { value: 'stressed',  emoji: '😤', label: 'Stressé'  },
  { value: 'sad',       emoji: '😔', label: 'Déprimé'  },
  { value: 'neutral',   emoji: '😐', label: 'Neutre'   },
  { value: 'good',      emoji: '😊', label: 'Bien'     },
  { value: 'strong',    emoji: '💪', label: 'Fort'     },
];

const MOOD_RISK: Record<string, boolean> = {
  stressed: true,
  sad:      true,
};

export default function Dashboard() {
  const { profile, user } = useFirebase();
  const [recentBets,   setRecentBets]   = useState<Bet[]>([]);
  const [goals,        setGoals]        = useState<Goal[]>([]);
  const [coachMsg,     setCoachMsg]     = useState('Chargement de votre message du jour…');
  const [analysis,     setAnalysis]     = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showAddGoal,  setShowAddGoal]  = useState(false);
  const [newGoal,      setNewGoal]      = useState({ title: '', cost: '' });
  const [loading,      setLoading]      = useState(false);

  // Humeur
  const [showMoodModal,  setShowMoodModal]  = useState(false);
  const [todayMood,      setTodayMood]      = useState<string | null>(null);
  const [moodNote,       setMoodNote]       = useState('');
  const [moodLoading,    setMoodLoading]    = useState(false);
  const [moodAnalysis,   setMoodAnalysis]   = useState<string | null>(null);
  const [recentMoods,    setRecentMoods]    = useState<{ value: string; date: string }[]>([]);

  const coachMsgLoadedRef = useRef<string | null>(null);

  const now          = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const todayStr     = now.toISOString().slice(0, 10);

  // Listeners Firestore
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

  // Charger l'humeur du jour + historique 7 jours
  useEffect(() => {
    if (!user) return;
    const loadMoods = async () => {
      try {
        // Humeur du jour
        const todayDoc = await getDoc(doc(db, 'users', user.uid, 'moods', todayStr));
        if (todayDoc.exists()) setTodayMood(todayDoc.data().value);

        // 7 derniers jours
        const { getDocs } = await import('firebase/firestore');
        const moodsSnap = await getDocs(
          query(collection(db, 'users', user.uid, 'moods'), orderBy('date', 'desc'))
        );
        const moods = moodsSnap.docs
          .slice(0, 7)
          .map(d => ({ value: d.data().value, date: d.data().date }));
        setRecentMoods(moods);
      } catch {}
    };
    loadMoods();
  }, [user?.uid, todayStr]);

  // Coach message
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
        value:   moodValue,
        note,
        date:    todayStr,
        savedAt: new Date().toISOString(),
      });
      setTodayMood(moodValue);

      // +5 XP pour avoir rempli le journal
      await updateDoc(doc(db, 'users', user.uid), { xp: (profile.xp ?? 0) + 5 });

      // Premium + humeur à risque → analyse Claude
      const isPremium = profile.subscriptionType === 'premium';
      if (isPremium && MOOD_RISK[moodValue]) {
        const analysis = await getMoodAnalysis(moodValue, note, profile, recentBets);
        setMoodAnalysis(analysis);
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
      await addDoc(collection(db, 'users', user.uid, 'goals'), {
        title: newGoal.title, cost: parseFloat(newGoal.cost), progress: 0,
      });
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

  const pieData    = [
    { name: 'Dépensé', value: totalSpent },
    { name: 'Restant', value: Math.max(0, profile.monthlyIncome - totalSpent) },
  ];
  const COLORS     = ['#4f46e5', '#f1f5f9'];
  const spendColor = spendPct < 5 ? 'text-emerald-500' : spendPct < 15 ? 'text-orange-500' : 'text-red-500';

  return (
    <div className="p-6 space-y-6 pb-24">

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

      {/* ── Humeur du jour + historique 7 jours ── */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SmilePlus size={18} className="text-violet-500" />
            <p className="text-sm font-bold text-slate-900 uppercase tracking-wider">Journal d'humeur</p>
          </div>
          {todayMood && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+5 XP ✓</span>}
        </div>

        {/* Humeur du jour */}
        {todayMood ? (
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{todayMoodDef?.emoji}</span>
            <div>
              <p className="font-black text-slate-900">{todayMoodDef?.label}</p>
              <p className="text-xs text-slate-400 font-medium">Humeur d'aujourd'hui</p>
            </div>
            <button onClick={() => { setMoodNote(''); setMoodAnalysis(null); setShowMoodModal(true); }}
              className="ml-auto text-xs font-bold text-indigo-600 hover:underline">
              Modifier
            </button>
          </div>
        ) : (
          <button onClick={() => setShowMoodModal(true)}
            className="w-full py-3 bg-violet-50 border border-violet-100 rounded-2xl text-sm font-bold text-violet-600 mb-4 hover:bg-violet-100 transition-colors">
            + Ajouter mon humeur du jour (+5 XP)
          </button>
        )}

        {/* Historique 7 jours */}
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
            <div className="mt-3 flex items-center gap-2">
              <Lock size={12} className="text-slate-400" />
              <p className="text-xs text-slate-400 font-medium">Coach IA Claude — <span className="text-indigo-600 font-bold">Premium uniquement</span></p>
            </div>
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
                // Vue analyse Claude
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-xs font-black text-violet-500 uppercase tracking-wider">Analyse du coach IA</p>
                    <button onClick={() => { setShowMoodModal(false); setMoodAnalysis(null); }} className="text-slate-400"><X size={20} /></button>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-4">
                    <p className="text-slate-700 font-medium leading-relaxed text-sm">{moodAnalysis}</p>
                  </div>
                  <button onClick={() => { setShowMoodModal(false); setMoodAnalysis(null); }}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold">
                    Compris, merci 💪
                  </button>
                </div>
              ) : (
                // Vue sélection humeur
                <>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Comment tu te sens ?</h3>
                      <p className="text-xs text-slate-400 font-medium mt-1">Journal du {new Date().toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    </div>
                    <button onClick={() => setShowMoodModal(false)} className="text-slate-400"><X size={22} /></button>
                  </div>

                  {/* Sélecteur humeur */}
                  <div className="flex justify-between mb-6">
                    {MOODS.map(mood => (
                      <button key={mood.value} onClick={() => !moodLoading && handleSaveMood(mood.value)}
                        disabled={moodLoading}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-95 ${
                          todayMood === mood.value ? 'bg-violet-100 ring-2 ring-violet-400' : 'hover:bg-slate-50'
                        }`}>
                        <span className="text-3xl">{mood.emoji}</span>
                        <span className="text-[10px] font-bold text-slate-500">{mood.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Note optionnelle */}
                  <div className="mb-4">
                    <textarea value={moodNote} onChange={e => setMoodNote(e.target.value)}
                      placeholder="Une note ? (optionnel)"
                      rows={2}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
                  </div>

                  {moodLoading && (
                    <div className="flex items-center justify-center gap-2 text-violet-600">
                      <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-medium">Enregistrement…</span>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Bouton flottant humeur ── */}
      {!todayMood && (
        <motion.button
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowMoodModal(true)}
          className="fixed bottom-24 right-4 w-14 h-14 bg-violet-600 text-white rounded-full shadow-xl flex items-center justify-center z-30"
        >
          <SmilePlus size={24} />
        </motion.button>
      )}
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
