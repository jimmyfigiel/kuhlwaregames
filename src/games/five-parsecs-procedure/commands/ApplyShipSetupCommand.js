import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

function makeShipRecord({ selectedShip, shipName, generatedDebt }) {
  const shipType = selectedShip?.ship || selectedShip?.name || selectedShip?.label || "Unknown Ship";
  const traits = Array.isArray(selectedShip?.traits) ? selectedShip.traits : [];

  return removeUndefinedValues({
    id: "crew-starship",
    name: shipName || shipType,
    shipType,
    hasShip: true,
    hullDamage: 0,
    hullThreshold: Number(selectedShip?.hull || 0),
    debtOwed: Number(generatedDebt || 0),
    financedAmount: Number(generatedDebt || 0),
    debtFormula: selectedShip?.debt || "",
    debtBonus: Number(selectedShip?.debtBonus || 0),
    traits,
    source: "Starting Ship Table",
    createdAt: new Date().toISOString(),
  });
}

export class ApplyShipSetupCommand extends BaseCommand {
  constructor({
    id = "apply-ship-setup",
    title = "Apply Ship Setup",
    sourcePath = "shipSetup.selectedShip",
    debtPath = "shipSetup.generatedDebt",
    namePath = "shipSetup.shipName",
    // Optional: pass ship data directly so re-reading from state isn't needed
    shipData = null,
    status = "pending",
    pauseAfter = false,
    visible = false,
  } = {}) {
    super({
      id,
      type: "applyShipSetup",
      title,
      status,
      pauseAfter,
      visible,
    });

    this.sourcePath = sourcePath;
    this.debtPath = debtPath;
    this.namePath = namePath;
    this.shipData = shipData;
  }

  execute(engineContext) {
    const selectedShip = this.shipData || engineContext.getStateValue(this.sourcePath) || {};
    const generatedDebt = Number(engineContext.getStateValue(this.debtPath) || 0);
    const shipName = String(engineContext.getStateValue(this.namePath) || selectedShip?.name || "").trim();
    const shipRecord = makeShipRecord({ selectedShip, shipName, generatedDebt });
    const traitText = shipRecord.traits?.length ? shipRecord.traits.join(", ") : "None";

    engineContext.pushCommandsToTop([
      engineContext.commandFactory.updateState({
        id: "save-crew-starship",
        title: `Save Ship: ${shipRecord.name}`,
        operations: [
          { op: "set", path: "crewLog.ship", value: shipRecord.name },
          { op: "set", path: "crewLog.starship", value: shipRecord },
          { op: "set", path: "crewLog.debt", value: generatedDebt },
          { op: "set", path: "campaign.phase", value: "shipSetupComplete" },
          { op: "set", path: "campaign.currentStep", value: "campaignPrep" },
        ],
        pauseAfter: false,
        visible: false,
      }),
      engineContext.commandFactory.popupMessage({
        id: "ship-setup-summary",
        title: "Ship Ready",
        message: `${shipRecord.name} is a ${shipRecord.shipType}. Hull: ${shipRecord.hullThreshold}. Debt: ${shipRecord.debtOwed}. Traits: ${traitText}.`,
        buttonText: "Continue",
        pauseAfter: false,
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.continue();
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Applied ship setup for ${shipRecord.name}.`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      sourcePath: this.sourcePath,
      debtPath: this.debtPath,
      namePath: this.namePath,
      shipData: this.shipData,
    });
  }
}

export default ApplyShipSetupCommand;
