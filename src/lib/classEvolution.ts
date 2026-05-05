// NAVI.EXE — MBTI Class Evolution System
// All 16 types, 5 tiers each, helper functions.

export interface MbtiClassEntry {
  mbti: string;
  className: string;
  desc: string;
  tiers: [string, string, string, string, string]; // T1–T5
}

export const MBTI_CLASS_MAP: Record<string, MbtiClassEntry> = {
  INTJ: {
    mbti: 'INTJ',
    className: 'The Architect',
    desc: 'Visionary strategist who sees the world as a system to be understood and optimized.',
    tiers: [
      'Strategist Initiate',
      'Shadow Architect',
      'Sovereign Architect',
      'Grand Architect',
      'Architect Eternal',
    ],
  },
  INTP: {
    mbti: 'INTP',
    className: 'The Logician',
    desc: 'Relentless seeker of truth who finds beauty in abstract systems and fundamental principles.',
    tiers: [
      'Logic Seeker',
      'System Theorist',
      'Infinite Logician',
      'Architect of Truth',
      'Logician Eternal',
    ],
  },
  ENTJ: {
    mbti: 'ENTJ',
    className: 'The Commander',
    desc: 'Natural-born leader who channels iron will into decisive action and relentless execution.',
    tiers: [
      'Field Commander',
      'War Strategist',
      'Supreme Commander',
      'Warlord Sovereign',
      'Commander Eternal',
    ],
  },
  ENTP: {
    mbti: 'ENTP',
    className: 'The Debater',
    desc: 'Quick-witted challenger who thrives at the edge of every idea, turning friction into fuel.',
    tiers: [
      'Spark Catalyst',
      'Chaos Engineer',
      'Paradigm Breaker',
      'Reality Architect',
      'Debater Eternal',
    ],
  },
  INFJ: {
    mbti: 'INFJ',
    className: 'The Advocate',
    desc: 'Rare idealist with prophetic clarity who acts with quiet, unwavering conviction.',
    tiers: [
      'Quiet Visionary',
      'Oracle Adept',
      'Sacred Advocate',
      'Sovereign Oracle',
      'Advocate Eternal',
    ],
  },
  INFP: {
    mbti: 'INFP',
    className: 'The Mediator',
    desc: 'Poetic soul who carries deep values and searches the world for meaning in all things.',
    tiers: [
      'Dream Walker',
      'Soul Weaver',
      'Eternal Mediator',
      'Keeper of Souls',
      'Mediator Eternal',
    ],
  },
  ENFJ: {
    mbti: 'ENFJ',
    className: 'The Protagonist',
    desc: 'Charismatic leader who brings out the best in others through empathy and infectious purpose.',
    tiers: [
      'Voice of Change',
      "People's Champion",
      'Luminous Protagonist',
      'Sovereign of Hearts',
      'Protagonist Eternal',
    ],
  },
  ENFP: {
    mbti: 'ENFP',
    className: 'The Campaigner',
    desc: 'Free spirit who sees possibility everywhere and moves through the world at full emotional velocity.',
    tiers: [
      'Spark Bearer',
      'Wildfire Spirit',
      'Boundless Campaigner',
      'Storm of Possibility',
      'Campaigner Eternal',
    ],
  },
  ISTJ: {
    mbti: 'ISTJ',
    className: 'The Logistician',
    desc: 'Dependable guardian of order who executes with precision and holds the line when others fold.',
    tiers: [
      'Order Keeper',
      'Iron Logistician',
      'Master of Systems',
      'Sovereign of Order',
      'Logistician Eternal',
    ],
  },
  ISFJ: {
    mbti: 'ISFJ',
    className: 'The Defender',
    desc: 'Devoted protector who serves without recognition and holds entire worlds together through quiet strength.',
    tiers: [
      'Silent Guardian',
      'Steadfast Defender',
      'Eternal Protector',
      'Sovereign Shield',
      'Defender Eternal',
    ],
  },
  ESTJ: {
    mbti: 'ESTJ',
    className: 'The Executive',
    desc: 'Relentless enforcer of standards who builds institutions that outlast every individual within them.',
    tiers: [
      'Order Enforcer',
      'Command Executive',
      'Sovereign Executive',
      'Iron Chancellor',
      'Executive Eternal',
    ],
  },
  ESFJ: {
    mbti: 'ESFJ',
    className: 'The Consul',
    desc: 'Social architect who binds communities together through loyalty, care, and the memory of every detail.',
    tiers: [
      'Community Keeper',
      'Harmony Consul',
      'Grand Consul',
      'Sovereign of Bonds',
      'Consul Eternal',
    ],
  },
  ISTP: {
    mbti: 'ISTP',
    className: 'The Virtuoso',
    desc: 'Master of mechanics who understands how everything works by taking it apart and putting it back better.',
    tiers: [
      'Silent Tinkerer',
      'Edge Virtuoso',
      'Master Craftsman',
      'Sovereign Artisan',
      'Virtuoso Eternal',
    ],
  },
  ISFP: {
    mbti: 'ISFP',
    className: 'The Adventurer',
    desc: 'Spontaneous artist who lives fully in the present, finding beauty in unexpected places.',
    tiers: [
      'Free Spirit',
      'Wild Adventurer',
      'Soul of the World',
      'Sovereign Wanderer',
      'Adventurer Eternal',
    ],
  },
  ESTP: {
    mbti: 'ESTP',
    className: 'The Entrepreneur',
    desc: 'Bold operator who reads every room, acts on instinct, and turns chaos into competitive advantage.',
    tiers: [
      'Street Operator',
      'Risk Architect',
      'Empire Builder',
      'Sovereign Disruptor',
      'Entrepreneur Eternal',
    ],
  },
  ESFP: {
    mbti: 'ESFP',
    className: 'The Entertainer',
    desc: 'Magnetic performer who commands every stage and makes the ordinary electric through sheer presence.',
    tiers: [
      'Stage Spark',
      'Living Legend',
      'Eternal Entertainer',
      'Sovereign of Joy',
      'Entertainer Eternal',
    ],
  },
};

