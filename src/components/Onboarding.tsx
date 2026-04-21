import React, { useState } from 'react';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth, app } from '../services/firebase';
import { UserProfile, OperationType, FirestoreErrorInfo } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Calendar, Wallet, ChevronRight, Check, AtSign } from 'lucide-react';

const INTRO_SLIDES = [
  {
    emoji: '🛑',
    title: 'Reprenez le contrôle',
    subtitle: 'StopBet vous accompagne chaque jour pour sortir de l\'addiction aux paris sportifs.',
    bg: 'from-indigo-600 to-violet-700',
    features: [
      { icon: '🔥', text: 'Suivez votre streak sans pari' },
      { icon: '🧠', text: 'Coach IA personnalisé chaque jour' },
      { icon: '🏆', text: 'Gagnez des badges et de l\'XP' },
    ],
  },
  {
    emoji: '🆘',
    title: 'Le mode SOS',
    subtitle: 'Quand l\'envie de parier frappe, le mode SOS est là en un tap.',
    bg: 'from-red-500 to-rose-600',
    features: [
      { icon: '🌬️', text: 'Respiration guidée 4-4-4' },
      { icon: '📞', text: 'Appel direct à vos proches' },
      { icon: '✅', text: '+25 XP si vous résistez' },
    ],
  },
  {
    emoji: '📈',
    title: 'Mesurez vos progrès',
    subtitle: 'Chaque jour sans pari représente de l\'argent économisé et une vie qui se reconstruit.',
    bg: 'from-emerald-500 to-teal-600',
    features: [
      { icon: '💰', text: 'Argent économisé calculé en temps réel' },
      { icon: '📊', text: 'Graphiques et statistiques avancées' },
      { icon: '🌍', text: 'Classement mondial avec d\'autres joueurs' },
    ],
  },
];

