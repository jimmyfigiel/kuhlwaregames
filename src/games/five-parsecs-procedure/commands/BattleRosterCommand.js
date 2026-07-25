import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

const OUTCOME_OPTIONS = [
  { id: "survived", label: "Survived and Fought", value: "survived", description: "Took part in the battle and made it through." },
  { id: "casualty", label: "Became a Casualty", value: "casualty", description: "Went down during the fight — roll on the Injury Table in Post-Battle." },
  { id: "fledEarly", label: "Fled Early (rounds 1-2)", value: "fledEarly", description: "Bailed from the battlefield in the first 2 rounds. Earns no XP." },
  { id: "didNotParticipate", label: "Did Not Participate", value: "didNotParticipate", description: "Was not part of this battle (e.g. in Sick Bay)." },
];

export class BattleRosterCommand extends BaseCommand {
  constructor({ id, title = "Post-Battle: Battle Roster", status = "pending", pauseAfter = false, visible = true } = {}) {
    super({ id, type: "battleRoster", title, status, pauseAfter, visible });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const state = engineContext.state;
    const baseId = this.id;

    const crewMembers = (state?.crewLog?.crewMembers || []).filter(
      (member) => !state?.crewLog?.crewDetails?.[member.id]?.removedFromCrew
    );

    const cmds = [];

    if (typeof state?.encounter?.heldField !== "boolean") {
      cmds.push(
        factory.choice({
          id: `${baseId}-held-field`,
          title: "Held the Field?",
          prompt: "Did your crew hold the field at the end of the battle (i.e. the enemy fled or was eliminated, and you remained in control of the battlefield)?",
          options: [
            { id: "yes", label: "Yes — Held the Field", value: "yes" },
            { id: "no", label: "No", value: "no" },
          ],
          saveTo: "battleRosterTemp.heldFieldChoice",
          buttonText: "Confirm",
          pauseAfter: false,
        })
      );
    }

    if (typeof state?.encounter?.objectiveAchieved !== "string") {
      cmds.push(
        factory.choice({
          id: `${baseId}-objective`,
          title: "Objective Achieved?",
          prompt: "Did you achieve your mission objective?",
          options: [
            { id: "yes", label: "Yes — Objective Achieved", value: "objective-achieved" },
            { id: "no", label: "No — Objective Not Achieved", value: "objective-failed" },
          ],
          saveTo: "encounter.objectiveAchieved",
          buttonText: "Confirm",
          pauseAfter: false,
        })
      );
    }

    if (!Number.isFinite(Number(state?.encounter?.totalRounds))) {
      cmds.push(
        factory.numberInput({
          id: `${baseId}-total-rounds`,
          title: "Rounds Fought",
          prompt: "How many rounds did the battle last?",
          defaultValue: 1,
          min: 1,
          saveTo: "encounter.totalRounds",
          buttonText: "OK",
          pauseAfter: false,
        })
      );
    }

    cmds.push(
      factory.choice({
        id: `${baseId}-invasion-threat`,
        title: "Invasion Threat?",
        prompt: "Was the enemy force you fought an Invasion Threat (as listed in their profile)?",
        options: [
          { id: "yes", label: "Yes", value: "yes" },
          { id: "no", label: "No", value: "no" },
        ],
        saveTo: "encounter.enemyWasInvasionThreat",
        buttonText: "Confirm",
        pauseAfter: false,
      }),
      factory.choice({
        id: `${baseId}-unique-kill`,
        title: "Unique Individual Killed?",
        prompt: "Did you kill a Unique Individual during this battle?",
        options: [
          { id: "yes", label: "Yes", value: "yes" },
          { id: "no", label: "No", value: "no" },
        ],
        saveTo: "encounter.killedUniqueIndividual",
        buttonText: "Confirm",
        pauseAfter: false,
      })
    );

    // Consolidate the temp held-field choice (if asked) into the canonical boolean path.
    cmds.push(
      factory.postBattleDispatch({
        id: `${baseId}-consolidate-held-field-dispatch`,
        dispatchKey: "consolidateHeldField",
      })
    );

    if (crewMembers.length > 0) {
      cmds.push(
        factory.popupMessage({
          id: `${baseId}-roster-intro`,
          title: "Battle Roster",
          message: `Record what happened to each of your ${crewMembers.length} crew member${crewMembers.length === 1 ? "" : "s"} this battle.`,
          buttonText: "Start",
          pauseAfter: false,
        })
      );

      for (const member of crewMembers) {
        cmds.push(
          factory.choice({
            id: `${baseId}-outcome-${member.id}`,
            title: `Battle Outcome: ${member.name}`,
            prompt: `What happened to ${member.name} in this battle?`,
            options: OUTCOME_OPTIONS,
            saveTo: `crewLog.crewDetails.${member.id}.battleOutcome`,
            buttonText: "Confirm",
            pauseAfter: false,
          })
        );
      }
    }

    engineContext.pushCommandsToTop(cmds);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: "Loaded Battle Roster step.",
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON() });
  }
}

export default BattleRosterCommand;
