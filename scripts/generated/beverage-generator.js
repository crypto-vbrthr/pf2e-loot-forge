import { ProceduralGenerator } from "./procedural-generator.js";

export class BeverageGenerator extends ProceduralGenerator {
  constructor() {
    super({ category: "beverage", sourceType: "beverage", dataPath: "data/generators/beverages.json" });
  }

  build(data, themeId) {
    const template = this.pickTemplate(data);
    const quality = this.pick(data.qualities, themeId);
    const beverage = this.pick(data.names, themeId);
    const origin = this.pick(data.origins, themeId);
    const seal = this.pick(data.seals, themeId);
    const flair = this.pick(data.flairs ?? [], themeId);

    const values = {
      quality: this.localize(quality),
      beverage: this.localize(beverage),
      origin: this.localize(origin),
      seal: this.localize(seal)
    };

    return {
      name: this.format(template, values),
      description: this.buildDescription("LF.Generated.Beverage.Description", values, flair),
      valueMultiplier: this.combinedMultiplier(quality, seal),
      qualityKey: quality?.key
    };
  }
}
