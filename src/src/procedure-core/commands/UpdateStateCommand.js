import BaseCommand from "./BaseCommand";
import { removeUndefinedValues } from "../utils";

function normalizeOperation(operation) {
  if (!operation || typeof operation !== "object") {
    return null;
  }

  const op = operation.op || operation.type;

  if (!op) {
    return null;
  }

  return removeUndefinedValues({
    ...operation,
    op,
  });
}

function joinPaths(basePath, childPath) {
  const cleanBasePath = String(basePath || "").trim();
  const cleanChildPath = String(childPath || "").trim();

  if (!cleanBasePath) {
    return cleanChildPath;
  }

  if (!cleanChildPath) {
    return cleanBasePath;
  }

  return `${cleanBasePath}.${cleanChildPath}`;
}

function shallowMerge(existingValue, nextValue) {
  const existingObject =
    existingValue && typeof existingValue === "object" && !Array.isArray(existingValue)
      ? existingValue
      : {};
  const nextObject =
    nextValue && typeof nextValue === "object" && !Array.isArray(nextValue)
      ? nextValue
      : {};

  return {
    ...existingObject,
    ...nextObject,
  };
}

export class UpdateStateCommand extends BaseCommand {
  constructor({
    id,
    title = "Update State",
    targetPath = "",
    operations = [],
    status = "pending",
    pauseAfter = false,
    visible = false,
  }) {
    super({
      id,
      type: "updateState",
      title,
      status,
      pauseAfter,
      visible,
    });

    this.targetPath = targetPath;
    this.operations = Array.isArray(operations)
      ? operations.map(normalizeOperation).filter(Boolean)
      : [];
  }

  execute(engineContext) {
    this.operations.forEach((operation) => {
      const path = joinPaths(this.targetPath, operation.path);

      if (!path) {
        return;
      }

      switch (operation.op) {
        case "set": {
          engineContext.setStateValue(path, operation.value);
          break;
        }

        case "setIfMissing": {
          const existingValue = engineContext.getStateValue(path);

          if (existingValue === undefined || existingValue === null) {
            engineContext.setStateValue(path, operation.value);
          }
          break;
        }

        case "increment": {
          const existingValue = Number(engineContext.getStateValue(path) || 0);
          const amount = Number(operation.amount ?? operation.value ?? 0);

          if (Number.isFinite(amount)) {
            engineContext.setStateValue(path, existingValue + amount);
          }
          break;
        }

        case "append": {
          engineContext.appendStateValue(path, operation.value);
          break;
        }

        case "appendMany": {
          const values = Array.isArray(operation.values) ? operation.values : [];
          values.forEach((value) => engineContext.appendStateValue(path, value));
          break;
        }

        case "merge": {
          const existingValue = engineContext.getStateValue(path);
          engineContext.setStateValue(path, shallowMerge(existingValue, operation.value));
          break;
        }

        default:
          engineContext.addLogEntry({
            type: "commandWarning",
            text: `Unknown update operation: ${operation.op}`,
            commandId: this.id,
          });
      }
    });

    this.status = "complete";

    if (this.pauseAfter) {
      engineContext.setStatus("idle");
      engineContext.stopAfterCurrentCommand();
    } else {
      engineContext.setStatus("running");
      engineContext.continue();
    }

    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Applied state update: ${this.title}`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      targetPath: this.targetPath,
      operations: this.operations,
    });
  }
}

export default UpdateStateCommand;
