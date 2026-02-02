import { GameEventHandler } from "../types";
import { runFrame as processFrame } from "../loop/frame";
import * as parameters from "../parameters";
import * as globals from "../globals";
import { runTick } from "../logic/tick";

const TICK_RATE = 60; // game ticks per second
const TICK_MS = 1000 / TICK_RATE; // ~16.666 or 17 ms

let tickIndex = 0;
let nextTickTime = 0;

function gameLoop() {
  const now = performance.now();

  // Run at most ONE tick per loop iteration
  if (now >= nextTickTime) {
    runGameTick(TICK_MS, tickIndex);
    tickIndex++;

    // advance schedule by exactly one tick
    nextTickTime += TICK_MS;

    // if we fell badly behind, realign instead of bursting
    if (nextTickTime < now - TICK_MS) {
      nextTickTime = now + TICK_MS;
    }
  }

  setImmediate(gameLoop);
}

export const startLoop = (gameEventHandler: GameEventHandler) => {
  nextTickTime = performance.now() + TICK_MS;
  gameLoop();
};
