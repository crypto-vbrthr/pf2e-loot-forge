import { LOOT_CATEGORIES, MODULE_ID } from "./constants.js";

export const ITEM_FORGE_MODULE_ID = "pf2e-item-forge";

const RARITIES = ["common", "uncommon", "rare", "unique"];

const TREASURE_THEME_MAP = {
  generic: { style: "any", motif: "any", magic: "automatic" },
  goblin: { style: "core.style.rustic", motif: "core.motif.geometric", magic: "automatic" },
  bandit: { style: "core.style.rustic", motif: "core.motif.hunting", magic: "automatic" },
  undead: { style: "core.style.funerary", motif: "core.motif.funerary", magic: "void" },
  cultist: { style: "core.style.ancient", motif: "core.motif.religious", magic: "occult" },
  temple: { style: "core.style.temple", motif: "core.motif.religious", magic: "divine" },
  wizard: { style: "core.style.scholarly", motif: "core.motif.scholarly", magic: "arcane" },
  noble: { style: "core.style.noble", motif: "core.motif.heraldry", magic: "automatic" },
  military: { style: "core.style.ancient", motif: "core.motif.military", magic: "automatic" },
  "dwarf-ruin": { style: "core.style.dwarven", motif: "core.motif.ancestral", magic: "automatic" },
  "elf-ruin": { style: "core.style.elven", motif: "core.motif.nature", magic: "primal" },
  "dragon-hoard": { style: "core.style.opulent", motif: "core.motif.draconic", magic: "automatic" },
  pirate: { style: "core.style.nautical", motif: "core.motif.maritime", magic: "automatic" },
  alchemist: { style: "core.style.scholarly", motif: "core.motif.scholarly", magic: "automatic" }
};

/**
 * Optional bridge to PF2E Item Forge.
 *
 * Loot Forge owns the overall loot composition, budgets, coins, and campaign
 * context. When delegation is enabled, Item Forge owns construction of every
 * individual item, including atmospheric treasure objects. There is no static
 * import from Item Forge, keeping the dependency strictly optional.
 */
export class ItemForgeIntegration {
  static getApi() {
    const module = globalThis.game?.modules?.get?.(ITEM_FORGE_MODULE_ID) ?? null;
    return globalThis.game?.pf2eItemForge ?? module?.api ?? null;
  }

  static getStatus() {
    const module = globalThis.game?.modules?.get?.(ITEM_FORGE_MODULE_ID) ?? null;
    const api = this.getApi();
    const active = Boolean(module?.active ?? api);
    const available = active && typeof api?.generate === "function";
    let treasureAvailable = Boolean(
      available
      && api?.treasure?.types
      && api?.treasure?.styles
      && api?.treasure?.motifs
    );

    if (available && typeof api?.getCapabilities === "function") {
      try {
        const capabilities = api.getCapabilities();
        treasureAvailable = treasureAvailable || ((capabilities?.generationModes ?? []).includes("treasure")
          && (capabilities?.categories ?? []).includes("treasure"));
      } catch (_error) {
        // Direct public treasure registries above remain a valid capability signal.
      }
    }

    return {
      installed: Boolean(module),
      active,
      available,
      treasureAvailable,
      apiVersion: api?.apiVersion ?? null
    };
  }

