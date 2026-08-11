import { MODULE_ID } from "../constants.js";
import { LootGenerator } from "../loot-generator.js";
import { CompendiumScanner } from "../compendium-scanner.js";
import { lfLocalize } from "../localization-helper.js";
import { ThemeManager } from "../theme-manager.js";
import { EnvironmentManager } from "../environment-manager.js";
import { GeneratedTreasureFactory } from "../generated/generated-treasure-factory.js";
import { ItemForgeIntegration } from "../item-forge-integration.js";
import { gpToCoins, priceToGp } from "../price-utils.js";

let embeddedInstanceCounter = 0;

/**
 * Reusable Loot Forge editor which can be mounted into any host HTMLElement.
 *
 * Host modules own persistence/application actions. This editor deliberately
 * does not expose "apply to actor" or "create loot actor" operations.
 */
export class EmbeddedLootForge {
  static CONTRACT_VERSION = 1;

  constructor(options = {}) {
    this.instanceId = `lf-embedded-${++embeddedInstanceCounter}`;
    this.result = options.result ?? null;
    this.editableLoot = options.editableLoot ?? null;
    this.lastConfig = options.initialConfig ? this.#clone(options.initialConfig) : null;
    this.container = null;
    this.root = null;
    this.onChange = typeof options.onChange === "function" ? options.onChange : null;
    this.onGenerate = typeof options.onGenerate === "function" ? options.onGenerate : null;
  }

  get hasResult() {
    return Boolean(this.editableLoot ?? this.result);
  }

  async render(container = this.container) {
    if (!container || typeof container.replaceChildren !== "function") {
      throw new TypeError("PF2E Loot Forge | Embedded editor requires a host HTMLElement-like container.");
    }

    this.container = container;
    const context = await this.#prepareContext();
    const html = await foundry.applications.handlebars.renderTemplate(
      `modules/${MODULE_ID}/templates/embedded-loot-forge.hbs`,
      context
    );

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html.trim();
    const root = wrapper.firstElementChild;
    if (!root) throw new Error("PF2E Loot Forge | Embedded editor template rendered no root element.");

    this.root = root;
    this.container.replaceChildren(root);
    this.#wireEvents();
    return this;
  }

  async refresh() {
    if (!this.container) return this;
    return this.render(this.container);
  }

  getConfig() {
    return this.#clone(this.#getRenderConfig());
  }

  async setConfig(partial = {}, { render = true } = {}) {
    this.lastConfig = this.#merge(this.#getRenderConfig(), partial);
    if (render) await this.refresh();
    this.#emitChange();
    return this;
  }

  getLoot() {
    return this.#clone(this.editableLoot ?? this.result);
  }

  getGeneratedResult() {
    return this.#clone(this.result);
  }

  getState() {
    return {
      contractVersion: EmbeddedLootForge.CONTRACT_VERSION,
      config: this.getConfig(),
      result: this.getGeneratedResult(),
      loot: this.getLoot(),
      hasResult: this.hasResult
    };
  }

  /**
   * Capture current field edits without generating new loot.
   * Useful to a host immediately before it persists/applies the result.
   */
  syncFromForm() {
    if (!this.root) return this.getState();
    const data = this.#formDataObject();
    this.lastConfig = this.#configFromFormData(data);
    this.#syncEditsFromData(data);
    this.#emitChange();
    return this.getState();
  }

  /**
   * Generate loot using either an explicit partial config or the mounted form.
   */
  async generate(configOverride = null) {
    let config;
    let data = null;

    if (configOverride) {
      config = this.#merge(this.#getRenderConfig(), configOverride);
      this.lastConfig = this.#clone(config);
    } else if (this.root) {
      data = this.#formDataObject();
      config = this.#configFromFormData(data);
      this.lastConfig = this.#clone(config);
      this.#syncEditsFromData(data);
    } else {
      config = this.#getRenderConfig();
      this.lastConfig = this.#clone(config);
    }

    const enabledCompendiums = data
      ? Object.entries(data)
          .filter(([key, value]) => key.startsWith("pack.") && value)
          .map(([key]) => key.replace(/^pack\./, ""))
      : game.settings.get(MODULE_ID, "enabledCompendiums") ?? [];

    await game.settings.set(MODULE_ID, "enabledCompendiums", enabledCompendiums);
    config.compendiums = enabledCompendiums;

    this.result = await LootGenerator.generate(config);
    this.editableLoot = this.#clone(this.result);
    this.lastConfig = this.#clone(config);

    if (this.onGenerate) await this.onGenerate(this.getState());
    this.#emitChange();
    await this.refresh();
    return this.getLoot();
  }

  destroy() {
    if (this.container && this.root && this.root.parentElement === this.container) {
      this.container.replaceChildren();
    }
    this.root = null;
    this.container = null;
  }

  async #prepareContext() {
    const config = this.#getRenderConfig();

    const enabled = new Set(game.settings.get(MODULE_ID, "enabledCompendiums") ?? []);
    const packs = CompendiumScanner.getAvailableItemPacks().map(pack => ({
      collection: pack.collection,
      label: pack.metadata.label ?? pack.collection,
      checked: enabled.has(pack.collection)
    }));

