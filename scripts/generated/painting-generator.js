import { ProceduralGenerator } from "./procedural-generator.js";
export class PaintingGenerator extends ProceduralGenerator {
  constructor() { super({ category: "painting", sourceType: "painting", dataPath: "data/generators/paintings.json" }); }
  build(data, themeId) {
    const template = this.pickTemplate(data), quality = this.pick(data.qualities, themeId), subject = this.pick(data.subjects, themeId), background = this.pick(data.backgrounds, themeId), condition = this.pick(data.conditions, themeId), flair = this.pick(data.flairs ?? [], themeId);
    const values = { quality: this.localize(quality), condition: this.localize(condition), subject: this.localize(subject), background: this.localize(background) };
    return { name: this.format(template, values), description: this.buildDescription("LF.Generated.Painting.Description", values, flair), valueMultiplier: this.combinedMultiplier(quality, condition), qualityKey: quality?.key };
  }
}
