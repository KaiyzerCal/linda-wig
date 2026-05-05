// NAVI.EXE — XP and Level System
// All math is defined here. Components import only from this file.

export {
  tierFromLevel,
  tierNameFromLevel,
  tierThreshold,
  nextTierThreshold,
  evolutionTitleFromMbtiAndLevel,
  classNameFromMbti,
  MBTI_CLASS_MAP,
  TIER_COLORS,
  TIER_NAMES,
} from './classEvolution';

// ─── XP formulas ─────────────────────────────────────────────────────────────

/**
 * XP required to advance FROM the given level TO the next level.
 * Formula: 50 * level * (level + 1) / 2
 * Level is clamped to [1, 100].
 */
export function xpRequiredForLevel(level: number): number {
  const l = Math.max(1, Math.min(100, level));
  return (50 * l * (l + 1)) / 2;
}

/**
 * Total cumulative XP needed to REACH the given level from zero.
 * Formula: 25 * (level - 1) * level * (level + 1) / 3
 * Returns 0 for level 1 (no XP needed to start at level 1).
 * Level is clamped to [1, 100].
 */
export function totalXpForLevel(level: number): number {
  const l = Math.max(1, Math.min(100, level));
  if (l === 1) return 0;
  return (25 * (l - 1) * l * (l + 1)) / 3;
}

/**
 * Returns the operator's level given their total accumulated XP.
 * Uses binary search against totalXpForLevel.
 * Clamped to [1, 100].
 */
export function levelFromTotalXp(totalXp: number): number {
  if (totalXp <= 0) return 1;
  let lo = 1;
  let hi = 100;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (totalXpForLevel(mid) <= totalXp) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return Math.max(1, Math.min(100, lo));
}

/**
 * XP still needed to reach the next level from the current total XP amount.
 */
export function xpToNextLevel(currentTotalXp: number): number {
  const level = levelFromTotalXp(currentTotalXp);
  if (level >= 100) return 0;
  const nextLevelTotal = totalXpForLevel(level + 1);
  return Math.max(0, nextLevelTotal - currentTotalXp);
}

/**
 * Percentage progress (0–100) through the current level toward the next.
 */
export function progressPercent(currentTotalXp: number): number {
  const level = levelFromTotalXp(currentTotalXp);
  if (level >= 100) return 100;
  const currentLevelTotal = totalXpForLevel(level);
  const nextLevelTotal = totalXpForLevel(level + 1);
  const earned = currentTotalXp - currentLevelTotal;
  const required = nextLevelTotal - currentLevelTotal;
  if (required <= 0) return 100;
  return Math.min(100, Math.max(0, (earned / required) * 100));
}

/**
 * Percentage progress (0–100) through the CURRENT TIER toward the next tier threshold.
 * Returns 100 if in tier 5 (max tier).
 */
export function tierProgressPercent(currentTotalXp: number): number {
  const { tierFromLevel, tierThreshold, nextTierThreshold } = require('./classEvolution');
  const level = levelFromTotalXp(currentTotalXp);
  const currentTier = tierFromLevel(level) as 1 | 2 | 3 | 4 | 5;
  if (currentTier === 5) return 100;

  const tierStart = tierThreshold(currentTier) as number;
  const tierEnd = nextTierThreshold(level) as number;

  const xpAtTierStart = totalXpForLevel(tierStart);
  const xpAtTierEnd = totalXpForLevel(tierEnd);

  if (xpAtTierEnd <= xpAtTierStart) return 100;
  const earned = currentTotalXp - xpAtTierStart;
  const total = xpAtTierEnd - xpAtTierStart;
  return Math.min(100, Math.max(0, (earned / total) * 100));
}
