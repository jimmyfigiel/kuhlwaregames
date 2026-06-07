// src/procedure-core/name-generator/MarkovNameGenerator.js
// Adapted from the public-domain Donjon/bin.sh Markov name generator by drow.
// The reusable engine owns generation behavior; games provide their own source name lists.

export class MarkovNameGenerator {
  constructor(nameSets = {}) {
    this.nameSets = { ...nameSets };
    this.chainCache = {};
  }

  registerNameSet(type, names) {
    if (!type || typeof type !== "string") {
      throw new Error("registerNameSet requires a string type.");
    }

    if (!Array.isArray(names)) {
      throw new Error(`Name set '${type}' must be an array.`);
    }

    this.nameSets[type] = names.filter((name) => {
      return typeof name === "string" && name.trim().length > 0;
    });

    delete this.chainCache[type];
  }

  generateName(type) {
    const chain = this.getMarkovChain(type);

    if (!chain) {
      return "";
    }

    return this.createNameFromChain(chain);
  }

  generateNameList(type, count) {
    const safeCount = Number.isFinite(Number(count))
      ? Math.max(0, Math.floor(Number(count)))
      : 0;

    const names = [];

    for (let index = 0; index < safeCount; index += 1) {
      names.push(this.generateName(type));
    }

    return names;
  }

  getMarkovChain(type) {
    if (this.chainCache[type]) {
      return this.chainCache[type];
    }

    const names = this.nameSets[type];

    if (!Array.isArray(names) || names.length === 0) {
      return null;
    }

    const chain = this.constructChain(names);
    this.chainCache[type] = chain;

    return chain;
  }

  constructChain(names) {
    let chain = {};

    names.forEach((entry) => {
      const parts = String(entry)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      chain = this.incrementChain(chain, "parts", parts.length);

      parts.forEach((namePart) => {
        chain = this.incrementChain(chain, "name_len", namePart.length);

        let currentCharacter = namePart.substring(0, 1);
        chain = this.incrementChain(chain, "initial", currentCharacter);

        let remaining = namePart.substring(1);
        let lastCharacter = currentCharacter;

        while (remaining.length > 0) {
          currentCharacter = remaining.substring(0, 1);
          chain = this.incrementChain(chain, lastCharacter, currentCharacter);

          remaining = remaining.substring(1);
          lastCharacter = currentCharacter;
        }
      });
    });

    return this.scaleChain(chain);
  }

  incrementChain(chain, key, token) {
    const nextChain = chain;

    if (!nextChain[key]) {
      nextChain[key] = {};
    }

    if (!nextChain[key][token]) {
      nextChain[key][token] = 0;
    }

    nextChain[key][token] += 1;

    return nextChain;
  }

  scaleChain(chain) {
    const tableLength = {};

    Object.keys(chain).forEach((key) => {
      tableLength[key] = 0;

      Object.keys(chain[key]).forEach((token) => {
        const count = chain[key][token];
        const weighted = Math.floor(Math.pow(count, 1.3));

        chain[key][token] = weighted;
        tableLength[key] += weighted;
      });
    });

    chain.table_len = tableLength;

    return chain;
  }

  createNameFromChain(chain) {
    const partCount = this.selectLink(chain, "parts");
    const names = [];

    for (let partIndex = 0; partIndex < partCount; partIndex += 1) {
      const targetLength = this.selectLink(chain, "name_len");
      let currentCharacter = this.selectLink(chain, "initial");
      let name = currentCharacter;
      let lastCharacter = currentCharacter;

      while (name.length < targetLength) {
        currentCharacter = this.selectLink(chain, lastCharacter);

        if (!currentCharacter) {
          break;
        }

        name += currentCharacter;
        lastCharacter = currentCharacter;
      }

      names.push(name);
    }

    return names.join(" ");
  }

  selectLink(chain, key) {
    const tableLength = chain.table_len?.[key];

    if (!tableLength) {
      return false;
    }

    const index = Math.floor(Math.random() * tableLength);
    const tokens = Object.keys(chain[key]);
    let accumulator = 0;

    for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
      const token = tokens[tokenIndex];
      accumulator += chain[key][token];

      if (accumulator > index) {
        return token;
      }
    }

    return false;
  }
}

export default MarkovNameGenerator;
