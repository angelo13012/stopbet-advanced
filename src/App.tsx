import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, TrendingUp, PlusCircle, User,
  CreditCard, LogOut, ChevronRight, Trophy,
  AlertTriangle, AtSign, Check, X, Pencil, Bell, BellOff,
  Phone, Plus, Trash2, ShieldOff, ExternalLink, Lock, Shield,
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
import CGU from './components/CGU';
import Landing from './components/Landing';
import { syncStreakAndXP } from './services/streak';
import {
  requestNotificationPermission,
  disableNotifications,
  listenToForegroundMessages,
  areNotificationsSupported,
} from './services/notifications';
import { auth, db } from './services/firebase';
import { EmergencyContact } from './types';

type Tab = 'dashboard' | 'progress' | 'leaderboard' | 'log' | 'profile' | 'subscription';

const PLATFORMS = [
  { id: 'winamax',      name: 'Winamax',        url: 'https://www.winamax.fr/compte/auto-exclusion' },
  { id: 'betclic',      name: 'Betclic',         url: 'https://www.betclic.fr/fr-fr/account/responsible-gaming' },
  { id: 'pmu',          name: 'PMU',             url: 'https://www.pmu.fr/turf/static/aide/auto-exclusion.html' },
  { id: 'unibet',       name: 'Unibet',          url: 'https://www.unibet.fr/aide/jeu-responsable/auto-exclusion' },
  { id: 'zebet',        name: 'ZEbet',           url: 'https://www.zebet.fr/fr/responsible-gaming' },
  { id: 'bwin',         name: 'Bwin',            url: 'https://sports.bwin.fr/fr/sports/responsible-gaming' },
  { id: 'parionssport', name: 'Parions Sport',   url: 'https://enligne.parionssport.fdj.fr/jeu-responsable' },
  { id: 'feelingbet',   name: 'Feelingbet',      url: 'https://www.feelingbet.fr/jeu-responsable' },
  { id: 'vbet',         name: 'Vbet',            url: 'https://www.vbet.fr/responsible-gambling' },
  { id: 'netbet',       name: 'NetBet',          url: 'https://www.netbet.fr/jeu-responsable' },
];

