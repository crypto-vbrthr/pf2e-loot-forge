import { MODULE_ID } from "../constants.js";
import { lfFormat, lfLocalize } from "../localization-helper.js";

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
    const result = this.build(data, themeId);
    const valueMultiplier = result.valueMultiplier ?? 1;
    const valueGp = Math.max(0, Math.round(Number(valueBudget ?? 0) * valueMultiplier));

    return {
      name: result.name,
      description: result.description,
      valueGp,
      type: "treasure",
      sourceType: this.sourceType
    };
  }

  build(_data, _themeId) {
    throw new Error(`${this.constructor.name} must implement build(data, themeId).`);
  }

  pick(list = [], themeId = "generic") {
    const themed = list.filter(entry => entry.themes?.includes(themeId));
    const generic = list.filter(entry => !entry.themes || entry.themes.includes("generic"));
    const pool = themed.length ? themed : (generic.length ? generic : list);

    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  pickTemplate(data) {
    return this.pick((data.templates ?? []).map(key => ({ key })))?.key ?? data.templates?.[0];
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
}
