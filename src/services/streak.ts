import { doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
  UserProfile, BadgeId, ALL_BADGES,
  XP_PER_DAY, XP_WEEK_BONUS, computeLevel,
} from '../types';

export function computeStreakFromLastBet(lastBetDate?: string): number {
  if (!lastBetDate) return 0;
  const last  = new Date(lastBetDate); last.setHours(0, 0, 0, 0);
  const today = new Date();            today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - last.getTime()) / 86_400_000));
}

// Met à jour le leaderboard public avec les données non-sensibles
async function syncLeaderboard(userId: string, data: {
  pseudo: string;
  xp: number;
  streakCount: number;
  level: number;
}): Promise<void> {
  try {
    await setDoc(doc(db, 'leaderboard', userId), {
      pseudo:      data.pseudo,
      xp:          data.xp,
      streakCount: data.streakCount,
      level:       data.level,
      updatedAt:   new Date().toISOString(),
    }, { merge: true });
  } catch (e) {
    console.error('Leaderboard sync error:', e);
  }
}

// Appelé au chargement de l'app pour auto-incrémenter les jours sans pari + XP
export async function syncStreakAndXP(userId: string, profile: UserProfile): Promise<void> {
  const realStreak = computeStreakFromLastBet(profile.lastBetDate);
  if (realStreak <= profile.streakCount) {
    // Pas de nouveau streak mais on sync quand même le leaderboard si pseudo existe
    if (profile.pseudo) {
      await syncLeaderboard(userId, {
        pseudo:      profile.pseudo,
        xp:          profile.xp ?? 0,
        streakCount: profile.streakCount,
        level:       profile.level ?? 1,
      });
    }
    return;
  }

  const days = realStreak - profile.streakCount;
  let xpGain = days * XP_PER_DAY;
  for (let d = profile.streakCount + 1; d <= realStreak; d++) {
    if (d % 7 === 0) xpGain += XP_WEEK_BONUS;
  }

  const newXP      = (profile.xp ?? 0) + xpGain;
  const newLevel   = computeLevel(newXP);
  const bestStreak = Math.max(profile.bestStreak ?? 0, realStreak);

  // Vérifier les nouveaux badges
  const earned: BadgeId[] = [...(profile.badges ?? [])];
  ALL_BADGES.filter(b => b.requiredStreak).forEach(b => {
    if (!earned.includes(b.id) && realStreak >= (b.requiredStreak ?? 0)) earned.push(b.id);
  });

  // Mettre à jour le profil privé
  await updateDoc(doc(db, 'users', userId), {
    streakCount: realStreak,
    bestStreak,
    xp:          newXP,
    level:       newLevel,
    badges:      earned,
  });

  // Mettre à jour le leaderboard public
  if (profile.pseudo) {
    await syncLeaderboard(userId, {
      pseudo:      profile.pseudo,
      xp:          newXP,
      streakCount: realStreak,
      level:       newLevel,
    });
  }
}

// Appelé quand l'utilisateur enregistre une rechute
export async function handleRelapse(userId: string, profile: UserProfile): Promise<void> {
  const updates: Record<string, unknown> = {
    streakCount:  0,
    lastBetDate:  new Date().toISOString(),
    bestStreak:   Math.max(profile.bestStreak ?? 0, profile.streakCount),
  };

  if (profile.streakCount > 0 && !(profile.badges ?? []).includes('comeback')) {
    updates['badges'] = arrayUnion('comeback');
  }

  await updateDoc(doc(db, 'users', userId), updates);

  // Mettre à jour le leaderboard — streak remis à 0
  if (profile.pseudo) {
    await syncLeaderboard(userId, {
      pseudo:      profile.pseudo,
      xp:          profile.xp ?? 0,
      streakCount: 0,
      level:       profile.level ?? 1,
    });
  }
}

// Donner un badge spécifique
export async function awardBadge(userId: string, badgeId: BadgeId): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { badges: arrayUnion(badgeId) });
}