export default function Onboarding() {
  const [phase, setPhase]     = useState<'intro' | 'form'>('intro');
  const [slide, setSlide]     = useState(0);
  const [step,  setStep]      = useState(1);
  const [formData, setFormData] = useState({
    firstName:       '',
    lastName:        '',
    pseudo:          '',
    dob:             '',
    monthlyIncome:   '',
    bettingDuration: "Moins d'un an",
  });
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [pseudoError,    setPseudoError]    = useState<string | null>(null);
  const [checkingPseudo, setCheckingPseudo] = useState(false);

  const handleFirestoreError = (err: any, op: OperationType, path: string | null) => {
    const info: FirestoreErrorInfo = {
      error: err instanceof Error ? err.message : String(err),
      operationType: op,
      path,
      authInfo: {
        userId:        auth.currentUser?.uid,
        email:         auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified ?? false,
        isAnonymous:   auth.currentUser?.isAnonymous   ?? false,
        tenantId:      auth.currentUser?.tenantId      ?? null,
        providerInfo:  auth.currentUser?.providerData.map(p => ({
          providerId:  p.providerId,
          displayName: p.displayName,
          email:       p.email,
          photoUrl:    p.photoURL,
        })) ?? [],
      },
    };
    console.error('Firestore Error:', JSON.stringify(info));
    setError(`Erreur: ${info.error}`);
    throw new Error(JSON.stringify(info));
  };

  const validatePseudo = async (pseudo: string): Promise<boolean> => {
    const cleaned = pseudo.trim();
    if (cleaned.length < 3)  { setPseudoError('Au moins 3 caractères'); return false; }
    if (cleaned.length > 20) { setPseudoError('Maximum 20 caractères'); return false; }
    if (!/^[a-zA-Z0-9_-]+$/.test(cleaned)) {
      setPseudoError('Lettres, chiffres, _ et - uniquement');
      return false;
    }
    setCheckingPseudo(true);
    try {
      const snap = await getDocs(query(collection(db, 'leaderboard'), where('pseudo', '==', cleaned.toLowerCase())));
      if (!snap.empty) { setPseudoError('Ce pseudo est déjà pris'); return false; }
      setPseudoError(null);
      return true;
    } catch {
      setPseudoError(null);
      return true;
    } finally {
      setCheckingPseudo(false);
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      const valid = await validatePseudo(formData.pseudo);
      if (!valid) return;
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!auth.currentUser) return;
    setLoading(true); setError(null);
    try {
      const pseudo = formData.pseudo.trim().toLowerCase();
      const pseudoValid = await validatePseudo(pseudo);
      if (!pseudoValid) { setLoading(false); return; }

      const profile: Omit<UserProfile, 'id'> = {
        firstName:          formData.firstName.trim(),
        lastName:           formData.lastName.trim(),
        pseudo,
        dob:                formData.dob,
        monthlyIncome:      parseFloat(formData.monthlyIncome),
        bettingDuration:    formData.bettingDuration,
        streakCount:        0,
        bestStreak:         0,
        xp:                 0,
        level:              1,
        badges:             [],
        subscriptionType:   'free',
        subscriptionStatus: 'active',
        role:               'user',
        createdAt:          new Date().toISOString(),
      };

      if (!profile.firstName || !profile.lastName || !profile.dob || isNaN(profile.monthlyIncome)) {
        throw new Error('Veuillez remplir tous les champs obligatoires.');
      }

      const uid  = auth.currentUser.uid;
      const path = `users/${uid}`;
      try {
        await setDoc(doc(db, 'users', uid), profile);
        await setDoc(doc(db, 'leaderboard', uid), {
          pseudo, xp: 0, streakCount: 0, level: 1, updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }

      // Email de bienvenue
      try {
        const fns = getFunctions(app, 'us-central1');
        await httpsCallable(fns, 'sendWelcomeEmail')({ firstName: profile.firstName });
      } catch (e) {
        console.error('Welcome email error:', e);
      }

    } catch (e: any) {
      setError(e.message ?? "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  if (phase === 'intro') {
    const s = INTRO_SLIDES[slide];
    return (
      <div className="min-h-screen flex flex-col max-w-md mx-auto">
        <AnimatePresence mode="wait">
          <motion.div key={slide}
            initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.3 }}
            className={`flex-1 bg-gradient-to-br ${s.bg} flex flex-col justify-between p-8 min-h-screen`}
          >
            <div className="flex items-center justify-between pt-4">
              <div className="flex gap-2">
                {INTRO_SLIDES.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-8 bg-white' : 'w-3 bg-white/30'}`} />
                ))}
              </div>
              <button onClick={() => setPhase('form')} className="text-white/60 text-sm font-bold">
                Passer →
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-center py-12">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="text-8xl mb-8 text-center"
              >
                {s.emoji}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-4xl font-black text-white mb-4 text-center leading-tight"
              >
                {s.title}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-white/80 font-medium text-center text-lg leading-relaxed mb-10"
              >
                {s.subtitle}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-3"
              >
                {s.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                    <span className="text-2xl">{f.icon}</span>
                    <span className="text-white font-bold">{f.text}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={() => {
                if (slide < INTRO_SLIDES.length - 1) {
                  setSlide(s => s + 1);
                } else {
                  setPhase('form');
                }
              }}
              className="w-full py-5 bg-white text-slate-900 rounded-3xl font-black text-lg flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-transform mb-4"
            >
              {slide < INTRO_SLIDES.length - 1 ? 'Suivant' : 'Commencer'}
              <ChevronRight size={22} />
            </motion.button>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  const totalSteps = 4;

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col max-w-md mx-auto">
      <div className="flex justify-between items-center mb-12">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`h-2 flex-1 mx-1 rounded-full transition-all ${i + 1 <= step ? 'bg-indigo-600' : 'bg-slate-200'}`} />
        ))}
      </div>

      <div className="flex-1">
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium mb-6">{error}</div>}

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Faisons connaissance</h2>
            <p className="text-slate-500 mb-8 font-medium">Ces informations nous aident à personnaliser votre expérience.</p>
            <div className="space-y-4">
              {[
                { placeholder: 'Prénom', key: 'firstName', Icon: User },
                { placeholder: 'Nom',    key: 'lastName',  Icon: User },
              ].map(({ placeholder, key, Icon }) => (
                <div key={key} className="relative">
                  <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input type="text" placeholder={placeholder}
                    value={(formData as any)[key]}
                    onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" />
                </div>
              ))}

              <div>
                <div className="relative">
                  <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input type="text" placeholder="Pseudo (visible dans le classement)"
                    value={formData.pseudo}
                    onChange={e => { setFormData({ ...formData, pseudo: e.target.value }); setPseudoError(null); }}
                    className={`w-full pl-12 pr-4 py-4 bg-white border rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 ${pseudoError ? 'border-red-300' : 'border-slate-100'}`}
                    maxLength={20} />
                </div>
                {pseudoError
                  ? <p className="text-xs text-red-500 font-medium mt-1 ml-1">{pseudoError}</p>
                  : <p className="text-xs text-slate-400 font-medium mt-1 ml-1">Lettres, chiffres, _ et - uniquement.</p>
                }
              </div>

              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="date" value={formData.dob}
                  onChange={e => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" />
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Vos finances</h2>
            <p className="text-slate-500 mb-8 font-medium">Nous calculons l'impact des paris sur votre budget réel.</p>
            <div className="relative">
              <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type="number" placeholder="Revenu mensuel net (€)" value={formData.monthlyIncome}
                onChange={e => setFormData({ ...formData, monthlyIncome: e.target.value })}
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" />
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Votre historique</h2>
            <p className="text-slate-500 mb-8 font-medium">Depuis combien de temps pariez-vous ?</p>
            <div className="space-y-3">
              {["Moins d'un an", '1 à 3 ans', '3 à 5 ans', 'Plus de 5 ans'].map(opt => (
                <button key={opt} onClick={() => setFormData({ ...formData, bettingDuration: opt })}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${
                    formData.bettingDuration === opt
                      ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                      : 'bg-white border-slate-100 text-slate-600'
                  }`}>
                  <span className="font-bold">{opt}</span>
                  {formData.bettingDuration === opt && <Check size={20} />}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Dernière étape 🎁</h2>
            <p className="text-slate-500 mb-8 font-medium">Commencez avec tous les avantages Premium.</p>

            <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🎁</span>
                <div>
                  <p className="font-black text-slate-900">7 jours Premium gratuits</p>
                  <p className="text-xs text-slate-500 font-medium">Sans engagement immédiat</p>
                </div>
              </div>
              <ul className="space-y-2 mb-4">
                {[
                  '🧠 Coach IA Claude personnalisé',
                  '📊 Graphique & stats avancées',
                  '💰 Argent économisé calculé',
                  '🆘 Mode SOS avec contacts d\'urgence',
                  '📅 Citations motivantes quotidiennes',
                  '🧘 Badges journal d\'humeur',
                ].map(item => (
                  <li key={item} className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400 font-medium">
                Une CB est requise. Sans annulation avant 7 jours → 3,49€/mois automatiquement.
              </p>
            </div>

            <p className="text-center text-slate-400 text-sm font-medium">Ou commencer directement en version gratuite ↓</p>
          </motion.div>
        )}
      </div>

      <div className="flex gap-4 mt-8">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex-1 py-4 bg-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-300 transition-all">
            Retour
          </button>
        )}

        {step < 4 && (
          <button
            onClick={step === 1 ? handleNext : () => setStep(s => s + 1)}
            disabled={loading || checkingPseudo}
            className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50"
          >
            {checkingPseudo ? 'Vérification…' : 'Continuer'}
            <ChevronRight size={20} />
          </button>
        )}

        {step === 4 && (
          <div className="flex-[2] flex flex-col gap-3">
            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black hover:bg-amber-600 transition-all shadow-lg disabled:opacity-50">
              {loading ? 'Création…' : "Commencer l'essai gratuit 🎁"}
            </button>
            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-3 text-slate-400 font-bold text-sm hover:text-slate-600 transition-all disabled:opacity-50">
              {loading ? '…' : 'Commencer en version gratuite'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}