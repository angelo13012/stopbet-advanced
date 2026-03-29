import React, { useEffect, useState } from 'react';
import {
  collection, query, orderBy, limit, onSnapshot,
  doc, getDoc,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useFirebase } from './FirebaseProvider';
import { LeaderboardEntry } from '../types';
import { motion } from 'framer-motion';
import { Trophy, Globe, Users, Crown, Zap, Flame } from 'lucide-react';

type Tab = 'world' | 'friends';

export default function Leaderboard() {
  const { profile, user } = useFirebase();
  const [tab,          setTab]          = useState<Tab>('world');
  const [worldTop,     setWorldTop]     = useState<LeaderboardEntry[]>([]);
  const [friendsTop,   setFriendsTop]   = useState<LeaderboardEntry[]>([]);
  const [myRank,       setMyRank]       = useState<number | null>(null);
  const [loadingFriends, setLoadingFriends] = useState(false);

  // ── Classement mondial — top 100 ──
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'leaderboard'), orderBy('xp', 'desc'), limit(100)),
      snap => {
        const entries = snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaderboardEntry));
        setWorldTop(entries);
        // Trouver mon rang
        const myIdx = entries.findIndex(e => e.id === user?.uid);
        setMyRank(myIdx >= 0 ? myIdx + 1 : null);
      }
    );
    return unsub;
  }, [user?.uid]);

  // ── Classement amis ──
  useEffect(() => {
    if (!user || !profile) return;
    setLoadingFriends(true);

    const loadFriends = async () => {
      try {
        // Amis = les gens qui ont utilisé mon code + les gens dont j'ai utilisé le code
        const friendIds: string[] = [];

        // Moi-même toujours inclus
        friendIds.push(user.uid);

        // Parrain si j'ai été parrainé
        if (profile.referredBy) friendIds.push(profile.referredBy);

        // Mes filleuls — on cherche dans leaderboard ceux qui ont referredBy = mon uid
        // On charge les 20 premiers du classement et on filtre
        const snap = await import('firebase/firestore').then(({ getDocs }) =>
          getDocs(query(collection(db, 'leaderboard'), orderBy('xp', 'desc'), limit(200)))
        );

        // Pour chaque entrée, vérifier si c'est un ami (via users collection)
        const checks = snap.docs
          .filter(d => d.id !== user.uid)
          .slice(0, 50)
          .map(async d => {
            const userDoc = await getDoc(doc(db, 'users', d.id));
            const userData = userDoc.data();
            if (
              userData?.referredBy === user.uid ||
              userData?.referralCode === profile.referralCode
            ) {
              friendIds.push(d.id);
            }
          });

        await Promise.all(checks);

        // Récupérer les entrées leaderboard des amis
        const friendEntries: LeaderboardEntry[] = [];
        for (const id of [...new Set(friendIds)]) {
          const d = await getDoc(doc(db, 'leaderboard', id));
          if (d.exists()) {
            friendEntries.push({ id: d.id, ...d.data() } as LeaderboardEntry);
          }
        }

        // Trier par XP
        friendEntries.sort((a, b) => b.xp - a.xp);
        setFriendsTop(friendEntries);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingFriends(false);
      }
    };

    loadFriends();
  }, [user?.uid, profile?.referredBy]);

  if (!profile) return null;

  const currentList = tab === 'world' ? worldTop : friendsTop;
  const myEntry     = worldTop.find(e => e.id === user?.uid);

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={22} className="text-amber-400" />
            <span className="text-sm font-bold uppercase tracking-widest opacity-80">Classement</span>
          </div>
          <h3 className="text-3xl font-black tracking-tight mb-1">
            {profile.pseudo ? `@${profile.pseudo}` : profile.firstName}
          </h3>
          <div className="flex items-center gap-4 mt-2">
            {myRank && (
              <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full">
                <Crown size={14} />
                <span className="text-sm font-black">#{myRank} mondial</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full">
              <Zap size={14} />
              <span className="text-sm font-black">{profile.xp ?? 0} XP</span>
            </div>
          </div>
        </div>
        <div className="absolute -right-8 -bottom-8 opacity-10 rotate-12">
          <Trophy size={160} />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2">
        <button onClick={() => setTab('world')}
          className={`flex-1 py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all ${
            tab === 'world' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border border-slate-100'
          }`}>
          <Globe size={16} /> Monde
        </button>
        <button onClick={() => setTab('friends')}
          className={`flex-1 py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all ${
            tab === 'friends' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border border-slate-100'
          }`}>
          <Users size={16} /> Amis
        </button>
      </div>

      {/* ── Podium top 3 (monde uniquement) ── */}
      {tab === 'world' && worldTop.length >= 3 && (
        <div className="flex items-end justify-center gap-3 pb-2">
          {/* 2ème */}
          <PodiumCard entry={worldTop[1]} rank={2} isMe={worldTop[1]?.id === user?.uid} />
          {/* 1er */}
          <PodiumCard entry={worldTop[0]} rank={1} isMe={worldTop[0]?.id === user?.uid} tall />
          {/* 3ème */}
          <PodiumCard entry={worldTop[2]} rank={3} isMe={worldTop[2]?.id === user?.uid} />
        </div>
      )}

      {/* ── Liste ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {loadingFriends && tab === 'friends' ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-12">
            <Users size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">
              {tab === 'friends' ? 'Aucun ami encore — parraine tes amis !' : 'Classement vide'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {/* Sauter les 3 premiers dans le monde (déjà dans le podium) */}
            {(tab === 'world' ? currentList.slice(3) : currentList).map((entry, idx) => {
              const rank  = tab === 'world' ? idx + 4 : idx + 1;
              const isMe  = entry.id === user?.uid;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`flex items-center gap-4 px-5 py-4 ${isMe ? 'bg-indigo-50' : ''}`}
                >
                  <div className={`w-8 text-center font-black text-sm ${
                    rank <= 3 ? 'text-amber-500' : 'text-slate-400'
                  }`}>
                    #{rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-black text-sm truncate ${isMe ? 'text-indigo-700' : 'text-slate-900'}`}>
                        @{entry.pseudo}
                      </p>
                      {isMe && <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full">Toi</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-400 font-medium">Niv. {entry.level}</span>
                      <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                        <Flame size={10} className="text-orange-400" />
                        {entry.streakCount}j
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-amber-600 font-black text-sm">
                    <Zap size={14} className="fill-amber-500" />
                    {entry.xp}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Ma position si pas dans le top visible ── */}
      {tab === 'world' && myRank && myRank > 103 && myEntry && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-4 flex items-center gap-4">
          <div className="w-8 text-center font-black text-sm text-indigo-600">#{myRank}</div>
          <div className="flex-1">
            <p className="font-black text-sm text-indigo-700">@{myEntry.pseudo} <span className="text-[10px] font-black text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full ml-1">Toi</span></p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Niv. {myEntry.level} · {myEntry.streakCount}j sans pari</p>
          </div>
          <div className="flex items-center gap-1 text-amber-600 font-black text-sm">
            <Zap size={14} className="fill-amber-500" />
            {myEntry.xp}
          </div>
        </div>
      )}

      {/* Note confidentialité */}
      <p className="text-center text-xs text-slate-400 font-medium px-4">
        🔒 Seuls ton pseudo, ton XP et tes jours sans pari sont visibles. Aucune donnée financière n'est partagée.
      </p>
    </div>
  );
}

function PodiumCard({ entry, rank, isMe, tall }: {
  entry: LeaderboardEntry; rank: number; isMe: boolean; tall?: boolean;
}) {
  const medals = ['🥇', '🥈', '🥉'];
  const heights = ['h-20', 'h-28', 'h-20'];

  return (
    <div className={`flex flex-col items-center gap-2 flex-1 ${tall ? 'mb-0' : 'mb-0'}`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${
        isMe ? 'bg-indigo-600 text-white ring-4 ring-indigo-200' : 'bg-slate-100 text-slate-700'
      }`}>
        {entry.pseudo?.[0]?.toUpperCase() ?? '?'}
      </div>
      <p className="text-xs font-black text-slate-700 text-center truncate w-full px-1">
        @{entry.pseudo}
      </p>
      <div className="flex items-center gap-1 text-xs font-black text-amber-600">
        <Zap size={11} className="fill-amber-500" />
        {entry.xp}
      </div>
      <div className={`w-full ${heights[rank - 1]} rounded-t-2xl flex items-center justify-center text-2xl ${
        rank === 1 ? 'bg-amber-400' : rank === 2 ? 'bg-slate-300' : 'bg-orange-300'
      }`}>
        {medals[rank - 1]}
      </div>
    </div>
  );
}
