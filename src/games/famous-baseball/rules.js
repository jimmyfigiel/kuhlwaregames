// /src/games/famous-baseball/rules.js

const OUT_TYPES = {
  strikeout: [
    "He fooled him completely — the batter goes down on strikes.",
    "Big swing and a miss! That is a strikeout.",
    "The pitcher wins that duel, and the batter heads back to the bench.",
    "He never had a chance on that one. Strike three.",
    "A nasty pitch gets the swing, and that is one away.",
    "The batter was guessing, and he guessed wrong. Strikeout.",
    "That pitch had him tied in knots. He is gone on strikes.",
    "The pitcher reaches back and gets the strikeout.",
    "Nothing doing at the plate — that is strike three.",
    "The count ends with a whiff, and the pitcher records the out.",
  ],

  groundout: [
    "A routine grounder is handled cleanly, and the throw beats the runner to first.",
    "Chopped on the infield — easy play, easy out.",
    "The batter rolls one over, and the defense takes care of it.",
    "A slow roller turns into a simple groundout.",
    "Hit on the ground, scooped up, fired across — one away.",
    "The defense makes no mistake on that ground ball.",
    "That one never left the dirt, and the inning gets one out heavier.",
    "A harmless ground ball is turned into an out.",
    "The infielder gathers it in and makes the throw in plenty of time.",
    "Grounded weakly, and the defense calmly finishes the play.",
  ],

  lineout: [
    "That ball was hit hard, but right at a fielder for the out.",
    "A sharp liner finds a glove instead of open grass.",
    "He squared it up, but the defense was standing right there.",
    "A screaming line drive is snatched out of the air.",
    "That looked dangerous off the bat, but it becomes an out.",
    "Hard contact, bad luck — the liner is caught.",
    "The fielder barely had to move, and the batter cannot believe it.",
    "A frozen-rope line drive is handled for the out.",
    "The batter stings it, but the defense wins the moment.",
    "That was ticketed for a hit, but the glove says otherwise.",
  ],

  flyout: [
    "A high fly ball hangs up long enough for the fielder to settle under it.",
    "Lifted into the air, but there is room to make the catch.",
    "That one is playable, and the outfielder pulls it in.",
    "A lazy fly ball drifts into an easy out.",
    "He got under it, and the defense had plenty of time.",
    "The ball carries for a moment, but not far enough.",
    "A towering fly becomes a routine catch.",
    "The outfielder camps underneath it and squeezes it for the out.",
    "That one had height, but not the distance.",
    "A fly ball to the outfield is handled without trouble.",
  ],
};

const HIT_RESULTS = {
  0: {
    title: "Triple!",
    detail:
      "The ball rattles into the gap and the batter races all the way to third.",
    bases: 3,
  },

  1: {
    title: "Double Play!",
    detail:
      "A sharp grounder turns into two quick outs for the defense.",
    doublePlay: true,
  },

  2: {
    title: "Pop Fly Out!",
    detail:
      "The batter gets underneath it and the defense records the easy out.",
    out: true,
  },

  3: {
    title: "Single!",
    detail:
      "A clean base hit puts the batter aboard safely.",
    bases: 1,
  },

  4: {
    title: "Double!",
    detail:
      "Driven deep into the outfield for a stand-up double.",
    bases: 2,
  },

  5: {
    title: "Home Run!",
    detail:
      "That ball is crushed deep and gone!",
    homeRun: true,
  },

  6: {
    title: "Triple Play!",
    detail:
      "An unbelievable triple play ends the threat immediately.",
    triplePlay: true,
  },
};

