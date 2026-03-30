import { doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
  UserProfile, BadgeId, ALL_BADGES,
  XP_PER_DAY, XP_WEEK_BONUS, computeLevel,
} from '../types';

export function computeStreakFromLastBet(lastBetDate?: string, createdAt?: string): number {
  // Si pas de rechute, on compte depuis la création du compte
  const startDate = lastBetDate ?? createdAt;
  if (!startDate) return 0;
  const last  = new Date(startDate); last.setHours(0, 0, 0, 0);
  const today = new Date();          today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - last.getTime()) / 86_400_000));
}

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

export async function syncStreakAndXP(userId: string, profile: UserProfile): Promise<void> {
  // On passe createdAt comme fallback si pas de lastBetDate
  const realStreak = computeStreakFromLastBet(profile.lastBetDate, profile.createdAt);

  if (realStreak <= profile.streakCount) {
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

  const earned: BadgeId[] = [...(profile.badges ?? [])];
  ALL_BADGES.filter(b => b.requiredStreak).forEach(b => {
    if (!earned.includes(b.id) && realStreak >= (b.requiredStreak ?? 0)) earned.push(b.id);
  });

  await updateDoc(doc(db, 'users', userId), {
    streakCount: realStreak,
    bestStreak,
    xp:          newXP,
    level:       newLevel,
    badges:      earned,
  });

  if (profile.pseudo) {
    await syncLeaderboard(userId, {
      pseudo:      profile.pseudo,
      xp:          newXP,
      streakCount: realStreak,
      level:       newLevel,
    });
  }
}

export async function handleRelapse(userId: string, profile: UserProfile): Promise<void> {
  const updates: Record<string, unknown> = {
    streakCount: 0,
    lastBetDate: new Date().toISOString(),
    bestStreak:  Math.max(profile.bestStreak ?? 0, profile.streakCount),
  };

  if (profile.streakCount > 0 && !(profile.badges ?? []).includes('comeback')) {
    updates['badges'] = arrayUnion('comeback');
  }

  await updateDoc(doc(db, 'users', userId), updates);

  if (profile.pseudo) {
    await syncLeaderboard(userId, {
      pseudo:      profile.pseudo,
      xp:          profile.xp ?? 0,
      streakCount: 0,
      level:       profile.level ?? 1,
    });
  }
}

export async function awardBadge(userId: string, badgeId: BadgeId): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { badges: arrayUnion(badgeId) });
}