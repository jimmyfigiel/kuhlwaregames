export default class BaseCommand {
  constructor({
    id,
    type,
    title = "Command",
    status = "pending",
    pauseAfter = false,
    visible = true,
  }) {
    this.id = id;
    this.type = type;
    this.title = title;
    this.status = status;
    this.pauseAfter = pauseAfter;
    this.visible = visible;
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
