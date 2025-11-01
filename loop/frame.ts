import * as types from "../types";
import * as parameters from "../parameters";
import * as globals from "../globals";
import {
  resetControlValues,
  handleMovement,
  handleShot,
  checkHealth,
  detectCollision,
  handleLocalObject,
} from "./logic";
import {
  sendUnreliableState,
  syncBufferSize,
  gatherUnreliableStateDataBinary,
  resetUnreliableStateOffset,
} from "../netcode/unreliableState";

const scoreTimeInteval = 9875;

let nextSendTime = Date.now();
let nextScoreTime = Date.now();

const handleLocalObjects = (
  delta: number,
  gameEventHandler: types.GameEventHandler
) => {
  const localObjectsRemoveIndexes = [];
  for (let i = globals.localGameObjects.length - 1; i > -1; i--) {
    const o = globals.localGameObjects[i];
    if (o && o.mesh) {
      const remove = handleLocalObject(delta, o);
      remove && localObjectsRemoveIndexes.push(i);
    }
  }
  gameEventHandler({
    type: types.EventType.RemoveLocalObjectIndexes,
    data: localObjectsRemoveIndexes,
  });
  localObjectsRemoveIndexes.splice(0, localObjectsRemoveIndexes.length);
};

const handleObjects = (
  delta: number,
  time: number,
  gatherUnreliableState: boolean,
  gameEventHandler: types.GameEventHandler
) => {
  syncBufferSize();
  const objectCount = globals.sharedGameObjects.length;
  resetUnreliableStateOffset();
  for (let i = 0; i < objectCount; i++) {
    const o = globals.sharedGameObjects[i];
    if (o) {
      checkHealth(o, gameEventHandler);
      detectCollision(o, time, gameEventHandler);
      handleMovement(delta, o);
      handleShot(delta, o, gameEventHandler);
      // mock ->
      if (Date.now() > nextScoreTime) {
        nextScoreTime = Date.now() + scoreTimeInteval;
        o.score += 1;
      }
      // <-
      if (gatherUnreliableState) {
        gatherUnreliableStateDataBinary(o);
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
  const shouldSendUnreliableState =
    time > nextSendTime &&
    globals.idsVersionMax255.value ===
      globals.recentlySentState.value?.idsVersionMax255;

  handleLocalObjects(delta, gameEventHandler);
  handleObjects(delta, time, shouldSendUnreliableState, gameEventHandler);

  if (shouldSendUnreliableState) {
    nextSendTime = time + parameters.unreliableStateInterval;
    sendUnreliableState();
  }
};
