// src/core/display/commands/createArea.js

export const type = "CREATE_AREA";

export function run(state, command) {
  const { areaId, name, layout = "row", placeIds = [] } = command.params ?? {};
  if (!areaId) throw new Error("CREATE_AREA requires areaId.");

  return {
    ...state,
    areas: {
      ...(state.areas ?? {}),
      [areaId]: {
        id: areaId,
        name: name ?? areaId,
        layout,
        placeIds,
      },
    },
  };
}
