import { ProceduralGenerator } from "./procedural-generator.js";
export class StatueGenerator extends ProceduralGenerator {
  constructor() { super({ category: "statue", sourceType: "statue", dataPath: "data/generators/statues.json" }); }
  build(data, themeId) {
    const template = this.pickTemplate(data), quality = this.pick(data.qualities, themeId), material = this.pick(data.materials, themeId), subject = this.pick(data.subjects, themeId), condition = this.pick(data.conditions, themeId), flair = this.pick(data.flairs ?? [], themeId);
    const values = { quality: this.localize(quality), condition: this.localize(condition), material: this.localize(material), subject: this.localize(subject) };
    return { name: this.format(template, values), description: this.buildDescription("LF.Generated.Statue.Description", values, flair), valueMultiplier: this.combinedMultiplier(quality, material, condition), qualityKey: quality?.key };
  }
}
