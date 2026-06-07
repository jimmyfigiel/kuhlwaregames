import BaseCommand from "./BaseCommand";
import { removeUndefinedValues } from "../utils";

function normalizeChoiceOption(option, index) {
  if (option && typeof option === "object") {
    return removeUndefinedValues({
      id: option.id || `option-${index + 1}`,
      label: option.label || String(option.value ?? option.id ?? `Option ${index + 1}`),
      value: option.value ?? option.id ?? option.label ?? `option-${index + 1}`,
      description: option.description || "",
      disabled: option.disabled === true,
    });
  }

  return {
    id: `option-${index + 1}`,
    label: String(option),
    value: option,
    description: "",
    disabled: false,
  };
}

export class ChoiceCommand extends BaseCommand {
  constructor({
    id,
    title = "Choose an Option",
    prompt = "Choose an option.",
    options = [],
    saveTo = null,
    saveLabelTo = null,
    buttonText = "Continue",
    status = "pending",
    pauseAfter = true,
    visible = true,
  }) {
    super({
      id,
      type: "choice",
      title,
      status,
      pauseAfter,
      visible,
    });

    this.prompt = prompt;
    this.options = Array.isArray(options)
      ? options.map(normalizeChoiceOption)
      : [];
    this.saveTo = saveTo;
    this.saveLabelTo = saveLabelTo;
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
    const selectedValue = input.value;
    const selectedOption = this.options.find((option) => {
      return String(option.value) === String(selectedValue) || option.id === selectedValue;
    });

    if (!selectedOption || selectedOption.disabled) {
      engineContext.setStatus("waitingForUser");
      engineContext.showActiveCommand({
        ...this,
        status: "waitingForUser",
        errorMessage: "Please choose an option.",
      });
      engineContext.stopAfterCurrentCommand();
      return;
    }

    if (this.saveTo) {
      engineContext.setStateValue(this.saveTo, selectedOption.value);
    }

    if (this.saveLabelTo) {
      engineContext.setStateValue(this.saveLabelTo, selectedOption.label);
    }

    this.status = "complete";
    engineContext.clearActiveCommand();
    engineContext.setStatus("idle");

    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Completed command: ${this.title} (${selectedOption.label})`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      prompt: this.prompt,
      options: this.options,
      saveTo: this.saveTo,
      saveLabelTo: this.saveLabelTo,
      buttonText: this.buttonText,
      errorMessage: this.errorMessage,
    });
  }
}

export default ChoiceCommand;