export default function App() {
  const { user, profile, loading, isAuthReady } = useFirebase();
  const [activeTab,          setActiveTab]          = useState<Tab>('dashboard');
  const [showSOS,            setShowSOS]            = useState(false);
  const [showPseudoModal,    setShowPseudoModal]    = useState(false);
  const [showContactsModal,  setShowContactsModal]  = useState(false);
  const [showPlatformsModal, setShowPlatformsModal] = useState(false);
  const [showCGU,            setShowCGU]            = useState(false);
  const [notifLoading,       setNotifLoading]       = useState(false);
  const [foregroundNotif,    setForegroundNotif]    = useState<{ title: string; body: string } | null>(null);
  const [showLanding,        setShowLanding]        = useState(true);

  useEffect(() => {
    if (user && profile) {
      syncStreakAndXP(user.uid, profile).catch(console.error);
      if (!profile.pseudo) setShowPseudoModal(true);
    }
  }, [user?.uid, profile?.lastBetDate]);

  useEffect(() => {
    if (!user) return;
    const unsub = listenToForegroundMessages((title, body) => {
      setForegroundNotif({ title, body });
      setTimeout(() => setForegroundNotif(null), 5000);
    });
    return unsub;
  }, [user?.uid]);

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

  if (!user) {
    if (showLanding) return <Landing onStart={() => setShowLanding(false)} onLogin={() => setShowLanding(false)} />;
    return <Auth />;
  }
  if (!profile) return <Onboarding />;

  const notifEnabled   = profile.notificationsEnabled === true;
  const notifSupported = areNotificationsSupported();
  const savedPlatforms = (profile as any).platforms ?? [];

  const handleToggleNotifications = async () => {
    if (!user) return;
    setNotifLoading(true);
    try {
      if (notifEnabled) {
        await disableNotifications(user.uid);
      } else {
        const granted = await requestNotificationPermission(user.uid);
        if (!granted) alert('Pour activer les notifications, autorise-les dans les paramètres de ton navigateur.');
      }
    } catch (e) { console.error(e); }
    finally { setNotifLoading(false); }
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
          <p className="text-slate-500 font-medium mb-1">{profile.firstName} {profile.lastName}</p>

          <div className="flex items-center gap-2 mb-6">
            {profile.pseudo ? (
              <>
                <p className="text-indigo-600 font-black text-sm">@{profile.pseudo}</p>
                <button onClick={() => setShowPseudoModal(true)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors">
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

            {profile.subscriptionType === 'premium' ? (
              <button onClick={() => setShowPlatformsModal(true)}
                className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg text-orange-500"><ShieldOff size={20} /></div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900">Mes plateformes de paris</p>
                    <p className="text-sm text-slate-500">
                      {savedPlatforms.length > 0
                        ? `${savedPlatforms.length} plateforme${savedPlatforms.length > 1 ? 's' : ''} — liens d'auto-exclusion`
                        : "Gérer mes inscriptions et m'auto-exclure"}
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-400" />
              </button>
            ) : (
              <button onClick={() => setActiveTab('subscription')}
                className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100 opacity-60">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg text-orange-500"><ShieldOff size={20} /></div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900">Mes plateformes de paris</p>
                    <p className="text-sm text-indigo-500 font-bold">Premium uniquement</p>
                  </div>
                </div>
                <Lock size={16} className="text-slate-300" />
              </button>
            )}

            <button onClick={() => setShowContactsModal(true)}
              className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg text-red-500"><Phone size={20} /></div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900">Contacts d'urgence</p>
                  <p className="text-sm text-slate-500">
                    {(profile.emergencyContacts ?? []).length > 0
                      ? `${profile.emergencyContacts!.length} contact${profile.emergencyContacts!.length > 1 ? 's' : ''} configuré${profile.emergencyContacts!.length > 1 ? 's' : ''}`
                      : 'Ajouter des proches à appeler en cas de crise'}
                  </p>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </button>

            {notifSupported && (
              <div className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${notifEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                    {notifEnabled ? <Bell size={20} /> : <BellOff size={20} />}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900">Notifications</p>
                    <p className="text-sm text-slate-500">{notifEnabled ? 'Activées — rappels quotidiens' : 'Désactivées'}</p>
                  </div>
                </div>
                <button onClick={handleToggleNotifications} disabled={notifLoading}
                  className={`w-12 h-7 rounded-full transition-colors relative disabled:opacity-50 ${notifEnabled ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                  <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${notifEnabled ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            )}

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

            <button onClick={() => setShowCGU(true)}
              className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-500"><Shield size={20} /></div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900">CGU & Confidentialité</p>
                  <p className="text-sm text-slate-500">Mentions légales et politique de données</p>
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

        <AnimatePresence>
          {foregroundNotif && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 left-4 right-4 max-w-md mx-auto z-50 bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex items-start gap-3">
              <Bell size={18} className="text-indigo-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-sm">{foregroundNotif.title}</p>
                <p className="text-xs text-slate-300 mt-0.5">{foregroundNotif.body}</p>
              </div>
              <button onClick={() => setForegroundNotif(null)} className="text-slate-400"><X size={16} /></button>
            </motion.div>
          )}
        </AnimatePresence>

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

        <AnimatePresence>
          {showPseudoModal && user && (
            <PseudoModal currentPseudo={profile.pseudo} userId={user.uid} profile={profile} onClose={() => setShowPseudoModal(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showContactsModal && user && (
            <ContactsModal contacts={profile.emergencyContacts ?? []} userId={user.uid} onClose={() => setShowContactsModal(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPlatformsModal && user && (
            <PlatformsModal savedPlatforms={savedPlatforms} userId={user.uid} onClose={() => setShowPlatformsModal(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCGU && <CGU onClose={() => setShowCGU(false)} />}
        </AnimatePresence>

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

function PlatformsModal({ savedPlatforms, userId, onClose }: {
  savedPlatforms: string[]; userId: string; onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(savedPlatforms);
  const [loading,  setLoading]  = useState(false);
  const [saved,    setSaved]    = useState(false);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), { platforms: selected });
      setSaved(true);
      setTimeout(onClose, 1500);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
        className="bg-white w-full max-w-md rounded-t-[32px] shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-8 pb-4 shrink-0">
          <div>
            <h3 className="text-xl font-black text-slate-900">Mes plateformes</h3>
            <p className="text-xs text-slate-400 font-medium mt-1">Coche celles où tu es inscrit</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400"><X size={22} /></button>
        </div>
        {saved ? (
          <div className="flex flex-col items-center py-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <Check size={32} className="text-emerald-600" />
            </div>
            <p className="font-black text-slate-900">Sauvegardé !</p>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto flex-1 px-8 space-y-2 pb-4">
              {PLATFORMS.map(p => (
                <div key={p.id} className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  selected.includes(p.id) ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100'
                }`}>
                  <button onClick={() => toggle(p.id)}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                      selected.includes(p.id) ? 'bg-orange-500 border-orange-500' : 'border-slate-200'
                    }`}>
                    {selected.includes(p.id) && <Check size={14} className="text-white" />}
                  </button>
                  <span className={`flex-1 font-bold text-sm ${selected.includes(p.id) ? 'text-orange-700' : 'text-slate-700'}`}>
                    {p.name}
                  </span>
                  {selected.includes(p.id) && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-black text-red-500 bg-red-50 px-3 py-1.5 rounded-full active:scale-95 transition-transform">
                      <ExternalLink size={11} /> S'auto-exclure
                    </a>
                  )}
                </div>
              ))}
              <div className="mt-4 p-4 bg-slate-900 rounded-2xl">
                <p className="text-xs font-black text-white mb-1">Exclusion nationale (ANJ)</p>
                <p className="text-xs text-slate-400 font-medium mb-3">Se bannir de tous les sites agréés en France en une seule fois.</p>
                <a href="https://www.anj.fr/jeu-responsable/auto-exclusion" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 text-white rounded-xl font-black text-sm active:scale-95 transition-transform">
                  <ExternalLink size={14} /> Accéder au site de l'ANJ
                </a>
              </div>
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <p className="text-xs font-black text-indigo-700 mb-1">Joueurs Info Service</p>
                <p className="text-xs text-indigo-500 font-medium mb-2">Aide gratuite et confidentielle 7j/7</p>
                <a href="tel:0974751313" className="flex items-center gap-2 text-sm font-black text-indigo-700">
                  <Phone size={14} /> 09 74 75 13 13
                </a>
              </div>
            </div>
            <div className="p-8 pt-4 shrink-0">
              <button onClick={handleSave} disabled={loading}
                className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sauvegarde…</>
                  : <><Check size={18} /> Sauvegarder</>
                }
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function ContactsModal({ contacts, userId, onClose }: {
  contacts: EmergencyContact[]; userId: string; onClose: () => void;
}) {
  const [list,    setList]    = useState<EmergencyContact[]>(contacts);
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAdd = () => {
    if (!name.trim() || !phone.trim()) return;
    setList(prev => [...prev, { name: name.trim(), phone: phone.trim() }]);
    setName(''); setPhone('');
  };

  const handleRemove = (i: number) => setList(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), { emergencyContacts: list });
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
        className="bg-white w-full max-w-md rounded-t-[32px] p-8 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-black text-slate-900">Contacts d'urgence</h3>
            <p className="text-xs text-slate-400 font-medium mt-1">Accessibles en un tap dans le mode SOS</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400"><X size={22} /></button>
        </div>
        {success ? (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <Check size={32} className="text-emerald-600" />
            </div>
            <p className="font-black text-slate-900">Contacts sauvegardés !</p>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-6">
              {list.length === 0 ? (
                <p className="text-sm text-slate-400 font-medium text-center py-4">Aucun contact encore ajouté</p>
              ) : list.map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                    <Phone size={16} className="text-red-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-sm">{c.name}</p>
                    <p className="text-xs text-slate-400 font-medium">{c.phone}</p>
                  </div>
                  <button onClick={() => handleRemove(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            {list.length < 5 && (
              <div className="space-y-3 mb-6">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Ajouter un contact</p>
                <input type="text" placeholder="Prénom (ex: Maman)" value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-400" />
                <input type="tel" placeholder="Numéro (ex: 0612345678)" value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-400" />
                <button onClick={handleAdd} disabled={!name.trim() || !phone.trim()}
                  className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40">
                  <Plus size={16} /> Ajouter
                </button>
              </div>
            )}
            <button onClick={handleSave} disabled={loading}
              className="w-full py-4 bg-red-500 text-white rounded-2xl font-black hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sauvegarde…</>
                : <><Check size={18} /> Sauvegarder</>
              }
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

function PseudoModal({ currentPseudo, userId, profile, onClose }: {
  currentPseudo?: string; userId: string; profile: any; onClose: () => void;
}) {
  const [pseudo,  setPseudo]  = useState(currentPseudo ?? '');
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const cleaned = pseudo.trim().toLowerCase();
    if (cleaned.length < 3)  { setError('Au moins 3 caractères'); return; }
    if (cleaned.length > 20) { setError('Maximum 20 caractères'); return; }
    if (!/^[a-zA-Z0-9_-]+$/.test(cleaned)) { setError('Lettres, chiffres, _ et - uniquement'); return; }
    setLoading(true); setError('');
    try {
      if (cleaned !== currentPseudo) {
        const snap = await getDocs(query(collection(db, 'leaderboard'), where('pseudo', '==', cleaned)));
        if (!snap.empty) { setError('Ce pseudo est déjà pris'); setLoading(false); return; }
      }
      await updateDoc(doc(db, 'users', userId), { pseudo: cleaned });
      await setDoc(doc(db, 'leaderboard', userId), {
        pseudo: cleaned, xp: profile.xp ?? 0, streakCount: profile.streakCount ?? 0,
        level: profile.level ?? 1, updatedAt: new Date().toISOString(),
      }, { merge: true });
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (e: any) {
      setError(e.message || 'Une erreur est survenue');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
        className="bg-white w-full max-w-md rounded-t-[32px] p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-black text-slate-900">{currentPseudo ? 'Modifier le pseudo' : 'Choisir un pseudo'}</h3>
            <p className="text-xs text-slate-400 font-medium mt-1">Visible dans le classement mondial</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400"><X size={22} /></button>
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
              <input type="text" value={pseudo} onChange={e => { setPseudo(e.target.value); setError(''); }}
                placeholder="tonpseudo" maxLength={20}
                className={`w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 ${error ? 'border-red-300' : 'border-slate-100'}`} />
            </div>
            {error
              ? <p className="text-xs text-red-500 font-medium mb-3 ml-1">{error}</p>
              : <p className="text-xs text-slate-400 font-medium mb-6 ml-1">Lettres, chiffres, _ et - uniquement. Min 3, max 20 caractères.</p>
            }
            <button onClick={handleSave} disabled={loading || !pseudo.trim()}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Vérification…</>
                : <><Check size={18} /> Sauvegarder</>
              }
            </button>
            {!currentPseudo && (
              <button onClick={onClose} className="w-full py-3 text-slate-400 font-bold text-sm mt-2">Plus tard</button>
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