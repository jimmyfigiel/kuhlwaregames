import BaseCommand from "./BaseCommand";
import { removeUndefinedValues } from "../utils";

export class TextInputCommand extends BaseCommand {
  constructor({
    id,
    title = "Text Input",
    prompt = "Enter text.",
    label = "Text",
    defaultValue = "",
    saveTo = null,
    buttonText = "OK",
    allowRandomName = false,
    randomNameSet = "",
    randomNameButtonText = "Generate",
    status = "pending",
    pauseAfter = true,
    visible = true,
  }) {
    super({
      id,
      type: "textInput",
      title,
      status,
      pauseAfter,
      visible,
    });

    this.prompt = prompt;
    this.label = label;
    this.defaultValue = defaultValue;
    this.saveTo = saveTo;
    this.buttonText = buttonText;
    this.allowRandomName = allowRandomName;
    this.randomNameSet = randomNameSet;
    this.randomNameButtonText = randomNameButtonText;
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

  resolve(engineContext, input = {}) {
    const rawValue = input.value ?? this.defaultValue;
    const value = String(rawValue || "").trim();

    if (!value) {
      engineContext.setStatus("waitingForUser");
      engineContext.showActiveCommand({
        ...this,
        status: "waitingForUser",
        errorMessage: "Please enter a value.",
      });
      engineContext.stopAfterCurrentCommand();
      return;
    }

    if (this.saveTo) {
      engineContext.setStateValue(this.saveTo, value);
    }

    this.status = "complete";
    engineContext.clearActiveCommand();
    engineContext.setStatus("idle");

    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Completed command: ${this.title} (${value})`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      prompt: this.prompt,
      label: this.label,
      defaultValue: this.defaultValue,
      saveTo: this.saveTo,
      buttonText: this.buttonText,
      allowRandomName: this.allowRandomName,
      randomNameSet: this.randomNameSet,
      randomNameButtonText: this.randomNameButtonText,
      errorMessage: this.errorMessage,
    });
  }
}

export default TextInputCommand;
