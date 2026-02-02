import { GameEventHandler } from "../types";
import { runFrame } from "./frame";
import * as parameters from "../parameters";
import * as globals from "../globals";
import { runTick } from "../logic/tick";

let previousTimestamp = 0;
const idleLoop = 3000;
let cumulativeDelta = 0;
const tickBuffer = new Uint8Array(1);
let shouldRunTick = false;
let nextTickTime = 0;

const loop = () => {
  const clientsLength = globals.clients.array.length;
  if (clientsLength) {
    const now = performance.now();

    // Run at most ONE tick per loop iteration
    if (now >= nextTickTime) {
      runTick(tickBuffer[0]);
      previousTimestamp = now;
      tickBuffer[0]++;

      // advance schedule by exactly one tick
      nextTickTime += parameters.tickInterval;

      // if we fell badly behind, realign instead of bursting
      if (nextTickTime < now - parameters.tickInterval) {
        nextTickTime = now + parameters.tickInterval;
      }
    }

    // const now = Date.now();
    // const delta = now - previousTimestamp;
    // cumulativeDelta += delta;
    // if (cumulativeDelta >= parameters.tickInterval) shouldRunTick = true;
    // // processFrame(delta, gameEventHandler, shouldProcessTick, tickBuffer[0]);
    // if (shouldRunTick) {
    //   shouldRunTick = false;
    //   cumulativeDelta -= parameters.tickInterval;
    //   tickBuffer[0]++;
    // }
    // previousTimestamp = now;
  }
  if (clientsLength) {
    setImmediate(loop);
  } else {
    setTimeout(() => loop(), idleLoop);
  }
};

export const startLoop = (gameEventHandler: GameEventHandler) => {
  previousTimestamp = Date.now();
  loop();
};
