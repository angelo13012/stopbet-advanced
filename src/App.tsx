import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, TrendingUp, PlusCircle, User,
  Settings, CreditCard, LogOut, ChevronRight, Trophy,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirebase } from './components/FirebaseProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import BetLogger from './components/BetLogger';
import Progress from './components/Progress';
import Subscription from './components/Subscription';
import { syncStreakAndXP } from './services/streak';
import { auth } from './services/firebase';

type Tab = 'dashboard' | 'progress' | 'log' | 'profile' | 'subscription';

export default function App() {
  const { user, profile, loading, isAuthReady } = useFirebase();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  // Auto-sync streak & XP when app loads
  useEffect(() => {
    if (user && profile) {
      syncStreakAndXP(user.uid, profile).catch(console.error);
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

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':    return <Dashboard />;
      case 'progress':     return <Progress />;
      case 'log':          return <BetLogger onComplete={() => setActiveTab('dashboard')} />;
      case 'subscription': return <Subscription onComplete={() => setActiveTab('profile')} />;
      case 'profile':      return (
        <div className="p-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Mon profil</h2>
          <p className="text-slate-500 font-medium mb-6">
            {profile.firstName} {profile.lastName}
          </p>

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Niveau',  value: profile.level },
              { label: 'XP',     value: `${profile.xp ?? 0}` },
              { label: 'Streak', value: `${profile.streakCount}j` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
                <p className="text-xl font-black text-slate-900">{value}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
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

        {/* ── Header ── */}
        <header className="p-6 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-black text-indigo-600 tracking-tighter">StopBet</h1>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Reprenez le contrôle</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full">
            <Trophy size={16} />
            <span className="text-sm font-bold">{profile.streakCount} jours</span>
          </div>
        </header>

        {/* ── Content ── */}
        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ── Bottom navigation ── */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-lg border-t border-slate-100 px-4 py-3 flex justify-around items-center z-20">
          <NavBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard size={22} />} label="Accueil" />

          <NavBtn active={activeTab === 'progress'} onClick={() => setActiveTab('progress')}
            icon={<TrendingUp size={22} />} label="Progrès" />

          {/* Central floating button */}
          <button onClick={() => setActiveTab('log')}
            className={`p-4 rounded-full shadow-lg transition-transform active:scale-95 ${
              activeTab === 'log' ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'
            }`}>
            <PlusCircle size={26} />
          </button>

          <NavBtn active={activeTab === 'profile'} onClick={() => setActiveTab('profile')}
            icon={<User size={22} />} label="Profil" />

          <NavBtn active={activeTab === 'subscription'} onClick={() => setActiveTab('subscription')}
            icon={<Settings size={22} />} label="Compte" />
        </nav>
      </div>
    </ErrorBoundary>
  );
}

function NavBtn({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors ${
        active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
      }`}>
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}
