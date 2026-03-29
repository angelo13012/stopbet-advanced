import React, { useState } from 'react';
import {
  signInWithPopup, GoogleAuthProvider,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { LogIn, UserPlus, Mail, Lock, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type View = 'login' | 'register' | 'forgot';

function LogoSB() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="64" height="64" rx="14" fill="#0f172a"/>
      <rect x="0" y="0" width="64" height="64" rx="14" fill="none" stroke="#4f46e5" strokeWidth="2.5"/>
      <text
        x="32" y="39"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="22"
        fontWeight="800"
        fill="white"
        textAnchor="middle"
        letterSpacing="-1"
      >SB</text>
    </svg>
  );
}

export default function Auth() {
  const [view,     setView]     = useState<View>('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (view === 'login') await signInWithEmailAndPassword(auth, email, password);
      else                  await createUserWithEmailAndPassword(auth, email, password);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Un email de réinitialisation a été envoyé à ' + email);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <LogoSB />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">StopBet</h1>
          <p className="text-slate-500 font-medium text-center mt-2">
            Reprenez le contrôle de votre vie et de vos finances.
          </p>
        </div>

        {error   && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium mb-6">{error}</div>}
        {success && <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-sm font-medium mb-6">{success}</div>}

        <AnimatePresence mode="wait">
          {view === 'forgot' && (
            <motion.div key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <button onClick={() => { setView('login'); setError(''); setSuccess(''); }}
                className="flex items-center gap-2 text-slate-400 hover:text-slate-600 mb-6 text-sm font-bold">
                <ArrowLeft size={16} /> Retour à la connexion
              </button>
              <h2 className="text-xl font-black text-slate-900 mb-2">Mot de passe oublié</h2>
              <p className="text-slate-500 text-sm font-medium mb-6">
                Entre ton email et on t'envoie un lien pour réinitialiser ton mot de passe.
              </p>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input type="email" placeholder="Email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                    required />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? 'Envoi...' : 'Envoyer le lien'}
                </button>
              </form>
            </motion.div>
          )}

          {view !== 'forgot' && (
            <motion.div key="auth" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <form onSubmit={handleEmail} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input type="email" placeholder="Email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                    required />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input type="password" placeholder="Mot de passe" value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                    required />
                </div>

                {view === 'login' && (
                  <div className="text-right">
                    <button type="button" onClick={() => { setView('forgot'); setError(''); setSuccess(''); }}
                      className="text-sm text-indigo-600 font-bold hover:underline">
                      Mot de passe oublié ?
                    </button>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? 'Chargement...' : view === 'login'
                    ? <><LogIn size={20} />Connexion</>
                    : <><UserPlus size={20} />S'inscrire</>}
                </button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest text-slate-400 bg-white px-4">
                  Ou continuer avec
                </div>
              </div>

              <button onClick={handleGoogle} disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-4 border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />
                Google
              </button>

              <p className="mt-8 text-center text-slate-500 font-medium">
                {view === 'login' ? "Pas encore de compte ?" : "Déjà un compte ?"}
                <button onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError(''); }}
                  className="ml-2 text-indigo-600 font-bold hover:underline">
                  {view === 'login' ? "S'inscrire" : "Se connecter"}
                </button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
