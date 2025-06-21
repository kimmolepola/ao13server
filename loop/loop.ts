import { GameEventHandler } from "../types";
import { runFrame } from "./frame";
import * as parameters from "../parameters";

let previousTimestamp = 0;

const loop = (gameEventHandler: GameEventHandler) => {
  const now = Date.now();
  const delta = now - previousTimestamp;
  runFrame(delta, gameEventHandler);
  previousTimestamp = now;
  setTimeout(() => loop(gameEventHandler), parameters.tickRate);
};

export const startLoop = (gameEventHandler: GameEventHandler) => {
  previousTimestamp = Date.now();
  loop(gameEventHandler);
};