    const themes = (await ThemeManager.getThemes()).map(theme => ({
      id: theme.id,
      name: lfLocalize(theme.name),
      selected: theme.id === config.theme
    }));

    const rarityOptions = ["common", "uncommon", "rare", "unique"].map(value => ({
      value,
      label: lfLocalize(`LF.Rarity.${value.charAt(0).toUpperCase()}${value.slice(1)}`),
      selected: value === config.rarity
    }));

    const treasureProfileOptions = ["poor", "standard", "rich", "boss", "hoard"].map(value => ({
      value,
      label: lfLocalize(`LF.Profile.${value.charAt(0).toUpperCase()}${value.slice(1).replace("hoard", "Hoard")}`),
      selected: value === config.treasureProfile
    }));

    const environmentOptions = await EnvironmentManager.getOptions(config.environment ?? "generic");
    const itemForgeStatus = ItemForgeIntegration.getStatus();

    const result = this.#clone(this.editableLoot ?? this.result);
    if (result?.generatedItems) {
      for (const item of result.generatedItems) {
        item.lootForgeValueGp = priceToGp(item.system?.price?.value ?? {});
      }
    }

    return {
      instanceId: this.instanceId,
      config,
      rarityOptions,
      treasureProfileOptions,
      packs,
      themes,
      environmentOptions,
      itemForgeStatus,
      result,
      hasResult: this.hasResult
    };
  }

  #getRenderConfig() {
    return this.#merge({
      level: 1,
      partySize: 4,
      itemLevelMin: 0,
      itemLevelMax: 2,
      rarity: game.settings.get(MODULE_ID, "defaultRarity"),
      treasureProfile: "standard",
      theme: "generic",
      environment: "generic",
      lootTarget: "display",
      newLootActorName: "Loot Forge Treasure",
      lootStyle: 50,
      includeCombatGear: false,
      includeConsumables: true,
      includePermanentItems: true,
      includeValuables: true,
      includeCuriosities: true,
      mystifyMagicItems: game.settings.get(MODULE_ID, "mystifyMagicItems"),
      useItemForge: game.settings.get(MODULE_ID, "useItemForgeByDefault")
    }, this.lastConfig ?? {});
  }

  #wireEvents() {
    if (!this.root) return;

    const levelInput = this.root.querySelector('input[name="level"]');
    const minInput = this.root.querySelector('input[name="itemLevelMin"]');
    const maxInput = this.root.querySelector('input[name="itemLevelMax"]');

    if (levelInput && minInput && maxInput) {
      const updateRange = () => {
        const level = Number(levelInput.value ?? 1);
        minInput.value = String(Math.max(0, level - 2));
        maxInput.value = String(Math.max(0, level + 1));
      };
      levelInput.addEventListener("change", updateRange);
      levelInput.addEventListener("input", updateRange);
    }

    this.root.addEventListener("click", async event => {
      const button = event.target.closest?.("[data-action]");
      if (!button || !this.root.contains(button)) return;

      const action = button.dataset.action;
      if (!action) return;

      event.preventDefault();

      if (action === "select-all-packs" || action === "deselect-all-packs") {
        const checked = action === "select-all-packs";
        this.root.querySelectorAll("input[name^='pack.']").forEach(input => {
          input.checked = checked;
        });
        return;
      }

      if (action === "generate") {
        await this.generate();
        return;
      }

      const data = this.#formDataObject();
      this.lastConfig = this.#configFromFormData(data);
      this.#syncEditsFromData(data);

      if (action.startsWith("reroll-generated:")) {
        await this.#rerollGeneratedItem(Number(action.split(":")[1]));
        this.#emitChange();
        await this.refresh();
        return;
      }

      if (action.startsWith("remove-generated:")) {
        this.#removeGeneratedItem(Number(action.split(":")[1]));
        this.#emitChange();
        await this.refresh();
        return;
      }

      if (action.startsWith("remove-pf2e:")) {
        this.#removePf2eItem(Number(action.split(":")[1]));
        this.#emitChange();
        await this.refresh();
      }
    });
  }

  #formDataObject() {
    const form = this.root?.matches?.("form") ? this.root : this.root?.querySelector?.("form");
    if (!form) return {};
    return Object.fromEntries(new FormData(form).entries());
  }

  #syncEditsFromData(data) {
    if (!this.editableLoot) return;

    this.editableLoot.coins = {
      cp: Number(data.coinCp ?? this.editableLoot.coins?.cp ?? 0),
      sp: Number(data.coinSp ?? this.editableLoot.coins?.sp ?? 0),
      gp: Number(data.coinGp ?? this.editableLoot.coins?.gp ?? 0),
      pp: Number(data.coinPp ?? this.editableLoot.coins?.pp ?? 0)
    };

    const generatedItems = this.editableLoot.generatedItems ?? [];
    for (let index = 0; index < generatedItems.length; index++) {
      const value = data[`generatedValue.${index}`];
      if (value === undefined) continue;

      generatedItems[index].system ??= {};
      generatedItems[index].system.price ??= {};
      const valueGp = Math.max(0, Number(value ?? 0));
      generatedItems[index].system.price.value = gpToCoins(valueGp);
      generatedItems[index].flags ??= {};
      generatedItems[index].flags[MODULE_ID] ??= {};
      generatedItems[index].flags[MODULE_ID].valueGp = valueGp;
    }

    this.editableLoot.totalValueGp = this.#estimateTotalValue(this.editableLoot);
    this.editableLoot.budgetDeltaGp = Math.round((this.editableLoot.totalValueGp - (this.editableLoot.budget?.targetGp ?? 0)) * 100) / 100;
  }

  #estimateTotalValue(loot) {
    const coins = loot?.coins ?? {};
    const coinGp = Number(coins.gp ?? 0) + Number(coins.sp ?? 0) / 10 + Number(coins.cp ?? 0) / 100 + Number(coins.pp ?? 0) * 10;
    const generatedGp = (loot?.generatedItems ?? []).reduce((sum, item) => {
      return sum + priceToGp(item.system?.price?.value ?? {});
    }, 0);
    const roughPf2eGp = (loot?.selectedRefs ?? []).reduce((sum, item) => {
      const level = Number(item.level ?? 0);
      return sum + Math.max(1, Math.round(Math.pow(level + 1, 2) * 0.75));
    }, 0);

    return Math.round((coinGp + generatedGp + roughPf2eGp) * 100) / 100;
  }

  async #rerollGeneratedItem(index) {
    const item = this.editableLoot?.generatedItems?.[index];
    if (!item) return;

    const sourceType = item.flags?.[MODULE_ID]?.sourceType ?? "curiosity";
    const currentValue = priceToGp(item.system?.price?.value ?? {});
    const themeId = this.editableLoot?.themeProfile?.id ?? this.lastConfig?.theme ?? "generic";
    let replacement = null;

    if (sourceType === "item-forge-treasure" && this.lastConfig?.useItemForge && ItemForgeIntegration.getStatus().treasureAvailable) {
      replacement = await ItemForgeIntegration.regenerateTreasure(this.lastConfig, item, { targetValue: currentValue });
    }

    if (!replacement) {
      replacement = await GeneratedTreasureFactory.generate({
        category: sourceType === "item-forge-treasure" ? "curiosity" : sourceType,
        themeId,
        valueBudget: currentValue
      });
    }

    this.editableLoot.generatedItems[index] = replacement;
    this.editableLoot.totalValueGp = this.#estimateTotalValue(this.editableLoot);
    this.editableLoot.budgetDeltaGp = Math.round((this.editableLoot.totalValueGp - (this.editableLoot.budget?.targetGp ?? 0)) * 100) / 100;
  }

  #removeGeneratedItem(index) {
    if (!this.editableLoot?.generatedItems) return;
    this.editableLoot.generatedItems.splice(index, 1);
    this.editableLoot.totalValueGp = this.#estimateTotalValue(this.editableLoot);
    this.editableLoot.budgetDeltaGp = Math.round((this.editableLoot.totalValueGp - (this.editableLoot.budget?.targetGp ?? 0)) * 100) / 100;
  }

  #removePf2eItem(index) {
    if (!this.editableLoot) return;
    this.editableLoot.selectedRefs?.splice(index, 1);
    this.editableLoot.pf2eItems?.splice(index, 1);
    this.editableLoot.totalValueGp = this.#estimateTotalValue(this.editableLoot);
    this.editableLoot.budgetDeltaGp = Math.round((this.editableLoot.totalValueGp - (this.editableLoot.budget?.targetGp ?? 0)) * 100) / 100;
  }

  #configFromFormData(data) {
    return {
      level: Number(data.level ?? 1),
      partySize: Number(data.partySize ?? 4),
      itemLevelMin: Number(data.itemLevelMin ?? 0),
      itemLevelMax: Number(data.itemLevelMax ?? 2),
      rarity: data.rarity ?? "common",
      treasureProfile: data.treasureProfile ?? "standard",
      theme: data.theme ?? "generic",
      environment: data.environment ?? "generic",
      lootTarget: data.lootTarget ?? "display",
      newLootActorName: data.newLootActorName ?? "Loot Forge Treasure",
      lootStyle: Number(data.lootStyle ?? 50),
      includeCombatGear: Boolean(data.includeCombatGear),
      includeConsumables: Boolean(data.includeConsumables),
      includePermanentItems: Boolean(data.includePermanentItems),
      includeValuables: Boolean(data.includeValuables),
      includeCuriosities: Boolean(data.includeCuriosities),
      mystifyMagicItems: Boolean(data.mystifyMagicItems),
      useItemForge: Boolean(data.useItemForge)
    };
  }

  #emitChange() {
    if (this.onChange) this.onChange(this.getState());
  }

  #clone(value) {
    if (value === null || value === undefined) return value;
    if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
    return structuredClone(value);
  }

  #merge(base, update) {
    if (globalThis.foundry?.utils?.mergeObject) {
      return foundry.utils.mergeObject(base, update, { inplace: false });
    }
    return { ...this.#clone(base), ...this.#clone(update) };
  }
}
