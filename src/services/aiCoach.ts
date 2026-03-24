import { UserProfile, Bet, Goal } from '../types';

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

async function claude(system: string, user: string, maxTokens = 200): Promise<string> {
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

// ---- Message du jour ----
export async function getMotivationalMessage(
  profile: UserProfile,
  recentBets: Bet[]
): Promise<string> {
  const msg = await claude(
    `Tu es StopBet Coach, expert bienveillant en psychologie comportementale.
Parle en français, utilise "tu", sois empathique, jamais culpabilisant.
Réponds UNIQUEMENT avec le message, sans guillemets ni préfixe. Maximum 2 phrases.`,
    `Utilisateur: ${profile.firstName}. Streak: ${profile.streakCount} jours. Niveau ${profile.level} (${profile.xp} XP). Paris récents: ${recentBets.length}. Revenu: ${profile.monthlyIncome}€.
Génère un message motivant et personnalisé pour aujourd'hui.`
  );
  return msg || localMotivation(profile.streakCount);
}

// ---- Intervention rechute ----
export async function getInterventionMessage(
  amount: number,
  profile: UserProfile,
  goals: Goal[]
): Promise<string> {
  const goalsList = goals.length
    ? goals.map(g => `${g.title} (${g.cost}€)`).join(', ')
    : 'aucun projet défini';

  const msg = await claude(
    `Tu es StopBet Coach. Empêche l'utilisateur de parier impulsivement.
Sois percutant mais bienveillant. Français, "tu". UNIQUEMENT le message, sans guillemets. Max 2 phrases.`,
    `${profile.firstName} va parier ${amount}€. Revenus: ${profile.monthlyIncome}€. Streak: ${profile.streakCount} jours. Projets: ${goalsList}.
Message d'intervention fort.`
  );
  return msg || localIntervention(amount, goals);
}

// ---- Analyse des rechutes (premium) ----
export async function analyzeRelapsePattern(
  profile: UserProfile,
  bets: Bet[]
): Promise<string> {
  if (bets.length < 2) return "Pas encore assez de données pour analyser tes habitudes.";

  const summary = bets.slice(0, 6).map(b =>
    `${new Date(b.date).toLocaleDateString('fr')}: ${b.amount}€, heure: ${b.timeOfDay ?? '?'}, raison: ${b.reason ?? '?'}`
  ).join('\n');

  const msg = await claude(
    `Tu es StopBet Coach. Analyse les patterns de rechute et donne un conseil pratique.
Parle en français. 2-3 phrases max. UNIQUEMENT le conseil, direct et concret.`,
    `Analyse les rechutes de ${profile.firstName}:\n${summary}\nIdentifie UN pattern et donne UN conseil actionnable.`,
    250
  );
  return msg || "Tu rechutes souvent en soirée. Essaie d'identifier ce qui te pousse à parier à ces moments et prépare une activité de substitution.";
}

// ---- Fallbacks locaux ----
function localMotivation(streak: number): string {
  if (streak === 0) return "Aujourd'hui est un nouveau départ. Chaque grand voyage commence par un premier pas. 💪";
  if (streak < 7)  return `${streak} jour${streak > 1 ? 's' : ''} déjà ! Tu bâtis quelque chose de solide. Continue !`;
  if (streak < 30) return `${streak} jours sans pari — tu montres chaque jour que tu es plus fort que cette addiction. 🔥`;
  if (streak < 90) return `${streak} jours, c'est incroyable. Tu es un exemple que le changement est possible. 🏆`;
  return `${streak} jours — tu es une légende vivante. Rien ne peut t'arrêter. 👑`;
}

function localIntervention(amount: number, goals: Goal[]): string {
  if (goals.length > 0) {
    return `Ce pari de ${amount}€ te rapproche ou t'éloigne de "${goals[0].title}" (${goals[0].cost}€) ? Prends 30 secondes avant de décider.`;
  }
  return `${amount}€ c'est ${Math.floor(amount / 10)} cafés ou une sortie. Est-ce que ce pari en vaut vraiment la peine ?`;
}
