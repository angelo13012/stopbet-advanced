import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { UserProfile, OperationType, FirestoreErrorInfo } from '../types';
import { motion } from 'framer-motion';
import { User, Calendar, Wallet, ChevronRight, Check } from 'lucide-react';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    monthlyIncome: '',
    bettingDuration: "Moins d'un an",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

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

  const handleSubmit = async () => {
    if (!auth.currentUser) return;
    setLoading(true); setError(null);
    try {
      const profile: Omit<UserProfile, 'id'> = {
        firstName:       formData.firstName.trim(),
        lastName:        formData.lastName.trim(),
        dob:             formData.dob,
        monthlyIncome:   parseFloat(formData.monthlyIncome),
        bettingDuration: formData.bettingDuration,
        streakCount:  0,
        bestStreak:   0,
        xp:           0,
        level:        1,
        badges:       [],
        subscriptionType:   'free',
        subscriptionStatus: 'active',
        role:       'user',
        createdAt:  new Date().toISOString(),
      };
      if (!profile.firstName || !profile.lastName || !profile.dob || isNaN(profile.monthlyIncome)) {
        throw new Error('Veuillez remplir tous les champs obligatoires.');
      }
      const path = `users/${auth.currentUser.uid}`;
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), profile);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
    } catch (e: any) {
      setError(e.message ?? "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col max-w-md mx-auto">
      <div className="flex justify-between items-center mb-12">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-2 flex-1 mx-1 rounded-full transition-all ${s <= step ? 'bg-indigo-600' : 'bg-slate-200'}`} />
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
      </div>

      <div className="flex gap-4 mt-8">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex-1 py-4 bg-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-300 transition-all">
            Retour
          </button>
        )}
        <button onClick={step === 3 ? handleSubmit : () => setStep(s => s + 1)}
          disabled={loading}
          className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50">
          {loading ? 'Chargement...' : step === 3 ? 'Commencer' : 'Continuer'}
          {step < 3 && <ChevronRight size={20} />}
        </button>
      </div>
    </div>
  );
}
