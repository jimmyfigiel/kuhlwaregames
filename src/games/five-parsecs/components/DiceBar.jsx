import React, { useEffect, useState } from "react";

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDice(count, sides) {
  const rolls = Array.from({ length: count }, () => rollDie(sides));
  const total = rolls.reduce((sum, value) => sum + value, 0);

  return {
    label: count === 1 ? `D${sides}` : `${count}D${sides}`,
    rolls,
    total,
  };
}

function isTypingTarget(event) {
  const target = event.target;

  if (!target) return false;

  const tagName = target.tagName?.toLowerCase();

  if (tagName === "input") return true;
  if (tagName === "textarea") return true;
  if (tagName === "select") return true;
  if (target.isContentEditable) return true;

  return false;
}

export default function DiceBar() {
  const [result, setResult] = useState(null);

  function doRoll(count, sides) {
    setResult(rollDice(count, sides));
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (isTypingTarget(event)) {
        return;
      }

      if (event.key === "1") {
        doRoll(1, 6);
      } else if (event.key === "2") {
        doRoll(2, 6);
      } else if (event.key === "3") {
        doRoll(1, 10);
      } else if (event.key === "4") {
        doRoll(2, 10);
      } else if (event.key === "5") {
        doRoll(1, 100);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="fp-dicebar">
      <div className="fp-dice-buttons">
        <button className="fp-btn fp-die-btn" onClick={() => doRoll(1, 6)}>
          D6
        </button>

        <button className="fp-btn fp-die-btn" onClick={() => doRoll(2, 6)}>
          2D6
        </button>

        <button className="fp-btn fp-die-btn" onClick={() => doRoll(1, 10)}>
          D10
        </button>

        <button className="fp-btn fp-die-btn" onClick={() => doRoll(2, 10)}>
          2D10
        </button>

        <button className="fp-btn fp-die-btn" onClick={() => doRoll(1, 100)}>
          D100
        </button>
      </div>

      {result && (
        <div className="fp-dice-result">
          <span className="fp-dice-label">{result.label}</span>
          <span className="fp-dice-total">{result.total}</span>
          <span className="fp-dice-rolls">
            [{result.rolls.join(", ")}]
          </span>
        </div>
      )}
    </div>
  );
}