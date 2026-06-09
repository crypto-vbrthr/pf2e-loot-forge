import { MODULE_ID } from "../constants.js";
import { lfFormat, lfLocalize } from "../localization-helper.js";
import { EnvironmentManager } from "../environment-manager.js";

export class ProceduralGenerator {
  constructor({ category, dataPath, sourceType }) {
    this.category = category;
    this.dataPath = dataPath;
    this.sourceType = sourceType ?? category;
    this.data = null;
  }

  async loadData() {
    if (this.data) return this.data;
    const response = await fetch(`modules/${MODULE_ID}/${this.dataPath}`);
    this.data = await response.json();
    return this.data;
  }

  async generate({ themeId = "generic", valueBudget = 0 } = {}) {
    const data = await this.loadData();
    const environment = await EnvironmentManager.getEnvironment(arguments[0]?.environmentId ?? arguments[0]?.environment ?? "generic");
    const result = this.build(data, themeId, environment);
    const valueGp = Math.max(0, Math.round(Number(valueBudget ?? 0) * Number(result.valueMultiplier ?? 1)));

    return {
      name: result.name,
      description: result.description,
      valueGp,
      type: "treasure",
      sourceType: this.sourceType,
      category: this.category,
      theme: themeId,
      quality: result.qualityKey ?? null
    };
  }

  build(_data, _themeId) {
    throw new Error(`${this.constructor.name} must implement build(data, themeId).`);
  }


conditionPool(data, environment) {
  return EnvironmentManager.mergeConditions(data.conditions ?? [], environment);
}

  pick(list = [], themeId = "generic") {
    if (!list.length) return null;

    const generic = list.filter(entry => !Array.isArray(entry.themes) || entry.themes.includes("generic"));
    const themed = list.filter(entry => Array.isArray(entry.themes) && entry.themes.includes(themeId));

    let pool;
    if (themeId === "generic") {
      pool = generic.length ? generic : list;
    } else {
      pool = themed.length ? [...themed, ...themed, ...generic] : (generic.length ? generic : list);
    }

    return pool[Math.floor(Math.random() * pool.length)];
  }

  pickTemplate(data) {
    const templates = (data.templates ?? []).map(key => ({ key }));
    return this.pick(templates)?.key ?? data.templates?.[0];
  }

  localize(entry) {
    return lfLocalize(entry?.key ?? entry);
  }

  format(templateKey, values) {
    return lfFormat(templateKey, values);
  }

  combinedMultiplier(...entries) {
    return entries.reduce((product, entry) => product * Number(entry?.valueMultiplier ?? 1), 1);
  }

  buildDescription(baseKey, values, flair) {
    const base = this.format(baseKey, values);
    if (!flair) return base;
    return `${base}<br>${this.localize(flair)}`;
  }
}
