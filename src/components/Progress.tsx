import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useFirebase } from './FirebaseProvider';
import { Bet, ALL_BADGES, getLevelMeta, LEVELS } from '../types';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Calendar, Lock } from 'lucide-react';

export default function Progress() {
  const { profile, user } = useFirebase();
  const [bets, setBets] = useState<Bet[]>([]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(collection(db, 'users', user.uid, 'bets'), orderBy('date', 'desc')),
      snap => setBets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Bet)))
    );
  }, [user]);

  if (!profile) return null;

  const isPremium  = profile.subscriptionType === 'premium';
  const levelMeta  = getLevelMeta(profile.xp ?? 0);
  const earnedIds  = profile.badges ?? [];
  const totalSpent = bets.reduce((s, b) => s + b.amount, 0);
  const relapses   = bets.length;
  const avgAmount  = relapses > 0 ? totalSpent / relapses : 0;

  // Build timeline: last 30 days
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days: { date: Date; hasBet: boolean; amount: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    const dayBets = bets.filter(b => b.date.slice(0, 10) === dayStr);
    days.push({ date: d, hasBet: dayBets.length > 0, amount: dayBets.reduce((s, b) => s + b.amount, 0) });
  }

  return (
    <div className="p-6 space-y-6">

      {/* ── Level progress ── */}
      <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">Niveau {levelMeta.level}</p>
          <h3 className="text-3xl font-black tracking-tight mb-3">{levelMeta.name}</h3>
          <div className="h-3 bg-white/30 rounded-full overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${levelMeta.progressPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-white rounded-full"
            />
          </div>
          <p className="text-sm font-medium opacity-90">
            {profile.xp ?? 0} XP
            {levelMeta.nextLevel && ` · ${levelMeta.xpToNext} XP pour "${levelMeta.nextLevel.name}"`}
          </p>
        </div>
        <div className="absolute -right-6 -bottom-6 opacity-10 text-[120px]">⚡</div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Meilleur streak',  value: `${profile.bestStreak ?? 0}j`, icon: '🔥' },
          { label: 'Streak actuel',    value: `${profile.streakCount}j`,      icon: '📅' },
          { label: 'Total dépensé',    value: `${totalSpent.toFixed(0)}€`,    icon: '💸' },
          { label: 'Moy. par rechute', value: `${avgAmount.toFixed(0)}€`,     icon: '📊' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <p className="text-2xl mb-1">{icon}</p>
            <p className="text-2xl font-black text-slate-900">{value}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* ── 30-day heatmap ── */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-indigo-600" />
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">30 derniers jours</h4>
        </div>
        <div className="grid grid-cols-10 gap-1.5">
          {days.map((d, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: i * 0.01 }}
              title={`${d.date.toLocaleDateString('fr')}${d.hasBet ? ` — ${d.amount}€ pariés` : ' — Jour propre'}`}
              className={`aspect-square rounded-md cursor-default ${
                d.hasBet ? 'bg-red-400' : 'bg-emerald-400'
              }`}
            />
          ))}
        </div>
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-400" /><span className="text-xs text-slate-500 font-medium">Jour propre</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-400" /><span className="text-xs text-slate-500 font-medium">Rechute</span>
          </div>
        </div>
      </div>

      {/* ── Badges ── */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={18} className="text-amber-500" />
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Badges</h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {ALL_BADGES.map(badge => {
            const earned = earnedIds.includes(badge.id);
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                  earned
                    ? 'bg-amber-50 border-amber-100'
                    : 'bg-slate-50 border-slate-100 opacity-50'
                }`}
              >
                <span className="text-2xl">{earned ? badge.emoji : '🔒'}</span>
                <div>
                  <p className={`text-xs font-black ${earned ? 'text-slate-900' : 'text-slate-400'}`}>{badge.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{badge.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Level roadmap ── */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-indigo-600" />
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Progression des niveaux</h4>
        </div>
        <div className="space-y-2">
          {LEVELS.map(lvl => {
            const reached  = (profile.xp ?? 0) >= lvl.minXP;
            const isCurrent = lvl.level === levelMeta.level;
            return (
              <div key={lvl.level} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                isCurrent ? 'bg-indigo-50 border border-indigo-200' : ''
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${
                  reached ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {lvl.level}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${reached ? 'text-slate-900' : 'text-slate-400'}`}>{lvl.name}</p>
                  <p className="text-xs text-slate-400 font-medium">{lvl.minXP} XP</p>
                </div>
                {isCurrent && <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">Actuel</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Relapse history (premium) ── */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Historique des rechutes</h4>
        {!isPremium && bets.length > 3 ? (
          <div className="text-center py-6">
            <Lock size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500 mb-1">Historique complet</p>
            <p className="text-xs text-slate-400">Disponible avec StopBet Premium</p>
          </div>
        ) : bets.length === 0 ? (
          <p className="text-sm text-slate-400 font-medium text-center py-6">Aucune rechute enregistrée 🎉</p>
        ) : (
          <div className="space-y-3">
            {(isPremium ? bets : bets.slice(0, 3)).map(bet => (
              <div key={bet.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl">
                <div className="w-2 h-2 rounded-full bg-red-400 mt-2 shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-bold text-slate-900">{bet.amount}€ pariés</p>
                    <p className="text-xs text-slate-400 font-medium">
                      {new Date(bet.date).toLocaleDateString('fr', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  {bet.reason && <p className="text-xs text-slate-500 mt-0.5 italic">"{bet.reason}"</p>}
                  {bet.timeOfDay && (
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {{morning:'Matin',afternoon:'Après-midi',evening:'Soirée',night:'Nuit'}[bet.timeOfDay]}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
