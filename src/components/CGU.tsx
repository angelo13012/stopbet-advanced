import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Shield, FileText, ChevronDown, ChevronUp } from 'lucide-react';

type Section = {
  title: string;
  content: string;
};

const CGU_SECTIONS: Section[] = [
  {
    title: "1. Objet de l'application",
    content: `StopBet est une application d'aide à l'arrêt des paris sportifs. Elle fournit des outils de suivi, de motivation et de soutien aux personnes souhaitant réduire ou arrêter leur pratique des jeux d'argent.

StopBet ne constitue en aucun cas un dispositif médical, un traitement thérapeutique ou un suivi psychologique professionnel. L'application ne remplace pas une consultation médicale, psychiatrique ou psychologique. En cas de dépendance sévère, nous recommandons vivement de consulter un professionnel de santé ou de contacter le Joueurs Info Service au 09 74 75 13 13.`,
  },
  {
    title: '2. Inscription et compte utilisateur',
    content: `Pour utiliser StopBet, vous devez créer un compte avec une adresse email valide ou via Google. Vous êtes responsable de la confidentialité de vos identifiants et de toutes les activités réalisées depuis votre compte.

Vous devez avoir au moins 18 ans pour utiliser cette application. En créant un compte, vous certifiez avoir l'âge requis et acceptez les présentes conditions.`,
  },
  {
    title: '3. Abonnement et paiement',
    content: `StopBet propose une version gratuite et une version Premium à 3,49€/mois ou 30€/an. Un essai gratuit de 7 jours est disponible pour les nouveaux utilisateurs, sous réserve d'enregistrement d'un moyen de paiement valide.

Sans annulation avant la fin de la période d'essai, l'abonnement se renouvelle automatiquement au tarif choisi. Vous pouvez annuler à tout moment depuis les paramètres de votre compte. Les paiements sont traités de manière sécurisée par Stripe. Aucune donnée bancaire n'est stockée par StopBet.`,
  },
  {
    title: '4. Utilisation acceptable',
    content: `Vous vous engagez à utiliser StopBet uniquement à des fins personnelles et légales. Il est interdit de tenter de contourner les protections techniques, d'usurper l'identité d'autres utilisateurs, de diffuser des contenus offensants ou illégaux, ou d'utiliser l'application à des fins commerciales sans autorisation préalable.`,
  },
  {
    title: '5. Limitation de responsabilité',
    content: `StopBet est fourni "tel quel" sans garantie d'aucune sorte. Nous ne pouvons garantir que l'application sera disponible en permanence, sans erreur ou adaptée à un usage particulier.

StopBet décline toute responsabilité pour les préjudices directs ou indirects résultant de l'utilisation ou de l'impossibilité d'utiliser l'application, pour les décisions prises sur la base des informations fournies, ou pour tout comportement de tiers sur la plateforme.

StopBet n'est pas responsable des rechutes ou de l'évolution de l'addiction. L'application est un outil d'aide, non une garantie de résultat.`,
  },
  {
    title: '6. Propriété intellectuelle',
    content: `Tous les contenus de StopBet (textes, graphiques, logos, code) sont la propriété exclusive de StopBet ou de ses partenaires et sont protégés par les lois sur la propriété intellectuelle. Toute reproduction, modification ou diffusion sans autorisation est interdite.`,
  },
  {
    title: '7. Modification et résiliation',
    content: `StopBet se réserve le droit de modifier ces conditions à tout moment. Les utilisateurs seront informés des modifications importantes. La poursuite de l'utilisation de l'application vaut acceptation des nouvelles conditions.

StopBet peut suspendre ou résilier votre compte en cas de violation des présentes conditions, sans préavis ni remboursement.`,
  },
  {
    title: '8. Droit applicable',
    content: `Les présentes conditions sont soumises au droit français. Tout litige sera soumis à la juridiction compétente du ressort de Lyon, France.`,
  },
];

