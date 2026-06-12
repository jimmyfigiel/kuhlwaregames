// src/core/command/commandRegistry.js

export function createCommandRegistry(modules = []) {
  const byType = {};
  for (const module of modules) {
    if (!module?.type) continue;
    byType[module.type] = module;
  }
  return {
    has(type) {
      return Boolean(byType[type]);
    },
    get(type) {
      return byType[type] || null;
    },
    all() {
      return { ...byType };
    },
  };
}
