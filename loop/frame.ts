import * as types from "../types";
import * as parameters from "../parameters";
import * as globals from "../globals";
import {
  refreshControlValues,
  handleMovement,
  handleShot,
  checkHealth,
  checkCollisions,
  handleLocalObject,
} from "./logic";
import {
  sendState,
  gatherStateData,
  handleNewSequence,
} from "../netcode/state";

const scoreTimeInteval = 9875;

let nextSendTime = Date.now();
let nextScoreTime = Date.now();
const localObjectsRemoveIndexes: number[] = [];

const handleLocalObjects = (
  delta: number,
  gameEventHandler: types.GameEventHandler
) => {
  for (let i = globals.localObjects.length - 1; i > -1; i--) {
    const o = globals.localObjects[i];
    if (o) {
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
  gatherState: boolean,
  gameEventHandler: types.GameEventHandler
) => {
  // gatherState && handleNewSequence();

  const objectCount = globals.sharedObjects.length;
  for (let i = 0; i < objectCount; i++) {
    const o = globals.sharedObjects[i];
    if (o) {
      checkHealth(o, gameEventHandler);
      // detectCollision(o, gameEventHandler);
      handleMovement(delta, o);
      handleShot(delta, o, gameEventHandler);
      // mock ->
      if (Date.now() > nextScoreTime) {
        nextScoreTime = Date.now() + scoreTimeInteval;
        o.score += 1;
      }
      // <-
      if (gatherState) {
        // gatherStateData(i, o);
        refreshControlValues(o);
      }
    }
  }
};

export const runFrame = (
  delta: number,
  gameEventHandler: types.GameEventHandler
) => {
  const time = Date.now();
  const shouldSendState = time > nextSendTime;

  handleLocalObjects(delta, gameEventHandler);
  handleObjects(delta, time, shouldSendState, gameEventHandler);

  // if (shouldSendState) {
  //   nextSendTime = time + parameters.unreliableStateInterval;
  //   sendState();
  // }
};
