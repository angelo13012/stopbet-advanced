import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, orderBy, query } from 'firebase/firestore';
import { db } from '../services/firebase';
import { motion } from 'framer-motion';
import { Users, TrendingUp, X, Crown, Ban, Search, RefreshCw } from 'lucide-react';

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  pseudo: string;
  subscriptionType: 'free' | 'premium';
  subscriptionStatus: string;
  subscriptionPlan?: string;
  subscribedAt?: string;
  cancelAt?: string;
  createdAt: string;
  streakCount: number;
  xp: number;
}

export default function Admin({ onClose }: { onClose: () => void }) {
  const [users,      setUsers]      = useState<AdminUser[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState<'all' | 'premium' | 'free' | 'canceling'>('all');
  const [updating,   setUpdating]   = useState<string | null>(null);
  const [tab,        setTab]        = useState<'users' | 'stats'>('users');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminUser));
      setUsers(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleTogglePremium = async (user: AdminUser) => {
    setUpdating(user.id);
    try {
      const isPremium = user.subscriptionType === 'premium';
      await updateDoc(doc(db, 'users', user.id), {
        subscriptionType:   isPremium ? 'free'    : 'premium',
        subscriptionStatus: isPremium ? 'canceled' : 'active',
        subscribedAt:       isPremium ? null : new Date().toISOString(),
      });
      setUsers(prev => prev.map(u => u.id === user.id
        ? { ...u, subscriptionType: isPremium ? 'free' : 'premium', subscriptionStatus: isPremium ? 'canceled' : 'active' }
        : u
      ));
    } catch (e) { console.error(e); }
    finally { setUpdating(null); }
  };

  const filtered = users.filter(u => {
    const matchSearch = search === '' ||
      `${u.firstName} ${u.lastName} ${u.pseudo}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all'       ? true :
      filter === 'premium'   ? u.subscriptionType === 'premium' && u.subscriptionStatus === 'active' :
      filter === 'canceling' ? u.subscriptionStatus === 'canceling' :
      u.subscriptionType === 'free';
    return matchSearch && matchFilter;
  });

  // Stats
  const totalUsers     = users.length;
  const premiumUsers   = users.filter(u => u.subscriptionType === 'premium' && u.subscriptionStatus === 'active').length;
  const cancelingUsers = users.filter(u => u.subscriptionStatus === 'canceling').length;
  const freeUsers      = users.filter(u => u.subscriptionType === 'free').length;
  const monthlyUsers   = users.filter(u => u.subscriptionPlan === 'monthly' && u.subscriptionType === 'premium').length;
  const yearlyUsers    = users.filter(u => u.subscriptionPlan === 'yearly'  && u.subscriptionType === 'premium').length;
  const mrr            = (monthlyUsers * 3.49) + (yearlyUsers * 30 / 12);
  const arr            = mrr * 12;

  const thisMonth = new Date();
  thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
  const newUsersThisMonth = users.filter(u => new Date(u.createdAt) >= thisMonth).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col max-w-md mx-auto">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-6 shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">Dashboard Admin</h2>
            <p className="text-xs text-slate-400 font-medium">{totalUsers} utilisateurs</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadUsers} className="p-2 text-slate-400 hover:text-indigo-600">
              <RefreshCw size={18} />
            </button>
            <button onClick={onClose} className="p-2 text-slate-400"><X size={22} /></button>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('users')}
            className={`flex-1 py-2 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-1 ${tab === 'users' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
            <Users size={14} /> Users
          </button>
          <button onClick={() => setTab('stats')}
            className={`flex-1 py-2 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-1 ${tab === 'stats' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
            <TrendingUp size={14} /> Stats
          </button>
        </div>
      </div>

      {tab === 'stats' ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* MRR */}
          <div className="bg-indigo-600 rounded-3xl p-6 text-white">
            <p className="text-xs font-black uppercase tracking-wider opacity-70 mb-1">MRR estimé</p>
            <p className="text-4xl font-black">{mrr.toFixed(0)}€</p>
            <p className="text-sm opacity-70 mt-1">ARR : {arr.toFixed(0)}€/an</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total users',    value: totalUsers,        color: 'text-slate-900' },
              { label: 'Nouveaux/mois',  value: newUsersThisMonth, color: 'text-emerald-600' },
              { label: 'Premium actifs', value: premiumUsers,      color: 'text-indigo-600' },
              { label: 'En résiliation', value: cancelingUsers,    color: 'text-amber-600' },
              { label: 'Gratuits',       value: freeUsers,         color: 'text-slate-500' },
              { label: 'Mensuel',        value: monthlyUsers,      color: 'text-violet-600' },
              { label: 'Annuel',         value: yearlyUsers,       color: 'text-cyan-600' },
              { label: 'Taux Premium',   value: `${totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(0) : 0}%`, color: 'text-indigo-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Barre de conversion */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">Conversion free → premium</p>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full transition-all"
                style={{ width: `${totalUsers > 0 ? (premiumUsers / totalUsers) * 100 : 0}%` }} />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-slate-400">{freeUsers} gratuits</span>
              <span className="text-xs text-indigo-600 font-bold">{premiumUsers} premium</span>
            </div>
          </div>
        </div>

      ) : (
        <div className="flex-1 overflow-y-auto flex flex-col">

          {/* Filtres */}
          <div className="px-6 pt-4 pb-2 shrink-0 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un user..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(['all', 'premium', 'free', 'canceling'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-black transition-all ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>
                  {f === 'all' ? 'Tous' : f === 'premium' ? '⭐ Premium' : f === 'canceling' ? '⚠️ Résiliation' : '🆓 Gratuit'}
                  {f === 'all' && ` (${totalUsers})`}
                  {f === 'premium' && ` (${premiumUsers})`}
                  {f === 'free' && ` (${freeUsers})`}
                  {f === 'canceling' && ` (${cancelingUsers})`}
                </button>
              ))}
            </div>
          </div>

          {/* Liste users */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-12">Aucun utilisateur trouvé</p>
            ) : filtered.map(user => (
              <motion.div key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-black text-slate-900 text-sm truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      {user.subscriptionType === 'premium' && (
                        <span className="shrink-0 text-[10px] font-black bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">PRO</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-medium">@{user.pseudo}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        user.subscriptionStatus === 'active'    ? 'bg-emerald-50 text-emerald-600' :
                        user.subscriptionStatus === 'canceling' ? 'bg-amber-50 text-amber-600' :
                        user.subscriptionStatus === 'past_due'  ? 'bg-red-50 text-red-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {user.subscriptionStatus === 'active'    ? '✓ Actif' :
                         user.subscriptionStatus === 'canceling' ? '⚠ Résiliation' :
                         user.subscriptionStatus === 'past_due'  ? '❌ Impayé' :
                         'Gratuit'}
                      </span>
                      {user.subscriptionPlan && (
                        <span className="text-[10px] text-slate-400 font-medium">{user.subscriptionPlan}</span>
                      )}
                    </div>
                    {user.cancelAt && (
                      <p className="text-[10px] text-amber-600 font-bold mt-1">
                        Fin le {new Date(user.cancelAt).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-slate-400">🔥 {user.streakCount}j</span>
                      <span className="text-[10px] text-slate-400">⚡ {user.xp} XP</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTogglePremium(user)}
                    disabled={updating === user.id}
                    className={`shrink-0 p-2 rounded-xl transition-all disabled:opacity-50 ${
                      user.subscriptionType === 'premium'
                        ? 'bg-red-50 text-red-500 hover:bg-red-100'
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                    }`}
                    title={user.subscriptionType === 'premium' ? 'Passer en gratuit' : 'Passer en Premium'}
                  >
                    {updating === user.id
                      ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      : user.subscriptionType === 'premium' ? <Ban size={16} /> : <Crown size={16} />
                    }
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}