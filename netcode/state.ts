import * as globals from "../globals";
import * as types from "../types";
import {
  getAxisValueToNetwork,
  encodeQuaternionWithOnlyZRotation,
} from "../utils";
import { sendUnreliableBinary } from "../service/channels";

const sequenceNumberBytes = 1;
let buffer = new ArrayBuffer(sequenceNumberBytes);
let view = new DataView(buffer);
let previousObjectCount = 0;
let offset = 0;
let sequenceNumber = 0;

const recentStates: types.RecentStates = {
  0: { acknowledged: false, state: {} },
  32: { acknowledged: false, state: {} },
  64: { acknowledged: false, state: {} },
  96: { acknowledged: false, state: {} },
  128: { acknowledged: false, state: {} },
  160: { acknowledged: false, state: {} },
  192: { acknowledged: false, state: {} },
  224: { acknowledged: false, state: {} },
};

const shouldAddToRecentStates = () => sequenceNumber % 32 === 0;

const resetRecentStatesCurrentSequence = () => {
  if (shouldAddToRecentStates()) {
    delete recentStates[sequenceNumber];
    recentStates[sequenceNumber] = { acknowledged: false, state: {} };
  }
};

const getComparisonSeqNumber = () => (sequenceNumber + 256 - 32) & 0xff;

const getStateToCompareTo = () => {
  return recentStates[getComparisonSeqNumber()];
};

const handle8BitSequenceNumber = () => {
  view.setUint8(0, sequenceNumber);
  sequenceNumber = (sequenceNumber + 1) & 0xff;
};

const resetStateOffset = () => {
  offset = sequenceNumberBytes;
};

const syncBufferSize = () => {
  const objectCount = globals.sharedGameObjects.length;
  if (objectCount !== previousObjectCount) {
    previousObjectCount = objectCount;
    const maxBytes =
      sequenceNumberBytes +
      objectCount * types.unreliableStateSingleObjectMaxBytes;
    buffer = new ArrayBuffer(maxBytes);
    view = new DataView(buffer);
    handle8BitSequenceNumber();
  }
};

const getUint8Bytes = (num: number) => {
  const uint32 = num >>> 0; // Coerce to unsigned 32-bit
  return [
    uint32 & 0xff,
    (uint32 >>> 8) & 0xff,
    (uint32 >>> 16) & 0xff,
    (uint32 >>> 24) & 0xff,
  ];
};

const getDifferenceSignificance = (
  uint8BytesA: number[],
  uint8BytesB: number[]
) => {
  for (let i = uint8BytesA.length - 1; i--; i <= 0) {
    if (uint8BytesA[i] !== uint8BytesB[i]) {
      return i + 1;
    }
  }
  return 0;
};

const acknowledgements: {
  expectedSequenceNumber: number;
  acknowledged: { [clientId: string]: boolean };
} = {
  expectedSequenceNumber: 0,
  acknowledged: {},
};

const resetExpectedAcks = () => {
  acknowledgements.expectedSequenceNumber = getComparisonSeqNumber();
  acknowledgements.acknowledged = {};
};

const checkAcks = () => {
  const seq = acknowledgements.expectedSequenceNumber;
  const recentState = recentStates[seq];
  if (!recentState.acknowledged) {
    for (let i = 0; i < globals.clients.array.length; i++) {
      const clientId = globals.clients.array[i].id;
      if (!acknowledgements.acknowledged[clientId]) {
        return;
      }
    }
    recentState.acknowledged = true;
  }
};

export const receiveAck = (seqNum: number, clientId: string) => {
  if (acknowledgements.expectedSequenceNumber === seqNum) {
    acknowledgements.acknowledged[clientId] = true;
  }
};

export const sendState = () => {
  sendUnreliableBinary(Buffer.from(buffer, 0, offset));
  handle8BitSequenceNumber();
};

export const handleNewSequence = () => {
  syncBufferSize();
  resetStateOffset();
  checkAcks();
  if (shouldAddToRecentStates()) {
    resetRecentStatesCurrentSequence();
    resetExpectedAcks();
  }
};

