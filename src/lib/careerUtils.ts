import {
  CareerLevel,
  CareerLevelConfig,
  SellerCareerProfile,
  careerConfig,
  careerLevelOrder,
} from "./mockData";

export function getNextLevel(level: CareerLevel): CareerLevel | null {
  const index = careerLevelOrder.indexOf(level);
  if (index === -1 || index === careerLevelOrder.length - 1) return null;
  return careerLevelOrder[index + 1];
}

export function getConfig(level: CareerLevel): CareerLevelConfig {
  return careerConfig[level];
}

/** How many full stars the seller has completed in the current cycle */
export function getStarsCount(profile: SellerCareerProfile): number {
  const config = getConfig(profile.currentLevel);
  return Math.floor(profile.salesCountCurrentCycle / config.salesPerStar);
}

/** How many sales are needed to complete the next star */
export function getSalesToNextStar(profile: SellerCareerProfile): number {
  const config = getConfig(profile.currentLevel);
  const completedInCurrentStar = profile.salesCountCurrentCycle % config.salesPerStar;
  return config.salesPerStar - completedInCurrentStar;
}

/** How many stars are still needed to level up (null when rule is "special") */
export function getStarsToLevelUp(profile: SellerCareerProfile): number | null {
  const config = getConfig(profile.currentLevel);
  if (config.starsToLevelUp === "special") return null;
  const stars = getStarsCount(profile);
  return Math.max(0, config.starsToLevelUp - stars);
}

/** 0–100 progress within current level, capped at 100 */
export function getLevelProgressPct(profile: SellerCareerProfile): number {
  const config = getConfig(profile.currentLevel);
  if (config.starsToLevelUp === "special") {
    const subordinateStars = profile.subordinateCycleStars ?? 0;
    return Math.min(100, (subordinateStars / 4) * 100);
  }
  const totalSalesForLevel = config.starsToLevelUp * config.salesPerStar;
  return Math.min(100, (profile.salesCountCurrentCycle / totalSalesForLevel) * 100);
}

export function isBelowMinimum(profile: SellerCareerProfile): boolean {
  const config = getConfig(profile.currentLevel);
  return profile.salesCountCurrentMonth < config.minMonthlySales;
}

export function getLevelBadgeColor(level: CareerLevel): string {
  if (level.startsWith("TRAINEE")) return "bg-blue-500/15 text-blue-600 border-blue-500/30";
  if (level === "LANCAMENTO_GERENTE") return "bg-purple-500/15 text-purple-600 border-purple-500/30";
  if (level === "DIRETOR") return "bg-yellow-500/15 text-yellow-600 border-yellow-500/30";
  return "bg-green-500/15 text-green-600 border-green-500/30";
}
