import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { XP_GAIN_RULES } from "../data/tables/postBattleTables";
import { isObjectiveAchieved, getActiveCrewMembers } from "./postBattleHelpers";

function computeXpGain(state, member) {
  const detail = state?.crewLog?.crewDetails?.[member.id] || {};
  const outcome = detail.battleOutcome;

  if (!outcome || outcome === "didNotParticipate") return { amount: 0, reason: "Did not participate." };
  if (outcome === "fledEarly") return { amount: 0, reason: "Fled early — no XP." };

  const won = isObjectiveAchieved(state);
  const easyMode = state?.campaign?.difficultyMode === "easy";
  const questFinale = state?.encounter?.questWasFinale === true;

  let amount = 0;
  const parts = [];

  if (outcome === "casualty") {
    amount += XP_GAIN_RULES.casualty;
    parts.push(`+${XP_GAIN_RULES.casualty} became a casualty`);
  } else if (outcome === "survived") {
    if (won) {
      amount += XP_GAIN_RULES.survivedWon;
      parts.push(`+${XP_GAIN_RULES.survivedWon} survived and Won`);
    } else {
      amount += XP_GAIN_RULES.survivedNoWin;
      parts.push(`+${XP_GAIN_RULES.survivedNoWin} survived, did not Win`);
    }
  }

  if (easyMode) {
    amount += XP_GAIN_RULES.easyMode;
    parts.push(`+${XP_GAIN_RULES.easyMode} Easy mode`);
  }

  if (questFinale) {
    amount += XP_GAIN_RULES.questFinale;
    parts.push(`+${XP_GAIN_RULES.questFinale} Quest finale`);
  }

  return { amount, reason: parts.join(", ") };
}

export class ExperienceUpgradesCommand extends BaseCommand {
  constructor({ id, title = "Post-Battle: Experience and Character Upgrades", status = "pending", pauseAfter = false, visible = true } = {}) {
    super({ id, type: "experienceUpgrades", title, status, pauseAfter, visible });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const state = engineContext.state;
    const baseId = this.id;

    const crewMembers = getActiveCrewMembers(state);
    const uniqueKillCandidate = state?.encounter?.killedUniqueIndividual === "yes";

    const ops = [];
    const lines = [];

    for (const member of crewMembers) {
      const { amount, reason } = computeXpGain(state, member);
      if (amount > 0) {
        ops.push({ op: "increment", path: `crewLog.crewDetails.${member.id}.xp`, amount });
      }
      lines.push(`${member.name}: +${amount} XP${reason ? ` (${reason})` : ""}`);
    }

    const cmds = [];

    if (ops.length > 0) {
      cmds.push(
        factory.updateState({
          id: `${baseId}-apply-xp`,
          title: "Apply Battle XP",
          operations: ops,
          pauseAfter: false,
          visible: false,
        })
      );
    }

    cmds.push(
      factory.popupMessage({
        id: `${baseId}-summary`,
        title: "Experience and Character Upgrades",
        message: `Battle XP awarded:\n${lines.map((l) => `• ${l}`).join("\n")}`,
        buttonText: "Continue",
        pauseAfter: false,
      })
    );

    if (uniqueKillCandidate && crewMembers.length > 0) {
      cmds.push(
        factory.choice({
          id: `${baseId}-unique-kill-credit`,
          title: "Who Killed the Unique Individual?",
          prompt: "Select the crew member who gets +1 XP for killing a Unique Individual.",
          options: crewMembers.map((m) => ({ id: m.id, label: m.name, value: m.id })),
          saveTo: "postBattleTemp.uniqueKillCreditMemberId",
          buttonText: "Confirm",
          pauseAfter: false,
        }),
        factory.postBattleDispatch({
          id: `${baseId}-unique-kill-dispatch`,
          dispatchKey: "uniqueKillXpDispatch",
        })
      );
    }

    cmds.push(
      factory.postBattleDispatch({
        id: `${baseId}-start-upgrade-offer`,
        dispatchKey: "upgradeOffer",
      })
    );

    engineContext.pushCommandsToTop(cmds);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({ type: "commandCompleted", text: "Loaded Experience and Character Upgrades step.", commandId: this.id });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON() });
  }
}

export default ExperienceUpgradesCommand;
