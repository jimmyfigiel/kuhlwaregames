export class CompoundNameGenerator {
  constructor({ firstWords = [], secondWords = [], separator = " " } = {}) {
    this.firstWords = Array.isArray(firstWords) ? firstWords : [];
    this.secondWords = Array.isArray(secondWords) ? secondWords : [];
    this.separator = separator;
  }

  generate() {
    const firstWord = this.pick(this.firstWords);
    const secondWord = this.pick(this.secondWords);

    if (!firstWord && !secondWord) {
      return "";
    }

    if (!firstWord) {
      return secondWord;
    }

    if (!secondWord) {
      return firstWord;
    }

    return `${firstWord}${this.separator}${secondWord}`;
  }

  generateMany(count = 10) {
    const safeCount = Math.max(0, Number(count) || 0);
    const names = [];

    for (let index = 0; index < safeCount; index += 1) {
      names.push(this.generate());
    }

    return names;
  }

  pick(list) {
    if (!Array.isArray(list) || list.length === 0) {
      return "";
    }

    return list[Math.floor(Math.random() * list.length)];
  }
}

export function generateCompoundName(config) {
  const generator = new CompoundNameGenerator(config);
  return generator.generate();
}

export default CompoundNameGenerator;
