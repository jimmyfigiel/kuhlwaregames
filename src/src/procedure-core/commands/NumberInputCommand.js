import BaseCommand from "./BaseCommand";
import { removeUndefinedValues } from "../utils";

export class NumberInputCommand extends BaseCommand {
  constructor({
    id,
    title = "Number Input",
    prompt = "Enter a number.",
    defaultValue = 0,
    min = null,
    max = null,
    saveTo = null,
    buttonText = "OK",
    status = "pending",
    pauseAfter = true,
    visible = true,
  }) {
    super({
      id,
      type: "numberInput",
      title,
      status,
      pauseAfter,
      visible,
    });

    this.prompt = prompt;
    this.defaultValue = defaultValue;
    this.min = min;
    this.max = max;
    this.saveTo = saveTo;
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

  resolve(engineContext, input = {}) {
    const rawValue = input.value ?? this.defaultValue;
    const parsedValue = Number(rawValue);

    if (!Number.isFinite(parsedValue)) {
      engineContext.setStatus("waitingForUser");
      engineContext.showActiveCommand({
        ...this,
        status: "waitingForUser",
        errorMessage: "Please enter a valid number.",
      });
      engineContext.stopAfterCurrentCommand();
      return;
    }

    if (this.min !== null && parsedValue < this.min) {
      engineContext.setStatus("waitingForUser");
      engineContext.showActiveCommand({
        ...this,
        status: "waitingForUser",
        errorMessage: `Please enter a number of at least ${this.min}.`,
      });
      engineContext.stopAfterCurrentCommand();
      return;
    }

    if (this.max !== null && parsedValue > this.max) {
      engineContext.setStatus("waitingForUser");
      engineContext.showActiveCommand({
        ...this,
        status: "waitingForUser",
        errorMessage: `Please enter a number no greater than ${this.max}.`,
      });
      engineContext.stopAfterCurrentCommand();
      return;
    }

    if (this.saveTo) {
      engineContext.setStateValue(this.saveTo, parsedValue);
    }

    this.status = "complete";
    engineContext.clearActiveCommand();
    engineContext.setStatus("idle");

    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Completed command: ${this.title} (${parsedValue})`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      prompt: this.prompt,
      defaultValue: this.defaultValue,
      min: this.min,
      max: this.max,
      saveTo: this.saveTo,
      buttonText: this.buttonText,
      errorMessage: this.errorMessage,
    });
  }
}

export default NumberInputCommand;
