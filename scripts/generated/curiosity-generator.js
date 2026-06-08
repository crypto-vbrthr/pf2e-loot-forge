import { ProceduralGenerator } from "./procedural-generator.js";
export class CuriosityGenerator extends ProceduralGenerator {
  constructor() { super({ category: "curiosity", sourceType: "curiosity", dataPath: "data/generators/curiosities.json" }); }
  build(data, themeId) {
    const template = this.pickTemplate(data), quality = this.pick(data.qualities, themeId), object = this.pick(data.objects, themeId), feature = this.pick(data.features, themeId), condition = this.pick(data.conditions, themeId), flair = this.pick(data.flairs ?? [], themeId);
    const values = { quality: this.localize(quality), condition: this.localize(condition), object: this.localize(object), feature: this.localize(feature) };
    return { name: this.format(template, values), description: this.buildDescription("LF.Generated.Curiosity.Description", values, flair), valueMultiplier: this.combinedMultiplier(quality, condition), qualityKey: quality?.key };
  }
}
