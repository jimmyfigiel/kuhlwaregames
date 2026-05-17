// /src/games/famous-baseball/panels/ActionPanel.jsx

import React from "react";

function Card({ children }) {
  return <section className="fbb-card">{children}</section>;
}

function ChoiceButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      className="fbb-choice-button"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function ActionPanel({
  state,
  role,
  onChoosePitch,
  onChooseBatterAction,
  onChooseHitPlacement,
}) {
  const isPitcher = role === "pitcher";
  const isBatter = role === "batter";

  const pitcherSubmitted = state.submitted?.pitcher;
  const batterSubmitted = state.submitted?.batter;

  if (state.phase === "pitch") {
    return (
      <Card>
        <div className="fbb-section-title">Pitch Phase</div>

        {isPitcher && !pitcherSubmitted && (
          <>
            <div>Choose your pitch:</div>

            <div className="fbb-button-row">
              <ChoiceButton onClick={() => onChoosePitch("strike")}>
                ✊ Strike
              </ChoiceButton>

              <ChoiceButton onClick={() => onChoosePitch("ball")}>
                ✋ Ball
              </ChoiceButton>
            </div>
          </>
        )}

        {isBatter && !batterSubmitted && (
          <>
            <div>Choose your action:</div>

            <div className="fbb-button-row">
              <ChoiceButton onClick={() => onChooseBatterAction("swing")}>
                ✊ Swing
              </ChoiceButton>

              <ChoiceButton onClick={() => onChooseBatterAction("take")}>
                ✋ Take
              </ChoiceButton>
            </div>
          </>
        )}

        {isPitcher && pitcherSubmitted && (
          <div>Pitch submitted. Waiting for batter...</div>
        )}

        {isBatter && batterSubmitted && (
          <div>Batter action submitted. Waiting for pitcher...</div>
        )}

        {role === "spectator" && <div>Waiting for both players...</div>}
      </Card>
    );
  }

  if (state.phase === "hitPlacement") {
    return (
      <Card>
        <div className="fbb-section-title">Hit Placement</div>

        <div>Both players secretly choose a number from 0 to 3.</div>

        {(isPitcher || isBatter) && (
          <div className="fbb-button-row">
            {[0, 1, 2, 3].map((number) => (
              <ChoiceButton
                key={number}
                onClick={() => onChooseHitPlacement(number)}
              >
                {number}
              </ChoiceButton>
            ))}
          </div>
        )}

        {isPitcher && pitcherSubmitted && <div>Pitcher number submitted.</div>}

        {isBatter && batterSubmitted && <div>Batter number submitted.</div>}

        <div className="fbb-small-chart">
          0 = Triple · 1 = Double Play · 2 = Pop Fly · 3 = Single · 4 = Double
          · 5 = Home Run · 6 = Triple Play
        </div>
      </Card>
    );
  }

  if (state.phase === "gameOver") {
    return (
      <Card>
        <div className="fbb-section-title">Game Over</div>

        <div>
          Visitors {state.score?.visitors || 0}
          {" - "}
          {state.score?.home || 0} Home
        </div>
      </Card>
    );
  }

  return null;
}