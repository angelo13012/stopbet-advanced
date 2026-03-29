// ---- User ----
export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  pseudo: string;
  dob: string;
  bettingDuration: string;
  monthlyIncome: number;
  spendingLimit?: number;

  // Jours sans pari
  streakCount: number;
  bestStreak: number;
  lastBetDate?: string;

  // Gamification
  xp: number;
  level: number;
  badges: BadgeId[];

  // Subscription
  subscriptionType: 'free' | 'premium';
  subscriptionStatus: 'active' | 'canceled' | 'expired';
  trialUsed?: boolean;
  trialEndsAt?: string;
  isTrial?: boolean;

  // Parrainage
  referralCode?: string;
  referralCount?: number;
  referralApplied?: boolean;
  referredBy?: string;
  referralBonusEnds?: string;

  // Coach IA cache
  coachMessage?: string;
  coachMessageDate?: string;

  // Meta
  createdAt: string;
  role: 'user' | 'admin';
}

// ---- Leaderboard (public) ----
export interface LeaderboardEntry {
  id: string;
  pseudo: string;
  xp: number;
  streakCount: number;
  level: number;
  updatedAt: string;
}

// ---- Bet / Relapse ----
export interface Bet {
  id: string;
  amount: number;
  date: string;
  reason?: string;
  isPlanned: boolean;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
}

// ---- Goal ----
export interface Goal {
  id: string;
  title: string;
  cost: number;
  progress: number;
}

// ---- Gamification ----
export type BadgeId =
  | 'first_day'
  | 'week_clean'
  | 'month_clean'
  | 'three_months_clean'
  | 'year_clean'
  | 'comeback'
  | 'goal_setter';

export interface BadgeDef {
  id: BadgeId;
  name: string;
  description: string;
  emoji: string;
  requiredStreak?: number;
}

export const ALL_BADGES: BadgeDef[] = [
  { id: 'first_day',          name: 'Premier pas',    description: '1 jour sans pari',    emoji: '🌱', requiredStreak: 1   },
  { id: 'week_clean',         name: 'Semaine propre', description: '7 jours sans pari',   emoji: '🔥', requiredStreak: 7   },
  { id: 'month_clean',        name: 'Un mois entier', description: '30 jours sans pari',  emoji: '🏆', requiredStreak: 30  },
  { id: 'three_months_clean', name: 'Trois mois',     description: '90 jours sans pari',  emoji: '💎', requiredStreak: 90  },
  { id: 'year_clean',         name: 'Une année',      description: '365 jours sans pari', emoji: '👑', requiredStreak: 365 },
  { id: 'comeback',           name: 'Retour en force',description: 'Reprise après une rechute', emoji: '🦅' },
  { id: 'goal_setter',        name: 'Ambitieux',      description: 'Premier objectif créé',      emoji: '🎯' },
];

// ---- XP / Levels ----
export const XP_PER_DAY    = 10;
export const XP_WEEK_BONUS = 50;

export const LEVELS = [
  { level: 1,  name: 'Débutant',   minXP: 0    },
  { level: 2,  name: 'Déterminé',  minXP: 100  },
  { level: 3,  name: 'Combatif',   minXP: 250  },
  { level: 4,  name: 'Solide',     minXP: 500  },
  { level: 5,  name: 'Résilient',  minXP: 800  },
  { level: 6,  name: 'Courageux',  minXP: 1200 },
  { level: 7,  name: 'Champion',   minXP: 1700 },
  { level: 8,  name: 'Maître',     minXP: 2300 },
  { level: 9,  name: 'Légende',    minXP: 3000 },
  { level: 10, name: 'Invincible', minXP: 4000 },
];

export function computeLevel(xp: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return LEVELS[i].level;
  }
  return 1;
}

export function getLevelMeta(xp: number) {
  const lvlIdx = LEVELS.findIndex((_, i) => {
    const next = LEVELS[i + 1];
    return !next || xp < next.minXP;
  });
  const current    = LEVELS[Math.max(lvlIdx, 0)];
  const next       = LEVELS[lvlIdx + 1] ?? null;
  const progressXP = next ? xp - current.minXP : 0;
  const neededXP   = next ? next.minXP - current.minXP : 1;
  return {
    ...current,
    nextLevel:       next,
    progressPercent: Math.min(100, Math.round((progressXP / neededXP) * 100)),
    xpToNext:        next ? next.minXP - xp : 0,
  };
}

// ---- Firestore error ----
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  WRITE  = 'write',
  GET    = 'get',
  LIST   = 'list',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified: boolean;
    isAnonymous: boolean;
    tenantId: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}