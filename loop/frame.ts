import * as types from "../types";
import * as parameters from "../parameters";
import * as globals from "../globals";
import {
  resetControlValues,
  handleMovement,
  handleShot,
  checkHealth,
  detectCollision,
  gatherUnreliableStateDataBinary,
} from "./logic";
import { sendUnreliableBinary } from "../service/channels";

const scoreTimeInteval = 9875;

let nextSendTime = Date.now();
let nextScoreTime = Date.now();
let buffer = new ArrayBuffer(types.unreliableStateInfoBytes);
let view = new DataView(buffer);
let previousObjectCount = 0;
let offset = 0;

const handleObjects = (
  delta: number,
  time: number,
  gatherUnreliableState: boolean,
  gameEventHandler: types.GameEventHandler
) => {
  const objectCount = globals.sharedGameObjects.length;
  if (objectCount !== previousObjectCount) {
    previousObjectCount = objectCount;
    buffer = new ArrayBuffer(
      types.unreliableStateInfoBytes +
        objectCount * types.unreliableStateSingleObjectMaxBytes
    );
    view = new DataView(buffer);
  }
  offset = types.unreliableStateInfoBytes;
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
        offset = gatherUnreliableStateDataBinary(view, offset, o);
        resetControlValues(o);
      }
    }
  }
};

const incrementAndLoop16BitSequence = () => {
  let seq = view.getUint16(0);
  seq = (seq + 1) % 65536;
  view.setUint16(0, seq);
};

const insertStateSequenceNumber = () => {
  const sequenceNumber = globals.recentlySentState.value?.sequenceNumberMax255;
  sequenceNumber !== undefined && view.setUint8(2, sequenceNumber);
};

export const runFrame = (
  delta: number,
  gameEventHandler: types.GameEventHandler
) => {
  const time = Date.now();
  const sendUnreliableState =
    time > nextSendTime &&
    globals.idsVersionMax255.value ===
      globals.recentlySentState.value?.idsVersionMax255;

  handleObjects(delta, time, sendUnreliableState, gameEventHandler);

  if (sendUnreliableState) {
    nextSendTime = time + parameters.unreliableStateInterval;
    insertStateSequenceNumber();
    sendUnreliableBinary(Buffer.from(buffer, 0, offset));
    incrementAndLoop16BitSequence();
  }
};
