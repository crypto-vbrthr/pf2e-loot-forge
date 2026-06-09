import { TreasureProfileManager } from "./treasure-profile-manager.js";

export class TreasureBudget {
  static async calculate(config = {}) {
    const profile = config.treasureBudgetProfile ?? await TreasureProfileManager.getActiveProfile();
    const budgets = this.#resolveBudgets(profile);
    const level = Math.max(-1, Math.min(25, Number(config.level ?? 1)));
    const partySize = Math.max(1, Number(config.partySize ?? 4));
    const treasureProfile = config.treasureProfile ?? "standard";

    const base = Number(budgets[String(level)] ?? budgets["1"] ?? 4);
    const treasureProfileMultiplier = Number({
      poor: 0.5,
      standard: 1,
      rich: 1.5,
      boss: 2,
      hoard: 4
    }[treasureProfile] ?? 1);

    const profileMultiplier = Number(profile.budgetMultiplier ?? 1);
    const partyMultiplier = partySize / 4;
    const targetGp = Math.max(1, Math.round(base * treasureProfileMultiplier * profileMultiplier * partyMultiplier));

    return {
      level,
      partySize,
      profile: treasureProfile,
      budgetProfileId: profile.id,
      budgetProfileName: profile.name,
      baseGp: base,
      profileMultiplier: treasureProfileMultiplier * profileMultiplier,
      partyMultiplier,
      targetGp
    };
  }

  static splitBudget(targetGp, themeProfile = {}, treasureBudgetProfile = null) {
    const weights = {
      ...(treasureBudgetProfile?.categoryWeights ?? {}),
      ...(themeProfile?.weights ?? {})
    };

    const totalWeight = Object.values(weights).reduce((sum, value) => sum + Number(value), 0) || 1;
    const split = {};

    for (const [category, weight] of Object.entries(weights)) {
      split[category] = Math.round((targetGp * Number(weight) / totalWeight) * 100) / 100;
    }

    return split;
  }

  static #resolveBudgets(profile) {
    if (profile.budgetsGp) return profile.budgetsGp;

    // Derived profiles may only define a multiplier; use PF2E standard as fallback.
    return {
      "-1": 1, "0": 2, "1": 4, "2": 7, "3": 12, "4": 20, "5": 30, "6": 45, "7": 65, "8": 90,
      "9": 125, "10": 175, "11": 250, "12": 350, "13": 500, "14": 700, "15": 1000,
      "16": 1400, "17": 2000, "18": 2800, "19": 4000, "20": 5600, "21": 8000,
      "22": 11200, "23": 16000, "24": 22400, "25": 32000
    };
  }
}
