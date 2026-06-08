import { ProceduralGenerator } from "./procedural-generator.js";
export class InstrumentGenerator extends ProceduralGenerator {
  constructor() { super({ category: "instrument", sourceType: "instrument", dataPath: "data/generators/instruments.json" }); }
  build(data, themeId) {
    const template = this.pickTemplate(data), quality = this.pick(data.qualities, themeId), material = this.pick(data.materials, themeId), kind = this.pick(data.kinds, themeId), detail = this.pick(data.details, themeId), condition = this.pick(data.conditions, themeId), flair = this.pick(data.flairs ?? [], themeId);
    const values = { quality: this.localize(quality), condition: this.localize(condition), material: this.localize(material), kind: this.localize(kind), detail: this.localize(detail) };
    return { name: this.format(template, values), description: this.buildDescription("LF.Generated.Instrument.Description", values, flair), valueMultiplier: this.combinedMultiplier(quality, material, detail, condition), qualityKey: quality?.key };
  }
}
