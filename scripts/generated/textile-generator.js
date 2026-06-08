import { ProceduralGenerator } from "./procedural-generator.js";

export class TextileGenerator extends ProceduralGenerator {
  constructor() {
    super({ category: "textile", sourceType: "textile", dataPath: "data/generators/textiles.json" });
  }

  build(data, themeId) {
    const template = this.pickTemplate(data);
    const quality = this.pick(data.qualities, themeId);
    const kind = this.pick(data.kinds, themeId);
    const subject = this.pick(data.subjects, themeId);
    const material = this.pick(data.materials, themeId);
    const condition = this.pick(data.conditions, themeId);
    const flair = this.pick(data.flairs ?? [], themeId);

    const values = {
      quality: this.localize(quality),
      condition: this.localize(condition),
      kind: this.localize(kind),
      subject: this.localize(subject),
      material: this.localize(material)
    };

    return {
      name: this.format(template, values),
      description: this.buildDescription("LF.Generated.Textile.Description", values, flair),
      valueMultiplier: this.combinedMultiplier(quality, material, condition),
      qualityKey: quality?.key
    };
  }
}