export const gatherStateData = (
  index: number,
  gameObject: types.SharedGameObject
) => {
  const o = gameObject;

  const idOverNetwork = o.idOverNetwork;
  const x = getAxisValueToNetwork(o.mesh.position.x);
  const y = getAxisValueToNetwork(o.mesh.position.y);
  const z = o.positionZ;
  const angleZ = encodeQuaternionWithOnlyZRotation(o.mesh.quaternion);
  const ____ctrlsUp = o.controlsOverChannelsUp;
  const __ctrlsDown = o.controlsOverChannelsDown;
  const __ctrlsLeft = o.controlsOverChannelsLeft;
  const _ctrlsRight = o.controlsOverChannelsRight;
  const _ctrlsSpace = o.controlsOverChannelsSpace;
  const _____ctrlsD = o.controlsOverChannelsD;
  const _____ctrlsF = o.controlsOverChannelsF;

  let controls = 0b00000000;
  ____ctrlsUp && (controls |= 0b00000001);
  __ctrlsDown && (controls |= 0b00000010);
  __ctrlsLeft && (controls |= 0b00000100);
  _ctrlsRight && (controls |= 0b00001000);
  _ctrlsSpace && (controls |= 0b00010000);
  _____ctrlsD && (controls |= 0b00100000);
  _____ctrlsF && (controls |= 0b01000000);

  const healthByte = o.health & 0xff;
  const xBytes = getUint8Bytes(x);
  const yBytes = getUint8Bytes(y);
  const zBytes = getUint8Bytes(z);
  const angleZBytes = getUint8Bytes(angleZ);

  let ____indexHasChanged = true;
  let _controlsHasChanged = true;
  let ___healthHasChanged = true;
  let ________xHasChanged = true;
  let ________yHasChanged = true;
  let ________zHasChanged = true;
  let ___angleZHasChanged = true;
  let xDifferenceSignificance = 4;
  let yDifferenceSignificance = 4;
  let zDifferenceSignificance = 2;
  let angleZDifferenceSignificance = 2;
  let providedBytesForPositionAndAngleHasChanged = true;

  const stateToCompareTo = getStateToCompareTo();
  const oState = stateToCompareTo.state[idOverNetwork];
  if (oState && stateToCompareTo.acknowledged) {
    index !== oState.index && (____indexHasChanged = true);
    controls !== oState.controls && (_controlsHasChanged = true);
    healthByte !== oState.health && (___healthHasChanged = true);
    const oXBytes = getUint8Bytes(oState.x);
    xDifferenceSignificance = getDifferenceSignificance(xBytes, oXBytes);
    const oYBytes = getUint8Bytes(oState.y);
    yDifferenceSignificance = getDifferenceSignificance(yBytes, oYBytes);
    const oZBytes = getUint8Bytes(oState.z);
    zDifferenceSignificance = getDifferenceSignificance(zBytes, oZBytes);
    const oAngleZBytes = getUint8Bytes(oState.angleZ);
    angleZDifferenceSignificance = getDifferenceSignificance(
      angleZBytes,
      oAngleZBytes
    );
  }

  xDifferenceSignificance > 0 && (________xHasChanged = true);
  yDifferenceSignificance > 0 && (________yHasChanged = true);
  zDifferenceSignificance > 0 && (________zHasChanged = true);
  angleZDifferenceSignificance > 0 && (___angleZHasChanged = true);

  let providedBytesForPositionAndAngle = 0b00000000;

  if (xDifferenceSignificance === 4) {
    providedBytesForPositionAndAngle |= 0b00000011; // bit 1&2
  } else if (xDifferenceSignificance === 3) {
    providedBytesForPositionAndAngle |= 0b00000010; // bit 2
  } else if (xDifferenceSignificance === 2) {
    providedBytesForPositionAndAngle |= 0b00000001; // bit 1
  }

  if (yDifferenceSignificance === 4)
    providedBytesForPositionAndAngle |= 0b00001100; // bit 3&4
  if (yDifferenceSignificance === 3)
    providedBytesForPositionAndAngle |= 0b00001000; // bit 4
  if (yDifferenceSignificance === 2)
    providedBytesForPositionAndAngle |= 0b00000100; // bit 3
  if (zDifferenceSignificance === 2)
    providedBytesForPositionAndAngle |= 0b00010000; // bit 5
  if (angleZDifferenceSignificance === 2)
    providedBytesForPositionAndAngle |= 0b00100000; // bit 6

  const a = providedBytesForPositionAndAngle;
  const b = oState?.providedBytesForPositionAndAngle;
  a !== b && (providedBytesForPositionAndAngleHasChanged = true);

  let providedValues1to8 = 0b00000000;
  ____indexHasChanged && (providedValues1to8 |= 0b00000001);
  _controlsHasChanged && (providedValues1to8 |= 0b00000010);
  ___healthHasChanged && (providedValues1to8 |= 0b00000100);
  ________xHasChanged && (providedValues1to8 |= 0b00001000);
  ________yHasChanged && (providedValues1to8 |= 0b00010000);
  ________zHasChanged && (providedValues1to8 |= 0b00100000);
  ___angleZHasChanged && (providedValues1to8 |= 0b01000000);
  providedBytesForPositionAndAngleHasChanged &&
    (providedValues1to8 |= 0b10000000);

  let localOffset = 0;

  const setUint8 = (value: number) => {
    view.setUint8(offset + localOffset, value);
    localOffset++;
  };

  const insertChangedBytes = (
    differenceSignificance: number,
    bytes: number[]
  ) => {
    for (let i = 0; i < differenceSignificance; i++) {
      setUint8(bytes[i]);
    }
  };

  setUint8(providedValues1to8);
  ____indexHasChanged && setUint8(idOverNetwork);
  _controlsHasChanged && setUint8(controls);
  ___healthHasChanged && setUint8(healthByte);

  insertChangedBytes(xDifferenceSignificance, xBytes);
  insertChangedBytes(yDifferenceSignificance, yBytes);
  insertChangedBytes(zDifferenceSignificance, zBytes);
  insertChangedBytes(angleZDifferenceSignificance, angleZBytes);

  providedBytesForPositionAndAngleHasChanged &&
    setUint8(providedBytesForPositionAndAngle);

  // local offset max total 17 bytes
  // if (localOffset > types.unreliableStateSingleObjectMaxBytes) {
  //   console.warn(
  //     `Warning: Game object data exceeded the maximum size of ${types.unreliableStateSingleObjectMaxBytes} bytes. Actual size: ${localOffset} bytes.`
  //   );
  // }
  offset += localOffset;

  if (shouldAddToRecentStates()) {
    recentStates[sequenceNumber].state[idOverNetwork] = {
      index,
      idOverNetwork,
      controls,
      health: healthByte,
      x,
      y,
      z,
      angleZ,
      providedBytesForPositionAndAngle,
    };
  }
};
