import { UserProfile, Bet, Goal } from '../types';

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

async function claude(system: string, user: string, maxTokens = 300): Promise<string> {
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

  const msg = await claude(
    `Tu es un coach psychologique expert en addiction aux jeux d'argent. Tu connais profondément la psychologie de la rechute, les mécanismes du craving, et les techniques de renforcement positif.

RÈGLES ABSOLUES :
- Parle TOUJOURS en français avec "tu"
- Réponds UNIQUEMENT avec le message du coach, rien d'autre
- Pas de guillemets, pas de préfixe, pas d'explication
- 2-3 phrases maximum
- Varie TOUJOURS le style : parfois une question percutante, parfois une métaphore puissante, parfois une vérité choc, parfois de la tendresse
- Ne commence JAMAIS par "Félicitations" ou "Bravo" ou "Continue"
- Utilise le prénom naturellement, pas forcément au début`,

    `Contexte précis sur ${profile.firstName} :
- Jours sans pari : ${profile.streakCount}
- Meilleur record : ${profile.bestStreak ?? 0} jours
- Niveau gamification : ${profile.level} (${profile.xp} XP)
- Argent total perdu en paris : ${totalPerdu}€
- Revenu mensuel : ${profile.monthlyIncome}€
- Nombre de rechutes enregistrées : ${recentBets.length}
- Moment de la journée : ${moment} du ${dayOfWeek}
- Durée d'addiction déclarée : ${profile.bettingDuration}

Génère un message du coach profondément personnel et différent de "félicitations pour X jours". Surprends-le.`
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
    ? goals.map(g => `"${g.title}" (objectif: ${g.cost}€)`).join(', ')
    : 'aucun objectif défini';

  const pourcentageRevenu = ((amount / profile.monthlyIncome) * 100).toFixed(1);
  const streak = profile.streakCount;

  const angles = [
    'financier concret',
    'psychologique sur le mécanisme du craving',
    'sur les objectifs de vie',
    "sur la fierté et l'identité",
    'sur ce que tu vas ressentir après',
  ];
  const angle = angles[Math.floor(Math.random() * angles.length)];

  const msg = await claude(
    `Tu es un coach expert en addiction aux jeux. Tu interviens au moment critique où quelqu'un est sur le point de parier. Tu dois le faire STOPPER et RÉFLÉCHIR.

RÈGLES :
- Français, "tu", UNIQUEMENT le message, sans guillemets
- 2-3 phrases MAXIMUM — percutant et mémorable
- Angle d'aujourd'hui : ${angle}
- Jamais de morale plate ou de phrases clichées
- Pose parfois une question qui fait mal (dans le bon sens)
- Sois DIRECT et HUMAIN, pas robotique`,

    `${profile.firstName} est sur le point de parier ${amount}€ maintenant.
- C'est ${pourcentageRevenu}% de son revenu mensuel (${profile.monthlyIncome}€)
- Il a ${streak} jours sans pari ${streak > 0 ? "— qu'il va perdre" : ''}
- Ses objectifs : ${goalsList}
- Durée d'addiction : ${profile.bettingDuration}

Génère un message d'intervention qui lui fait VRAIMENT réfléchir avec l'angle : ${angle}.`
  );
  return msg || localIntervention(amount, goals);
}

// ---- Message SOS mode urgence (premium) ----
export async function getSOSMessage(profile: UserProfile): Promise<string> {
  const hour   = new Date().getHours();
  const moment = hour < 6 ? 'nuit profonde' : hour < 12 ? 'matin' : hour < 18 ? 'après-midi' : 'soirée';

  const msg = await claude(
    `Tu es un thérapeute spécialisé en addiction aux jeux, disponible 24h/24 pour les moments de crise intense.
Cette personne vient d'activer le MODE SOS — elle ressent une envie intense et incontrôlable de parier RIGHT NOW.
C'est le moment le plus critique. Tu dois l'aider à traverser cette vague de craving.

RÈGLES ABSOLUES :
- Français, "tu", bienveillant mais FERME
- UNIQUEMENT le message, sans guillemets ni préfixe
- 3-4 phrases — plus long qu'habituellement car c'est une urgence
- Commence par reconnaître la douleur de ce moment
- Utilise une technique thérapeutique : STOP (Stop, Take a breath, Observe, Proceed) ou surf du craving
- Termine avec quelque chose d'ancré dans le concret (une action immédiate)
- Rappelle que le craving dure 15-20 minutes maximum et passe toujours`,

    `${profile.firstName} est en MODE URGENCE maintenant (${moment}).
- Jours sans pari en jeu : ${profile.streakCount}
- Meilleur record : ${profile.bestStreak ?? 0} jours
- Revenu mensuel : ${profile.monthlyIncome}€
- Durée d'addiction : ${profile.bettingDuration}

Génère un message de crise puissant qui l'aide à traverser cette vague sans parier.`,
    400
  );
  return msg || localSOSMessage(profile.streakCount);
}

// ---- Analyse des rechutes (premium) ----
export async function analyzeRelapsePattern(
  profile: UserProfile,
  bets: Bet[]
): Promise<string> {
  if (bets.length < 2) return "Pas encore assez de données pour analyser tes habitudes. Continue à enregistrer tes rechutes.";

  const summary = bets.slice(0, 8).map(b =>
    `• ${new Date(b.date).toLocaleDateString('fr', { weekday: 'short', day: 'numeric', month: 'short' })}: ${b.amount}€, moment: ${b.timeOfDay ?? 'non précisé'}, raison: "${b.reason ?? 'non précisée'}", impulsif: ${b.isPlanned ? 'non' : 'oui'}`
  ).join('\n');

  const msg = await claude(
    `Tu es un psychologue spécialisé en addiction aux jeux. Tu analyses les données de rechute pour identifier des patterns comportementaux précis.

RÈGLES :
- Français, "tu"
- 3-4 phrases maximum
- Identifie UN pattern concret et spécifique (pas générique)
- Donne UN conseil pratique et actionnable immédiatement
- Sois direct et professionnel, pas condescendant`,

    `Analyse les rechutes de ${profile.firstName} (revenu: ${profile.monthlyIncome}€/mois) :

${summary}

Identifie le pattern le plus important et donne un conseil pratique ultra-concret qu'il peut appliquer dès aujourd'hui.`,
    350
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
    strong:   'fort',
  };

  const msg = await claude(
    `Tu es un thérapeute spécialisé en addiction. Tu reçois l'humeur du jour d'un utilisateur qui lutte contre l'addiction aux jeux. Quand l'humeur est négative (stressé, déprimé), tu dois intervenir avec bienveillance pour prévenir une rechute.

RÈGLES :
- Français, "tu", uniquement le message, sans guillemets
- 3-4 phrases maximum
- Reconnais l'émotion d'abord
- Donne une action concrète anti-rechute
- Termine avec quelque chose d'encourageant`,

    `${profile.firstName} se sent ${moodLabels[mood] || mood} aujourd'hui.
Note personnelle : "${note || 'aucune'}"
Jours sans pari : ${profile.streakCount}
Rechutes récentes : ${recentBets.length}
Durée d'addiction : ${profile.bettingDuration}

Génère un message de soutien adapté à cette humeur pour prévenir une rechute.`,
    300
  );
  return msg || `Je vois que tu te sens ${moodLabels[mood] || mood} aujourd'hui. C'est dans ces moments que le craving peut être fort — appelle quelqu'un de confiance ou ouvre le mode SOS si l'envie devient trop forte. Tu as déjà tenu ${profile.streakCount} jours, tu peux traverser ça. 💪`;
}

// ---- Fallbacks locaux ----
function localMotivation(streak: number): string {
  if (streak === 0) return "Aujourd'hui est un nouveau départ. Le premier pas est toujours le plus courageux. 💪";
  if (streak < 7)  return `${streak} jour${streak > 1 ? 's' : ''} — tu prouve chaque matin que tu es capable de changer.`;
  if (streak < 30) return `${streak} jours sans pari. C'est réel, c'est toi, c'est maintenant. 🔥`;
  if (streak < 90) return `${streak} jours — tu appartiens désormais au groupe des gens qui changent vraiment. 🏆`;
  return `${streak} jours. Tu es passé de l'autre côté. 👑`;
}

function localIntervention(amount: number, goals: Goal[]): string {
  if (goals.length > 0) {
    const pct = Math.round((amount / goals[0].cost) * 100);
    return `Ces ${amount}€ représentent ${pct}% de "${goals[0].title}". Dans 30 secondes tu vas décider si ce pari vaut vraiment ce sacrifice.`;
  }
  const equivalents = [
    `${Math.floor(amount / 15)} repas au restaurant`,
    `${Math.floor(amount / 12)} livres`,
    `${Math.floor(amount / 10)} sorties cinéma`,
  ];
  return `${amount}€ c'est ${equivalents[Math.floor(Math.random() * equivalents.length)]}. Est-ce que ce pari vaut vraiment ça ?`;
}

function localSOSMessage(streak: number): string {
  return `Cette envie que tu ressens là, elle est réelle et intense — mais elle va passer. Le craving dure toujours moins de 20 minutes, même s'il semble insurmontable. ${streak > 0 ? `Tu as tenu ${streak} jour${streak > 1 ? 's' : ''} — c'est la preuve que tu en es capable.` : "Chaque seconde de résistance compte."} Lève-toi, bois un verre d'eau froide, et marche 2 minutes — ton cerveau a besoin d'un reset physique maintenant.`;
}