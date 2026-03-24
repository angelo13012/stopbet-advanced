import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
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

/** Called on app load to auto-increase streak + XP */
export async function syncStreakAndXP(userId: string, profile: UserProfile): Promise<void> {
  const realStreak = computeStreakFromLastBet(profile.lastBetDate);
  if (realStreak <= profile.streakCount) return; // nothing new

  const days = realStreak - profile.streakCount;
  let xpGain = days * XP_PER_DAY;
  // bonus for each completed week in the range
  for (let d = profile.streakCount + 1; d <= realStreak; d++) {
    if (d % 7 === 0) xpGain += XP_WEEK_BONUS;
  }

  const newXP      = (profile.xp ?? 0) + xpGain;
  const newLevel   = computeLevel(newXP);
  const bestStreak = Math.max(profile.bestStreak ?? 0, realStreak);

  // check newly earned badges
  const earned: BadgeId[] = [...(profile.badges ?? [])];
  ALL_BADGES.filter(b => b.requiredStreak).forEach(b => {
    if (!earned.includes(b.id) && realStreak >= (b.requiredStreak ?? 0)) earned.push(b.id);
  });

  await updateDoc(doc(db, 'users', userId), {
    streakCount: realStreak,
    bestStreak,
    xp: newXP,
    level: newLevel,
    badges: earned,
  });
}

/** Called when user logs a relapse */
export async function handleRelapse(userId: string, profile: UserProfile): Promise<void> {
  const updates: Record<string, unknown> = {
    streakCount:  0,
    lastBetDate:  new Date().toISOString(),
    bestStreak:   Math.max(profile.bestStreak ?? 0, profile.streakCount),
  };
  // award comeback badge if they had a streak
  if (profile.streakCount > 0 && !(profile.badges ?? []).includes('comeback')) {
    updates['badges'] = arrayUnion('comeback');
  }
  await updateDoc(doc(db, 'users', userId), updates);
}

/** Award a single badge */
export async function awardBadge(userId: string, badgeId: BadgeId): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { badges: arrayUnion(badgeId) });
}
