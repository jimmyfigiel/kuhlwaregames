// /src/gameRegistry.js

const manifests = import.meta.glob("./games/*/manifest.js");
const rules = import.meta.glob("./games/*/rules.js");
const views = import.meta.glob("./games/*/view.jsx");

export async function discoverGameManifests() {
  const discoveredGames = [];

  for (const [path, loader] of Object.entries(manifests)) {
    const module = await loader();
    const manifest = module.default || module.manifest;

    if (!manifest) {
      continue;
    }

    const folderMatch = path.match(/\.\/games\/([^/]+)\/manifest\.js$/);
    const folderId = folderMatch ? folderMatch[1] : null;
    const gameId = manifest.id || folderId;

    if (!gameId) {
      continue;
    }

    discoveredGames.push({
      id: gameId,
      gameId,
      title: manifest.title || manifest.name || gameId,
      name: manifest.name || manifest.title || gameId,
      shortTitle:
        manifest.shortTitle || manifest.title || manifest.name || gameId,
      description: manifest.description || "",
      minPlayers: Number(manifest.minPlayers ?? 1),
      maxPlayers: Number(manifest.maxPlayers ?? 0),
      playerSlots: manifest.playerSlots || [],
      options: manifest.options || [],
      enabled: manifest.enabled !== false,
    });
  }

  return discoveredGames
    .filter((game) => game.enabled !== false)
    .sort((a, b) =>
      String(a.title || a.id).localeCompare(String(b.title || b.id))
    );
}

export async function loadGameDefinition(gameId) {
  const manifestPath = `./games/${gameId}/manifest.js`;
  const rulesPath = `./games/${gameId}/rules.js`;
  const viewPath = `./games/${gameId}/view.jsx`;

  const manifestLoader = manifests[manifestPath];
  const rulesLoader = rules[rulesPath];
  const viewLoader = views[viewPath];

  if (!manifestLoader) {
    throw new Error(`No manifest.js found for game "${gameId}".`);
  }

  if (!rulesLoader) {
    throw new Error(`No rules.js found for game "${gameId}".`);
  }

  if (!viewLoader) {
    throw new Error(`No view.jsx found for game "${gameId}".`);
  }

  const manifestModule = await manifestLoader();
  const rulesModule = await rulesLoader();
  const viewModule = await viewLoader();

  const manifest = manifestModule.default || manifestModule.manifest;
  const gameRules = rulesModule.default || rulesModule;
  const Component = viewModule.default;

  if (!manifest) {
    throw new Error(
      `Game "${gameId}" manifest.js must export a default manifest object.`
    );
  }

  if (!Component) {
    throw new Error(
      `Game "${gameId}" view.jsx must export a default React component.`
    );
  }

  const createInitialState =
    gameRules.createInitialState ||
    (() => ({
      log: [`${manifest.title || manifest.name || gameId} started.`],
    }));

  const submitAction =
    gameRules.submitAction ||
    gameRules.applyAction ||
    (({ state }) => state);

  return {
    ...manifest,

    id: manifest.id || gameId,
    gameId: manifest.id || gameId,
    title: manifest.title || manifest.name || gameId,
    name: manifest.name || manifest.title || gameId,
    shortTitle:
      manifest.shortTitle || manifest.title || manifest.name || gameId,

    Component,

    rules: {
      ...gameRules,
      createInitialState,
      submitAction,
    },

    createInitialState,
    submitAction,

    getAvailableActions: gameRules.getAvailableActions || (() => []),
    applyAction: gameRules.applyAction || submitAction,
  };
}

export async function getGameDefinition(gameId) {
  return loadGameDefinition(gameId);
}