const PRIVACY_SECTIONS: Section[] = [
  {
    title: '1. Données collectées',
    content: `StopBet collecte les données suivantes lors de votre utilisation :

— Données d'identité : prénom, nom, date de naissance, adresse email, pseudo
— Données de santé comportementale : historique des rechutes, humeurs enregistrées, durée d'addiction déclarée
— Données financières : revenu mensuel déclaré, montants de paris enregistrés (non vérifiés)
— Données techniques : identifiant Firebase, token de notification, adresse IP, type d'appareil
— Données de paiement : gérées exclusivement par Stripe — StopBet n'a accès qu'au statut de l'abonnement`,
  },
  {
    title: '2. Finalités du traitement',
    content: `Vos données sont utilisées pour :

— Fournir et personnaliser les fonctionnalités de l'application
— Calculer votre streak, vos statistiques et vos badges
— Vous envoyer des notifications de rappel (si activées)
— Gérer votre abonnement et les paiements via Stripe
— Améliorer l'application via des analyses anonymisées
— Respecter nos obligations légales`,
  },
  {
    title: '3. Base légale',
    content: `Le traitement de vos données repose sur votre consentement explicite lors de l'inscription, l'exécution du contrat d'abonnement, et nos intérêts légitimes à améliorer nos services. Vous pouvez retirer votre consentement à tout moment en supprimant votre compte.`,
  },
  {
    title: '4. Partage des données',
    content: `Vos données ne sont jamais vendues à des tiers. Elles peuvent être partagées uniquement avec :

— Firebase (Google) : hébergement et authentification
— Stripe : traitement des paiements
— Anthropic : génération des messages du coach IA (données anonymisées)

Ces prestataires sont soumis à des obligations strictes de confidentialité et ne peuvent utiliser vos données qu'à des fins limitées.`,
  },
  {
    title: '5. Conservation des données',
    content: `Vos données sont conservées pendant toute la durée de votre compte actif, puis supprimées dans un délai de 30 jours suivant la suppression de votre compte, sauf obligation légale contraire (données de paiement conservées 5 ans).`,
  },
  {
    title: '6. Vos droits (RGPD)',
    content: `Conformément au Règlement Général sur la Protection des Données, vous disposez des droits suivants :

— Droit d'accès à vos données personnelles
— Droit de rectification des informations inexactes
— Droit à l'effacement ("droit à l'oubli")
— Droit à la portabilité de vos données
— Droit d'opposition au traitement
— Droit de limitation du traitement

Pour exercer ces droits, contactez-nous à : contact@stopbet.fr`,
  },
  {
    title: '7. Sécurité',
    content: `StopBet met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, perte ou destruction. Les données sont chiffrées en transit (HTTPS) et au repos via Firebase.`,
  },
  {
    title: '8. Cookies',
    content: `StopBet utilise uniquement des cookies techniques strictement nécessaires au fonctionnement de l'application (authentification, session). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.`,
  },
  {
    title: '9. Contact et réclamations',
    content: `Pour toute question relative à vos données personnelles, contactez : contact@stopbet.fr

Vous avez également le droit d'introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés) : www.cnil.fr`,
  },
];

function AccordionItem({ section, index }: { section: Section; index: number }) {
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

export default function CGU({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'cgu' | 'privacy'>('cgu');

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col max-w-md mx-auto">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-6 shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Légal</h2>
              <p className="text-xs text-slate-400 font-medium">Dernière mise à jour : Mars 2026</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600">
            <X size={22} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button onClick={() => setTab('cgu')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${
              tab === 'cgu' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
            <FileText size={14} /> CGU
          </button>
          <button onClick={() => setTab('privacy')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${
              tab === 'privacy' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
            <Shield size={14} /> Confidentialité
          </button>
        </div>
      </div>

      {/* Mention médicale */}
      <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl shrink-0">
        <p className="text-xs font-black text-amber-700 mb-1">⚠️ Mention importante</p>
        <p className="text-xs text-amber-600 font-medium leading-relaxed">
          StopBet est un outil d'aide et ne remplace pas un suivi médical professionnel. En cas de dépendance sévère, consultez un médecin ou appelez le <strong>09 74 75 13 13</strong> (Joueurs Info Service — gratuit, 7j/7).
        </p>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {tab === 'cgu' ? (
          <div>
            <p className="text-xs text-slate-400 font-medium mb-4 leading-relaxed">
              En utilisant StopBet, vous acceptez les présentes conditions générales d'utilisation. Veuillez les lire attentivement.
            </p>
            {CGU_SECTIONS.map((s, i) => <AccordionItem key={i} section={s} index={i} />)}
          </div>
        ) : (
          <div>
            <p className="text-xs text-slate-400 font-medium mb-4 leading-relaxed">
              StopBet s'engage à protéger vos données personnelles conformément au RGPD et à la loi Informatique et Libertés.
            </p>
            {PRIVACY_SECTIONS.map((s, i) => <AccordionItem key={i} section={s} index={i} />)}
          </div>
        )}
        <div className="h-8" />
      </div>
    </div>
  );
}
