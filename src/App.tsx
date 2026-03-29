import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, TrendingUp, PlusCircle, User,
  Settings, CreditCard, LogOut, ChevronRight, Trophy,
  AlertTriangle, AtSign, Check, X, Pencil,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, updateDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { useFirebase } from './components/FirebaseProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import BetLogger from './components/BetLogger';
import Progress from './components/Progress';
import Subscription from './components/Subscription';
import Leaderboard from './components/Leaderboard';
import SOSMode from './components/SOSMode';
import { syncStreakAndXP } from './services/streak';
import { auth, db } from './services/firebase';

type Tab = 'dashboard' | 'progress' | 'leaderboard' | 'log' | 'profile' | 'subscription';

export default function App() {
  const { user, profile, loading, isAuthReady } = useFirebase();
  const [activeTab,     setActiveTab]     = useState<Tab>('dashboard');
  const [showSOS,       setShowSOS]       = useState(false);
  const [showPseudoModal, setShowPseudoModal] = useState(false);

  useEffect(() => {
    if (user && profile) {
      syncStreakAndXP(user.uid, profile).catch(console.error);
      // Ouvrir automatiquement le modal pseudo si pas encore défini
      if (!profile.pseudo) setShowPseudoModal(true);
    }
  }, [user?.uid, profile?.lastBetDate]);

  if (!isAuthReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-600 font-medium">Chargement de StopBet…</p>
        </div>
      </div>
    );
  }

  if (!user)    return <Auth />;
  if (!profile) return <Onboarding />;

  const handleResetToFree = async () => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), {
      subscriptionType:   'free',
      subscriptionStatus: 'active',
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':    return <Dashboard />;
      case 'progress':     return <Progress />;
      case 'leaderboard':  return <Leaderboard />;
      case 'log':          return <BetLogger onComplete={() => setActiveTab('dashboard')} />;
      case 'subscription': return <Subscription onComplete={() => setActiveTab('profile')} />;
      case 'profile':      return (
        <div className="p-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Mon profil</h2>
          <p className="text-slate-500 font-medium mb-1">
            {profile.firstName} {profile.lastName}
          </p>

          {/* Pseudo */}
          <div className="flex items-center gap-2 mb-6">
            {profile.pseudo ? (
              <>
                <p className="text-indigo-600 font-black text-sm">@{profile.pseudo}</p>
                <button onClick={() => setShowPseudoModal(true)}
                  className="p-1 text-slate-400 hover:text-indigo-600 transition-colors">
                  <Pencil size={14} />
                </button>
              </>
            ) : (
              <button onClick={() => setShowPseudoModal(true)}
                className="flex items-center gap-1.5 text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors">
                <AtSign size={14} /> Choisir un pseudo
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Niveau',          value: profile.level },
              { label: 'XP',              value: `${profile.xp ?? 0}` },
              { label: 'Jours sans pari', value: `${profile.streakCount}j` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
                <p className="text-xl font-black text-slate-900">{value}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <button onClick={() => setActiveTab('leaderboard')}
              className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-500"><Trophy size={20} /></div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900">Classement</p>
                  <p className="text-sm text-slate-500">Voir ma position mondiale</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </button>

            <button onClick={() => setActiveTab('subscription')}
              className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><CreditCard size={20} /></div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900">Abonnement</p>
                  <p className="text-sm text-slate-500 capitalize">{profile.subscriptionType}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </button>

            <button onClick={handleResetToFree}
              className="w-full flex items-center gap-3 p-4 bg-orange-50 text-orange-600 rounded-2xl font-semibold">
              <CreditCard size={20} /> Passer en Free (test)
            </button>

            <button onClick={() => auth.signOut()}
              className="w-full flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl font-semibold">
              <LogOut size={20} /> Déconnexion
            </button>
          </div>
        </div>
      );
      default: return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 pb-24 max-w-md mx-auto relative shadow-2xl">

        <header className="p-6 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-black text-indigo-600 tracking-tighter">StopBet</h1>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Reprenez le contrôle</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSOS(true)}
              className="flex items-center gap-1.5 bg-red-500 text-white px-3 py-1.5 rounded-full font-black text-xs uppercase tracking-wider active:scale-95 transition-transform animate-pulse">
              <AlertTriangle size={13} /> SOS
            </button>
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full">
              <Trophy size={16} />
              <span className="text-sm font-bold">{profile.streakCount}j sans pari</span>
            </div>
          </div>
        </header>

        <main>
          <AnimatePresence mode="wait">
            <motion.div key={activeTab}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-lg border-t border-slate-100 px-2 py-3 flex justify-around items-center z-20">
          <NavBtn active={activeTab === 'dashboard'}   onClick={() => setActiveTab('dashboard')}   icon={<LayoutDashboard size={21} />} label="Accueil" />
          <NavBtn active={activeTab === 'progress'}    onClick={() => setActiveTab('progress')}    icon={<TrendingUp size={21} />}      label="Progrès" />
          <button onClick={() => setActiveTab('log')}
            className={`p-4 rounded-full shadow-lg transition-transform active:scale-95 ${activeTab === 'log' ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'}`}>
            <PlusCircle size={24} />
          </button>
          <NavBtn active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} icon={<Trophy size={21} />}          label="Classement" />
          <NavBtn active={activeTab === 'profile'}     onClick={() => setActiveTab('profile')}     icon={<User size={21} />}            label="Profil" />
        </nav>

        {/* ── Modal Pseudo ── */}
        <AnimatePresence>
          {showPseudoModal && user && (
            <PseudoModal
              currentPseudo={profile.pseudo}
              userId={user.uid}
              profile={profile}
              onClose={() => setShowPseudoModal(false)}
            />
          )}
        </AnimatePresence>

        {/* ── Mode SOS ── */}
        <AnimatePresence>
          {showSOS && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SOSMode onClose={() => setShowSOS(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}

// ── Modal pseudo ──
function PseudoModal({ currentPseudo, userId, profile, onClose }: {
  currentPseudo?: string;
  userId: string;
  profile: any;
  onClose: () => void;
}) {
  const [pseudo,   setPseudo]   = useState(currentPseudo ?? '');
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [checking, setChecking] = useState(false);

  const handleSave = async () => {
    const cleaned = pseudo.trim().toLowerCase();
    if (cleaned.length < 3)  { setError('Au moins 3 caractères'); return; }
    if (cleaned.length > 20) { setError('Maximum 20 caractères'); return; }
    if (!/^[a-zA-Z0-9_-]+$/.test(cleaned)) { setError('Lettres, chiffres, _ et - uniquement'); return; }

    setLoading(true); setError(''); setChecking(true);
    try {
      // Vérifier disponibilité sauf si c'est le pseudo actuel
      if (cleaned !== currentPseudo) {
        const snap = await getDocs(
          query(collection(db, 'leaderboard'), where('pseudo', '==', cleaned))
        );
        if (!snap.empty) { setError('Ce pseudo est déjà pris'); setLoading(false); setChecking(false); return; }
      }

      // Mettre à jour profil privé
      await updateDoc(doc(db, 'users', userId), { pseudo: cleaned });

      // Mettre à jour leaderboard public
      await setDoc(doc(db, 'leaderboard', userId), {
        pseudo:      cleaned,
        xp:          profile.xp ?? 0,
        streakCount: profile.streakCount ?? 0,
        level:       profile.level ?? 1,
        updatedAt:   new Date().toISOString(),
      }, { merge: true });

      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (e: any) {
      setError(e.message || 'Une erreur est survenue');
    } finally {
      setLoading(false); setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="bg-white w-full max-w-md rounded-t-[32px] p-8 shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-black text-slate-900">
              {currentPseudo ? 'Modifier le pseudo' : 'Choisir un pseudo'}
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Visible dans le classement mondial
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600">
            <X size={22} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <Check size={32} className="text-emerald-600" />
            </div>
            <p className="font-black text-slate-900">Pseudo sauvegardé !</p>
            <p className="text-sm text-slate-500 mt-1">@{pseudo.trim().toLowerCase()}</p>
          </div>
        ) : (
          <>
            <div className="relative mb-2">
              <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={pseudo}
                onChange={e => { setPseudo(e.target.value); setError(''); }}
                placeholder="tonpseudo"
                maxLength={20}
                className={`w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
                  error ? 'border-red-300' : 'border-slate-100'
                }`}
              />
            </div>
            {error && <p className="text-xs text-red-500 font-medium mb-3 ml-1">{error}</p>}
            {!error && (
              <p className="text-xs text-slate-400 font-medium mb-6 ml-1">
                Lettres, chiffres, _ et - uniquement. Min 3, max 20 caractères.
              </p>
            )}
            <button onClick={handleSave} disabled={loading || !pseudo.trim()}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Vérification…</>
              ) : (
                <><Check size={18} /> Sauvegarder</>
              )}
            </button>
            {!currentPseudo && (
              <button onClick={onClose} className="w-full py-3 text-slate-400 font-bold text-sm mt-2">
                Plus tard
              </button>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}