  /**
   * Delegate rule-relevant PF2e items to Item Forge.
   */
  static async generateItems(config, { itemBudget, maxItems, tolerance } = {}) {
    const api = this.getApi();
    if (typeof api?.generate !== "function") {
      return {
        available: false,
        pf2eItems: [],
        selectedRefs: [],
        attempts: 0,
        warnings: [{ code: "ITEM_FORGE_UNAVAILABLE" }]
      };
    }

    const includePacks = [...new Set((config.compendiums ?? []).filter(Boolean))];
    if (!includePacks.length) {
      return {
        available: true,
        pf2eItems: [],
        selectedRefs: [],
        attempts: 0,
        warnings: [{ code: "NO_SOURCE_PACKS" }]
      };
    }

    const budget = Math.max(1, Number(itemBudget ?? 1));
    const itemLimit = Math.max(0, Number(maxItems ?? 0));
    const budgetTolerance = Math.max(1, Number(tolerance ?? 1.2));
    const hardCap = budget * budgetTolerance;
    const plans = this.#buildPlans(config);

    if (!itemLimit || !plans.length) {
      return { available: true, pf2eItems: [], selectedRefs: [], attempts: 0, warnings: [] };
    }

    const pf2eItems = [];
    const selectedRefs = [];
    const warnings = [];
    const fingerprints = new Set();
    let remaining = budget;
    let attempts = 0;
    const maxAttempts = Math.min(36, Math.max(12, itemLimit * 8));

    while (pf2eItems.length < itemLimit && attempts < maxAttempts) {
      const plan = this.#weightedPlan(plans);
      attempts += 1;
      if (!plan) break;

      const request = this.#buildRequest(plan, config, includePacks, attempts);
      let result;
      try {
        result = await api.generate(request);
      } catch (error) {
        warnings.push({
          code: error?.code ?? "ITEM_FORGE_GENERATION_FAILED",
          category: plan.category,
          mode: plan.mode
        });
        continue;
      }

      const item = result?.itemSource;
      if (!item) continue;

      const value = this.#priceToGp(item.system?.price?.value);
      const cursed = this.#isCursed(item);
      if (value <= 0 && !(config.allowCursedZeroValueItems && cursed)) continue;

      const allowed = pf2eItems.length === 0
        ? value <= hardCap
        : value <= Math.max(1, remaining * budgetTolerance);
      if (!allowed) continue;

      const level = Number(item.system?.level?.value ?? result?.metadata?.level ?? 0);
      const fingerprint = `${item.name}|${item.type}|${level}|${value}`;
      if (fingerprints.has(fingerprint)) continue;
      fingerprints.add(fingerprint);

      const cleanItem = this.#clone(item);
      if (cleanItem && Object.hasOwn(cleanItem, "_id")) cleanItem._id = null;
      pf2eItems.push(cleanItem);
      selectedRefs.push(this.#toReference(cleanItem, result, value));
      remaining -= value;

      if (remaining <= budget * 0.15) break;
    }

    return { available: true, pf2eItems, selectedRefs, attempts, warnings };
  }

  /**
   * Delegate atmospheric/generated treasure construction to Item Forge.
   * Loot Forge still decides how much value and how many treasure objects it
   * wants. Item Forge decides what each individual treasure object actually is.
   */
  static async generateTreasures(config, { treasureBudget, maxTreasures, tolerance } = {}) {
    const api = this.getApi();
    if (typeof api?.generate !== "function") {
      return {
        available: false,
        generatedItems: [],
        attempts: 0,
        warnings: [{ code: "ITEM_FORGE_UNAVAILABLE" }]
      };
    }

    if (!this.getStatus().treasureAvailable) {
      return {
        available: true,
        generatedItems: [],
        attempts: 0,
        warnings: [{ code: "ITEM_FORGE_TREASURE_UNAVAILABLE" }]
      };
    }

    const budget = Math.max(0, Number(treasureBudget ?? 0));
    const treasureLimit = Math.max(0, Number(maxTreasures ?? 0));
    const budgetTolerance = Math.max(1, Number(tolerance ?? 1.2));
    const plans = this.#buildTreasurePlans(config);

    if (budget <= 0 || !treasureLimit || !plans.length) {
      return { available: true, generatedItems: [], attempts: 0, warnings: [] };
    }

    const generatedItems = [];
    const warnings = [];
    const fingerprints = new Set();
    let remaining = budget;
    let attempts = 0;
    const maxAttempts = Math.min(48, Math.max(16, treasureLimit * 8));

    while (generatedItems.length < treasureLimit && attempts < maxAttempts && remaining > 0.09) {
      const plan = this.#weightedPlan(plans);
      attempts += 1;
      if (!plan) break;

      const slotsLeft = Math.max(1, treasureLimit - generatedItems.length);
      const targetValue = Math.max(0.1, remaining / slotsLeft);
      const request = this.#buildTreasureRequest(plan, config, targetValue, attempts);

      let result;
      try {
        result = await api.generate(request);
      } catch (error) {
        warnings.push({
          code: error?.code ?? "ITEM_FORGE_TREASURE_GENERATION_FAILED",
          category: plan.category,
          mode: "treasure"
        });
        continue;
      }

      const item = result?.itemSource;
      if (!item || item.type !== "treasure") continue;

      const value = Number(result?.metadata?.value ?? this.#priceToGp(item.system?.price?.value));
      if (!Number.isFinite(value) || value <= 0) continue;

      const hardCap = generatedItems.length === 0
        ? budget * budgetTolerance
        : Math.max(0.1, remaining * budgetTolerance);
      if (value > hardCap) continue;

      const fingerprint = `${item.name}|${plan.category}|${Math.round(value * 100)}`;
      if (fingerprints.has(fingerprint)) continue;
      fingerprints.add(fingerprint);

      const cleanItem = this.#clone(item);
      if (Object.hasOwn(cleanItem, "_id")) cleanItem._id = null;
      this.#normalizeTreasureForLootForge(cleanItem, value, request, result, config);
      generatedItems.push(cleanItem);
      remaining -= value;

      if (remaining <= Math.max(0.1, budget * 0.08)) break;
    }

    return { available: true, generatedItems, attempts, warnings };
  }

  /**
   * Re-roll a single delegated treasure while keeping its target value and
   * original Item Forge treasure category.
   */
  static async regenerateTreasure(config, item, { targetValue } = {}) {
    const api = this.getApi();
    if (typeof api?.generate !== "function" || !this.getStatus().treasureAvailable) return null;

    const bridge = item?.flags?.[MODULE_ID]?.itemForge ?? {};
    const category = bridge.category ?? "treasure";
    const plan = { category, weight: 1, group: bridge.group ?? LOOT_CATEGORIES.VALUABLES };
    const value = Math.max(0.1, Number(targetValue ?? this.#priceToGp(item?.system?.price?.value) ?? 1));
    const request = this.#buildTreasureRequest(plan, config, value, Date.now());
    const result = await api.generate(request);
    if (!result?.itemSource || result.itemSource.type !== "treasure") return null;

    const actualValue = Number(result?.metadata?.value ?? this.#priceToGp(result.itemSource.system?.price?.value));
    if (!Number.isFinite(actualValue) || actualValue <= 0) return null;

    const cleanItem = this.#clone(result.itemSource);
    if (Object.hasOwn(cleanItem, "_id")) cleanItem._id = null;
    this.#normalizeTreasureForLootForge(cleanItem, actualValue, request, result, config);
    return cleanItem;
  }

  static #buildPlans(config) {
    const groups = [];
    const split = config.budgetSplit ?? {};

    if (config.includeCombatGear) {
      groups.push({ id: LOOT_CATEGORIES.WEAPONS, weight: Number(split.weapons ?? 1) || 1 });
      groups.push({ id: LOOT_CATEGORIES.ARMOR, weight: Number(split.armor ?? 1) || 1 });
    }
    if (config.includeConsumables) {
      groups.push({ id: LOOT_CATEGORIES.CONSUMABLES, weight: Number(split.consumables ?? 0) + Number(split.alchemy ?? 0) || 1 });
    }
    if (config.includePermanentItems) {
      groups.push({ id: LOOT_CATEGORIES.PERMANENT, weight: Number(split.permanent ?? 0) + Number(split.magic ?? 0) || 1 });
    }

    const preferred = new Set(config.preferredCategories ?? []);
    const activeGroups = preferred.size
      ? groups.filter(group => preferred.has(group.id))
      : groups;
    const plans = [];

    const add = (group, weight, request) => plans.push({ group, weight: Math.max(0.01, weight), ...request });

    for (const group of activeGroups) {
      if (group.id === LOOT_CATEGORIES.WEAPONS) {
        add(group.id, group.weight * 1.4, { mode: "equipment", category: "weapon.melee" });
        add(group.id, group.weight * 1.2, { mode: "equipment", category: "weapon.ranged" });
        add(group.id, group.weight, { mode: "existing", category: "weapon.melee" });
        add(group.id, group.weight * 0.8, { mode: "existing", category: "weapon.ranged" });
        add(group.id, group.weight * 0.55, { mode: "magic", category: "magic.weapon", magic: { specificMode: "generated" } });
      } else if (group.id === LOOT_CATEGORIES.ARMOR) {
        add(group.id, group.weight, { mode: "equipment", category: "armor.light" });
        add(group.id, group.weight, { mode: "equipment", category: "armor.medium" });
        add(group.id, group.weight * 0.8, { mode: "equipment", category: "armor.heavy" });
        add(group.id, group.weight * 0.8, { mode: "equipment", category: "shield" });
        add(group.id, group.weight * 0.8, { mode: "existing", category: "armor" });
        add(group.id, group.weight * 0.55, { mode: "magic", category: "magic.armor", magic: { specificMode: "generated" } });
        add(group.id, group.weight * 0.45, { mode: "magic", category: "magic.shield", magic: { specificMode: "generated" } });
      } else if (group.id === LOOT_CATEGORIES.CONSUMABLES) {
        add(group.id, group.weight * 1.2, { mode: "existing", category: "consumable.potion" });
        add(group.id, group.weight * 1.2, { mode: "existing", category: "consumable.scroll" });
        add(group.id, group.weight, { mode: "existing", category: "consumable.ammunition" });
        add(group.id, group.weight * 0.8, { mode: "existing", category: "consumable" });
      } else if (group.id === LOOT_CATEGORIES.PERMANENT) {
        add(group.id, group.weight * 1.1, { mode: "existing", category: "equipment" });
        add(group.id, group.weight * 0.55, { mode: "existing", category: "weapon.melee" });
        add(group.id, group.weight * 0.45, { mode: "existing", category: "weapon.ranged" });
        add(group.id, group.weight * 0.5, { mode: "existing", category: "armor" });
        add(group.id, group.weight * 0.4, { mode: "existing", category: "shield" });
        add(group.id, group.weight * 0.45, { mode: "magic", category: "magic.weapon", magic: { specificMode: "generated" } });
        add(group.id, group.weight * 0.4, { mode: "magic", category: "magic.armor", magic: { specificMode: "generated" } });
        add(group.id, group.weight, { mode: "magic", category: "magic.wand" });
        add(group.id, group.weight * 0.8, { mode: "magic", category: "magic.staff", magic: { staffMode: "generated" } });
        add(group.id, group.weight * 0.75, { mode: "magic", category: "magic.spellheart", magic: { spellheartMode: "generated" } });
        add(group.id, group.weight * 0.9, { mode: "magic", category: "magic.worn", magic: { wornMode: "generated" } });
        add(group.id, group.weight * 0.85, { mode: "magic", category: "magic.held", magic: { heldMode: "generated" } });
        add(group.id, group.weight * 0.65, { mode: "magic", category: "magic.grimoire", magic: { grimoireMode: "generated" } });
        if (Number(config.itemLevelMax ?? 0) >= 17) {
          add(group.id, group.weight * 0.55, { mode: "magic", category: "magic.apex", magic: { apexMode: "generated" } });
        }
      }
    }

    return plans;
  }

  static #buildTreasurePlans(config) {
    const split = config.budgetSplit ?? {};
    const plans = [];
    const add = (group, category, weight) => {
      const numericWeight = Number(weight ?? 0);
      if (numericWeight > 0) plans.push({ group, category, weight: numericWeight });
    };

    if (config.includeValuables) {
      const art = Number(split.art ?? 0);
      const valuables = Number(split.valuables ?? 0);
      const religious = Number(split.religious ?? 0);
      const beverages = Number(split.beverages ?? 0);

      add(LOOT_CATEGORIES.ART, "treasure.art", art || 1);
      add(LOOT_CATEGORIES.VALUABLES, "treasure.jewelry", valuables * 1.1);
      add(LOOT_CATEGORIES.VALUABLES, "treasure.luxury", valuables);
      add(LOOT_CATEGORIES.VALUABLES, "treasure.gemstone", valuables * 0.75);
      add(LOOT_CATEGORIES.VALUABLES, "treasure.tableware", valuables * 0.65);
      add(LOOT_CATEGORIES.RELIGIOUS, "treasure.ceremonial", religious * 1.2);
      add(LOOT_CATEGORIES.RELIGIOUS, "treasure.art", religious * 0.55);
      add(LOOT_CATEGORIES.VALUABLES, "treasure.beverage", beverages);
    }

    if (config.includeCuriosities) {
      const curiosities = Number(split.curiosities ?? 0);
      const documents = Number(split.documents ?? 0);
      add(LOOT_CATEGORIES.CURIOSITIES, "treasure.luxury", curiosities);
      add(LOOT_CATEGORIES.CURIOSITIES, "treasure.tableware", curiosities * 0.75);
      add(LOOT_CATEGORIES.CURIOSITIES, "treasure", curiosities * 0.65);
      add(LOOT_CATEGORIES.DOCUMENTS, "treasure.book", documents * 1.4);
    }

    // Some themes intentionally carry category weights not represented in old
    // atmospheric buckets. Preserve that identity when Item Forge can model it.
    const themeWeights = config.themeProfile?.weights ?? {};
    if (config.includeValuables && Number(themeWeights.beverages ?? 0) > 0) {
      add(LOOT_CATEGORIES.VALUABLES, "treasure.beverage", Number(themeWeights.beverages));
    }

    return plans;
  }

  static #buildRequest(plan, config, includePacks, attempt) {
    const theme = this.#themeContext(config);
    const request = {
      mode: plan.mode,
      category: plan.category,
      level: {
        min: Number(config.itemLevelMin ?? 0),
        max: Number(config.itemLevelMax ?? 0),
        target: Number(config.level ?? config.itemLevelMax ?? 1)
      },
      levelPolicy: "strict",
      rarity: this.#allowedRarities(config.rarity),
      source: {
        mode: "selected",
        includePacks,
        excludePacks: []
      },
      seed: `loot-forge-${Date.now()}-${attempt}-${Math.random()}`,
      metadata: this.#metadata(config, plan, theme)
    };

    if (plan.mode === "equipment") {
      request.equipment = {
        fundamentalRunes: "automatic",
        propertyRunes: { mode: "automatic" }
      };
    }

    if (plan.mode === "magic") {
      request.magic = {
        theme: theme.magic,
        allowHeightened: true,
        ...(plan.magic ?? {})
      };
    }

    return request;
  }

  static #buildTreasureRequest(plan, config, targetValue, attempt) {
    const theme = this.#themeContext(config);
    const supportsExplicitMotif = plan.category === "treasure.art"
      || plan.category.startsWith("treasure.art.")
      || ["treasure.jewelry", "treasure.tableware", "treasure.ceremonial", "treasure.luxury"].includes(plan.category);

    return {
      mode: "treasure",
      category: plan.category,
      level: { min: 0, max: 0, target: 0 },
      levelPolicy: "strict",
      rarity: ["common"],
      source: { mode: "all", includePacks: [], excludePacks: [] },
      value: {
        mode: "target",
        target: Math.max(0.1, Number(targetValue ?? 1)),
        tolerance: 0.22
      },
      treasure: {
        type: "any",
        material: "any",
        condition: "any",
        craftsmanship: "any",
        motif: supportsExplicitMotif ? theme.motif : "any",
        style: theme.style
      },
      solver: { maxAttempts: 96 },
      seed: `loot-forge-treasure-${Date.now()}-${attempt}-${Math.random()}`,
      metadata: this.#metadata(config, plan, theme)
    };
  }

  static #metadata(config, plan, theme) {
    return {
      caller: "pf2e-loot-forge",
      theme: theme.id,
      themeTags: [...(config.themeProfile?.tags ?? [])],
      itemForgeTreasureStyle: theme.style,
      itemForgeTreasureMotif: theme.motif,
      environment: config.environment ?? "generic",
      lootForgeCategory: plan?.group ?? null
    };
  }

