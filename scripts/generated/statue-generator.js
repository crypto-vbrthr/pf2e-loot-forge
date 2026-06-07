import { ProceduralGenerator } from "./procedural-generator.js";

export class StatueGenerator extends ProceduralGenerator {
  constructor() {
    super({
      category: "statue",
      sourceType: "statue",
      dataPath: "data/generators/statues.json"
    });
  }

  build(data, themeId) {
    const template = this.pickTemplate(data);
    const material = this.pick(data.materials, themeId);
    const subject = this.pick(data.subjects, themeId);
    const condition = this.pick(data.conditions, themeId);

    const values = {
      condition: this.localize(condition),
      material: this.localize(material),
      subject: this.localize(subject)
    };

    return {
      name: this.format(template, values),
      description: this.format("LF.Generated.Statue.Description", values),
      valueMultiplier: this.combinedMultiplier(material, condition)
    };
  }
}
