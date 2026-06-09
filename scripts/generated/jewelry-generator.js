import { ProceduralGenerator } from "./procedural-generator.js";
export class JewelryGenerator extends ProceduralGenerator {
  constructor() { super({ category: "jewelry", sourceType: "jewelry", dataPath: "data/generators/jewelry.json" }); }
  build(data, themeId, environment) {
    const template = this.pickTemplate(data), quality = this.pick(data.qualities, themeId), material = this.pick(data.materials, themeId), kind = this.pick(data.kinds, themeId), detail = this.pick(data.details, themeId), flair = this.pick(data.flairs ?? [], themeId);
    const values = { quality: this.localize(quality), material: this.localize(material), kind: this.localize(kind), detail: this.localize(detail) };
    return { name: this.format(template, values), description: this.buildDescription("LF.Generated.Jewelry.Description", values, flair), valueMultiplier: this.combinedMultiplier(quality, material), qualityKey: quality?.key };
  }
}
