import BaseCommand from "./BaseCommand";

export default class PopupMessageCommand extends BaseCommand {
  constructor({
    id,
    title = "Message",
    message,
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

  execute() {
    return {
      status: "waitingForUser",
      shouldContinue: false,
      activeCommand: this.toJSON(),
    };
  }

  toJSON() {
    return {
      ...super.toJSON(),
      message: this.message,
      buttonText: this.buttonText,
    };
  }
}
