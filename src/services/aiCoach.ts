import { UserProfile, Bet, Goal } from '../types';

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
async function claude(system: string, user: string, maxTokens = 600): Promise<string> {
  if (!API_KEY) return '';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text?.trim() ?? '';
  } catch {
    return '';
  }
}

// ---- Message du jour (premium) ----
export async function getMotivationalMessage(
  profile: UserProfile,
  recentBets: Bet[]
): Promise<string> {
  const today     = new Date();
  const dayOfWeek = today.toLocaleDateString('fr', { weekday: 'long' });
  const hour      = today.getHours();
  const moment    = hour < 12 ? 'matin' : hour < 18 ? 'après-midi' : 'soir';
  const totalPerdu = recentBets.reduce((s, b) => s + b.amount, 0);

  const styles = [
    "une métaphore puissante tirée de la vie quotidienne",
    "une question philosophique qui pousse à la réflexion profonde",
    "une vérité crue mais bienveillante sur l'addiction",
    "un encouragement basé sur les neurosciences du changement",
    "une comparaison avec un athlète qui s'entraîne",
    "un rappel de ce que la liberté signifie concrètement au quotidien",
  ];
  const style = styles[Math.floor(Math.random() * styles.length)];

  const msg = await claude(
    `Tu es un coach psychologique de haut niveau, expert en addiction aux jeux d'argent. Tu as 15 ans d'expérience en thérapie comportementale et cognitive. Tu connais profondément la psychologie de la rechute, les mécanismes neurobiologiques du craving (dopamine, circuit de la récompense), et les techniques de renforcement positif.

TON STYLE :
- Tu parles comme un ami sage, pas comme un robot
- Tu utilises des images mentales fortes, des métaphores concrètes
- Tu fais réfléchir, tu ne récites pas des platitudes
- Tu connais les triggers spécifiques des parieurs sportifs (matchs le soir, weekends, grandes compétitions)

RÈGLES :
- Parle TOUJOURS en français avec "tu"
- Réponds UNIQUEMENT avec le message du coach, rien d'autre
- 4-6 phrases — assez long pour être impactant, assez court pour être lu
- Style d'aujourd'hui : ${style}
- Ne commence JAMAIS par "Félicitations" ou "Bravo" ou "Continue"
- Utilise le prénom naturellement
- Intègre des connaissances spécifiques sur l'addiction (neuroplasticité, habitudes, biais cognitifs des parieurs)`,

    `Contexte complet sur ${profile.firstName} :
- Jours sans pari actuellement : ${profile.streakCount}
- Meilleur record personnel : ${profile.bestStreak ?? 0} jours
- Niveau gamification : ${profile.level} (${profile.xp} XP)
- Argent total perdu en paris récemment : ${totalPerdu}€
- Revenu mensuel : ${profile.monthlyIncome}€
- Nombre de rechutes enregistrées : ${recentBets.length}
- Moment de la journée : ${moment} du ${dayOfWeek}
- Durée d'addiction déclarée : ${profile.bettingDuration}
${totalPerdu > 0 ? `- Équivalent de ce qu'il a perdu : ${Math.floor(totalPerdu / 15)} repas, ${Math.floor(totalPerdu / 50)} sorties, ${Math.floor(totalPerdu / 200)} weekends` : ''}

Génère un message du coach profondément personnel, intelligent et surprenant. Montre que tu comprends SA situation spécifique. Pas de message générique.`,
    600
  );
  return msg || localMotivation(profile.streakCount);
}

// ---- Intervention avant pari (premium) ----
export async function getInterventionMessage(
  amount: number,
  profile: UserProfile,
  goals: Goal[]
): Promise<string> {
  const goalsList = goals.length
    ? goals.map(g => `"${g.title}" (objectif: ${g.cost}€, déjà ${g.saved ?? 0}€ épargnés)`).join(', ')
    : 'aucun objectif défini';

  const pourcentageRevenu = ((amount / profile.monthlyIncome) * 100).toFixed(1);
  const streak = profile.streakCount;

  const angles = [
    'financier ultra-concret avec des calculs précis',
    'psychologique sur le mécanisme neurobiologique du craving et de la dopamine',
    'sur les objectifs de vie et ce que cet argent représente concrètement',
    "sur la fierté personnelle, l'identité et l'image de soi",
    'sur ce que tu vas ressentir 5 minutes APRÈS avoir parié (la honte, le regret)',
    'sur les probabilités réelles de gagner et les biais cognitifs du parieur',
    'sur l\'impact sur tes proches et les gens qui tiennent à toi',
  ];
  const angle = angles[Math.floor(Math.random() * angles.length)];

  const msg = await claude(
    `Tu es un coach expert en addiction aux jeux. Tu interviens au moment CRITIQUE où quelqu'un est sur le point de parier. C'est le moment de vérité — tu dois le faire STOPPER et RÉFLÉCHIR profondément.

Tu connais les biais cognitifs des parieurs : l'illusion de contrôle, le biais de confirmation, le "near miss effect", la chasse aux pertes, le "gambler's fallacy". Tu les utilises pour démontrer que le parieur se trompe lui-même.

RÈGLES :
- Français, "tu", UNIQUEMENT le message, sans guillemets
- 4-6 phrases — assez percutant pour arrêter quelqu'un dans son élan
- Angle d'aujourd'hui : ${angle}
- Utilise des CHIFFRES concrets quand c'est pertinent
- Pose une question qui DÉRANGE (dans le bon sens)
- Sois DIRECT, HUMAIN et INTELLIGENT — pas moralisateur
- Décris ce qui va se passer concrètement s'il parie (la séquence émotionnelle : excitation → anxiété → perte → honte → craving encore plus fort)`,

    `${profile.firstName} est sur le point de parier ${amount}€ MAINTENANT.
- C'est ${pourcentageRevenu}% de son revenu mensuel (${profile.monthlyIncome}€)
- Il a ${streak} jours sans pari ${streak > 0 ? `— série qu'il va détruire en 1 clic` : ''}
- Ses objectifs : ${goalsList}
- Durée d'addiction : ${profile.bettingDuration}
- Argent déjà perdu historiquement dans les paris : probablement des milliers d'euros
${streak > 7 ? `- Il a mis ${streak} jours d'effort pour construire cette série — 1 seconde pour tout perdre` : ''}

Génère un message d'intervention puissant avec l'angle : ${angle}. Ce message doit lui faire poser son téléphone.`,
    600
  );
  return msg || localIntervention(amount, goals);
}

// ---- Message SOS mode urgence (premium) ----
export async function getSOSMessage(profile: UserProfile): Promise<string> {
  const hour   = new Date().getHours();
  const moment = hour < 6 ? 'nuit profonde' : hour < 12 ? 'matin' : hour < 18 ? 'après-midi' : 'soirée';

  const techniques = [
    "technique STOP (Stop, Take a breath, Observe, Proceed)",
    "surf du craving (observer la vague monter et descendre sans agir)",
    "ancrage sensoriel 5-4-3-2-1 (5 choses que tu vois, 4 que tu touches...)",
    "technique du chronomètre (mettre un timer de 15 minutes et attendre)",
    "recadrage cognitif (remettre en question la pensée automatique)",
  ];
  const technique = techniques[Math.floor(Math.random() * techniques.length)];

  const msg = await claude(
    `Tu es un thérapeute spécialisé en addiction aux jeux, formé en TCC et en thérapie d'acceptation et d'engagement (ACT). Tu es disponible 24h/24 pour les moments de crise intense.

SITUATION : Cette personne vient d'activer le MODE SOS — elle ressent une envie INTENSE et INCONTRÔLABLE de parier RIGHT NOW. C'est le moment le plus critique. Son cerveau est inondé de dopamine anticipatoire.

TECHNIQUE À UTILISER : ${technique}

RÈGLES ABSOLUES :
- Français, "tu", bienveillant mais FERME et STRUCTURÉ
- UNIQUEMENT le message, sans guillemets ni préfixe
- 5-7 phrases — c'est une urgence, tu as le droit d'être plus long
- Commence par VALIDER la douleur de ce moment (ne minimise jamais)
- Explique la technique choisie de manière simple et immédiatement applicable
- Donne 2-3 actions PHYSIQUES concrètes à faire MAINTENANT (se lever, boire de l'eau, sortir marcher)
- Rappelle que le craving dure 15-20 minutes maximum — c'est scientifiquement prouvé
- Termine avec un ancrage de fierté`,

    `${profile.firstName} est en MODE URGENCE maintenant (${moment}).
- Jours sans pari en jeu : ${profile.streakCount}
- Meilleur record : ${profile.bestStreak ?? 0} jours
- Revenu mensuel : ${profile.monthlyIncome}€
- Durée d'addiction : ${profile.bettingDuration}
${profile.streakCount > 0 ? `- S'il cède, il perd ${profile.streakCount} jours de combat` : "- Il est en jour 0, c'est le moment de construire"}

Génère un message de crise PUISSANT et STRUCTURÉ utilisant la technique : ${technique}. Ce message doit l'aider à traverser les 15 prochaines minutes sans parier.`,
    700
  );
  return msg || localSOSMessage(profile.streakCount);
}

// ---- Analyse des rechutes (premium) ----
export async function analyzeRelapsePattern(
  profile: UserProfile,
  bets: Bet[]
): Promise<string> {
  if (bets.length < 2) return "Pas encore assez de données pour analyser tes habitudes. Continue à enregistrer tes rechutes — à partir de 3 entrées, je pourrai identifier des patterns précis.";

  const summary = bets.slice(0, 10).map(b =>
    `• ${new Date(b.date).toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' })}: ${b.amount}€, moment: ${b.timeOfDay ?? 'non précisé'}, humeur: ${b.mood ?? 'non précisée'}, raison: "${b.reason ?? 'non précisée'}", impulsif: ${b.isPlanned ? 'non (planifié)' : 'oui (impulsif)'}`
  ).join('\n');

  const totalPerdu = bets.reduce((s, b) => s + b.amount, 0);
  const moyennePari = Math.round(totalPerdu / bets.length);

  const msg = await claude(
    `Tu es un psychologue clinicien spécialisé en addictologie comportementale. Tu analyses des données de rechute pour identifier des PATTERNS PRÉCIS et ACTIONNABLES.

Tu connais les facteurs de rechute classiques :
- Triggers émotionnels (stress, ennui, solitude, euphorie)
- Triggers situationnels (soir, weekend, matchs importants, jour de paie)
- Triggers sociaux (amis qui parient, réseaux sociaux, pubs)
- Pensées automatiques ("cette fois je vais gagner", "juste un petit pari", "je mérite bien ça")

RÈGLES :
- Français, "tu"
- 6-8 phrases — analyse DÉTAILLÉE
- Identifie 2-3 patterns CONCRETS et SPÉCIFIQUES (pas génériques)
- Pour chaque pattern, donne UNE action préventive ultra-concrète
- Utilise les données pour faire des corrélations (jour/montant/humeur/moment)
- Termine avec un plan d'action en 1 phrase
- Sois professionnel mais accessible, pas condescendant`,

    `Analyse complète des rechutes de ${profile.firstName} :
- Revenu mensuel : ${profile.monthlyIncome}€
- Total perdu sur cette période : ${totalPerdu}€ (${((totalPerdu / profile.monthlyIncome) * 100).toFixed(0)}% du revenu)
- Pari moyen : ${moyennePari}€
- Durée d'addiction : ${profile.bettingDuration}
- Streak actuel : ${profile.streakCount} jours

Détail des ${bets.length} dernières rechutes :
${summary}

Fais une analyse psycho-comportementale poussée. Identifie les patterns temporels, émotionnels et financiers. Donne des conseils ultra-concrets et personnalisés.`,
    800
  );
  return msg || "Tes rechutes semblent suivre un pattern. Analyse les moments et émotions récurrents pour mieux les anticiper.";
}

// ---- Analyse humeur (premium) ----
export async function getMoodAnalysis(
  mood: string,
  note: string,
  profile: UserProfile,
  recentBets: Bet[]
): Promise<string> {
  const moodLabels: Record<string, string> = {
    stressed: 'stressé',
    sad:      'déprimé',
    neutral:  'neutre',
    good:     'bien',
    strong:   'fort et déterminé',
  };

  const isRisky = mood === 'stressed' || mood === 'sad';
  const recentRelapse = recentBets.length > 0 && (Date.now() - new Date(recentBets[0].date).getTime()) < 3 * 24 * 60 * 60 * 1000;

  const msg = await claude(
    `Tu es un thérapeute spécialisé en addiction et en régulation émotionnelle. Tu reçois l'humeur du jour d'un utilisateur qui lutte contre l'addiction aux jeux.

CONTEXTE IMPORTANT :
${isRisky ? "⚠️ HUMEUR À RISQUE — les émotions négatives sont le trigger #1 de rechute chez les parieurs. Tu dois intervenir de manière PRÉVENTIVE." : "L'humeur est positive — renforce le comportement positif et aide à construire la résilience."}
${recentRelapse ? "⚠️ RECHUTE RÉCENTE — il est fragile en ce moment." : ""}

RÈGLES :
- Français, "tu", uniquement le message, sans guillemets
- 4-6 phrases
- Étape 1 : Valide l'émotion (ne la minimise JAMAIS)
- Étape 2 : Explique le lien entre cette émotion et le risque de rechute (ou la force que ça donne)
- Étape 3 : Donne 1-2 actions concrètes adaptées à l'émotion
- Étape 4 : Termine avec un ancrage positif
- Si la note personnelle contient un indice important, adresse-le spécifiquement`,

    `${profile.firstName} se sent ${moodLabels[mood] || mood} aujourd'hui.
Note personnelle : "${note || 'aucune note'}"
Jours sans pari : ${profile.streakCount}
Rechutes récentes : ${recentBets.length} (${recentRelapse ? 'dont une très récente' : 'aucune récente'})
Durée d'addiction : ${profile.bettingDuration}
Revenu mensuel : ${profile.monthlyIncome}€

Génère un message de soutien INTELLIGENT et PERSONNALISÉ adapté à cette humeur. Si l'humeur est à risque, sois proactif sur la prévention de rechute.`,
    600
  );
  return msg || `Je vois que tu te sens ${moodLabels[mood] || mood} aujourd'hui. C'est dans ces moments que le craving peut être fort — appelle quelqu'un de confiance ou ouvre le mode SOS si l'envie devient trop forte. Tu as déjà tenu ${profile.streakCount} jours, tu peux traverser ça. 💪`;
}

// ---- Fallbacks locaux ----
function localMotivation(streak: number): string {
  if (streak === 0) return "Aujourd'hui est un nouveau départ. Ton cerveau va résister, il va te murmurer que 'juste un petit pari' c'est rien — mais toi tu sais que c'est le premier domino. Reste debout. 💪";
  if (streak < 7)  return `${streak} jour${streak > 1 ? 's' : ''} sans pari. Ton cerveau est en train de se recâbler — chaque jour sans parier renforce de nouveaux circuits neuronaux. Le plus dur c'est maintenant, et tu le fais.`;
  if (streak < 30) return `${streak} jours — tu es en pleine neuroplasticité positive. Les anciennes habitudes s'affaiblissent, les nouvelles se renforcent. Continue, ton cerveau travaille pour toi même quand tu dors. 🔥`;
  if (streak < 90) return `${streak} jours sans pari. Tu n'es plus dans la phase de résistance — tu es dans la phase de reconstruction. L'ancien toi aurait déjà craqué. Le nouveau toi est en train de gagner. 🏆`;
  return `${streak} jours. Ce n'est plus de la résistance, c'est devenu ton identité. Tu es quelqu'un qui ne parie pas. Point final. 👑`;
}

function localIntervention(amount: number, goals: Goal[]): string {
  if (goals.length > 0) {
    const g = goals[0];
    const pct = Math.round((amount / g.cost) * 100);
    return `Ces ${amount}€ représentent ${pct}% de ton objectif "${g.title}". Dans 30 secondes tu vas décider : est-ce que Winamax mérite plus cet argent que toi ? Pose ton téléphone. Respire. La réponse tu la connais déjà.`;
  }
  const heures = Math.floor(amount / (profile?.monthlyIncome ? profile.monthlyIncome / 160 : 12));
  return `${amount}€ — c'est environ ${heures} heures de ton travail. Tu vas donner ${heures}h de ta vie à un algorithme conçu pour te faire perdre. Est-ce que ça en vaut vraiment la peine ?`;
}

function localSOSMessage(streak: number): string {
  return `Ce que tu ressens là, c'est ton cerveau qui te ment — il te dit que parier va soulager la tension, mais c'est exactement l'inverse qui va se passer. Le craving est comme une vague : il monte, il est intense, mais il redescend TOUJOURS en moins de 20 minutes. C'est scientifiquement prouvé. ${streak > 0 ? `Tu as tenu ${streak} jour${streak > 1 ? 's' : ''} — ${streak} jours de combat que tu vas protéger.` : "Chaque seconde de résistance compte, c'est maintenant que tu construis."} Action immédiate : lève-toi, va te passer de l'eau froide sur le visage, et marche 5 minutes dehors. Quand tu reviendras, la vague sera passée.`;
}