import { PopupMessageCommand } from "../commands";

export default class CommandFactory {
  constructor({ idPrefix = "cmd" } = {}) {
    this.idPrefix = idPrefix;
  }

  popupMessage({
    id,
    title = "Message",
    message,
    buttonText = "OK",
    pauseAfter = true,
  }) {
    return new PopupMessageCommand({
      id: id || this.createId("popup"),
      title,
      message,
      buttonText,
      pauseAfter,
    });
  }

  createId(label = "command") {
    const safeLabel = String(label)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "command";

    return `${this.idPrefix}-${safeLabel}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }
}
