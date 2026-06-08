import { ProceduralGenerator } from "./procedural-generator.js";

export class JewelryGenerator extends ProceduralGenerator {
  constructor() {
    super({ category: "jewelry", sourceType: "jewelry", dataPath: "data/generators/jewelry.json" });
  }

  build(data, themeId) {
    const template = this.pickTemplate(data);
    const quality = this.pick(data.qualities, themeId);
    const material = this.pick(data.materials, themeId);
    const kind = this.pick(data.kinds, themeId);
    const detail = this.pick(data.details, themeId);
    const flair = this.pick(data.flairs ?? [], themeId);

    const values = {
      quality: this.localize(quality),
      material: this.localize(material),
      kind: this.localize(kind),
      detail: this.localize(detail)
    };

    return {
      name: this.format(template, values),
      description: this.buildDescription("LF.Generated.Jewelry.Description", values, flair),
      valueMultiplier: this.combinedMultiplier(quality, material),
      qualityKey: quality?.key
    };
  }
}
