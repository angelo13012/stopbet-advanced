import React, { useState } from 'react';
import {
  signInWithPopup, GoogleAuthProvider,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { LogIn, UserPlus, Mail, Lock, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Auth() {
  const [isLogin,  setIsLogin]  = useState(true);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
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
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else         await createUserWithEmailAndPassword(auth, email, password);
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
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">StopBet</h1>
          <p className="text-slate-500 font-medium text-center mt-2">
            Reprenez le contrôle de votre vie et de vos finances.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium mb-6">{error}</div>
        )}

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
          <button type="submit" disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? 'Chargement...' : isLogin
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
          {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
          <button onClick={() => setIsLogin(!isLogin)} className="ml-2 text-indigo-600 font-bold hover:underline">
            {isLogin ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
