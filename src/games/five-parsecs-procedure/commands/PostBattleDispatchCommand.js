import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { POST_BATTLE_DISPATCH_HANDLERS } from "./postBattleDispatchHandlers";

// A single, real, factory-registered command used for every "run this logic after
// a choice/tableRoll resolves" step in the Post-Battle sequence. Handler logic is
// looked up fresh (by dispatchKey) from a static registry at execute() time, and all
// context is passed via `params` (plain, serializable data) rather than closures —
// this command (like any other) gets serialized to JSON and rebuilt from JSON on every
// player interaction in this app's architecture, so nothing can rely on captured
// function references surviving that round-trip.
export class PostBattleDispatchCommand extends BaseCommand {
  constructor({
    id,
    title = "Post-Battle Step",
    status = "pending",
    pauseAfter = false,
    visible = false,
    dispatchKey,
    params = {},
  } = {}) {
    super({ id, type: "postBattleDispatch", title, status, pauseAfter, visible });
    this.dispatchKey = dispatchKey;
    this.params = params && typeof params === "object" ? params : {};
  }

  execute(engineContext) {
    const handler = POST_BATTLE_DISPATCH_HANDLERS[this.dispatchKey];

    if (typeof handler !== "function") {
      engineContext.addLogEntry({
        type: "warning",
        text: `Unknown Post-Battle dispatch key: ${this.dispatchKey}`,
        commandId: this.id,
      });
      this.status = "complete";
      engineContext.setStatus("running");
      return;
    }

    handler(engineContext, this.params, this.id);

    this.status = "complete";
    engineContext.setStatus("running");
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      dispatchKey: this.dispatchKey,
      params: this.params,
    });
  }
}

export default PostBattleDispatchCommand;
