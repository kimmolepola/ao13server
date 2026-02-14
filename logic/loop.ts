import * as parameters from "../parameters";
import * as globals from "../globals";
import { runTick } from "./tick";

const idleLoop = 3000;
const tickBuffer = new Uint8Array(1);
let nextTickTime = 0;

const loop = () => {
  const clientsLength = globals.clients.array.length;
  if (clientsLength) {
    const now = performance.now();

    // Run at most ONE tick per loop iteration
    if (now >= nextTickTime) {
      runTick(tickBuffer[0]);
      tickBuffer[0]++;

      // advance schedule by exactly one tick
      nextTickTime += parameters.tickInterval;

      // if we fell badly behind, realign instead of bursting
      if (nextTickTime < now - parameters.tickInterval) {
        nextTickTime = now + parameters.tickInterval;
      }
    }
  }
  if (clientsLength) {
    setImmediate(loop);
  } else {
    setTimeout(() => loop(), idleLoop);
  }
};

export const startLoop = () => {
  loop();
};
