import * as types from "../types";
import * as parameters from "../parameters";
import * as globals from "../globals";
import {
  gatherUpdateData,
  resetControlValues,
  handleMovement,
  handleShot,
  checkHealth,
  detectCollision,
} from "./logic";
import { sendUnordered } from "../service/channels";

let nextSendTime = Date.now();
let nextScoreTime = Date.now();
const scoreTimeInteval = 9875;

const handleObjects = (
  delta: number,
  updateData: { [id: string]: types.UpdateObject },
  time: number,
  gatherUpdate: boolean,
  gameEventHandler: types.GameEventHandler
) => {
  for (let i = globals.sharedGameObjects.length - 1; i > -1; i--) {
    const o = globals.sharedGameObjects[i];
    if (o) {
      checkHealth(o, gameEventHandler);
      detectCollision(o, time, gameEventHandler);
      handleMovement(delta, o, o.mesh);
      handleShot(delta, o, gameEventHandler);
      // mock ->
      if (Date.now() > nextScoreTime) {
        nextScoreTime = Date.now() + scoreTimeInteval;
        o.score += 1;
      }
      // <-
      if (gatherUpdate) {
        gatherUpdateData(updateData, o);
        resetControlValues(o);
      }
    }
  }
};

export const runFrame = (
  delta: number,
  gameEventHandler: types.GameEventHandler
) => {
  const time = Date.now();
  const updateData: { [id: string]: types.UpdateObject } = {};
  const send = time > nextSendTime;

  handleObjects(delta, updateData, time, send, gameEventHandler);

  if (send) {
    nextSendTime = time + parameters.sendInterval;
    sendUnordered({
      timestamp: time,
      type: types.ServerDataType.Update,
      data: updateData,
    });
  }
};
