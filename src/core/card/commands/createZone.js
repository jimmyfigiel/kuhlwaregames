// src/core/card/commands/createZone.js

import { makeCommand } from "../../command/commandObjects";
import { appendLog } from "../../command/commandLog";
import { addZone } from "../cardState";

export const type = "CREATE_ZONE";

export function create(params = {}) {
  return makeCommand(type, {
    mode: "auto",
    actor: params.actor || "System",
    params: {
      zoneId: params.zoneId,
      zoneType: params.zoneType || "card-space",
      label: params.label || params.zoneId,
      capacity: params.capacity ?? 1,
    },
  });
}

export function run(state, command) {
  const { zoneId, zoneType, label, capacity } = command.params;
  if (!zoneId) throw new Error("CREATE_ZONE requires zoneId.");
  let next = addZone(state, {
    id: zoneId,
    zoneType,
    label,
    capacity,
    cardIds: [],
  });
  next = appendLog(next, {
    eventType: "ZONE_CREATED",
    commandType: type,
    actor: "System",
    status: "ok",
    message: `Created zone ${zoneId}.`,
  });
  return next;
}