function randomFromList(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomOutResult() {
  const types = Object.keys(OUT_TYPES);

  const type =
    types[Math.floor(Math.random() * types.length)];

  return {
    type,

    title:
      type === "strikeout"
        ? "Strikeout!"
        : type === "groundout"
          ? "Groundout!"
          : type === "lineout"
            ? "Lineout!"
            : "Flyout!",

    detail: randomFromList(OUT_TYPES[type]),
  };
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function createEmptyBases() {
  return {
    first: false,
    second: false,
    third: false,
  };
}

function nextHalfInning(state) {
  const nextState = cloneState(state);

  nextState.outs = 0;
  nextState.bases = createEmptyBases();
  nextState.submitted = {};

  if (nextState.half === "top") {
    nextState.half = "bottom";
    nextState.battingTeam = "home";
    nextState.fieldingTeam = "visitors";
  } else {
    nextState.half = "top";
    nextState.inning += 1;
    nextState.battingTeam = "visitors";
    nextState.fieldingTeam = "home";
  }

  if (nextState.inning > nextState.maxInnings) {
    nextState.phase = "gameOver";

    nextState.lastResult = {
      title: "Game Over",
      detail: `Final Score: Visitors ${nextState.score.visitors} - Home ${nextState.score.home}`,
    };

    nextState.log.unshift(nextState.lastResult);

    return nextState;
  }

  nextState.phase = "pitch";

  nextState.lastResult = {
    title: "Side Retired",
    detail: `Now entering the ${nextState.half} of inning ${nextState.inning}.`,
  };

  nextState.log.unshift(nextState.lastResult);

  return nextState;
}

function addOut(state, count = 1) {
  state.outs += count;

  if (state.outs >= 3) {
    return nextHalfInning(state);
  }

  return state;
}

function advanceRunners(state, basesEarned) {
  const runners = [];

  if (state.bases.third) runners.push(3);
  if (state.bases.second) runners.push(2);
  if (state.bases.first) runners.push(1);

  runners.push(0);

  state.bases = createEmptyBases();

  runners.forEach((runnerBase) => {
    const newBase = runnerBase + basesEarned;

    if (newBase >= 4) {
      state.score[state.battingTeam] += 1;
    } else if (newBase === 1) {
      state.bases.first = true;
    } else if (newBase === 2) {
      state.bases.second = true;
    } else if (newBase === 3) {
      state.bases.third = true;
    }
  });
}

function resolvePitch(state) {
  const pitcherChoice = state.submitted.pitcher;
  const batterChoice = state.submitted.batter;

  const mismatch =
    (pitcherChoice === "strike" && batterChoice === "take") ||
    (pitcherChoice === "ball" && batterChoice === "swing");

  if (mismatch) {
    const outResult = randomOutResult();

    state.lastResult = {
      title: outResult.title,
      detail: `${outResult.detail} Pitcher threw a ${pitcherChoice}. Batter chose to ${batterChoice}.`,
    };

    state.log.unshift(state.lastResult);

    state.phase = "pitch";
    state.submitted = {};

    return addOut(state);
  }

  if (
    pitcherChoice === "ball" &&
    batterChoice === "take"
  ) {
    advanceRunners(state, 1);

    state.lastResult = {
      title: "Walk!",
      detail:
        "The batter takes the free pass and moves to first base.",
    };

    state.log.unshift(state.lastResult);

    state.phase = "pitch";
    state.submitted = {};

    return state;
  }

  if (
    pitcherChoice === "strike" &&
    batterChoice === "swing"
  ) {
    state.phase = "hitPlacement";
    state.submitted = {};

    state.lastResult = {
      title: "Ball In Play!",
      detail:
        "Both players now choose a number from 0 to 3 for hit placement.",
    };

    state.log.unshift(state.lastResult);

    return state;
  }

  return state;
}

function resolveHitPlacement(state) {
  const pitcherNumber = Number(state.submitted.pitcher);
  const batterNumber = Number(state.submitted.batter);

  const total = pitcherNumber + batterNumber;

  const result = HIT_RESULTS[total];

  if (!result) {
    state.phase = "pitch";
    state.submitted = {};

    return state;
  }

  state.lastResult = {
    title: result.title,
    detail: result.detail,
  };

  state.log.unshift(state.lastResult);

  if (result.bases) {
    advanceRunners(state, result.bases);
  }

  if (result.homeRun) {
    let runs = 1;

    if (state.bases.first) runs += 1;
    if (state.bases.second) runs += 1;
    if (state.bases.third) runs += 1;

    state.score[state.battingTeam] += runs;
    state.bases = createEmptyBases();
  }

  if (result.out) {
    addOut(state, 1);
  }

  if (result.doublePlay) {
    addOut(state, 2);
  }

  if (result.triplePlay) {
    addOut(state, 3);
  }

  state.phase = "pitch";
  state.submitted = {};

  return state;
}

export function createInitialState() {
  return {
    inning: 1,
    half: "top",

    battingTeam: "visitors",
    fieldingTeam: "home",

    outs: 0,

    score: {
      visitors: 0,
      home: 0,
    },

    bases: createEmptyBases(),

    phase: "pitch",

    submitted: {},

    maxInnings: 9,

    lastResult: {
      title: "Play Ball!",
      detail:
        "The visitors step to the plate to begin the game.",
    },

    log: [
      {
        title: "Play Ball!",
        detail:
          "The visitors step to the plate to begin the game.",
      },
    ],
  };
}

export function submitAction({
  state,
  playerSlot,
  action,
}) {
  const nextState = cloneState(state);

  if (nextState.phase === "gameOver") {
    return nextState;
  }

  const isPitcher =
    playerSlot === nextState.fieldingTeam;

  const isBatter =
    playerSlot === nextState.battingTeam;

  if (nextState.phase === "pitch") {
    if (
      action.type === "choosePitch" &&
      isPitcher
    ) {
      nextState.submitted.pitcher = action.choice;
    }

    if (
      action.type === "chooseBatterAction" &&
      isBatter
    ) {
      nextState.submitted.batter = action.choice;
    }

    if (
      nextState.submitted.pitcher &&
      nextState.submitted.batter
    ) {
      return resolvePitch(nextState);
    }

    return nextState;
  }

  if (nextState.phase === "hitPlacement") {
    if (
      action.type === "chooseHitPlacement" &&
      isPitcher
    ) {
      nextState.submitted.pitcher = action.number;
    }

    if (
      action.type === "chooseHitPlacement" &&
      isBatter
    ) {
      nextState.submitted.batter = action.number;
    }

    if (
      nextState.submitted.pitcher !== undefined &&
      nextState.submitted.batter !== undefined
    ) {
      return resolveHitPlacement(nextState);
    }

    return nextState;
  }

  return nextState;
}

export default {
  createInitialState,
  submitAction,
};