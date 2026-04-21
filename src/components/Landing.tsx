import { motion } from 'framer-motion';
import {
  Shield, TrendingUp, Brain, Trophy,
  AlertTriangle, Clock, Wallet,
  CheckCircle, ArrowRight
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export default function Landing({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-x-hidden transition-colors duration-300">

      {/* ── TOGGLE ── */}
      <div className="flex justify-end px-6 pt-4">
        <ThemeToggle />
      </div>

      {/* ── HERO ── */}
      <section className="relative px-6 pt-10 pb-20 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-100/60 dark:from-indigo-600/20 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-200/40 dark:bg-indigo-500/10 rounded-full blur-[120px]" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="relative z-10 max-w-md mx-auto">

          <div className="inline-flex items-center gap-2 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-red-200 dark:border-red-500/20">
            <AlertTriangle size={14} /> 1 joueur sur 3 est en difficulté
          </div>

          <h1 className="text-4xl font-black leading-tight mb-4">
            Arrêtez les paris.
            <br />
            <span className="text-indigo-600 dark:text-indigo-400">Reprenez le contrôle.</span>
          </h1>

          <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed mb-8 max-w-sm mx-auto">
            L'app qui vous aide à stopper les paris sportifs avec un suivi quotidien, un coach IA et une communauté bienveillante.
          </p>

          <motion.button onClick={onStart} whileTap={{ scale: 0.96 }}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-base shadow-lg shadow-indigo-200 dark:shadow-indigo-600/30 flex items-center justify-center gap-2 mb-3">
            Commencer gratuitement <ArrowRight size={18} />
          </motion.button>

          <button onClick={onLogin}
            className="text-slate-400 font-bold text-sm hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            J'ai déjà un compte · Se connecter
          </button>
        </motion.div>
      </section>

      {/* ── STATS ── */}
      <section className="px-6 pb-16">
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
          {[
            { value: "24/7", label: "coach IA disponible" },
            { value: "100%", label: "gratuit pour commencer" },
            { value: "2 min", label: "pour s'inscrire" },
          ].map(({ value, label }) => (
            <div key={value} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center shadow-sm">
              <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{value}</p>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="px-6 pb-16">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-black text-center mb-2">Tout ce qu'il faut pour arrêter</h2>
          <p className="text-slate-400 text-center text-sm mb-10">Des outils concrets pour reprendre le contrôle</p>

          <div className="space-y-4">
            {[
              { icon: Shield,     colorLight: "bg-red-50 text-red-500",       colorDark: "dark:bg-red-500/10 dark:text-red-400",     title: "Mode SOS",              desc: "Un bouton d'urgence quand l'envie est trop forte. Respiration guidée + contacts d'urgence." },
              { icon: Brain,      colorLight: "bg-indigo-50 text-indigo-600",  colorDark: "dark:bg-indigo-500/10 dark:text-indigo-400", title: "Coach IA personnel",    desc: "Un coach disponible 24/7 qui comprend votre situation et vous guide." },
              { icon: TrendingUp, colorLight: "bg-emerald-50 text-emerald-600",colorDark: "dark:bg-emerald-500/10 dark:text-emerald-400",title: "Suivi des progrès",   desc: "Visualisez vos jours sans paris, votre argent économisé et votre niveau." },
              { icon: Trophy,     colorLight: "bg-amber-50 text-amber-500",    colorDark: "dark:bg-amber-500/10 dark:text-amber-400",  title: "Classement mondial",    desc: "Mesurez-vous à la communauté. Gagnez des XP et montez de niveau." },
              { icon: Wallet,     colorLight: "bg-violet-50 text-violet-600",  colorDark: "dark:bg-violet-500/10 dark:text-violet-400", title: "Journal de tentations", desc: "Notez chaque envie de parier. Comprenez vos déclencheurs." },
              { icon: Clock,      colorLight: "bg-cyan-50 text-cyan-600",      colorDark: "dark:bg-cyan-500/10 dark:text-cyan-400",    title: "Streak & récompenses",  desc: "Chaque jour sans pari compte. Maintenez votre série et gagnez des badges." },
            ].map(({ icon: Icon, colorLight, colorDark, title, desc }) => (
              <div key={title} className="flex gap-4 p-4 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-2xl shadow-sm">
                <div className={`p-3 rounded-xl shrink-0 ${colorLight} ${colorDark}`}>
                  <Icon size={22} />
                </div>
                <div>
                  <h3 className="font-black text-sm mb-1">{title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="px-6 pb-16">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-black text-center mb-2">Commencez gratuitement</h2>
          <p className="text-slate-400 text-center text-sm mb-10">Passez en Premium quand vous êtes prêt</p>

          <div className="space-y-4">
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-lg">Gratuit</h3>
                <span className="text-2xl font-black">0€</span>
              </div>
              {["Suivi des jours sans pari", "Mode SOS", "Journal de tentations", "Classement mondial"].map(f => (
                <div key={f} className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-emerald-500" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">{f}</span>
                </div>
              ))}
            </div>

            <div className="p-6 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-600/20 dark:to-violet-600/20 border-2 border-indigo-200 dark:border-indigo-500/30 rounded-2xl relative shadow-sm">
              <div className="absolute -top-3 left-6 bg-indigo-600 text-white text-xs font-black px-3 py-1 rounded-full">
                RECOMMANDÉ
              </div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-lg">Premium</h3>
                <div className="text-right">
                  <span className="text-2xl font-black">3,49€</span>
                  <span className="text-slate-400 text-sm">/mois</span>
                </div>
              </div>
              {["Tout le plan gratuit", "Coach IA personnel 24/7", "Auto-exclusion des plateformes", "Alertes budget personnalisées", "Statistiques avancées", "Support prioritaire"].map(f => (
                <div key={f} className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-indigo-500 dark:text-indigo-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-300">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="px-6 pb-20">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-black mb-3">Prêt à reprendre le contrôle ?</h2>
          <p className="text-slate-400 text-sm mb-8">Faites le premier pas aujourd'hui. C'est gratuit.</p>

          <motion.button onClick={onStart} whileTap={{ scale: 0.96 }}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-base shadow-lg shadow-indigo-200 dark:shadow-indigo-600/30 flex items-center justify-center gap-2 mb-4">
            Commencer gratuitement <ArrowRight size={18} />
          </motion.button>

          <p className="text-xs text-slate-400">
            Gratuit · Sans engagement · Données protégées
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-6 py-8 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-md mx-auto text-center">
          <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 mb-1">StopBet</p>
          <p className="text-xs text-slate-400 mb-4">Reprenez le contrôle de votre vie</p>
          <p className="text-xs text-slate-300 dark:text-slate-700">© 2026 StopBet · Tous droits réservés</p>
          <p className="text-xs text-slate-300 dark:text-slate-700 mt-1">SIREN 103438552</p>
        </div>
      </footer>
    </div>
  );
}