import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, TrendingUp, Brain, Trophy,
  AlertTriangle, Clock, Wallet,
  CheckCircle, ArrowRight, X, FileText,
  ChevronDown, ChevronUp,
} from 'lucide-react';

type Section = { title: string; content: string; };

const CGU_SECTIONS: Section[] = [
  { title: "1. Objet de l'application", content: `StopBet est une application d'aide à l'arrêt des paris sportifs. Elle fournit des outils de suivi, de motivation et de soutien aux personnes souhaitant réduire ou arrêter leur pratique des jeux d'argent.\n\nStopBet ne constitue en aucun cas un dispositif médical, un traitement thérapeutique ou un suivi psychologique professionnel. L'application ne remplace pas une consultation médicale, psychiatrique ou psychologique. En cas de dépendance sévère, nous recommandons vivement de consulter un professionnel de santé ou de contacter le Joueurs Info Service au 09 74 75 13 13.` },
  { title: '2. Inscription et compte utilisateur', content: `Pour utiliser StopBet, vous devez créer un compte avec une adresse email valide ou via Google. Vous êtes responsable de la confidentialité de vos identifiants et de toutes les activités réalisées depuis votre compte.\n\nVous devez avoir au moins 18 ans pour utiliser cette application. En créant un compte, vous certifiez avoir l'âge requis et acceptez les présentes conditions.` },
  { title: '3. Abonnement et paiement', content: `StopBet propose une version gratuite et une version Premium à 3,49€/mois ou 30€/an. Un essai gratuit de 7 jours est disponible pour les nouveaux utilisateurs, sous réserve d'enregistrement d'un moyen de paiement valide.\n\nSans annulation avant la fin de la période d'essai, l'abonnement se renouvelle automatiquement au tarif choisi. Vous pouvez annuler à tout moment depuis les paramètres de votre compte. Les paiements sont traités de manière sécurisée par Stripe. Aucune donnée bancaire n'est stockée par StopBet.` },
  { title: '4. Utilisation acceptable', content: `Vous vous engagez à utiliser StopBet uniquement à des fins personnelles et légales. Il est interdit de tenter de contourner les protections techniques, d'usurper l'identité d'autres utilisateurs, de diffuser des contenus offensants ou illégaux, ou d'utiliser l'application à des fins commerciales sans autorisation préalable.` },
  { title: '5. Limitation de responsabilité', content: `StopBet est fourni "tel quel" sans garantie d'aucune sorte. Nous ne pouvons garantir que l'application sera disponible en permanence, sans erreur ou adaptée à un usage particulier.\n\nStopBet décline toute responsabilité pour les préjudices directs ou indirects résultant de l'utilisation ou de l'impossibilité d'utiliser l'application, pour les décisions prises sur la base des informations fournies, ou pour tout comportement de tiers sur la plateforme.` },
  { title: '6. Propriété intellectuelle', content: `Tous les contenus de StopBet (textes, graphiques, logos, code) sont la propriété exclusive de StopBet ou de ses partenaires et sont protégés par les lois sur la propriété intellectuelle. Toute reproduction, modification ou diffusion sans autorisation est interdite.` },
  { title: '7. Modification et résiliation', content: `StopBet se réserve le droit de modifier ces conditions à tout moment. Les utilisateurs seront informés des modifications importantes. La poursuite de l'utilisation de l'application vaut acceptation des nouvelles conditions.\n\nStopBet peut suspendre ou résilier votre compte en cas de violation des présentes conditions, sans préavis ni remboursement.` },
  { title: '8. Droit applicable', content: `Les présentes conditions sont soumises au droit français. Tout litige sera soumis à la juridiction compétente du ressort de Lyon, France.` },
];

