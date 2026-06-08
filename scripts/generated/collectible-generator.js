import { ProceduralGenerator } from "./procedural-generator.js";
export class CollectibleGenerator extends ProceduralGenerator {
  constructor() { super({ category: "collectible", sourceType: "collectible", dataPath: "data/generators/collectibles.json" }); }
  build(data, themeId) {
    const template = this.pickTemplate(data), quality = this.pick(data.qualities, themeId), kind = this.pick(data.kinds, themeId), origin = this.pick(data.origins, themeId), condition = this.pick(data.conditions, themeId), flair = this.pick(data.flairs ?? [], themeId);
    const values = { quality: this.localize(quality), condition: this.localize(condition), kind: this.localize(kind), origin: this.localize(origin) };
    return { name: this.format(template, values), description: this.buildDescription("LF.Generated.Collectible.Description", values, flair), valueMultiplier: this.combinedMultiplier(quality, condition), qualityKey: quality?.key };
  }
}
