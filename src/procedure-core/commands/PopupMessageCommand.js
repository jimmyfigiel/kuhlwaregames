import BaseCommand from "./BaseCommand";
import { removeUndefinedValues } from "../utils";

export class PopupMessageCommand extends BaseCommand {
  constructor({
    id,
    title = "Message",
    message = "",
    buttonText = "OK",
    status = "pending",
    pauseAfter = true,
    visible = true,
    autoExecuteOnGameStart = false,
  }) {
    super({
      id,
      type: "popupMessage",
      title,
      status,
      pauseAfter,
      visible,
      autoExecuteOnGameStart,
    });

    this.message = message;
    this.buttonText = buttonText;
  }

  execute(engineContext) {
    this.status = "waitingForUser";

    engineContext.showActiveCommand(this);
    engineContext.setStatus("waitingForUser");
    engineContext.stopAfterCurrentCommand();

    engineContext.addLogEntry({
      type: "commandStarted",
      text: `Started command: ${this.title}`,
      commandId: this.id,
    });
  }

  resolve(engineContext) {
    this.status = "complete";

    engineContext.clearActiveCommand();
    engineContext.setStatus("idle");

    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Completed command: ${this.title}`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      message: this.message,
      buttonText: this.buttonText,
    });
  }
}

export default PopupMessageCommand;
