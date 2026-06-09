import { ProceduralGenerator } from "./procedural-generator.js";

export class CraftGenerator extends ProceduralGenerator {
  constructor() {
    super({ category: "craftsmanship", sourceType: "craftsmanship", dataPath: "data/generators/craftsmanship.json" });
  }

  build(data, themeId) {
    const template = this.pickTemplate(data);
    const quality = this.pick(data.qualities, themeId);
    const material = this.pick(data.materials, themeId);
    const kind = this.pick(data.kinds, themeId);
    const detail = this.pick(data.details, themeId);
    const condition = this.pick(data.conditions, themeId);
    const flair = this.pick(data.flairs ?? [], themeId);

    const values = {
      quality: this.localize(quality),
      condition: this.localize(condition),
      material: this.localize(material),
      kind: this.localize(kind),
      detail: this.localize(detail)
    };

    return {
      name: this.format(template, values),
      description: this.buildDescription("LF.Generated.Craft.Description", values, flair),
      valueMultiplier: this.combinedMultiplier(quality, material, condition),
      qualityKey: quality?.key
    };
  }
}
