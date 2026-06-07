import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export class ResolveShipDebtCommand extends BaseCommand {
  constructor({
    id = "resolve-ship-debt",
    title = "Resolve Ship Debt",
    sourcePath = "shipSetup.selectedShip",
    saveRollTo = "shipSetup.debtRoll",
    saveDebtTo = "shipSetup.generatedDebt",
    status = "pending",
    pauseAfter = false,
    visible = true,
  } = {}) {
    super({
      id,
      type: "resolveShipDebt",
      title,
      status,
      pauseAfter,
      visible,
    });

    this.sourcePath = sourcePath;
    this.saveRollTo = saveRollTo;
    this.saveDebtTo = saveDebtTo;
  }

  execute(engineContext) {
    this.status = "waitingForUser";
    const selectedShip = engineContext.getStateValue(this.sourcePath) || {};

    engineContext.showActiveCommand({
      ...this.toJSON(),
      selectedShip,
      debtBonus: Number(selectedShip.debtBonus || 0),
      debtFormula: selectedShip.debt || `1D6 + ${Number(selectedShip.debtBonus || 0)}`,
    });
    engineContext.setStatus("waitingForUser");
    engineContext.stopAfterCurrentCommand();

    engineContext.addLogEntry({
      type: "commandStarted",
      text: "Started ship debt roll.",
      commandId: this.id,
    });
  }

  resolve(engineContext, input = {}) {
    const selectedShip = engineContext.getStateValue(this.sourcePath) || {};
    const debtBonus = Number(selectedShip.debtBonus || 0);
    const rawRoll = input.roll ?? input.value ?? input.debtRoll;
    const debtRoll = Number(rawRoll);

    if (!Number.isFinite(debtRoll) || debtRoll < 1 || debtRoll > 6) {
      engineContext.setStatus("waitingForUser");
      engineContext.showActiveCommand({
        ...this.toJSON(),
        selectedShip,
        debtBonus,
        debtFormula: selectedShip.debt || `1D6 + ${debtBonus}`,
        errorMessage: "Enter a valid D6 roll from 1 to 6.",
      });
      engineContext.stopAfterCurrentCommand();
      return;
    }

    const roundedRoll = Math.floor(debtRoll);
    const generatedDebt = roundedRoll + debtBonus;

    const updateCommand = engineContext.commandFactory.updateState({
      id: "save-ship-debt-roll",
      title: "Save Ship Debt Roll",
      operations: [
        { op: "set", path: this.saveRollTo, value: roundedRoll },
        { op: "set", path: this.saveDebtTo, value: generatedDebt },
      ],
      pauseAfter: false,
      visible: false,
    });

    engineContext.pushCommandsToTop([updateCommand]);

    this.status = "complete";
    engineContext.clearActiveCommand();
    engineContext.setStatus("idle");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Resolved ship debt: ${roundedRoll} + ${debtBonus} = ${generatedDebt}.`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      sourcePath: this.sourcePath,
      saveRollTo: this.saveRollTo,
      saveDebtTo: this.saveDebtTo,
    });
  }
}

export default ResolveShipDebtCommand;