const PRIVACY_SECTIONS: Section[] = [
  { title: '1. Données collectées', content: `StopBet collecte les données suivantes lors de votre utilisation :\n\n— Données d'identité : prénom, nom, date de naissance, adresse email, pseudo\n— Données de santé comportementale : historique des rechutes, humeurs enregistrées, durée d'addiction déclarée\n— Données financières : revenu mensuel déclaré, montants de paris enregistrés (non vérifiés)\n— Données techniques : identifiant Firebase, token de notification, adresse IP, type d'appareil\n— Données de paiement : gérées exclusivement par Stripe — StopBet n'a accès qu'au statut de l'abonnement` },
  { title: '2. Finalités du traitement', content: `Vos données sont utilisées pour :\n\n— Fournir et personnaliser les fonctionnalités de l'application\n— Calculer votre streak, vos statistiques et vos badges\n— Vous envoyer des notifications de rappel (si activées)\n— Gérer votre abonnement et les paiements via Stripe\n— Améliorer l'application via des analyses anonymisées\n— Respecter nos obligations légales` },
  { title: '3. Base légale', content: `Le traitement de vos données repose sur votre consentement explicite lors de l'inscription, l'exécution du contrat d'abonnement, et nos intérêts légitimes à améliorer nos services. Vous pouvez retirer votre consentement à tout moment en supprimant votre compte.` },
  { title: '4. Partage des données', content: `Vos données ne sont jamais vendues à des tiers. Elles peuvent être partagées uniquement avec :\n\n— Firebase (Google) : hébergement et authentification\n— Stripe : traitement des paiements\n— Anthropic : génération des messages du coach IA (données anonymisées)\n\nCes prestataires sont soumis à des obligations strictes de confidentialité.` },
  { title: '5. Conservation des données', content: `Vos données sont conservées pendant toute la durée de votre compte actif, puis supprimées dans un délai de 30 jours suivant la suppression de votre compte, sauf obligation légale contraire (données de paiement conservées 5 ans).` },
  { title: '6. Vos droits (RGPD)', content: `Conformément au RGPD, vous disposez des droits suivants :\n\n— Droit d'accès à vos données personnelles\n— Droit de rectification des informations inexactes\n— Droit à l'effacement ("droit à l'oubli")\n— Droit à la portabilité de vos données\n— Droit d'opposition au traitement\n— Droit de limitation du traitement\n\nPour exercer ces droits, contactez-nous à : contact@stopbet.fr` },
  { title: '7. Sécurité', content: `StopBet met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, perte ou destruction. Les données sont chiffrées en transit (HTTPS) et au repos via Firebase.` },
  { title: '8. Cookies', content: `StopBet utilise uniquement des cookies techniques strictement nécessaires au fonctionnement de l'application (authentification, session). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.` },
  { title: '9. Contact et réclamations', content: `Pour toute question relative à vos données personnelles, contactez : contact@stopbet.fr\n\nVous avez également le droit d'introduire une réclamation auprès de la CNIL : www.cnil.fr` },
];

function AccordionItem({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden mb-2">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 bg-white text-left">
        <p className="font-bold text-slate-800 text-sm pr-4">{section.title}</p>
        {open ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
      </button>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="px-4 pb-4 bg-slate-50">
          <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-line">{section.content}</p>
        </motion.div>
      )}
    </div>
  );
}

function CGUModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'cgu' | 'privacy'>('cgu');
  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col max-w-md mx-auto">
      <div className="bg-white border-b border-slate-100 p-6 shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Shield size={20} /></div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Légal</h2>
              <p className="text-xs text-slate-400 font-medium">Dernière mise à jour : Mars 2026</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600"><X size={22} /></button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('cgu')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${tab === 'cgu' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
            <FileText size={14} /> CGU
          </button>
          <button onClick={() => setTab('privacy')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${tab === 'privacy' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
            <Shield size={14} /> Confidentialité
          </button>
        </div>
      </div>
      <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl shrink-0">
        <p className="text-xs font-black text-amber-700 mb-1">⚠️ Mention importante</p>
        <p className="text-xs text-amber-600 font-medium leading-relaxed">
          StopBet est un outil d'aide et ne remplace pas un suivi médical professionnel. En cas de dépendance sévère, consultez un médecin ou appelez le <strong>09 74 75 13 13</strong> (Joueurs Info Service — gratuit, 7j/7).
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {tab === 'cgu' ? (
          <div>
            <p className="text-xs text-slate-400 font-medium mb-4 leading-relaxed">En utilisant StopBet, vous acceptez les présentes conditions générales d'utilisation.</p>
            {CGU_SECTIONS.map((s, i) => <AccordionItem key={i} section={s} />)}
          </div>
        ) : (
          <div>
            <p className="text-xs text-slate-400 font-medium mb-4 leading-relaxed">StopBet s'engage à protéger vos données personnelles conformément au RGPD.</p>
            {PRIVACY_SECTIONS.map((s, i) => <AccordionItem key={i} section={s} />)}
          </div>
        )}
        <div className="h-8" />
      </div>
    </div>
  );
}

