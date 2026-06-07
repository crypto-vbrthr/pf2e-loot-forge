import { ProceduralGenerator } from "./procedural-generator.js";

export class JewelryGenerator extends ProceduralGenerator {
  constructor() {
    super({
      category: "jewelry",
      sourceType: "jewelry",
      dataPath: "data/generators/jewelry.json"
    });
  }

  build(data, themeId) {
    const template = this.pickTemplate(data);
    const material = this.pick(data.materials, themeId);
    const kind = this.pick(data.kinds, themeId);
    const detail = this.pick(data.details, themeId);

    const values = {
      material: this.localize(material),
      kind: this.localize(kind),
      detail: this.localize(detail)
    };

    return {
      name: this.format(template, values),
      description: this.format("LF.Generated.Jewelry.Description", values),
      valueMultiplier: this.combinedMultiplier(material)
    };
  }
}
