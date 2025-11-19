import { GameEventHandler } from "../types";
import { runFrame } from "./frame";
import * as parameters from "../parameters";
import * as globals from "../globals";

let previousTimestamp = 0;
const idleLoop = 3000;

const loop = (gameEventHandler: GameEventHandler) => {
  const clientsLength = globals.clients.array.length;
  if (clientsLength) {
    const now = Date.now();
    const delta = now - previousTimestamp;
    runFrame(delta, gameEventHandler);
    previousTimestamp = now;
  }
  setTimeout(
    () => loop(gameEventHandler),
    clientsLength ? parameters.tickRate : idleLoop
  );
};

export const startLoop = (gameEventHandler: GameEventHandler) => {
  previousTimestamp = Date.now();
  loop(gameEventHandler);
};
