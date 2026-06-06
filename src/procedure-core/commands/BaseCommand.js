import { removeUndefinedValues } from "../utils";

export class BaseCommand {
  constructor({
    id,
    type,
    title = "Command",
    status = "pending",
    pauseAfter = false,
    visible = true,
    autoExecuteOnGameStart = false,
  }) {
    this.id = id;
    this.type = type;
    this.title = title;
    this.status = status;
    this.pauseAfter = pauseAfter;
    this.visible = visible;
    this.autoExecuteOnGameStart = autoExecuteOnGameStart === true;
  }

  execute(engineContext) {
    throw new Error(
      `${this.constructor.name} must implement execute(engineContext).`
    );
  }

  resolve(engineContext) {
    this.status = "complete";
    engineContext.clearActiveCommand();
    engineContext.setStatus("idle");
  }

  toJSON() {
    return removeUndefinedValues({
      id: this.id,
      type: this.type,
      title: this.title,
      status: this.status,
      pauseAfter: this.pauseAfter,
      visible: this.visible,
      autoExecuteOnGameStart: this.autoExecuteOnGameStart,
    });
  }
}

export default BaseCommand;