export default function Landing({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  const [showCGU, setShowCGU] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative px-6 pt-16 pb-20 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-100/60 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-200/40 rounded-full blur-[120px]" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="relative z-10 max-w-md mx-auto">

          <div className="inline-flex items-center gap-2 bg-red-50 text-red-500 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-red-200">
            <AlertTriangle size={14} /> 1 joueur sur 3 est en difficulté
          </div>

          <h1 className="text-4xl font-black leading-tight mb-4 text-slate-900">
            Arrêtez les paris.
            <br />
            <span className="text-indigo-600">Reprenez le contrôle.</span>
          </h1>

          <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-sm mx-auto">
            L'app qui vous aide à stopper les paris sportifs avec un suivi quotidien, un coach IA et une communauté bienveillante.
          </p>

          <motion.button onClick={onStart} whileTap={{ scale: 0.96 }}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-base shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 mb-3">
            Commencer gratuitement <ArrowRight size={18} />
          </motion.button>

          <button onClick={onLogin}
            className="text-slate-400 font-bold text-sm hover:text-indigo-600 transition-colors">
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
            <div key={value} className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
              <p className="text-xl font-black text-indigo-600">{value}</p>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="px-6 pb-16">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-black text-center mb-2 text-slate-900">Tout ce qu'il faut pour arrêter</h2>
          <p className="text-slate-400 text-center text-sm mb-10">Des outils concrets pour reprendre le contrôle</p>
          <div className="space-y-4">
            {[
              { icon: Shield,     color: "bg-red-50 text-red-500",        title: "Mode SOS",              desc: "Un bouton d'urgence quand l'envie est trop forte. Respiration guidée + contacts d'urgence." },
              { icon: Brain,      color: "bg-indigo-50 text-indigo-600",   title: "Coach IA personnel",    desc: "Un coach disponible 24/7 qui comprend votre situation et vous guide." },
              { icon: TrendingUp, color: "bg-emerald-50 text-emerald-600", title: "Suivi des progrès",     desc: "Visualisez vos jours sans paris, votre argent économisé et votre niveau." },
              { icon: Trophy,     color: "bg-amber-50 text-amber-500",     title: "Classement mondial",    desc: "Mesurez-vous à la communauté. Gagnez des XP et montez de niveau." },
              { icon: Wallet,     color: "bg-violet-50 text-violet-600",   title: "Journal de tentations", desc: "Notez chaque envie de parier. Comprenez vos déclencheurs." },
              { icon: Clock,      color: "bg-cyan-50 text-cyan-600",       title: "Streak & récompenses",  desc: "Chaque jour sans pari compte. Maintenez votre série et gagnez des badges." },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className={`p-3 rounded-xl shrink-0 ${color}`}><Icon size={22} /></div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm mb-1">{title}</h3>
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
          <h2 className="text-2xl font-black text-center mb-2 text-slate-900">Commencez gratuitement</h2>
          <p className="text-slate-400 text-center text-sm mb-10">Passez en Premium quand vous êtes prêt</p>
          <div className="space-y-4">
            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-lg text-slate-900">Gratuit</h3>
                <span className="text-2xl font-black text-slate-900">0€</span>
              </div>
              {["Suivi des jours sans pari", "Mode SOS", "Journal de tentations", "Classement mondial"].map(f => (
                <div key={f} className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-emerald-500" />
                  <span className="text-sm text-slate-500">{f}</span>
                </div>
              ))}
            </div>
            <div className="p-6 bg-gradient-to-br from-indigo-50 to-violet-50 border-2 border-indigo-200 rounded-2xl relative shadow-sm">
              <div className="absolute -top-3 left-6 bg-indigo-600 text-white text-xs font-black px-3 py-1 rounded-full">RECOMMANDÉ</div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-lg text-slate-900">Premium</h3>
                <div className="text-right">
                  <span className="text-2xl font-black text-slate-900">3,49€</span>
                  <span className="text-slate-400 text-sm">/mois</span>
                </div>
              </div>
              {["Tout le plan gratuit", "Coach IA personnel 24/7", "Auto-exclusion des plateformes", "Alertes budget personnalisées", "Statistiques avancées", "Support prioritaire"].map(f => (
                <div key={f} className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-indigo-500" />
                  <span className="text-sm text-slate-600">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="px-6 pb-20">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-black mb-3 text-slate-900">Prêt à reprendre le contrôle ?</h2>
          <p className="text-slate-400 text-sm mb-8">Faites le premier pas aujourd'hui. C'est gratuit.</p>
          <motion.button onClick={onStart} whileTap={{ scale: 0.96 }}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-base shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 mb-4">
            Commencer gratuitement <ArrowRight size={18} />
          </motion.button>
          <p className="text-xs text-slate-400">Gratuit · Sans engagement · Données protégées</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-6 py-8 border-t border-slate-200">
        <div className="max-w-md mx-auto text-center">
          <p className="text-sm font-black text-indigo-600 mb-1">StopBet</p>
          <p className="text-xs text-slate-400 mb-4">Reprenez le contrôle de votre vie</p>
          <p className="text-xs text-slate-300">© 2026 StopBet · Tous droits réservés</p>
          <p className="text-xs text-slate-300 mt-1">SIREN 103438552</p>
          <button onClick={() => setShowCGU(true)} className="text-xs text-indigo-400 hover:underline mt-2 block mx-auto">
            Politique de confidentialité & CGU
          </button>
        </div>
      </footer>

      {/* ── MODAL CGU ── */}
      <AnimatePresence>
        {showCGU && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}>
            <CGUModal onClose={() => setShowCGU(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}