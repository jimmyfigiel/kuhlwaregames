import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function parseDice(diceText) {
  const cleanText = String(diceText || "1D6").trim().toUpperCase();
  const match = cleanText.match(/^(\d*)D(\d+)$/);

  if (!match) {
    return {
      count: 1,
      sides: 6,
      label: cleanText || "1D6",
    };
  }

  const count = Number(match[1] || 1);
  const sides = Number(match[2] || 6);

  return {
    count: Number.isFinite(count) && count > 0 ? Math.floor(count) : 1,
    sides: Number.isFinite(sides) && sides > 0 ? Math.floor(sides) : 6,
    label: cleanText,
  };
}

function rollDiceTotal(diceText) {
  const dice = parseDice(diceText);
  const rolls = [];

  for (let index = 0; index < dice.count; index += 1) {
    rolls.push(rollDie(dice.sides));
  }

  return {
    dice,
    rolls,
    total: rolls.reduce((sum, roll) => sum + roll, 0),
  };
}

export class ResolveCreditRollCommand extends BaseCommand {
  constructor({
    id,
    title = "Resolve Credit Roll",
    pendingEffectId = "",
    dice = "1D6",
    source = "",
    appRoll = null,
    status = "pending",
    pauseAfter = false,
    visible = true,
  } = {}) {
    super({
      id,
      type: "resolveCreditRoll",
      title,
      status,
      pauseAfter,
      visible,
    });

    this.pendingEffectId = pendingEffectId;
    this.dice = dice || "1D6";
    this.source = source || "";
    this.appRoll = appRoll;
  }

  execute(engineContext) {
    this.status = "waitingForUser";

    engineContext.showActiveCommand(this);
    engineContext.setStatus("waitingForUser");
    engineContext.stopAfterCurrentCommand();

    engineContext.addLogEntry({
      type: "commandStarted",
      text: `Started credit roll: ${this.dice}`,
      commandId: this.id,
    });
  }

  rollWithAppDice() {
    const result = rollDiceTotal(this.dice);
    this.appRoll = result;

    return result;
  }

  resolve(engineContext, input = {}) {
    const rawTotal = input.total ?? input.value ?? input.creditTotal;
    const total = Number(rawTotal);

    if (!Number.isFinite(total) || total < 0) {
      engineContext.setStatus("waitingForUser");
      engineContext.showActiveCommand({
        ...this.toJSON(),
        status: "waitingForUser",
        errorMessage: "Enter a valid credit total.",
      });
      engineContext.stopAfterCurrentCommand();
      return;
    }

    const roundedTotal = Math.floor(total);

    const commands = engineContext.commandFactory?.createCommandsForCreditRollResolution
      ? engineContext.commandFactory.createCommandsForCreditRollResolution({
          state: engineContext.state,
          pendingEffectId: this.pendingEffectId,
          dice: this.dice,
          source: this.source,
          total: roundedTotal,
          appRoll: input.appRoll || this.appRoll || null,
        })
      : [];

    if (commands.length > 0) {
      engineContext.pushCommandsToTop(commands);
    }

    this.status = "complete";
    engineContext.clearActiveCommand();
    engineContext.setStatus("idle");

    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Resolved credit roll ${this.dice}: +${roundedTotal} credits.`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      pendingEffectId: this.pendingEffectId,
      dice: this.dice,
      source: this.source,
      appRoll: this.appRoll,
    });
  }
}

export default ResolveCreditRollCommand;
