export default class BaseCommand {
  constructor({
    id,
    type,
    title = "Command",
    status = "pending",
    pauseAfter = false,
    visible = true,
  }) {
    if (!id) {
      throw new Error("Command requires an id.");
    }

    if (!type) {
      throw new Error("Command requires a type.");
    }

    this.id = id;
    this.type = type;
    this.title = title;
    this.status = status;
    this.pauseAfter = pauseAfter;
    this.visible = visible;
  }

  execute() {
    return {
      status: "complete",
      shouldContinue: true,
    };
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      status: this.status,
      pauseAfter: this.pauseAfter,
      visible: this.visible,
    };
  }
}