// ─── Tier names ───────────────────────────────────────────────────────────────

export const TIER_NAMES: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'AWAKENING',
  2: 'ASCENDING',
  3: 'SOVEREIGN',
  4: 'TRANSCENDENT',
  5: 'LEGENDARY',
};

// ─── Tier colors ──────────────────────────────────────────────────────────────

export const TIER_COLORS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '#00E5FF', // cyan
  2: '#7B2FFF', // purple
  3: '#FFBF00', // amber
  4: '#FF6B00', // orange
  5: '#FF2D9B', // pink / legendary
};

// ─── Helper functions ─────────────────────────────────────────────────────────

/** Returns which tier (1–5) a given level falls into. */
export function tierFromLevel(level: number): 1 | 2 | 3 | 4 | 5 {
  if (level <= 10) return 1;
  if (level <= 25) return 2;
  if (level <= 50) return 3;
  if (level <= 75) return 4;
  return 5;
}

/** Returns the human-readable tier name for a given level. */
export function tierNameFromLevel(level: number): string {
  return TIER_NAMES[tierFromLevel(level)];
}

/** Returns the minimum level required to enter a given tier. */
export function tierThreshold(tier: 1 | 2 | 3 | 4 | 5): number {
  const thresholds: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 1,
    2: 11,
    3: 26,
    4: 51,
    5: 76,
  };
  return thresholds[tier];
}

/** Returns the level required to enter the NEXT tier. Returns 100 if already in tier 5. */
export function nextTierThreshold(level: number): number {
  const currentTier = tierFromLevel(level);
  if (currentTier === 5) return 100;
  return tierThreshold((currentTier + 1) as 1 | 2 | 3 | 4 | 5);
}

/** Returns the evolution title for a given MBTI type and level. Falls back to "Operator". */
export function evolutionTitleFromMbtiAndLevel(mbti: string, level: number): string {
  const entry = MBTI_CLASS_MAP[mbti.toUpperCase()];
  if (!entry) return 'Operator';
  const tierIndex = tierFromLevel(level) - 1; // 0-based index into tiers array
  return entry.tiers[tierIndex];
}

/** Returns the class name (e.g. "The Architect") for a given MBTI type. Falls back to "Operator". */
export function classNameFromMbti(mbti: string): string {
  return MBTI_CLASS_MAP[mbti.toUpperCase()]?.className ?? 'Operator';
}