  static #themeContext(config) {
    const id = config.themeProfile?.id ?? config.theme ?? "generic";
    const mapped = TREASURE_THEME_MAP[id] ?? TREASURE_THEME_MAP.generic;
    const api = this.getApi();
    const styleSupported = mapped.style === "any" || api?.treasure?.styles?.has?.(mapped.style) !== false;
    const motifSupported = mapped.motif === "any" || api?.treasure?.motifs?.has?.(mapped.motif) !== false;
    const magicThemeIds = Array.isArray(api?.magicThemes)
      ? new Set(api.magicThemes.map(entry => typeof entry === "string" ? entry : entry?.id).filter(Boolean))
      : null;
    const magicSupported = mapped.magic === "automatic" || !magicThemeIds || magicThemeIds.has(mapped.magic);

    return {
      id,
      style: styleSupported ? mapped.style : "any",
      motif: motifSupported ? mapped.motif : "any",
      magic: magicSupported ? mapped.magic : "automatic"
    };
  }

  static #allowedRarities(maxRarity = "common") {
    const index = RARITIES.indexOf(maxRarity);
    return index < 0 ? ["common"] : RARITIES.slice(0, index + 1);
  }

  static #weightedPlan(plans) {
    if (!plans.length) return null;
    const total = plans.reduce((sum, plan) => sum + Number(plan.weight ?? 1), 0);
    let roll = Math.random() * total;
    for (const plan of plans) {
      roll -= Number(plan.weight ?? 1);
      if (roll <= 0) return plan;
    }
    return plans.at(-1) ?? null;
  }

  static #normalizeTreasureForLootForge(item, priceGp, request, result, config) {
    item.system ??= {};
    item.system.price ??= {};
    // Loot Forge's preview editor is GP-based. Preserve exact total value while
    // normalizing Item Forge's multi-denomination coin object to one GP number.
    item.system.price.value = { gp: Math.round(Number(priceGp) * 100) / 100 };
    item.system.price.per ??= 1;
    item.flags ??= {};
    item.flags[MODULE_ID] = {
      ...(item.flags[MODULE_ID] ?? {}),
      provider: "item-forge",
      sourceType: "item-forge-treasure",
      itemForge: {
        category: request.category,
        group: request.metadata?.lootForgeCategory ?? LOOT_CATEGORIES.VALUABLES,
        theme: request.metadata?.theme ?? config.theme ?? "generic",
        style: request.treasure?.style ?? "any",
        motif: request.treasure?.motif ?? "any",
        generator: result?.metadata?.generator ?? null
      }
    };
  }

  static #toReference(item, result, priceGp) {
    const category = this.#lootCategoryForItem(item, result);
    return {
      uuid: result?.metadata?.sourceUuid ?? null,
      name: item.name,
      img: item.img,
      type: item.type,
      typeLabelKey: this.#typeLabelKey(item.type),
      category,
      categoryLabelKey: this.#categoryLabelKey(category),
      priceGp,
      level: Number(item.system?.level?.value ?? result?.metadata?.level ?? 0),
      rarity: item.system?.traits?.rarity ?? result?.metadata?.rarity ?? "common",
      pack: result?.metadata?.sourcePack ?? null,
      provider: "item-forge",
      itemForgeGenerator: result?.metadata?.generator ?? null,
      generated: Boolean(item.flags?.[ITEM_FORGE_MODULE_ID]?.generated)
    };
  }

  static #lootCategoryForItem(item, result) {
    const category = String(result?.request?.category ?? result?.metadata?.category ?? "");
    if (item.type === "weapon" || category.includes("weapon")) return LOOT_CATEGORIES.WEAPONS;
    if (["armor", "shield"].includes(item.type) || category.includes("armor") || category.includes("shield")) return LOOT_CATEGORIES.ARMOR;
    if (item.type === "consumable" || category.startsWith("consumable")) return LOOT_CATEGORIES.CONSUMABLES;
    if (item.type === "treasure") return LOOT_CATEGORIES.VALUABLES;
    return LOOT_CATEGORIES.PERMANENT;
  }

  static #priceToGp(price = {}) {
    if (typeof price === "number") return Number(price) || 0;
    const cp = Number(price?.cp ?? 0);
    const sp = Number(price?.sp ?? 0);
    const gp = Number(price?.gp ?? 0);
    const pp = Number(price?.pp ?? 0);
    return Math.round((gp + sp / 10 + cp / 100 + pp * 10) * 100) / 100;
  }

  static #isCursed(item) {
    const traits = item?.system?.traits?.value ?? item?.system?.traits?.otherTags ?? [];
    const values = Array.isArray(traits) ? traits.map(value => String(value).toLowerCase()) : [];
    const name = String(item?.name ?? "").toLowerCase();
    return values.includes("cursed") || values.includes("curse") || name.includes("cursed") || name.includes("curse") || name.includes("verflucht");
  }

  static #typeLabelKey(type) {
    return {
      weapon: "LF.ItemType.Weapon",
      armor: "LF.ItemType.Armor",
      shield: "LF.ItemType.Shield",
      consumable: "LF.ItemType.Consumable",
      equipment: "LF.ItemType.Equipment",
      treasure: "LF.ItemType.Treasure",
      backpack: "LF.ItemType.Backpack",
      book: "LF.ItemType.Equipment"
    }[type] ?? "LF.ItemType.Item";
  }

  static #categoryLabelKey(category) {
    return {
      weapons: "LF.Category.Weapons",
      armor: "LF.Category.Armor",
      consumables: "LF.Category.Consumables",
      permanent: "LF.Category.Permanent",
      valuables: "LF.Category.Valuables"
    }[category] ?? "LF.Category.Other";
  }

  static #clone(value) {
    if (value === null || value === undefined) return value;
    if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
    return structuredClone(value);
  }
}
