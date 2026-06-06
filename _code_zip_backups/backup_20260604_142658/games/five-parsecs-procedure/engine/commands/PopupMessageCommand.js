import BaseCommand from "./BaseCommand";

export default class PopupMessageCommand extends BaseCommand {
  constructor({
    id,
    title = "Message",
    message = "",
    buttonText = "OK",
    status = "pending",
    pauseAfter = true,
    visible = true,
  }) {
    super({
      id,
      type: "popupMessage",
      title,
      status,
      pauseAfter,
      visible,
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
    return {
      ...super.toJSON(),
      message: this.message,
      buttonText: this.buttonText,
    };
  }
}
