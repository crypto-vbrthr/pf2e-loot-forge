import { ProceduralGenerator } from "./procedural-generator.js";

export class PaintingGenerator extends ProceduralGenerator {
  constructor() {
    super({
      category: "painting",
      sourceType: "painting",
      dataPath: "data/generators/paintings.json"
    });
  }

  build(data, themeId) {
    const template = this.pickTemplate(data);
    const subject = this.pick(data.subjects, themeId);
    const background = this.pick(data.backgrounds, themeId);
    const condition = this.pick(data.conditions, themeId);

    const values = {
      condition: this.localize(condition),
      subject: this.localize(subject),
      background: this.localize(background)
    };

    return {
      name: this.format(template, values),
      description: this.format("LF.Generated.Painting.Description", values),
      valueMultiplier: this.combinedMultiplier(condition)
    };
  }
}
